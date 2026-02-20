import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, FileText } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Farmer = Tables<"farmers">;
type LedgerEntry = Tables<"ledger_entries">;

const fmt = (n: number) => `₨ ${n.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtNum = (n: number) => n.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const Reports = () => {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [selectedFarmerId, setSelectedFarmerId] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("");
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [reportReady, setReportReady] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from("farmers").select("*").order("name").then(({ data }) => {
      if (data) setFarmers(data);
    });
  }, []);

  const generateReport = async () => {
    setLoading(true);
    setReportReady(false);
    let query = supabase.from("ledger_entries").select("*").order("entry_date", { ascending: true });
    if (selectedFarmerId !== "all") {
      query = query.eq("farmer_id", selectedFarmerId);
    }
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

  const handlePrint = () => {
    const printContent = document.getElementById("print-area")?.innerHTML;
    if (!printContent) return;
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Agricultural Statement</title><style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; font-size: 11px; color: #000; background: white; padding: 15mm; }
      .print-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 11px; }
      .print-table th { background: #f0f0f0; padding: 6px 8px; text-align: left; border: 1px solid #ccc; font-weight: 700; }
      .print-table td { padding: 5px 8px; border: 1px solid #ccc; }
      .print-table tfoot td { background: #e8e8e8; font-weight: 700; }
      .print-table tr:nth-child(even) td { background: #fafafa; }
      .section-title { font-size: 13px; font-weight: 700; margin: 16px 0 6px; border-bottom: 2px solid #333; padding-bottom: 4px; }
      .report-header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 12px; }
      .report-header h1 { font-size: 22px; margin: 0 0 4px; }
      .report-header p { font-size: 12px; margin: 2px 0; color: #444; }
      .farmer-block { page-break-inside: avoid; margin-bottom: 32px; }
      .farmer-name { font-size: 16px; font-weight: 700; background: #222; color: #fff; padding: 6px 12px; margin-bottom: 10px; }
      .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 10px; }
      .summary-box { border: 1px solid #ccc; padding: 10px; }
      .summary-box h3 { font-size: 12px; font-weight: 700; margin: 0 0 8px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
      .summary-row { display: flex; justify-content: space-between; font-size: 11px; padding: 3px 0; }
      .summary-total { display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; padding: 5px 0 0; border-top: 1px solid #000; margin-top: 4px; }
      .profit { color: #166534; }
      .loss { color: #991b1b; }
      .text-right { text-align: right; }
      @page { margin: 15mm; size: A4; }
    </style></head><body>${printContent}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  // Get farmers included in the report
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
      if (e.is_shared) return sum + (e.shared_amount ?? e.amount / 2);
      return sum + e.amount;
    }, 0);
    const totalLandlordExpenses = expenses.reduce((sum, e) => {
      if (e.is_shared) return sum + (e.amount - (e.shared_amount ?? e.amount / 2));
      return sum;
    }, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalSales = sales.reduce((sum, e) => sum + e.amount, 0);
    const totalPayments = payments.reduce((sum, e) => sum + e.amount, 0);
    const totalLoans = loans.reduce((sum, e) => sum + e.amount, 0);
    const farmer = getFarmer(farmerId);
    const initialBalance = Number(farmer?.initial_balance ?? 0);
    const balanceOwed = initialBalance + totalFarmerExpenses + totalLoans - totalPayments;
    const netProfit = totalSales - totalFarmerExpenses - totalLandlordExpenses;

    return { expenses, sales, payments, loans, totalFarmerExpenses, totalLandlordExpenses, totalExpenses, totalSales, totalPayments, totalLoans, initialBalance, balanceOwed, netProfit };
  };

  const selectedFarmerName = selectedFarmerId === "all" ? "All Farmers" : getFarmerName(selectedFarmerId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-foreground">Reports</h1>
        <p className="text-muted-foreground">Generate professional bills and statements</p>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Generate Report</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Farmer</Label>
              <Select value={selectedFarmerId} onValueChange={setSelectedFarmerId}>
                <SelectTrigger><SelectValue placeholder="Select farmer" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Farmers</SelectItem>
                  {farmers.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Month (optional)</Label>
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <div className="space-y-2 flex items-end gap-2">
              <Button onClick={generateReport} disabled={loading} className="flex-1">
                {loading ? "Loading..." : "Generate Report"}
              </Button>
              {reportReady && (
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />Print / PDF
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Screen preview */}
      {reportReady && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-4">Preview — click "Print / PDF" to save or print.</p>
            <div className="border border-border rounded-md overflow-hidden">
              <div className="bg-muted/30 px-4 py-2 text-xs text-muted-foreground flex justify-between">
                <span>Report for: {selectedFarmerName}</span>
                <span>Generated: {new Date().toLocaleDateString("en-PK")}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PRINT AREA — off-screen on screen, visible on print via CSS visibility */}
      <div
        id="print-area"
        ref={printRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '210mm',
          visibility: 'hidden',
          pointerEvents: 'none',
          zIndex: -1,
          padding: '20mm',
          boxSizing: 'border-box',
          fontFamily: 'Arial, sans-serif',
          color: '#000',
          background: 'white',
        }}
      >
        <style>{`
          .print-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 11px; }
          .print-table th { background: #f0f0f0; padding: 6px 8px; text-align: left; border: 1px solid #ccc; font-weight: 700; }
          .print-table td { padding: 5px 8px; border: 1px solid #ccc; }
          .print-table tfoot td { background: #e8e8e8; font-weight: 700; }
          .print-table tr:nth-child(even) td { background: #fafafa; }
          .section-title { font-size: 13px; font-weight: 700; margin: 16px 0 6px; border-bottom: 2px solid #333; padding-bottom: 4px; }
          .report-header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 12px; }
          .report-header h1 { font-size: 22px; margin: 0 0 4px; }
          .report-header p { font-size: 12px; margin: 2px 0; color: #444; }
          .farmer-block { page-break-inside: avoid; margin-bottom: 32px; }
          .farmer-name { font-size: 16px; font-weight: 700; background: #222; color: #fff; padding: 6px 12px; margin-bottom: 10px; }
          .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 10px; }
          .summary-box { border: 1px solid #ccc; padding: 10px; }
          .summary-box h3 { font-size: 12px; font-weight: 700; margin: 0 0 8px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
          .summary-row { display: flex; justify-content: space-between; font-size: 11px; padding: 3px 0; }
          .summary-total { display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; padding: 5px 0 0; border-top: 1px solid #000; margin-top: 4px; }
          .profit { color: #166534; }
          .loss { color: #991b1b; }
          .text-right { text-align: right; }
          @page { margin: 15mm; size: A4; }
        `}</style>

        {/* Report Header */}
        <div className="report-header">
          <h1>Agricultural Account Statement</h1>
          <p>{selectedFarmerName}{filterMonth ? ` — ${new Date(filterMonth + "-01").toLocaleString("en-PK", { month: "long", year: "numeric" })}` : ""}</p>
          <p>Date Generated: {new Date().toLocaleDateString("en-PK", { day: "2-digit", month: "long", year: "numeric" })}</p>
        </div>

        {reportFarmerIds.map((farmerId) => {
          const { expenses, sales, payments, loans, totalFarmerExpenses, totalLandlordExpenses, totalExpenses, totalSales, totalPayments, totalLoans, initialBalance, balanceOwed, netProfit } = calcSections(farmerId);
          const farmer = getFarmer(farmerId);
          if (!farmer) return null;

          return (
            <div key={farmerId} className="farmer-block">
              {selectedFarmerId === "all" && (
                <div className="farmer-name">{farmer.name}{farmer.phone ? ` | ${farmer.phone}` : ""}{farmer.address ? ` | ${farmer.address}` : ""}</div>
              )}

              {/* Section 1: Expenses */}
              <div className="section-title">1. Expenses Breakdown</div>
              {expenses.length > 0 ? (
                <table className="print-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Category</th>
                      <th>Description</th>
                      <th className="text-right">Farmer Share (₨)</th>
                      <th className="text-right">Landlord Share (₨)</th>
                      <th className="text-right">Total (₨)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((e) => {
                      const farmerShare = e.is_shared ? (e.shared_amount ?? e.amount / 2) : e.amount;
                      const landlordShare = e.is_shared ? (e.amount - (e.shared_amount ?? e.amount / 2)) : 0;
                      return (
                        <tr key={e.id}>
                          <td>{e.entry_date ?? "—"}</td>
                          <td>{e.category ?? "—"}</td>
                          <td>{e.description || "—"}</td>
                          <td className="text-right">{fmtNum(farmerShare)}</td>
                          <td className="text-right">{landlordShare > 0 ? fmtNum(landlordShare) : "—"}</td>
                          <td className="text-right">{fmtNum(e.amount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3}><strong>Total</strong></td>
                      <td className="text-right"><strong>{fmtNum(totalFarmerExpenses)}</strong></td>
                      <td className="text-right"><strong>{fmtNum(totalLandlordExpenses)}</strong></td>
                      <td className="text-right"><strong>{fmtNum(totalExpenses)}</strong></td>
                    </tr>
                  </tfoot>
                </table>
              ) : <p style={{ fontSize: "11px", color: "#666" }}>No expense entries.</p>}

              {/* Section 2: Sales */}
              <div className="section-title">2. Sales Summary</div>
              {sales.length > 0 ? (
                <table className="print-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th className="text-right">Gross Wt (kg)</th>
                      <th className="text-right">Deductions (kg)</th>
                      <th className="text-right">Net Wt (kg)</th>
                      <th className="text-right">Rate (₨/kg)</th>
                      <th className="text-right">Total (₨)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((e) => (
                      <tr key={e.id}>
                        <td>{e.entry_date ?? "—"}</td>
                        <td>{e.description || "—"}</td>
                        <td className="text-right">{e.gross_weight != null ? fmtNum(e.gross_weight) : "—"}</td>
                        <td className="text-right">{e.deductions != null ? fmtNum(e.deductions) : "—"}</td>
                        <td className="text-right">{e.net_weight != null ? fmtNum(e.net_weight) : "—"}</td>
                        <td className="text-right">{e.rate != null ? fmtNum(e.rate) : "—"}</td>
                        <td className="text-right">{fmtNum(e.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={4}><strong>Total</strong></td>
                      <td className="text-right"><strong>{fmtNum(sales.reduce((s, e) => s + (e.net_weight ?? 0), 0))} kg</strong></td>
                      <td></td>
                      <td className="text-right"><strong>{fmtNum(totalSales)}</strong></td>
                    </tr>
                  </tfoot>
                </table>
              ) : <p style={{ fontSize: "11px", color: "#666" }}>No sale entries.</p>}

              {/* Section 3: Payments */}
              <div className="section-title">3. Payments Received from Farmer</div>
              {payments.length > 0 ? (
                <table className="print-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Method</th>
                      <th>Details</th>
                      <th className="text-right">Amount (₨)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((e) => {
                      const details = e.payment_method === "crop_return" && e.crop_type
                        ? `${e.crop_type} ${e.crop_weight ?? ""}kg @ ₨${e.rate ?? ""}/kg`
                        : "—";
                      return (
                        <tr key={e.id}>
                          <td>{e.entry_date ?? "—"}</td>
                          <td>{e.payment_method === "crop_return" ? "Crop Return" : "Cash"}</td>
                          <td>{details}</td>
                          <td className="text-right">{fmtNum(e.amount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3}><strong>Total Received</strong></td>
                      <td className="text-right"><strong>{fmtNum(totalPayments)}</strong></td>
                    </tr>
                  </tfoot>
                </table>
              ) : <p style={{ fontSize: "11px", color: "#666" }}>No payment entries.</p>}

              {/* Section 4: Personal Loans */}
              <div className="section-title">4. Personal Loans from Landlord</div>
              {loans.length > 0 ? (
                <table className="print-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th className="text-right">Amount (₨)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loans.map((e) => (
                      <tr key={e.id}>
                        <td>{e.entry_date ?? "—"}</td>
                        <td>{e.description || "—"}</td>
                        <td className="text-right">{fmtNum(e.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={2}><strong>Total Loans</strong></td>
                      <td className="text-right"><strong>{fmtNum(totalLoans)}</strong></td>
                    </tr>
                  </tfoot>
                </table>
              ) : <p style={{ fontSize: "11px", color: "#666" }}>No loan entries.</p>}

              {/* Section 5 & 6: Account Summary + Profit/Loss */}
              <div className="summary-grid">
                {/* Account Summary */}
                <div className="summary-box">
                  <h3>5. Account Summary</h3>
                  <div className="summary-row"><span>Opening Balance (Previous Due)</span><span>{fmtNum(initialBalance)}</span></div>
                  <div className="summary-row"><span>+ Farmer's Expense Share</span><span>{fmtNum(totalFarmerExpenses)}</span></div>
                  <div className="summary-row"><span>+ Personal Loans from Landlord</span><span>{fmtNum(totalLoans)}</span></div>
                  <div className="summary-row" style={{ borderTop: "1px solid #ccc", marginTop: "4px", paddingTop: "4px", fontWeight: 700 }}>
                    <span>= Total Amount Owed</span><span>{fmtNum(initialBalance + totalFarmerExpenses + totalLoans)}</span>
                  </div>
                  <div className="summary-row"><span>− Payments Received</span><span>({fmtNum(totalPayments)})</span></div>
                  <div className={`summary-total ${balanceOwed > 0 ? "loss" : "profit"}`}>
                    <span>= Balance Still Due</span>
                    <span>{balanceOwed <= 0 ? "Settled ✓" : fmt(Math.abs(balanceOwed))}</span>
                  </div>
                </div>

                {/* Profit / Loss */}
                <div className="summary-box">
                  <h3>6. Profit / Loss (Landlord)</h3>
                  <div className="summary-row"><span>Total Sales Income</span><span>{fmtNum(totalSales)}</span></div>
                  <div className="summary-row"><span>− Farmer's Expense Share</span><span>({fmtNum(totalFarmerExpenses)})</span></div>
                  <div className="summary-row"><span>− Landlord's Expense Share</span><span>({fmtNum(totalLandlordExpenses)})</span></div>
                  <div className={`summary-total ${netProfit >= 0 ? "profit" : "loss"}`}>
                    <span>{netProfit >= 0 ? "Net Profit" : "Net Loss"}</span>
                    <span>{fmt(Math.abs(netProfit))}</span>
                  </div>
                </div>
              </div>

              {selectedFarmerId === "all" && <div style={{ borderTop: "1px dashed #999", marginTop: "24px" }} />}
            </div>
          );
        })}

        {reportFarmerIds.length === 0 && (
          <p style={{ textAlign: "center", color: "#666", fontSize: "13px" }}>No data found for the selected filters.</p>
        )}
      </div>

      {/* Screen summary cards when report is ready */}
      {reportReady && reportFarmerIds.length > 0 && (
        <div className="space-y-4">
          {reportFarmerIds.map((farmerId) => {
            const { totalFarmerExpenses, totalLandlordExpenses, totalSales, totalPayments, totalLoans, balanceOwed, netProfit } = calcSections(farmerId);
            return (
              <Card key={farmerId}>
                <CardHeader>
                  <CardTitle className="text-base">{getFarmerName(farmerId)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Farmer Expenses</p>
                      <p className="font-mono font-medium">{fmt(totalFarmerExpenses)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Landlord Expenses</p>
                      <p className="font-mono font-medium">{fmt(totalLandlordExpenses)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Sales</p>
                      <p className="font-mono font-medium">{fmt(totalSales)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Personal Loans</p>
                      <p className="font-mono font-medium">{fmt(totalLoans)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Payments Received</p>
                      <p className="font-mono font-medium">{fmt(totalPayments)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Balance Due</p>
                      <p className={`font-mono font-medium ${balanceOwed > 0 ? "text-destructive" : "text-green-700"}`}>
                        {balanceOwed <= 0 ? "Settled ✓" : fmt(Math.abs(balanceOwed))}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Net Profit/Loss</p>
                      <p className={`font-mono font-medium ${netProfit >= 0 ? "text-green-700" : "text-destructive"}`}>{fmt(Math.abs(netProfit))}</p>
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
