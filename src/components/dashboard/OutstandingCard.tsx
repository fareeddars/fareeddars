import { useNavigate } from "react-router-dom";
import FarmerAvatar from "@/components/FarmerAvatar";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import type { OutstandingRow } from "@/hooks/useDashboardData";

const money = (n: number) => `Rs ${Math.round(n).toLocaleString()}`;

interface OutstandingCardProps {
  rows: OutstandingRow[];
  total?: number;
  buyerOutstanding?: number;
  farmerPayables?: number;
  farmerReceivables?: number;
}

const OutstandingCard = ({
  rows,
  buyerOutstanding,
  farmerPayables = 0,
  farmerReceivables = 0,
}: OutstandingCardProps) => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <section aria-label={t("dashboard.farmerBalances")} className="flex flex-col rounded-lg border border-border bg-card p-4 sm:p-5 shadow-sm">
      <header className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{t("dashboard.farmerBalances")}</h2>
          <p className="text-[11px] text-muted-foreground">{t("dashboard.activeSeasonBalances")}</p>
        </div>
        <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => navigate("/farmers")}>
          {t("dashboard.viewAll")}
        </Button>
      </header>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t("dashboard.allSettled")}</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.slice(0, 5).map((r) => {
            const isCredit = r.amount < 0;
            return (
              <li key={r.farmerId} className="flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-muted/60">
                <FarmerAvatar name={r.name} photoUrl={r.photoUrl} className="h-9 w-9" />
                <div className="min-w-0 flex-1 truncate text-start">
                  <span className="block truncate text-sm font-medium text-foreground">{r.name}</span>
                  <span className="text-[10px] text-muted-foreground">{r.days}d</span>
                </div>
                <div className="text-end">
                  <span className={`block text-sm font-bold tabular-nums ${isCredit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                    <bdi>₨ {Math.round(Math.abs(r.amount)).toLocaleString()}</bdi>
                  </span>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${isCredit ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>
                    {isCredit ? t("dashboard.payable") : t("dashboard.due")}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <footer className="mt-auto space-y-1.5 border-t border-border pt-3 text-xs">
        {farmerPayables > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t("dashboard.farmerPayables")}:</span>
            <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400"><bdi>{money(farmerPayables)}</bdi></span>
          </div>
        )}
        {farmerReceivables > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t("dashboard.farmerReceivables")}:</span>
            <span className="font-bold tabular-nums text-rose-600"><bdi>{money(farmerReceivables)}</bdi></span>
          </div>
        )}
        {buyerOutstanding != null && buyerOutstanding > 0 && (
          <div className="flex items-center justify-between pt-1 border-t border-dashed border-border/60">
            <span className="font-medium text-muted-foreground">{t("dashboard.buyerOutstanding")}:</span>
            <span className="font-bold tabular-nums text-rose-600"><bdi>{money(buyerOutstanding)}</bdi></span>
          </div>
        )}
      </footer>
    </section>
  );
};

export default OutstandingCard;
