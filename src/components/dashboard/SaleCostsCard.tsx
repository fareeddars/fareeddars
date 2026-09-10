import { Receipt } from "lucide-react";
import { LedgerTotals, money } from "@/lib/ledger/aggregate";

const Row = ({ label, value, tone = "" }: { label: string; value: string; tone?: string }) => (
  <div className="flex items-center justify-between gap-3 border-b border-border/60 py-2 last:border-0">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className={`text-sm font-semibold tabular-nums ${tone || "text-foreground"}`}>{value}</span>
  </div>
);

/** Sale money breakdown — every cost shown separately, from the shared totals. */
const SaleCostsCard = ({ totals }: { totals: LedgerTotals }) => (
  <section aria-label="Sale cost breakdown" className="rounded-lg border border-border bg-card p-4 sm:p-5 shadow-sm">
    <div className="mb-2 flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
        <Receipt className="h-4 w-4" aria-hidden="true" />
      </span>
      <h2 className="text-sm font-semibold text-foreground">Sale Money Breakdown</h2>
    </div>
    {totals.salesCount === 0 ? (
      <p className="py-8 text-center text-sm text-muted-foreground">No sales recorded</p>
    ) : (
      <div>
        <Row label="Gross Sale" value={money(totals.grossSales)} />
        <Row label="Transport Cost" value={money(totals.transportCosts)} tone="text-rose-600" />
        <Row label="Labour / Loading Cost" value={money(totals.labourCosts)} tone="text-rose-600" />
        <Row label="Commission" value={money(totals.commissionCosts)} tone="text-rose-600" />
        <Row label="Other Sale Costs" value={money(totals.otherSaleCosts)} tone="text-rose-600" />
        <Row label="Total Sale Costs" value={money(totals.saleCosts)} tone="text-rose-600" />
        <Row label="Net Sale" value={money(totals.netSales)} tone="text-emerald-700" />
        <Row label="Amount Paid" value={money(totals.saleReceived)} />
        <Row label="Remaining / Pending" value={money(totals.saleOutstanding)} tone="text-rose-600" />
      </div>
    )}
  </section>
);

export default SaleCostsCard;
