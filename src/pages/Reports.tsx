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
    const fontFamily = isRTL ? "'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', Arial, sans-serif" : "Arial, sans-serif";
    const textAlign = isRTL ? "right" : "left";

    let html = "";

    // Header
    html += `<div class="report-header"><h1>${pt("print.title", L)}</h1>`;
    html += `<p>${selectedFarmerName}${filterMonth ? ` — ${new Date(filterMonth + "-01").toLocaleString("en-PK", { month: "long", year: "numeric" })}` : ""}</p>`;
    html += `<p>${pt("print.dateGenerated", L)}: ${new Date().toLocaleDateString("en-PK", { day: "2-digit", month: "long", year: "numeric" })}</p></div>`;

    reportFarmerIds.forEach((farmerId) => {
      const { expenses, sales, payments, loans, totalFarmerExpenses, totalLandlordExpenses, totalExpenses, totalSales, totalPayments, totalLoans, initialBalance, balanceOwed, netProfit } = calcSections(farmerId);
      const farmer = getFarmer(farmerId);
      if (!farmer) return;

      html += `<div class="farmer-block">`;
      if (selectedFarmerId === "all") {
        html += `<div class="farmer-name">${farmer.name}${farmer.phone ? ` | ${farmer.phone}` : ""}${farmer.address ? ` | ${farmer.address}` : ""}</div>`;
      }

      // Section 1: Expenses
      html += `<div class="section-title">${pt("print.expensesBreakdown", L)}</div>`;
      if (expenses.length > 0) {
        html += `<table class="print-table"><thead><tr><th>${pt("common.date", L)}</th><th>${pt("ledger.category", L)}</th><th>${pt("common.description", L)}</th><th class="text-right">${pt("print.farmerShare", L)} (₨)</th><th class="text-right">${pt("print.landlordShare", L)} (₨)</th><th class="text-right">${pt("common.total", L)} (₨)</th></tr></thead><tbody>`;
        expenses.forEach((e) => {
          const isLandlordOnly = e.payment_method === "landlord_only";
          const fs = isLandlordOnly ? 0 : (e.is_shared ? (e.shared_amount ?? e.amount / 2) : e.amount);
          const ls = isLandlordOnly ? e.amount : (e.is_shared ? (e.amount - (e.shared_amount ?? e.amount / 2)) : 0);
          html += `<tr><td>${e.entry_date ?? "—"}</td><td>${e.category ?? "—"}</td><td>${e.description || "—"}</td><td class="text-right">${fs > 0 ? fmtNum(fs) : "—"}</td><td class="text-right">${ls > 0 ? fmtNum(ls) : "—"}</td><td class="text-right">${fmtNum(e.amount)}</td></tr>`;
        });
        html += `</tbody><tfoot><tr><td colspan="3"><strong>${pt("common.total", L)}</strong></td><td class="text-right"><strong>${fmtNum(totalFarmerExpenses)}</strong></td><td class="text-right"><strong>${fmtNum(totalLandlordExpenses)}</strong></td><td class="text-right"><strong>${fmtNum(totalExpenses)}</strong></td></tr></tfoot></table>`;
      } else { html += `<p style="font-size:11px;color:#666">${pt("print.noExpenses", L)}</p>`; }

      // Section 2: Sales
      html += `<div class="section-title">${pt("print.salesSummary", L)}</div>`;
      if (sales.length > 0) {
        html += `<table class="print-table"><thead><tr><th>${pt("common.date", L)}</th><th>${pt("common.description", L)}</th><th class="text-right">${pt("print.grossWt", L)}</th><th class="text-right">${pt("print.deductionsKg", L)}</th><th class="text-right">${pt("print.netWt", L)}</th><th class="text-right">${pt("print.ratePerKg", L)}</th><th class="text-right">${pt("common.total", L)} (₨)</th></tr></thead><tbody>`;
        sales.forEach((e) => {
          html += `<tr><td>${e.entry_date ?? "—"}</td><td>${e.description || "—"}</td><td class="text-right">${e.gross_weight != null ? fmtNum(e.gross_weight) : "—"}</td><td class="text-right">${e.deductions != null ? fmtNum(e.deductions) : "—"}</td><td class="text-right">${e.net_weight != null ? fmtNum(e.net_weight) : "—"}</td><td class="text-right">${e.rate != null ? fmtNum(e.rate) : "—"}</td><td class="text-right">${fmtNum(e.amount)}</td></tr>`;
        });
        html += `</tbody><tfoot><tr><td colspan="4"><strong>${pt("common.total", L)}</strong></td><td class="text-right"><strong>${fmtNum(sales.reduce((s, e) => s + (e.net_weight ?? 0), 0))} kg</strong></td><td></td><td class="text-right"><strong>${fmtNum(totalSales)}</strong></td></tr></tfoot></table>`;
      } else { html += `<p style="font-size:11px;color:#666">${pt("print.noSales", L)}</p>`; }

      // Section 3: Payments
      html += `<div class="section-title">${pt("print.paymentsReceived", L)}</div>`;
      if (payments.length > 0) {
        html += `<table class="print-table"><thead><tr><th>${pt("common.date", L)}</th><th>${pt("print.method", L)}</th><th>${pt("print.details", L)}</th><th class="text-right">${pt("common.amount", L)} (₨)</th></tr></thead><tbody>`;
        payments.forEach((e) => {
          const details = e.payment_method === "crop_return" && e.crop_type ? `${e.crop_type} ${e.crop_weight ?? ""}kg @ ₨${e.rate ?? ""}/kg` : "—";
          html += `<tr><td>${e.entry_date ?? "—"}</td><td>${e.payment_method === "crop_return" ? pt("ledger.cropReturn", L) : pt("print.cash", L)}</td><td>${details}</td><td class="text-right">${fmtNum(e.amount)}</td></tr>`;
        });
        html += `</tbody><tfoot><tr><td colspan="3"><strong>${pt("print.totalReceived", L)}</strong></td><td class="text-right"><strong>${fmtNum(totalPayments)}</strong></td></tr></tfoot></table>`;
      } else { html += `<p style="font-size:11px;color:#666">${pt("print.noPayments", L)}</p>`; }

      // Section 4: Loans
      html += `<div class="section-title">${pt("print.personalLoans", L)}</div>`;
      if (loans.length > 0) {
        html += `<table class="print-table"><thead><tr><th>${pt("common.date", L)}</th><th>${pt("common.description", L)}</th><th class="text-right">${pt("common.amount", L)} (₨)</th></tr></thead><tbody>`;
        loans.forEach((e) => {
          html += `<tr><td>${e.entry_date ?? "—"}</td><td>${e.description || "—"}</td><td class="text-right">${fmtNum(e.amount)}</td></tr>`;
        });
        html += `</tbody><tfoot><tr><td colspan="2"><strong>${pt("print.totalLoans", L)}</strong></td><td class="text-right"><strong>${fmtNum(totalLoans)}</strong></td></tr></tfoot></table>`;
      } else { html += `<p style="font-size:11px;color:#666">${pt("print.noLoans", L)}</p>`; }

      // Section 5 & 6: Summary
      html += `<div class="summary-grid">`;
      html += `<div class="summary-box"><h3>${pt("print.accountSummary", L)}</h3>`;
      html += `<div class="summary-row"><span>${pt("print.openingBalance", L)}</span><span>${fmtNum(initialBalance)}</span></div>`;
      html += `<div class="summary-row"><span>${pt("print.farmerExpenseShare", L)}</span><span>${fmtNum(totalFarmerExpenses)}</span></div>`;
      html += `<div class="summary-row"><span>${pt("print.personalLoansFromLandlord", L)}</span><span>${fmtNum(totalLoans)}</span></div>`;
      html += `<div class="summary-row" style="border-top:1px solid #ccc;margin-top:4px;padding-top:4px;font-weight:700"><span>${pt("print.totalAmountOwed", L)}</span><span>${fmtNum(initialBalance + totalFarmerExpenses + totalLoans)}</span></div>`;
      html += `<div class="summary-row"><span>${pt("print.minusPayments", L)}</span><span>(${fmtNum(totalPayments)})</span></div>`;
      html += `<div class="summary-total ${balanceOwed > 0 ? "loss" : "profit"}"><span>${pt("print.balanceStillDue", L)}</span><span>${balanceOwed <= 0 ? pt("reports.settled", L) : fmt(Math.abs(balanceOwed))}</span></div>`;
      html += `</div>`;

      html += `<div class="summary-box"><h3>${pt("print.profitLoss", L)}</h3>`;
      html += `<div class="summary-row"><span>${pt("print.totalSalesIncome", L)}</span><span>${fmtNum(totalSales)}</span></div>`;
      html += `<div class="summary-row"><span>${pt("print.minusFarmerShare", L)}</span><span>(${fmtNum(totalFarmerExpenses)})</span></div>`;
      html += `<div class="summary-row"><span>${pt("print.minusLandlordShare", L)}</span><span>(${fmtNum(totalLandlordExpenses)})</span></div>`;
      html += `<div class="summary-total ${netProfit >= 0 ? "profit" : "loss"}"><span>${netProfit >= 0 ? pt("print.netProfit", L) : pt("print.netLoss", L)}</span><span>${fmt(Math.abs(netProfit))}</span></div>`;
      html += `</div></div>`;

      if (selectedFarmerId === "all") html += `<div style="border-top:1px dashed #999;margin-top:24px"></div>`;
      html += `</div>`;
    });

    if (reportFarmerIds.length === 0) {
      html += `<p style="text-align:center;color:#666;font-size:13px">${pt("print.noData", L)}</p>`;
    }

    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html ${dirAttr}><head><title>${pt("print.title", L)}</title>
    ${isRTL ? '<link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu&display=swap" rel="stylesheet">' : ''}
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: ${fontFamily}; font-size: 11px; color: #000; background: white; padding: 10mm; direction: ${isRTL ? 'rtl' : 'ltr'}; }
      .print-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 11px; }
      .print-table th { background: #f0f0f0; padding: 6px 8px; text-align: ${textAlign}; border: 1px solid #ccc; font-weight: 700; }
      .print-table td { padding: 5px 8px; border: 1px solid #ccc; }
      .print-table tfoot td { background: #e8e8e8; font-weight: 700; }
      .print-table tr:nth-child(even) td { background: #fafafa; }
      .section-title { font-size: 13px; font-weight: 700; margin: 12px 0 4px; border-bottom: 2px solid #333; padding-bottom: 3px; }
      .report-header { text-align: center; margin-bottom: 12px; border-bottom: 2px solid #000; padding-bottom: 8px; }
      .report-header h1 { font-size: 20px; margin: 0 0 4px; }
      .report-header p { font-size: 11px; margin: 2px 0; color: #444; }
      .farmer-block { margin-bottom: 20px; }
      .farmer-name { font-size: 14px; font-weight: 700; background: #222; color: #fff; padding: 5px 10px; margin-bottom: 8px; }
      .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px; }
      .summary-box { border: 1px solid #ccc; padding: 8px; }
      .summary-box h3 { font-size: 12px; font-weight: 700; margin: 0 0 6px; border-bottom: 1px solid #ccc; padding-bottom: 3px; }
      .summary-row { display: flex; justify-content: space-between; font-size: 11px; padding: 2px 0; }
      .summary-total { display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; padding: 4px 0 0; border-top: 1px solid #000; margin-top: 3px; }
      .profit { color: #166534; }
      .loss { color: #991b1b; }
      .text-right { text-align: ${isRTL ? 'left' : 'right'}; }
      @media print { body { padding: 0; } }
      @page { margin: 12mm; size: A4; }
    </style></head><body>${html}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Page Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-chart-1 via-chart-1/90 to-chart-3/80 p-6 sm:p-8 text-primary-foreground shadow-xl shadow-chart-1/20">
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
        <div className="h-1 bg-gradient-to-r from-chart-1 to-chart-3" />
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
