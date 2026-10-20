import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSeason } from "@/contexts/SeasonContext";
import { computeTotals, deriveSale, groupByBuyer, summarizeFarmer, isBuyerPayment, getLinkedSaleId } from "@/lib/ledger/aggregate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, FileText, Leaf } from "lucide-react";
import { translations, type Language } from "@/i18n/translations";
import type { Tables } from "@/integrations/supabase/types";
import FarmerAvatar from "@/components/FarmerAvatar";
import { fromKg, type WeightUnit } from "@/lib/ledger/calc";

type Farmer = Tables<"farmers">;
type LedgerEntry = Tables<"ledger_entries">;

const fmt = (n: number) => `₨ ${n.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtNum = (n: number) => n.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

// Direct translation lookup for print
const pt = (key: string, lang: Language): string => {
  const entry = translations[key];
  if (!entry) return key;
  return entry[lang] || entry.en || key;
};

const Reports = () => {
  const { t } = useLanguage();
  const { selectedSeason, farmerSeasons } = useSeason();
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [selectedFarmerId, setSelectedFarmerId] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("");
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [reportReady, setReportReady] = useState(false);
  // User picks Urdu OR Sindhi for printing (English UI is for the in-app preview only)
  const [printLang, setPrintLang] = useState<Language>("ur");
  const printRef = useRef<HTMLDivElement>(null);

  // Only show farmers in the current season
  const seasonFarmerIds = farmerSeasons.map(fs => fs.farmer_id);

  useEffect(() => {
    supabase.from("farmers").select("*").order("name").then(({ data }) => {
      if (data) setFarmers(data.filter(f => seasonFarmerIds.includes(f.id)));
    });
  }, [farmerSeasons]);

  const generateReport = async () => {
    setLoading(true);
    setReportReady(false);
    let query = supabase.from("ledger_entries").select("*").order("entry_date", { ascending: true });
    if (selectedSeason) query = query.eq("season_id", selectedSeason.id);
    if (selectedFarmerId !== "all") query = query.eq("farmer_id", selectedFarmerId);
    if (filterMonth) {
      const [year, month] = filterMonth.split("-");
      const start = `${year}-${month}-01`;
      const lastDay = new Date(Number(year), Number(month), 0).getDate();
      const end = `${year}-${month}-${lastDay}`;
      query = query.gte("entry_date", start).lte("entry_date", end);
    }
    const { data } = await query;
    if (data) setEntries(data);
    setLoading(false);
    setReportReady(true);
  };

  const reportFarmerIds = selectedFarmerId === "all"
    ? [...new Set(entries.map((e) => e.farmer_id))]
    : [selectedFarmerId];

  const getFarmerName = (id: string) => farmers.find((f) => f.id === id)?.name ?? id;
  const getFarmer = (id: string) => farmers.find((f) => f.id === id);
  const getFarmerEntries = (farmerId: string) => entries.filter((e) => e.farmer_id === farmerId);

  const calcSections = (farmerId: string) => {
    const farmerEntries = getFarmerEntries(farmerId);
    const expenses = farmerEntries.filter((e) => e.entry_type === "expense");
    const sales = farmerEntries.filter((e) => e.entry_type === "sale");
    const payments = farmerEntries.filter((e) => e.entry_type === "payment" && !isBuyerPayment(e as any));
    const loans = farmerEntries.filter((e) => e.entry_type === "loan");

    // === Per-row expense split ===
    // landlord_only -> 100% landlord
    // is_shared    -> 50/50 (or stored shared_amount on farmer's side)
    // else         -> 100% farmer
    const totalFarmerExpenses = expenses.reduce((sum, e) => {
      if (e.payment_method === "landlord_only") return sum;
      if (e.is_shared) return sum + Number(e.shared_amount ?? e.amount / 2);
      return sum + Number(e.amount);
    }, 0);
    const totalLandlordExpenses = expenses.reduce((sum, e) => {
      if (e.payment_method === "landlord_only") return sum + Number(e.amount);
      if (e.is_shared) return sum + (Number(e.amount) - Number(e.shared_amount ?? e.amount / 2));
      return sum;
    }, 0);
    const totalExpenses = totalFarmerExpenses + totalLandlordExpenses; // === sum of every row

    // Pre-calculate buyer receipts allocated to specific sales or general
    const buyerReceiptsBySale = new Map<string, number>();
    let unlinkedBuyerReceipts = 0;
    farmerEntries.forEach((e) => {
      if (isBuyerPayment(e as any)) {
        const amt = Number(e.amount) || 0;
        const saleId = getLinkedSaleId(e as any);
        if (saleId) {
          buyerReceiptsBySale.set(saleId, (buyerReceiptsBySale.get(saleId) || 0) + amt);
        } else {
          unlinkedBuyerReceipts += amt;
        }
      }
    });

    // If there is only one sale for this farmer and unlinked buyer receipts exist, attribute them to that sale
    if (sales.length === 1 && unlinkedBuyerReceipts > 0 && sales[0].id) {
      const current = buyerReceiptsBySale.get(sales[0].id) || 0;
      buyerReceiptsBySale.set(sales[0].id, current + unlinkedBuyerReceipts);
    }

    // Sale totals and buyer balances come from the same aggregation as Dashboard.
    const saleTotals = computeTotals(farmerEntries);
    const buyers = groupByBuyer(farmerEntries);
    const totalSales = saleTotals.netSales;
    const totalPayments = payments.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalLoans = loans.reduce((sum, e) => sum + Number(e.amount), 0);

    const farmer = getFarmer(farmerId);
    const fs = farmerSeasons.find(f => f.farmer_id === farmerId);
    const initialBalance = fs ? Number(fs.opening_balance) : Number(farmer?.initial_balance ?? 0);

    // === Single source of truth: same summary the Dashboard & Farmers use ===
    const summary = summarizeFarmer(farmerEntries as any[], farmerId, initialBalance);
    const netProfit = summary.netProfit;             // net sales − expenses
    const farmerProfitShare = summary.farmerProfitShare; // 50/50, profit only
    const landlordProfitShare = netProfit - farmerProfitShare;

    // Final Balance = Opening + FarmerExpenses + Loans − FarmerProfitShare − Payments
    const finalBalance = summary.balanceDue;

    return {
      expenses, sales, payments, loans,
      totalFarmerExpenses, totalLandlordExpenses, totalExpenses,
      totalSales, totalPayments, totalLoans,
      initialBalance, netProfit, farmerProfitShare, landlordProfitShare,
      finalBalance, saleTotals, buyers, buyerReceiptsBySale,
    };
  };


  const selectedFarmerName = selectedFarmerId === "all" ? t("reports.allFarmers") : getFarmerName(selectedFarmerId);

  const handlePrint = () => {
    const L = printLang; // "en" | "ur" | "sd"
    const isRTL = L !== "en";
    const dirAttr = isRTL ? 'dir="rtl"' : 'dir="ltr"';
    const textAlign = isRTL ? "right" : "left";
    const textAlignOpp = isRTL ? "left" : "right";
    const fmtSign = (n: number) => `${n < 0 ? "− " : ""}₨ ${fmtNum(Math.abs(n))}`;

    let html = "";

    reportFarmerIds.forEach((farmerId, idx) => {
      const {
        expenses, sales, payments, loans,
        totalFarmerExpenses, totalLandlordExpenses, totalExpenses,
        totalSales, totalPayments, totalLoans,
        initialBalance, netProfit, farmerProfitShare, landlordProfitShare,
        finalBalance, saleTotals, buyerReceiptsBySale,
      } = calcSections(farmerId);
      const farmer = getFarmer(farmerId);
      if (!farmer) return;
      const seasonName = selectedSeason?.name ?? "—";
      const stmtNo = `${new Date().getFullYear()}/${String(idx + 1).padStart(3, "0")}`;
      const profitOrLossLabel = netProfit >= 0 ? pt("print.netProfit", L) : pt("print.netLoss", L);

      if (idx > 0) html += `<div style="page-break-before:always"></div>`;

      // === HEADER ===
      html += `<div class="header-block">
        <h1>${pt("print.title", L)}</h1>
        <div class="header-sub">
          <span class="season-label">${pt("print.cropSeason", L)}: ${escapeHtml(seasonName)}</span>
          <span class="stmt-no">${pt("print.statementNo", L)}: ${stmtNo}</span>
        </div>
      </div>`;

      // === FARMER & LANDLORD INFO ===
      html += `<div class="info-row">
        <div class="info-col">
          <div class="info-label">${pt("print.farmer", L)}:</div>
          <div class="info-value">${escapeHtml(farmer.name)}</div>
          ${farmer.phone ? `<div class="info-detail">${pt("common.phone", L)}: ${farmer.phone}</div>` : ""}
          ${farmer.address ? `<div class="info-detail">${pt("print.village", L)}: ${farmer.address}</div>` : ""}
        </div>
        <div class="info-col">
          <div class="info-label">${pt("print.landlord", L)}:</div>
          <div class="info-value">${pt("print.landlordName", L)}</div>
        </div>
      </div>`;

      // === GREEN BAR ===
      html += `<div class="info-bar">
        ${pt("print.profitSharing", L)}: 50% ${pt("print.farmer", L)} / 50% ${pt("print.landlord", L)}
      </div>`;

      // === SUMMARY CARDS (top of bill) ===
      html += `<div class="summary-cards">
        <div class="sc sc-sales"><div class="sc-label">${pt("print.cardSales", L)}</div><div class="sc-value">₨ ${fmtNum(totalSales)}</div></div>
        <div class="sc sc-expenses"><div class="sc-label">${pt("print.cardExpenses", L)}</div><div class="sc-value">₨ ${fmtNum(totalExpenses)}</div></div>
        <div class="sc sc-profit"><div class="sc-label">${profitOrLossLabel}</div><div class="sc-value">${fmtSign(netProfit)}</div></div>
        <div class="sc sc-balance"><div class="sc-label">${pt("print.cardFinalBalance", L)}</div><div class="sc-value">${fmtSign(finalBalance)}</div></div>
      </div>`;

      // === SECTION 1: EXPENSES ===
      html += `<div class="section-title sec-expenses">1. ${pt("print.expensesDetails", L)}</div>`;
      if (expenses.length > 0) {
        html += `<table class="bill-table"><thead><tr>
          <th>${pt("common.date", L)}</th>
          <th>${pt("ledger.category", L)}</th>
          <th>${pt("common.description", L)}</th>
          <th class="num">${pt("print.farmerShare", L)} (₨)</th>
          <th class="num">${pt("print.landlordShare", L)} (₨)</th>
          <th class="num">${pt("print.lineRowTotal", L)} (₨)</th>
        </tr></thead><tbody>`;
        expenses.forEach((e) => {
          const isLandlordOnly = e.payment_method === "landlord_only";
          const fShare = isLandlordOnly ? 0 : (e.is_shared ? Number(e.shared_amount ?? e.amount / 2) : Number(e.amount));
          const lShare = isLandlordOnly ? Number(e.amount) : (e.is_shared ? Number(e.amount) - Number(e.shared_amount ?? e.amount / 2) : 0);
          const rowTotal = fShare + lShare;
          html += `<tr>
            <td>${e.entry_date ?? "—"}</td>
            <td>${e.category ?? "—"}</td>
            <td>${e.description || "—"}</td>
            <td class="num">${fmtNum(fShare)}</td>
            <td class="num">${fmtNum(lShare)}</td>
            <td class="num row-total">${fmtNum(rowTotal)}</td>
          </tr>`;
        });
        html += `</tbody><tfoot><tr>
          <td colspan="3"><strong>${pt("print.totalExpenses", L)}:</strong></td>
          <td class="num"><strong>${fmtNum(totalFarmerExpenses)}</strong></td>
          <td class="num"><strong>${fmtNum(totalLandlordExpenses)}</strong></td>
          <td class="num total-highlight">₨ ${fmtNum(totalExpenses)}</td>
        </tr></tfoot></table>`;
      } else { html += `<p class="no-data">${pt("print.noExpenses", L)}</p>`; }

      // === SECTION 2: SALES ===
      html += `<div class="section-title sec-sales">2. ${pt("print.salesSummaryTitle", L)}</div>`;
      if (sales.length > 0) {
        sales.forEach((e) => {
          const extraReceipts = e.id ? (buyerReceiptsBySale?.get(e.id) || 0) : 0;
          const s = deriveSale(e, extraReceipts);
          const line = (label: string, value: number) => `<div class="sale-amount"><span>${pt(label, L)}</span><strong>₨ ${fmtNum(value)}</strong></div>`;
          const weightUnit = e.weight_unit || "kg";
          const rateUnit = e.rate_unit || weightUnit;
          const rate = e.rate != null ? Number(e.rate) : null;
          const rateQuantity = s.netWeight > 0 && rateUnit !== weightUnit
            ? fromKg(s.netWeightKg, rateUnit as WeightUnit) : s.netWeight;
          html += `<article class="sale-detail" data-sale-id="${escapeHtml(e.id)}">
            <div class="sale-heading">${pt("print.saleDetails", L)} · ${escapeHtml(e.entry_date ?? "—")}</div>
            <div class="sale-parties">
              <span>${pt("print.farmer", L)}: <strong>${escapeHtml(farmer.name)}</strong></span>
              <span>${pt("reports.buyer", L)}: <strong>${escapeHtml(e.buyer?.trim() || pt("reports.unspecifiedBuyer", L))}</strong></span>
              <span>${pt("print.cropSeason", L)}: <strong>${escapeHtml(seasonName)}</strong></span>
              ${e.field_name ? `<span>${pt("print.field", L)}: <strong>${escapeHtml(e.field_name)}</strong></span>` : ""}
            </div>
            <table class="bill-table sale-table"><thead><tr>
              <th>${pt("print.crop", L)}</th><th class="num">${pt("print.quantity", L)}</th><th>${pt("print.unit", L)}</th>
              <th class="num">${pt("print.rate", L)}</th><th class="num">${pt("print.totalSaleAmount", L)}</th>
            </tr></thead><tbody><tr>
              <td>${escapeHtml(e.crop_type || e.description || "—")}</td>
              <td class="num">${s.netWeight > 0 ? fmtNum(s.netWeight) : "—"}</td>
              <td>${s.netWeight > 0 ? escapeHtml(weightUnit) : "—"}</td>
              <td class="num">${rate != null && Number.isFinite(rate) ? `₨ ${fmtNum(rate)} / ${escapeHtml(rateUnit)}` : "—"}</td>
              <td class="num row-total">₨ ${fmtNum(s.grossSale)}</td>
            </tr></tbody></table>
            ${s.netWeight > 0 && rate != null && Number.isFinite(rate)
              ? `<p class="rate-basis">${pt("print.rateBasis", L)}: ${fmtNum(rateQuantity)} ${escapeHtml(rateUnit)} × ₨ ${fmtNum(rate)} / ${escapeHtml(rateUnit)} = ₨ ${fmtNum(s.grossSale)}</p>` : ""}
            <div class="sale-costs">
              <div class="sale-subheading">${pt("print.costBreakdown", L)}</div>
              <div class="sale-cost-grid">
                ${line("reports.transportCost", s.transport)}
                ${line("reports.labourCost", s.labour)}
                ${line("reports.commissionCost", s.commission)}
                ${line("reports.otherSaleCosts", s.other)}
              </div>
            </div>
            <div class="sale-payment">
              <div class="sale-subheading">${pt("print.paymentSummary", L)}</div>
              <div class="sale-payment-grid">
                ${line("reports.grossSale", s.grossSale)}
                ${line("reports.totalSaleCosts", s.costs)}
                ${line("reports.netSale", s.netSale)}
                ${line("reports.salePaid", s.paid)}
                ${line("reports.saleOutstanding", s.buyerRemaining)}
              </div>
            </div>
          </article>`;
        });
        html += `<div class="sale-detail sale-total">
          <div class="sale-heading">${pt("print.totalSalesLabel", L)}</div>
          <div class="summary-row"><span>${pt("reports.grossSale", L)}</span><span>₨ ${fmtNum(saleTotals.grossSales)}</span></div>
          <div class="summary-row"><span>${pt("reports.totalSaleCosts", L)}</span><span>₨ ${fmtNum(saleTotals.saleCosts)}</span></div>
          <div class="summary-row"><span>${pt("reports.netSale", L)}</span><span>₨ ${fmtNum(saleTotals.netSales)}</span></div>
          <div class="summary-row"><span>${pt("reports.salePaid", L)}</span><span>₨ ${fmtNum(saleTotals.saleReceived)}</span></div>
          <div class="summary-row"><span>${pt("reports.saleOutstanding", L)}</span><span>₨ ${fmtNum(saleTotals.saleOutstanding)}</span></div>
        </div>`;
      } else { html += `<p class="no-data">${pt("print.noSales", L)}</p>`; }

      // === SECTION 3: LOANS GIVEN TO FARMER ===
      html += `<div class="section-title sec-loans">3. ${pt("print.loansToFarmer", L)}</div>`;
      if (loans.length > 0) {
        html += `<table class="bill-table"><thead><tr>
          <th>${pt("common.date", L)}</th>
          <th>${pt("common.description", L)}</th>
          <th class="num">${pt("common.amount", L)} (₨)</th>
        </tr></thead><tbody>`;
        loans.forEach((e) => {
          html += `<tr>
            <td>${e.entry_date ?? "—"}</td>
            <td>${e.description || "—"}</td>
            <td class="num row-total">${fmtNum(e.amount)}</td>
          </tr>`;
        });
        html += `</tbody><tfoot><tr>
          <td colspan="2"><strong>${pt("print.totalLoans", L)}:</strong></td>
          <td class="num total-highlight">₨ ${fmtNum(totalLoans)}</td>
        </tr></tfoot></table>`;
      } else { html += `<p class="no-data">${pt("print.noLoans", L)}</p>`; }

      // === SECTION 4: PAYMENTS RECEIVED FROM FARMER ===
      html += `<div class="section-title sec-payments">4. ${pt("print.paymentsReceivedTitle", L)}</div>`;
      if (payments.length > 0) {
        html += `<table class="bill-table"><thead><tr>
          <th>${pt("common.date", L)}</th>
          <th>${pt("print.method", L)}</th>
          <th>${pt("print.details", L)}</th>
          <th class="num">${pt("common.amount", L)} (₨)</th>
        </tr></thead><tbody>`;
        payments.forEach((e) => {
          const details = e.payment_method === "crop_return" && e.crop_type
            ? `${e.crop_type} ${e.crop_weight ?? ""}kg @ ₨${e.rate ?? ""}/kg`
            : "—";
          html += `<tr>
            <td>${e.entry_date ?? "—"}</td>
            <td>${e.payment_method === "crop_return" ? pt("ledger.cropReturn", L) : pt("print.cash", L)}</td>
            <td>${details}</td>
            <td class="num row-total">${fmtNum(e.amount)}</td>
          </tr>`;
        });
        html += `</tbody><tfoot><tr>
          <td colspan="3"><strong>${pt("print.totalReceived", L)}:</strong></td>
          <td class="num total-highlight">₨ ${fmtNum(totalPayments)}</td>
        </tr></tfoot></table>`;
      } else { html += `<p class="no-data">${pt("print.noPayments", L)}</p>`; }

      // === SECTION 5 & 6: PROFIT + FINAL BALANCE ===
      html += `<div class="bottom-grid">
        <div class="bottom-box box-profit">
          <div class="box-title">5. ${pt("print.profitLossSummary", L)}</div>
          <div class="summary-row"><span>${pt("print.totalSalesIncome", L)}:</span><span>₨ ${fmtNum(totalSales)}</span></div>
          <div class="summary-row"><span>− ${pt("print.cardExpenses", L)}:</span><span>${fmtSign(-totalExpenses)}</span></div>
          <div class="summary-row bold-row"><span>${profitOrLossLabel}:</span><span>${fmtSign(netProfit)}</span></div>
          <div class="summary-row"><span>${pt("print.profitShareFarmer", L)}:</span><span>${fmtSign(farmerProfitShare)}</span></div>
          <div class="summary-row"><span>${pt("print.profitShareLandlord", L)}:</span><span>${fmtSign(landlordProfitShare)}</span></div>
        </div>
        <div class="bottom-box box-balance">
          <div class="box-title">6. ${pt("print.finalAccountSummary", L)}</div>
          <div class="summary-row"><span>${pt("print.openingBalance", L)}:</span><span>₨ ${fmtNum(initialBalance)}</span></div>
          <div class="summary-row"><span>+ ${pt("print.farmerShare", L)} (${pt("print.cardExpenses", L)}):</span><span>+ ₨ ${fmtNum(totalFarmerExpenses)}</span></div>
          <div class="summary-row"><span>${pt("print.minusLoans", L)}:</span><span>+ ₨ ${fmtNum(totalLoans)}</span></div>
          <div class="summary-row"><span>− ${pt("print.profitShareFarmer", L)}:</span><span>− ₨ ${fmtNum(farmerProfitShare)}</span></div>
          <div class="summary-row"><span>${pt("print.minusPaymentsMade", L)}:</span><span>− ₨ ${fmtNum(totalPayments)}</span></div>
          <div class="summary-row highlight-row ${finalBalance > 0 ? 'due' : 'refund'}">
            <span>${finalBalance > 0 ? pt("print.payable", L) : pt("print.receivable", L)}:</span>
            <span>₨ ${fmtNum(Math.abs(finalBalance))}</span>
          </div>
        </div>
      </div>`;

      // === DATE + SIGNATURES ===
      html += `<div class="date-line">${pt("print.dateAndTime", L)}: ${new Date().toLocaleDateString("en-PK", { day: "2-digit", month: "2-digit", year: "numeric" })}</div>`;
      html += `<div class="signature-row">
        <div class="sig-block">
          <div class="sig-line"></div>
          <div>${pt("print.farmerSignature", L)}</div>
        </div>
        <div class="sig-block">
          <div class="sig-line"></div>
          <div>${pt("print.landlordSignature", L)}</div>
          <div class="sig-date">${pt("common.date", L)}: ________________</div>
        </div>
      </div>`;
    });

    if (reportFarmerIds.length === 0) {
      html += `<p style="text-align:center;color:#666;font-size:13px">${pt("print.noData", L)}</p>`;
    }

    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    // Offline-safe: rely on system fonts only (no external Google Fonts).
    const rtlFont = "'Jameel Noori Nastaleeq', 'Noto Naskh Arabic', 'Noto Nastaliq Urdu', 'Scheherazade New', 'Al Bayan', 'Geeza Pro', 'Tahoma', Arial, sans-serif";
    const finalFont = isRTL ? rtlFont : "'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif";
    win.document.write(`<!DOCTYPE html><html ${dirAttr}><head><title>${pt("print.title", L)}</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: ${finalFont}; font-size: 12px; color: #222; background: white; padding: 10mm; direction: ${isRTL ? 'rtl' : 'ltr'}; line-height: 1.6; }

      .header-block {
        background: linear-gradient(135deg, #1e3a5f 0%, #2c5f8a 50%, #1a4a6e 100%);
        color: white;
        text-align: center;
        padding: 18px 24px 14px;
        border-radius: 6px 6px 0 0;
      }
      .header-block h1 {
        font-size: ${isRTL ? '26px' : '20px'};
        font-weight: 700;
        letter-spacing: ${isRTL ? '0' : '1.5px'};
        text-transform: ${isRTL ? 'none' : 'uppercase'};
        margin-bottom: 6px;
      }
      .header-sub {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: ${isRTL ? '14px' : '11px'};
        padding-top: 4px;
        opacity: 0.9;
        border-top: 1px solid rgba(255,255,255,0.2);
      }
      .season-label { font-size: ${isRTL ? '15px' : '13px'}; font-weight: 600; }
      .stmt-no { font-size: ${isRTL ? '13px' : '11px'}; opacity: 0.85; }

      .info-row {
        display: flex;
        justify-content: space-between;
        padding: 14px 20px;
        border: 1px solid #d0d7de;
        border-top: none;
        background: #f8fafb;
      }
      .info-col { flex: 1; }
      .info-label { font-size: ${isRTL ? '13px' : '10px'}; color: #5a6872; font-weight: 600; text-transform: ${isRTL ? 'none' : 'uppercase'}; letter-spacing: 0.5px; }
      .info-value { font-size: ${isRTL ? '18px' : '15px'}; font-weight: 700; color: #1e3a5f; margin: 3px 0; }
      .info-detail { font-size: ${isRTL ? '14px' : '11px'}; color: #4a5568; }

      .info-bar {
        background: linear-gradient(90deg, #27855a 0%, #2d9d6a 100%);
        color: white;
        text-align: center;
        padding: 8px 16px;
        font-size: ${isRTL ? '14px' : '11px'};
        font-weight: 600;
        margin-bottom: 16px;
        border-radius: 0 0 6px 6px;
        letter-spacing: 0.3px;
      }

      .section-title {
        font-size: 16px;
        font-weight: 700;
        color: #1e3a5f;
        margin: 18px 0 6px;
        padding: 8px 12px;
        background: #edf2f7;
        border-right: 5px solid #2c5f8a;
        border-radius: 4px;
      }
      .section-title.sec-expenses { background: #fef2f2; border-right-color: #dc2626; color: #991b1b; }
      .section-title.sec-sales    { background: #ecfdf5; border-right-color: #059669; color: #065f46; }
      .section-title.sec-loans    { background: #eff6ff; border-right-color: #2563eb; color: #1e3a8a; }
      .section-title.sec-payments { background: #fffbeb; border-right-color: #d97706; color: #92400e; }
      .sale-detail { border: 1px solid #c5cdd6; border-radius: 4px; padding: 8px 12px; margin: 8px 0; break-inside: avoid; }
      .sale-heading { font-weight: 700; color: #065f46; border-bottom: 1px solid #c5cdd6; padding-bottom: 4px; }
      .sale-total { background: #ecfdf5; }
      .sale-parties { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2px 18px; margin: 7px 0; }
      .sale-parties span { min-width: 0; overflow-wrap: anywhere; }
      .sale-subheading { padding: 3px 0; font-weight: 700; color: #065f46; }
      .sale-costs, .sale-payment { border-top: 1px solid #c5cdd6; margin-top: 6px; padding-top: 3px; }
      .sale-cost-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
      .sale-payment-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; }
      .sale-amount { min-width: 0; overflow-wrap: anywhere; font-size: 11px; }
      .sale-amount span, .sale-amount strong { display: block; }
      .sale-amount strong { font-variant-numeric: tabular-nums; }
      .sale-payment-grid .sale-amount:last-child { border-inline-start: 2px solid #059669; padding-inline-start: 8px; }
      .rate-basis { padding: 2px 0 6px; color: #475569; font-size: 11px; }
      .sale-table { table-layout: fixed; margin: 8px 0 2px; }
      .sale-table th, .sale-table td { overflow-wrap: anywhere; padding: 5px 6px; }
      .sale-table th:first-child { width: 25%; }

      /* Top summary cards */
      .summary-cards {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
        margin: 12px 0 18px;
      }
      .sc {
        border-radius: 8px;
        padding: 10px 12px;
        border: 1px solid #e2e8f0;
        background: #f8fafc;
        text-align: center;
      }
      .sc-label { font-size: 12px; font-weight: 600; opacity: 0.85; margin-bottom: 4px; }
      .sc-value { font-size: 16px; font-weight: 800; font-family: 'Inter', 'Tahoma', monospace; }
      .sc-sales    { background: #ecfdf5; border-color: #6ee7b7; color: #065f46; }
      .sc-expenses { background: #fef2f2; border-color: #fca5a5; color: #991b1b; }
      .sc-profit   { background: #eff6ff; border-color: #93c5fd; color: #1e3a8a; }
      .sc-balance  { background: #fef3c7; border-color: #fcd34d; color: #78350f; font-weight: 800; }
      .row-total { font-weight: 700; background: #f1f5f9; }

      .box-profit .box-title { color: #1e3a8a; border-bottom-color: #2563eb; }
      .box-balance .box-title { color: #78350f; border-bottom-color: #d97706; }

      .bill-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 4px;
        font-size: ${isRTL ? '13px' : '11px'};
      }
      .bill-table th {
        background: #1e3a5f;
        color: white;
        padding: 8px 10px;
        text-align: ${textAlign};
        font-weight: 600;
        font-size: ${isRTL ? '13px' : '10px'};
        text-transform: ${isRTL ? 'none' : 'uppercase'};
        letter-spacing: 0.3px;
        border: 1px solid #1a3355;
      }
      .bill-table td {
        padding: 6px 10px;
        border: 1px solid #dce3ea;
        font-size: ${isRTL ? '13px' : '11px'};
      }
      .bill-table tbody tr:nth-child(even) td { background: #f5f8fb; }
      .bill-table tbody tr:hover td { background: #edf2f7; }
      .bill-table tfoot td {
        background: #edf2f7;
        font-weight: 700;
        border: 1px solid #c5cdd6;
      }
      .bill-table .num { text-align: ${textAlignOpp}; font-family: 'Inter', 'Tahoma', monospace; }
      .total-highlight {
        background: #1e3a5f !important;
        color: white !important;
        font-weight: 700 !important;
        font-size: 12px !important;
      }

      .total-line {
        text-align: ${textAlignOpp};
        font-weight: 700;
        font-size: ${isRTL ? '14px' : '12px'};
        padding: 6px 10px;
        margin-bottom: 4px;
        background: #edf2f7;
        border: 1px solid #c5cdd6;
        border-top: none;
        color: #1e3a5f;
      }

      .no-data { font-size: ${isRTL ? '14px' : '11px'}; color: #888; margin-bottom: 10px; font-style: italic; padding: 8px; }

      .bottom-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
        margin-top: 18px;
      }
      .bottom-box {
        border: 1px solid #c5cdd6;
        padding: 12px 14px;
        border-radius: 6px;
        background: #fafcfd;
      }
      .box-title {
        font-size: ${isRTL ? '15px' : '12px'};
        font-weight: 700;
        color: #1e3a5f;
        margin-bottom: 8px;
        border-bottom: 2px solid #2c5f8a;
        padding-bottom: 6px;
      }
      .summary-row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        overflow-wrap: anywhere;
        font-size: ${isRTL ? '13px' : '11px'};
        padding: 4px 0;
        border-bottom: 1px dotted #dce3ea;
      }
      .summary-row span:last-child { font-family: 'Inter', 'Tahoma', monospace; }
      .summary-row span:last-child { text-align: ${textAlignOpp}; flex-shrink: 0; }
      .bold-row {
        font-weight: 700;
        font-size: ${isRTL ? '15px' : '13px'};
        border-top: 2px solid #1e3a5f;
        border-bottom: none;
        margin-top: 6px;
        padding-top: 6px;
        color: #1e3a5f;
      }
      .highlight-row {
        font-weight: 700;
        font-size: ${isRTL ? '15px' : '13px'};
        padding: 8px 10px;
        margin-top: 8px;
        border: none;
        border-radius: 4px;
      }
      .highlight-row.refund {
        background: #d1fae5;
        color: #065f46;
        border: 1px solid #34d399;
      }
      .highlight-row.due {
        background: #fee2e2;
        color: #991b1b;
        border: 1px solid #f87171;
      }

      .date-line {
        text-align: center;
        margin-top: 20px;
        padding: 8px;
        border-top: 2px solid #dce3ea;
        font-size: ${isRTL ? '13px' : '11px'};
        color: #4a5568;
      }

      .signature-row {
        display: flex;
        justify-content: space-between;
        margin-top: 36px;
        padding: 0 16px;
      }
      .sig-block { text-align: ${textAlign}; font-size: ${isRTL ? '14px' : '11px'}; color: #4a5568; }
      .sig-line {
        width: 200px;
        border-bottom: 2px solid #1e3a5f;
        margin-bottom: 6px;
      }
      .sig-date { margin-top: 4px; font-size: ${isRTL ? '12px' : '10px'}; color: #718096; }

      .footer-note {
        text-align: center;
        margin-top: 24px;
        padding-top: 10px;
        border-top: 1px solid #e2e8f0;
        font-size: ${isRTL ? '12px' : '9px'};
        color: #a0aec0;
        letter-spacing: 0.5px;
      }

      .bill-table { table-layout: fixed; }
      .bill-table th, .bill-table td { overflow-wrap: anywhere; }
      .bill-table thead { display: table-header-group; }
      .bill-table tr, .bottom-box, .summary-cards, .signature-row { break-inside: avoid; }
      .info-col, .sc, .bottom-box { min-width: 0; overflow-wrap: anywhere; }
      @media screen and (max-width: 600px) {
        body { padding: 12px; }
        .summary-cards { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .bottom-grid { grid-template-columns: 1fr; }
        .bill-table th, .bill-table td { padding: 4px 3px; font-size: 10px; }
        .sale-detail { padding: 8px; }
        .sale-parties { grid-template-columns: 1fr; }
        .sale-cost-grid, .sale-payment-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .sig-line { width: 110px; }
      }
      @media print {
        body { padding: 0; font-size: 11px; line-height: 1.4; }
        .sale-detail { page-break-inside: avoid; }
        .section-title { break-after: avoid; }
        .header-block { padding: 10px 14px; }
        .info-row { padding: 8px 12px; }
        .info-bar { padding: 5px 10px; margin-bottom: 8px; }
        .summary-cards { margin: 8px 0; }
        .sc { padding: 6px 8px; }
        .section-title { margin-top: 10px; padding: 5px 8px; }
        .bill-table th, .bill-table td { padding: 4px 6px; }
      }
      @page { margin: 10mm; size: A4; }
    </style></head><body>${html}<div class="footer-note">— ${pt("print.title", L)} —</div></body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Page Header Banner */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-4 sm:p-8 text-primary-foreground shadow-xl shadow-primary/20">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-primary-foreground/5 -translate-y-1/2 translate-x-1/4 blur-2xl" />
        <div className="absolute bottom-0 left-1/3 w-32 h-32 rounded-full bg-primary-foreground/10 translate-y-1/2 blur-xl" />
        <div className="relative z-10 flex items-center gap-3 sm:gap-4">
          <div className="hidden sm:flex h-14 w-14 items-center justify-center rounded-lg bg-primary-foreground/15 backdrop-blur-md border border-primary-foreground/10">
            <FileText className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-3xl font-serif font-bold tracking-tight">{t("reports.title")}</h1>
            <p className="text-primary-foreground/70 text-xs sm:text-sm mt-0.5">{t("reports.subtitle")}</p>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden shadow-lg border-border/50">
        <div className="h-1 bg-gradient-to-r from-primary to-primary/70" />
        <CardHeader><CardTitle className="flex items-center gap-2 text-base sm:text-lg"><FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />{t("reports.generateReport")}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-sm sm:text-base">{t("ledger.farmer")}</Label>
              <Select value={selectedFarmerId} onValueChange={setSelectedFarmerId}>
                <SelectTrigger className="h-10 sm:h-11"><SelectValue placeholder={t("ledger.selectFarmer")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("reports.allFarmers")}</SelectItem>
                  {farmers.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-sm sm:text-base">{t("reports.monthOptional")}</Label>
              <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-sm sm:text-base">{t("reports.printLanguage")}</Label>
              <Select value={printLang} onValueChange={(v) => setPrintLang(v as Language)}>
                <SelectTrigger className="h-10 sm:h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ur">اردو (Urdu)</SelectItem>
                  <SelectItem value="sd">سندھی (Sindhi)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:space-y-2 flex items-end gap-2 col-span-2 sm:col-span-1">
              <Button size="sm" onClick={generateReport} disabled={loading} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-lg shadow-primary/20 rounded-xl text-xs sm:text-sm h-9 sm:h-10">
                {loading ? t("common.loading") : t("reports.generateReport")}
              </Button>
              {reportReady && (
                <Button size="sm" onClick={handlePrint} className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-lg shadow-primary/20 rounded-xl text-xs sm:text-sm h-9 sm:h-10">
                  <Printer className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />{t("reports.printPdf")}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {reportReady && (
        <Card>
          <CardContent className="p-4 sm:pt-6 sm:px-6">
            <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">{t("reports.preview")}</p>
            <div className="border border-border rounded-md overflow-hidden">
              <div className="bg-muted/30 px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs text-muted-foreground flex flex-col sm:flex-row justify-between gap-1">
                <span>{t("reports.reportFor")}: {selectedFarmerName}</span>
                <span>{t("reports.generated")}: {new Date().toLocaleDateString("en-PK")}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {reportReady && reportFarmerIds.length > 0 && (
        <div className="space-y-3 sm:space-y-4">
          {reportFarmerIds.map((farmerId) => {
            const { totalFarmerExpenses, totalLandlordExpenses, totalExpenses, totalSales, totalPayments, totalLoans, finalBalance, netProfit, saleTotals, buyers } = calcSections(farmerId);
            return (
              <Card key={farmerId}>
                <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                    <FarmerAvatar name={getFarmer(farmerId)?.name} photoUrl={getFarmer(farmerId)?.photo_url} className="h-8 w-8 sm:h-9 sm:w-9" />
                    <span className="truncate">{getFarmerName(farmerId)}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                  <div className="grid grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
                    {[
                      ["reports.grossSale", saleTotals.grossSales],
                      ["reports.transportCost", saleTotals.transportCosts],
                      ["reports.labourCost", saleTotals.labourCosts],
                      ["reports.commissionCost", saleTotals.commissionCosts],
                      ["reports.otherSaleCosts", saleTotals.otherSaleCosts],
                      ["reports.totalSaleCosts", saleTotals.saleCosts],
                      ["reports.netSale", saleTotals.netSales],
                      ["reports.salePaid", saleTotals.saleReceived],
                      ["reports.saleOutstanding", saleTotals.saleOutstanding],
                    ].map(([label, value]) => (
                      <div key={label} className="bg-muted/30 rounded-lg p-2 sm:p-3 min-w-0">
                        <p className="text-muted-foreground text-[10px] sm:text-xs">{t(String(label))}</p>
                        <p className="font-mono font-medium text-sm sm:text-base break-words">{fmt(Number(value))}</p>
                      </div>
                    ))}
                    <div className="bg-muted/30 rounded-lg p-2 sm:p-3"><p className="text-muted-foreground text-[10px] sm:text-xs">{t("reports.totalSales")}</p><p className="font-mono font-medium text-emerald-600 text-sm sm:text-base">{fmt(totalSales)}</p></div>
                    <div className="bg-muted/30 rounded-lg p-2 sm:p-3"><p className="text-muted-foreground text-[10px] sm:text-xs">{t("reports.farmerExpenses")}</p><p className="font-mono font-medium text-sm sm:text-base">{fmt(totalFarmerExpenses)}</p></div>
                    <div className="bg-muted/30 rounded-lg p-2 sm:p-3"><p className="text-muted-foreground text-[10px] sm:text-xs">{t("reports.landlordExpenses")}</p><p className="font-mono font-medium text-sm sm:text-base">{fmt(totalLandlordExpenses)}</p></div>
                    <div className="bg-muted/30 rounded-lg p-2 sm:p-3"><p className="text-muted-foreground text-[10px] sm:text-xs">Total Expenses</p><p className="font-mono font-medium text-red-600 text-sm sm:text-base">{fmt(totalExpenses)}</p></div>
                    <div className="bg-muted/30 rounded-lg p-2 sm:p-3"><p className="text-muted-foreground text-[10px] sm:text-xs">{t("reports.personalLoans")}</p><p className="font-mono font-medium text-sm sm:text-base">{fmt(totalLoans)}</p></div>
                    <div className="bg-muted/30 rounded-lg p-2 sm:p-3"><p className="text-muted-foreground text-[10px] sm:text-xs">{t("reports.paymentsReceived")}</p><p className="font-mono font-medium text-sm sm:text-base">{fmt(totalPayments)}</p></div>
                    <div className="bg-muted/30 rounded-lg p-2 sm:p-3"><p className="text-muted-foreground text-[10px] sm:text-xs">{t("reports.netProfitLoss")}</p><p className={`font-mono font-medium text-sm sm:text-base ${netProfit >= 0 ? "text-blue-600" : "text-destructive"}`}>{netProfit >= 0 ? "+" : "−"} {fmt(Math.abs(netProfit))}</p></div>
                    <div className="bg-muted/30 rounded-lg p-2 sm:p-3"><p className="text-muted-foreground text-[10px] sm:text-xs">{t("reports.balanceDue")}</p><p className={`font-mono font-bold text-sm sm:text-base ${finalBalance > 0 ? "text-destructive" : "text-primary"}`}>{Math.abs(finalBalance) < 0.5 ? t("reports.settled") : fmt(Math.abs(finalBalance))}</p></div>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 text-xs sm:text-sm">
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">{t("reports.farmerOutstanding")}</h3>
                      <div className="flex justify-between gap-3 border-b border-border py-2"><span className="min-w-0 break-words">{getFarmerName(farmerId)}</span><strong className="tabular-nums shrink-0">{fmt(finalBalance)}</strong></div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">{t("reports.buyerOutstanding")}</h3>
                      {buyers.length ? buyers.map((buyer) => (
                        <div key={buyer.buyer} className="flex justify-between gap-3 border-b border-border py-2"><span className="min-w-0 break-words">{buyer.buyer === "Unspecified buyer" ? t("reports.unspecifiedBuyer") : buyer.buyer}</span><strong className="tabular-nums shrink-0">{fmt(buyer.outstanding)}</strong></div>
                      )) : <p className="text-muted-foreground py-2">{t("print.noSales")}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Reports;
