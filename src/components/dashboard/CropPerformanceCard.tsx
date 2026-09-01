import { Leaf, Sprout } from "lucide-react";
import { CropRow, LedgerTotals, money, qty, withUnit } from "@/lib/ledger/aggregate";

interface Props {
  totals: LedgerTotals;
  crops: CropRow[];
  avgYield: { value: number; samples: number } | null;
  seasonName?: string;
}

const Metric = ({ label, value, tone = "" }: { label: string; value: string; tone?: string }) => (
  <div className="rounded-xl border border-border bg-card p-3">
    <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
    <p className={`mt-1 text-base font-bold tabular-nums ${tone || "text-foreground"}`}>{value}</p>
  </div>
);

/** Season / crop production + sales figures — all derived from saved sale transactions. */
const CropPerformanceCard = ({ totals, crops, avgYield, seasonName }: Props) => (
  <section aria-label="Crop and sales performance" className="rounded-2xl border border-border bg-secondary/40 p-4 sm:p-5">
    <div className="mb-3 flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
        <Sprout className="h-4 w-4" aria-hidden="true" />
      </span>
      <div>
        <h2 className="text-sm font-semibold text-foreground">Production &amp; Sales</h2>
        <p className="text-[11px] text-muted-foreground">{seasonName ? `${seasonName} — ` : ""}from saved sale transactions</p>
      </div>
    </div>

    {totals.salesCount === 0 ? (
      <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
        No sales recorded
      </p>
    ) : (
      <>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Metric label="Total Sale (Gross)" value={money(totals.grossSales)} />
          <Metric label="Net Sale" value={money(totals.netSales)} tone="text-emerald-700" />
          <Metric label="Received" value={totals.saleReceived > 0 ? money(totals.saleReceived) : "Not paid"} />
          <Metric label="Outstanding (Sales)" value={money(totals.saleOutstanding)} tone="text-rose-600" />
          <Metric label="Profit" value={money(totals.netProfit)} tone={totals.netProfit >= 0 ? "text-emerald-700" : "text-rose-600"} />
          <Metric label="Quantity Sold" value={withUnit(totals.totalQuantitySold, totals.weightUnitLabel)} />
          <Metric label="Total Yield" value={withUnit(totals.totalYieldDisplay, totals.weightUnitLabel)} />
          <Metric label="Total Area" value={withUnit(totals.totalAreaAcres, totals.areaUnitLabel)} />
          <Metric
            label="Yield / Acre"
            value={totals.yieldPerAcre != null ? `${qty(totals.yieldPerAcre)} ${totals.weightUnitLabel}/Acre` : "Not enough historical data"}
          />
          <Metric
            label="Profit / Acre"
            value={totals.profitPerAcre != null ? money(totals.profitPerAcre) : "—"}
          />
        </div>

        <p className="mt-2 text-[11px] text-muted-foreground">
          Average yield:{" "}
          {avgYield ? `${qty(avgYield.value)} ${totals.weightUnitLabel}/Acre (${avgYield.samples} sales)` : "Not enough historical data"}
        </p>

        <div className="mt-3 space-y-2">
          {crops.slice(0, 5).map((c) => (
            <div key={c.crop} className="rounded-xl border border-border bg-card p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Leaf className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" /> {c.crop}
                </span>
                <span className="text-sm font-bold tabular-nums text-emerald-700">{money(c.netSales)}</span>
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground sm:grid-cols-4">
                <div><dt className="inline">Yield: </dt><dd className="inline font-medium text-foreground">{withUnit(c.yieldDisplay, totals.weightUnitLabel)}</dd></div>
                <div><dt className="inline">Yield/Acre: </dt><dd className="inline font-medium text-foreground">{c.yieldPerAcre != null ? `${qty(c.yieldPerAcre)} ${totals.weightUnitLabel}` : "—"}</dd></div>
                <div><dt className="inline">Received: </dt><dd className="inline font-medium text-foreground">{c.received > 0 ? money(c.received) : "Not paid"}</dd></div>
                <div><dt className="inline">Outstanding: </dt><dd className="inline font-medium text-foreground">{money(c.outstanding)}</dd></div>
              </dl>
            </div>
          ))}
        </div>
      </>
    )}
  </section>
);

export default CropPerformanceCard;
