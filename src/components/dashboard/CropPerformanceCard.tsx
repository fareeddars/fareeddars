import { Leaf, Sprout } from "lucide-react";
import { CropRow, LedgerTotals, money, qty, withUnit } from "@/lib/ledger/aggregate";
import { useLanguage } from "@/contexts/LanguageContext";
import { translateCrop, translateUnit } from "@/i18n/translations";

interface Props {
  totals: LedgerTotals;
  crops: CropRow[];
  avgYield: { value: number; samples: number } | null;
  seasonName?: string;
}

const Metric = ({ label, value, tone = "" }: { label: string; value: string; tone?: string }) => (
  <div className="rounded-xl border border-border bg-card p-3 text-start">
    <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
    <p className={`mt-1 text-base font-bold tabular-nums ${tone || "text-foreground"}`}>
      <bdi>{value}</bdi>
    </p>
  </div>
);

/** Season / crop production + sales figures — all derived from saved sale transactions. */
const CropPerformanceCard = ({ totals, crops, avgYield, seasonName }: Props) => {
  const { t, language } = useLanguage();
  const weightUnit = translateUnit(totals.weightUnitLabel, language);
  const areaUnit = translateUnit(totals.areaUnitLabel, language);

  return (
    <section aria-label={t("dashboard.productionAndSales")} className="rounded-lg border border-border bg-secondary/40 p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
          <Sprout className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="text-start">
          <h2 className="text-sm font-semibold text-foreground">{t("dashboard.productionAndSales")}</h2>
          <p className="text-[11px] text-muted-foreground">{seasonName ? `${seasonName} — ` : ""}{t("dashboard.fromSavedSales")}</p>
        </div>
      </div>

      {totals.salesCount === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
          {t("dashboard.noSalesRecorded")}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Metric label={t("dashboard.totalSaleGross")} value={money(totals.grossSales)} />
            <Metric label={t("dashboard.netSale")} value={money(totals.netSales)} tone="text-emerald-700 dark:text-emerald-400" />
            <Metric label={t("dashboard.received")} value={totals.saleReceived > 0 ? money(totals.saleReceived) : t("dashboard.notPaid")} />
            <Metric label={t("dashboard.outstandingSales")} value={money(totals.saleOutstanding)} tone="text-rose-600 dark:text-rose-400" />
            <Metric label={t("dashboard.profit")} value={money(totals.netProfit)} tone={totals.netProfit >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"} />
            <Metric label={t("dashboard.quantitySold")} value={`${qty(totals.totalQuantitySold)} ${weightUnit}`} />
            <Metric label={t("dashboard.totalYield")} value={`${qty(totals.totalYieldDisplay)} ${weightUnit}`} />
            <Metric label={t("dashboard.totalArea")} value={`${qty(totals.totalAreaAcres)} ${areaUnit}`} />
            <Metric
              label={t("dashboard.yieldPerAcre")}
              value={totals.yieldPerAcre != null ? `${qty(totals.yieldPerAcre)} ${weightUnit} / ${areaUnit}` : t("dashboard.notEnoughData")}
            />
            <Metric
              label={t("dashboard.profitPerAcre")}
              value={totals.profitPerAcre != null ? money(totals.profitPerAcre) : "—"}
            />
          </div>

          <p className="mt-2 text-[11px] text-muted-foreground text-start">
            {t("dashboard.avgYield")}:{" "}
            {avgYield ? `${qty(avgYield.value)} ${weightUnit} / ${areaUnit} (${avgYield.samples} ${t("dashboard.sales")})` : t("dashboard.notEnoughData")}
          </p>

          <div className="mt-3 space-y-2">
            {crops.slice(0, 5).map((c) => (
              <div key={c.crop} className="rounded-xl border border-border bg-card p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <Leaf className="h-3.5 w-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
                    <span>{translateCrop(c.crop, language)}</span>
                  </span>
                  <span className="text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                    <bdi>{money(c.netSales)}</bdi>
                  </span>
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground sm:grid-cols-4 text-start">
                  <div>
                    <dt className="inline">{t("common.total")}: </dt>
                    <dd className="inline font-medium text-foreground"><bdi>{qty(c.yieldDisplay)} {weightUnit}</bdi></dd>
                  </div>
                  <div>
                    <dt className="inline">{t("dashboard.yieldPerAcre")}: </dt>
                    <dd className="inline font-medium text-foreground">{c.yieldPerAcre != null ? <bdi>{qty(c.yieldPerAcre)} {weightUnit}</bdi> : "—"}</dd>
                  </div>
                  <div>
                    <dt className="inline">{t("dashboard.received")}: </dt>
                    <dd className="inline font-medium text-foreground">{c.received > 0 ? <bdi>{money(c.received)}</bdi> : t("dashboard.notPaid")}</dd>
                  </div>
                  <div>
                    <dt className="inline">{t("dashboard.remainingPending")}: </dt>
                    <dd className="inline font-medium text-foreground"><bdi>{money(c.outstanding)}</bdi></dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
};

export default CropPerformanceCard;

