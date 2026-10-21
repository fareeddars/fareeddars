import { Store } from "lucide-react";
import { BuyerRow, money } from "@/lib/ledger/aggregate";
import { useLanguage } from "@/contexts/LanguageContext";

/** Shopkeeper / mill outstanding — derived from saved sales. */
const BuyerOutstandingCard = ({ rows }: { rows: BuyerRow[] }) => {
  const { t } = useLanguage();
  const total = rows.reduce((s, r) => s + r.outstanding, 0);
  return (
    <section aria-label={t("dashboard.shopkeeperMillOutstanding")} className="rounded-lg border border-border bg-card p-4 sm:p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
            <Store className="h-4 w-4" aria-hidden="true" />
          </span>
          <h2 className="text-sm font-semibold text-foreground text-start">{t("dashboard.shopkeeperMillOutstanding")}</h2>
        </div>
        <span className="text-sm font-bold tabular-nums text-rose-600 dark:text-rose-400">
          <bdi>{money(total)}</bdi>
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t("dashboard.noSalesRecorded")}</p>
      ) : (
        <ul className="space-y-2">
          {rows.slice(0, 6).map((r) => (
            <li key={r.buyer} className="rounded-xl border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-foreground">{r.buyer}</span>
                <span className="text-sm font-bold tabular-nums text-rose-600 dark:text-rose-400">
                  <bdi>{money(r.outstanding)}</bdi>
                </span>
              </div>
              <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground sm:grid-cols-4 text-start">
                <div><dt className="inline">{t("dashboard.gross")}: </dt><dd className="inline font-medium text-foreground"><bdi>{money(r.grossSales)}</bdi></dd></div>
                <div><dt className="inline">{t("dashboard.costs")}: </dt><dd className="inline font-medium text-foreground"><bdi>{money(r.costs)}</bdi></dd></div>
                <div><dt className="inline">{t("dashboard.net")}: </dt><dd className="inline font-medium text-foreground"><bdi>{money(r.netSales)}</bdi></dd></div>
                <div><dt className="inline">{t("dashboard.paid")}: </dt><dd className="inline font-medium text-foreground"><bdi>{money(r.paid)}</bdi></dd></div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default BuyerOutstandingCard;

