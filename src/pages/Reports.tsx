import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSeason } from "@/contexts/SeasonContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, FileText, Leaf } from "lucide-react";
import { translations, type Language } from "@/i18n/translations";
import type { Tables } from "@/integrations/supabase/types";

type Farmer = Tables<"farmers">;
type LedgerEntry = Tables<"ledger_entries">;

const fmt = (n: number) => `₨ ${n.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtNum = (n: number) => n.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

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
  const [printLang, setPrintLang] = useState<Language>("en");
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
    const payments = farmerEntries.filter((e) => e.entry_type === "payment");
    const loans = farmerEntries.filter((e) => e.entry_type === "loan");

    const totalFarmerExpenses = expenses.reduce((sum, e) => {
      if (e.payment_method === "landlord_only") return sum;
      if (e.is_shared) return sum + (e.shared_amount ?? e.amount / 2);
      return sum + e.amount;
    }, 0);
    const totalLandlordExpenses = expenses.reduce((sum, e) => {
      if (e.payment_method === "landlord_only") return sum + e.amount;
      if (e.is_shared) return sum + (e.amount - (e.shared_amount ?? e.amount / 2));
      return sum;
    }, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalSales = sales.reduce((sum, e) => sum + e.amount, 0);
    const totalPayments = payments.reduce((sum, e) => sum + e.amount, 0);
    const totalLoans = loans.reduce((sum, e) => sum + e.amount, 0);
    const farmer = getFarmer(farmerId);
    // Use farmer_season opening_balance if available, fallback to farmer's initial_balance
    const fs = farmerSeasons.find(f => f.farmer_id === farmerId);
    const initialBalance = fs ? Number(fs.opening_balance) : Number(farmer?.initial_balance ?? 0);
    const balanceOwed = initialBalance + totalFarmerExpenses + totalLoans - totalPayments;
    const netProfit = totalSales - totalFarmerExpenses - totalLandlordExpenses;

    return { expenses, sales, payments, loans, totalFarmerExpenses, totalLandlordExpenses, totalExpenses, totalSales, totalPayments, totalLoans, initialBalance, balanceOwed, netProfit };
  };

  const selectedFarmerName = selectedFarmerId === "all" ? t("reports.allFarmers") : getFarmerName(selectedFarmerId);

  const handlePrint = () => {
    const L = printLang;
    const isRTL = L !== "en";
    const dirAttr = isRTL ? 'dir="rtl"' : '';
    const fontFamily = isRTL ? "'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', Arial, sans-serif" : "'Segoe UI', Arial, sans-serif";
    const textAlign = isRTL ? "right" : "left";
    const textAlignOpp = isRTL ? "left" : "right";

    let html = "";

    reportFarmerIds.forEach((farmerId, idx) => {
      const { expenses, sales, payments, loans, totalFarmerExpenses, totalLandlordExpenses, totalExpenses, totalSales, totalPayments, totalLoans, initialBalance, balanceOwed, netProfit } = calcSections(farmerId);
      const farmer = getFarmer(farmerId);
      if (!farmer) return;
      const fs = farmerSeasons.find(f => f.farmer_id === farmerId);
      const seasonName = selectedSeason?.name ?? "—";
      const stmtNo = `${new Date().getFullYear()}/${String(idx + 1).padStart(3, "0")}`;
      const totalNetWeight = sales.reduce((s, e) => s + (e.net_weight ?? 0), 0);
      const totalPayable = initialBalance + totalFarmerExpenses + totalLandlordExpenses;
      const refundOrDue = totalPayments - totalPayable;

      if (idx > 0) html += `<div style="page-break-before:always"></div>`;

      // Header
      html += `<div class="header-block">
        <h1>${pt("print.title", L)}</h1>
        <div class="header-sub">
          <span class="season-label">${pt("print.cropSeason", L)}: ${seasonName}</span>
          <span class="stmt-no">${pt("print.statementNo", L)}: ${stmtNo}</span>
        </div>
      </div>`;

      // Farmer & Landlord Info
      html += `<div class="info-row">
        <div class="info-col">
          <div class="info-label">${pt("print.farmer", L)}:</div>
          <div class="info-value">${farmer.name}</div>
          ${farmer.phone ? `<div class="info-detail">${pt("common.phone", L)}: ${farmer.phone}</div>` : ""}
          ${farmer.address ? `<div class="info-detail">${pt("print.village", L)}: ${farmer.address}</div>` : ""}
        </div>
        <div class="info-col">
          <div class="info-label">${pt("print.landlord", L)}:</div>
          <div class="info-value">${pt("print.landlordName", L)}</div>
        </div>
      </div>`;

      // Green info bar
      html += `<div class="info-bar">
        ${pt("print.cropSeason", L)}: ${seasonName} &nbsp;|&nbsp; ${pt("print.profitSharing", L)}: 50% ${pt("print.farmer", L)} / 50% ${pt("print.landlord", L)}
      </div>`;

      // Section 1: Expenses
      html += `<div class="section-title">1. ${pt("print.expensesDetails", L)}</div>`;
      if (expenses.length > 0) {
        html += `<table class="bill-table"><thead><tr>
          <th>${pt("common.date", L)}</th>
          <th>${pt("ledger.category", L)}</th>
          <th>${pt("common.description", L)}</th>
          <th class="num">${pt("print.farmerShare", L)} (₨)</th>
          <th class="num">${pt("print.landlordShare", L)} (₨)</th>
          <th class="num">${pt("common.total", L)}</th>
          <th class="num">${pt("common.total", L)} (₨)</th>
        </tr></thead><tbody>`;
        expenses.forEach((e) => {
          const isLandlordOnly = e.payment_method === "landlord_only";
          const fShare = isLandlordOnly ? 0 : (e.is_shared ? (e.shared_amount ?? e.amount / 2) : e.amount);
          const lShare = isLandlordOnly ? e.amount : (e.is_shared ? (e.amount - (e.shared_amount ?? e.amount / 2)) : 0);
          html += `<tr>
            <td>${e.entry_date ?? "—"}</td>
            <td>${e.category ?? "—"}</td>
            <td>${e.description || "—"}</td>
            <td class="num">${fShare > 0 ? fmtNum(fShare) : "—"}</td>
            <td class="num">${lShare > 0 ? fmtNum(lShare) : "—"}</td>
            <td class="num">${fmtNum(e.amount)}</td>
            <td class="num">${fmtNum(e.amount)}</td>
          </tr>`;
        });
        html += `</tbody><tfoot><tr>
          <td colspan="3"><strong>${pt("print.totalExpenses", L)}:</strong></td>
          <td class="num"><strong>${fmtNum(totalFarmerExpenses)}</strong></td>
          <td class="num"><strong>${fmtNum(totalLandlordExpenses)}</strong></td>
          <td class="num"><strong>${fmtNum(totalExpenses)}</strong></td>
          <td class="num total-highlight">₨ ${fmtNum(totalFarmerExpenses + totalLandlordExpenses)}</td>
        </tr></tfoot></table>`;
      } else { html += `<p class="no-data">${pt("print.noExpenses", L)}</p>`; }

      // Section 2: Sales
      html += `<div class="section-title">2. ${pt("print.salesSummaryTitle", L)}</div>`;
      if (sales.length > 0) {
        html += `<table class="bill-table"><thead><tr>
          <th>${pt("common.date", L)}</th>
          <th>${pt("print.crop", L)}</th>
          <th class="num">${pt("print.grossWt", L)}</th>
          <th class="num">${pt("print.deductionsKg", L)}</th>
          <th class="num">${pt("print.netWt", L)}</th>
          <th class="num">${pt("print.ratePerKg", L)}</th>
        </tr></thead><tbody>`;
        sales.forEach((e) => {
          html += `<tr>
            <td>${e.entry_date ?? "—"}</td>
            <td>${e.crop_type || e.description || "—"}</td>
            <td class="num">${e.gross_weight != null ? fmtNum(e.gross_weight) + " kg" : "—"}</td>
            <td class="num">${e.deductions != null ? fmtNum(e.deductions) + " kg" : "—"}</td>
            <td class="num">${e.net_weight != null ? fmtNum(e.net_weight) + " kg" : "—"}</td>
            <td class="num">₨ ${e.rate != null ? fmtNum(e.rate) + "/kg" : "—"}</td>
          </tr>`;
        });
        html += `</tbody></table>`;
        html += `<div class="total-line">${pt("print.totalSalesLabel", L)}: ₨ ${fmtNum(totalSales)}</div>`;
      } else { html += `<p class="no-data">${pt("print.noSales", L)}</p>`; }

      // Section 3: Payments
      html += `<div class="section-title">3. ${pt("print.paymentsReceivedTitle", L)}</div>`;
      if (payments.length > 0) {
        html += `<table class="bill-table"><thead><tr>
          <th>${pt("common.date", L)}</th>
          <th>${pt("print.method", L)}</th>
          <th>${pt("print.details", L)}</th>
          <th class="num">${pt("common.amount", L)} (₨)</th>
        </tr></thead><tbody>`;
        payments.forEach((e) => {
          const details = e.payment_method === "crop_return" && e.crop_type ? `${e.crop_type} ${e.crop_weight ?? ""}kg @ ₨${e.rate ?? ""}/kg` : "—";
          html += `<tr>
            <td>${e.entry_date ?? "—"}</td>
            <td>${e.payment_method === "crop_return" ? pt("ledger.cropReturn", L) : pt("print.cash", L)}</td>
            <td>${details}</td>
            <td class="num">${fmtNum(e.amount)}</td>
          </tr>`;
        });
        html += `</tbody></table>`;
        html += `<div class="total-line">${pt("print.totalReceived", L)}: ₨ ${fmtNum(totalPayments)}</div>`;
      } else { html += `<p class="no-data">${pt("print.noPayments", L)}</p>`; }

      // Section 4: Loans
      html += `<div class="section-title">4. ${pt("print.loansToFarmer", L)}</div>`;
      if (loans.length > 0) {
        html += `<table class="bill-table"><thead><tr>
          <th>${pt("common.date", L)}</th>
          <th>${pt("common.description", L)}</th>
          <th class="num">${pt("common.amount", L)}</th>
          <th class="num">${pt("common.total", L)}</th>
        </tr></thead><tbody>`;
        loans.forEach((e) => {
          html += `<tr>
            <td>${e.entry_date ?? "—"}</td>
            <td>${e.description || "—"}</td>
            <td class="num">${fmtNum(e.amount)}</td>
            <td class="num">${fmtNum(e.amount)}</td>
          </tr>`;
        });
        html += `</tbody></table>`;
        html += `<div class="total-line">${pt("print.totalLoans", L)}: ₨ ${fmtNum(totalLoans)}</div>`;
      } else { html += `<p class="no-data">${pt("print.noLoans", L)}</p>`; }

      // Section 5 & 6: Profit/Loss + Final Account Summary side by side
      html += `<div class="bottom-grid">
        <div class="bottom-box">
          <div class="box-title">5. ${pt("print.profitLossSummary", L)}</div>
          <div class="summary-row"><span>${pt("print.totalSalesIncome", L)}:</span><span>₨ ${fmtNum(totalSales)}</span></div>
          <div class="summary-row"><span>+ ${pt("print.farmerShare", L)}:</span><span>− ${fmtNum(totalFarmerExpenses)}</span></div>
          <div class="summary-row"><span>+ ${pt("print.landlordShare", L)}:</span><span>− ${fmtNum(totalLandlordExpenses)}</span></div>
          <div class="summary-row bold-row"><span>${netProfit >= 0 ? pt("print.netProfit", L) : pt("print.netLoss", L)}:</span><span>₨ ${fmtNum(Math.abs(netProfit))}</span></div>
        </div>
        <div class="bottom-box">
          <div class="box-title">6. ${pt("print.finalAccountSummary", L)}</div>
          <div class="summary-row"><span>${pt("print.openingBalance", L)}</span><span>₨ ${fmtNum(initialBalance)}</span></div>
          <div class="summary-row"><span>+ ${pt("print.farmerShare", L)}</span><span>− ${fmtNum(totalFarmerExpenses)}</span></div>
          <div class="summary-row"><span>+ ${pt("print.landlordShare", L)}</span><span>− ${fmtNum(totalLandlordExpenses)}</span></div>
          <div class="summary-row"><span>− ${pt("print.totalPayableLabel", L)}:</span><span>₨ ${fmtNum(totalPayable)}</span></div>
          <div class="summary-row highlight-row ${refundOrDue >= 0 ? 'refund' : 'due'}">
            <span>${refundOrDue >= 0 ? pt("print.refundDueToFarmer", L) : pt("print.balanceStillDue", L)}:</span>
            <span>₨ ${fmtNum(Math.abs(refundOrDue))}</span>
          </div>
        </div>
      </div>`;

      // Date & Signatures
      html += `<div class="date-line">${pt("common.date", L)}: ${new Date().toLocaleDateString("en-PK", { day: "2-digit", month: "2-digit", year: "numeric" })}</div>`;
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

      html += `</div>`; // close farmer block wrapper (opened implicitly)
    });

    if (reportFarmerIds.length === 0) {
      html += `<p style="text-align:center;color:#666;font-size:13px">${pt("print.noData", L)}</p>`;
    }

    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    const rtlFont = "'Noto Naskh Arabic', 'Scheherazade New', 'Tahoma', Arial, sans-serif";
    const finalFont = isRTL ? rtlFont : "'Inter', 'Segoe UI', Arial, sans-serif";
    win.document.write(`<!DOCTYPE html><html ${dirAttr}><head><title>${pt("print.title", L)}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    ${isRTL ? '<link href="https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet"><link href="https://fonts.googleapis.com/css2?family=Scheherazade+New:wght@400;700&display=swap" rel="stylesheet">' : ''}
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
        font-size: ${isRTL ? '16px' : '13px'};
        font-weight: 700;
        color: #1e3a5f;
        margin: 18px 0 6px;
        padding: 6px 10px;
        background: #edf2f7;
        border-${isRTL ? 'right' : 'left'}: 4px solid #2c5f8a;
        border-radius: 2px;
      }

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
        font-size: ${isRTL ? '13px' : '11px'};
        padding: 4px 0;
        border-bottom: 1px dotted #dce3ea;
      }
      .summary-row span:last-child { font-family: 'Inter', 'Tahoma', monospace; }
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

      @media print { body { padding: 0; } }
      @page { margin: 10mm; size: A4; }
    </style></head><body>${html}<div class="footer-note">— ${pt("print.title", L)} —</div></body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Page Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-6 sm:p-8 text-primary-foreground shadow-xl shadow-primary/20">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-primary-foreground/5 -translate-y-1/2 translate-x-1/4 blur-2xl" />
        <div className="absolute bottom-0 left-1/3 w-32 h-32 rounded-full bg-primary-foreground/10 translate-y-1/2 blur-xl" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="hidden sm:flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-foreground/15 backdrop-blur-md border border-primary-foreground/10">
            <FileText className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight">{t("reports.title")}</h1>
            <p className="text-primary-foreground/70 text-sm mt-0.5">{t("reports.subtitle")}</p>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden shadow-lg border-border/50">
        <div className="h-1 bg-gradient-to-r from-primary to-primary/70" />
        <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />{t("reports.generateReport")}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>{t("ledger.farmer")}</Label>
              <Select value={selectedFarmerId} onValueChange={setSelectedFarmerId}>
                <SelectTrigger><SelectValue placeholder={t("ledger.selectFarmer")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("reports.allFarmers")}</SelectItem>
                  {farmers.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("reports.monthOptional")}</Label>
              <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
            </div>
            <div className="space-y-2">
              <Label>{t("reports.printLanguage")}</Label>
              <Select value={printLang} onValueChange={(v) => setPrintLang(v as Language)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="sd">سندھی (Sindhi)</SelectItem>
                  <SelectItem value="ur">اردو (Urdu)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 flex items-end gap-2">
              <Button onClick={generateReport} disabled={loading} className="flex-1">
                {loading ? t("common.loading") : t("reports.generateReport")}
              </Button>
              {reportReady && (
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />{t("reports.printPdf")}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {reportReady && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-4">{t("reports.preview")}</p>
            <div className="border border-border rounded-md overflow-hidden">
              <div className="bg-muted/30 px-4 py-2 text-xs text-muted-foreground flex justify-between">
                <span>{t("reports.reportFor")}: {selectedFarmerName}</span>
                <span>{t("reports.generated")}: {new Date().toLocaleDateString("en-PK")}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {reportReady && reportFarmerIds.length > 0 && (
        <div className="space-y-4">
          {reportFarmerIds.map((farmerId) => {
            const { totalFarmerExpenses, totalLandlordExpenses, totalSales, totalPayments, totalLoans, balanceOwed, netProfit } = calcSections(farmerId);
            return (
              <Card key={farmerId}>
                <CardHeader><CardTitle className="text-base">{getFarmerName(farmerId)}</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                    <div><p className="text-muted-foreground">{t("reports.farmerExpenses")}</p><p className="font-mono font-medium">{fmt(totalFarmerExpenses)}</p></div>
                    <div><p className="text-muted-foreground">{t("reports.landlordExpenses")}</p><p className="font-mono font-medium">{fmt(totalLandlordExpenses)}</p></div>
                    <div><p className="text-muted-foreground">{t("reports.totalSales")}</p><p className="font-mono font-medium">{fmt(totalSales)}</p></div>
                    <div><p className="text-muted-foreground">{t("reports.personalLoans")}</p><p className="font-mono font-medium">{fmt(totalLoans)}</p></div>
                    <div><p className="text-muted-foreground">{t("reports.paymentsReceived")}</p><p className="font-mono font-medium">{fmt(totalPayments)}</p></div>
                    <div><p className="text-muted-foreground">{t("reports.balanceDue")}</p><p className={`font-mono font-medium ${balanceOwed > 0 ? "text-destructive" : "text-primary"}`}>{balanceOwed <= 0 ? t("reports.settled") : fmt(Math.abs(balanceOwed))}</p></div>
                    <div><p className="text-muted-foreground">{t("reports.netProfitLoss")}</p><p className={`font-mono font-medium ${netProfit >= 0 ? "text-primary" : "text-destructive"}`}>{fmt(Math.abs(netProfit))}</p></div>
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
