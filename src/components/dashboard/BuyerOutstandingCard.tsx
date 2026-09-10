import { Store } from "lucide-react";
import { BuyerRow, money } from "@/lib/ledger/aggregate";

/** Shopkeeper / mill outstanding — derived from saved sales. */
const BuyerOutstandingCard = ({ rows }: { rows: BuyerRow[] }) => {
  const total = rows.reduce((s, r) => s + r.outstanding, 0);
  return (
    <section aria-label="Buyer outstanding" className="rounded-lg border border-border bg-card p-4 sm:p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <Store className="h-4 w-4" aria-hidden="true" />
          </span>
          <h2 className="text-sm font-semibold text-foreground">Shopkeeper / Mill Outstanding</h2>
        </div>
        <span className="text-sm font-bold tabular-nums text-rose-600">{money(total)}</span>
      </div>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No sales recorded</p>
      ) : (
        <ul className="space-y-2">
          {rows.slice(0, 6).map((r) => (
            <li key={r.buyer} className="rounded-xl border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-foreground">{r.buyer}</span>
                <span className="text-sm font-bold tabular-nums text-rose-600">{money(r.outstanding)}</span>
              </div>
              <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground sm:grid-cols-4">
                <div><dt className="inline">Gross: </dt><dd className="inline font-medium text-foreground">{money(r.grossSales)}</dd></div>
                <div><dt className="inline">Costs: </dt><dd className="inline font-medium text-foreground">{money(r.costs)}</dd></div>
                <div><dt className="inline">Net: </dt><dd className="inline font-medium text-foreground">{money(r.netSales)}</dd></div>
                <div><dt className="inline">Paid: </dt><dd className="inline font-medium text-foreground">{money(r.paid)}</dd></div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default BuyerOutstandingCard;
