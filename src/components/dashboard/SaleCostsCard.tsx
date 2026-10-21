import { Receipt } from "lucide-react";
import { LedgerTotals, money } from "@/lib/ledger/aggregate";
import { useLanguage } from "@/contexts/LanguageContext";

const Row = ({ label, value, tone = "" }: { label: string; value: string; tone?: string }) => (
  <div className="flex items-center justify-between gap-3 border-b border-border/60 py-2 last:border-0 text-start">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className={`text-sm font-semibold tabular-nums ${tone || "text-foreground"}`}>
      <bdi>{value}</bdi>
    </span>
  </div>
);

/** Sale money breakdown — every cost shown separately, from the shared totals. */
const SaleCostsCard = ({ totals }: { totals: LedgerTotals }) => {
  const { t } = useLanguage();
  return (
    <section aria-label={t("dashboard.saleMoneyBreakdown")} className="rounded-lg border border-border bg-card p-4 sm:p-5 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
          <Receipt className="h-4 w-4" aria-hidden="true" />
        </span>
        <h2 className="text-sm font-semibold text-foreground text-start">{t("dashboard.saleMoneyBreakdown")}</h2>
      </div>
      {totals.salesCount === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t("dashboard.noSalesRecorded")}</p>
      ) : (
        <div>
          <Row label={t("dashboard.totalSaleGross")} value={money(totals.grossSales)} />
          <Row label={t("dashboard.transportCost")} value={money(totals.transportCosts)} tone="text-rose-600 dark:text-rose-400" />
          <Row label={t("dashboard.labourCost")} value={money(totals.labourCosts)} tone="text-rose-600 dark:text-rose-400" />
          <Row label={t("dashboard.commission")} value={money(totals.commissionCosts)} tone="text-rose-600 dark:text-rose-400" />
          <Row label={t("dashboard.otherSaleCosts")} value={money(totals.otherSaleCosts)} tone="text-rose-600 dark:text-rose-400" />
          <Row label={t("dashboard.totalSaleCosts")} value={money(totals.saleCosts)} tone="text-rose-600 dark:text-rose-400" />
          <Row label={t("dashboard.netSale")} value={money(totals.netSales)} tone="text-emerald-700 dark:text-emerald-400" />
          <Row label={t("dashboard.amountPaid")} value={money(totals.saleReceived)} />
          <Row label={t("dashboard.remainingPending")} value={money(totals.saleOutstanding)} tone="text-rose-600 dark:text-rose-400" />
        </div>
      )}
    </section>
  );
};

export default SaleCostsCard;

