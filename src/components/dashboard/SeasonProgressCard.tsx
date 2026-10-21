import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from "date-fns";

interface Props {
  seasonName?: string | null;
  status?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  progress: number;
  daysLeft: number;
}

const fmt = (d?: string | null) => (d ? format(new Date(d), "dd MMM yyyy") : "—");

const SeasonProgressCard = ({ seasonName, status, startDate, endDate, progress, daysLeft }: Props) => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <section aria-label={t("dashboard.seasonProgress")} className="flex flex-col rounded-lg border border-border bg-card p-4 sm:p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-foreground">{t("dashboard.seasonProgress")}</h2>

      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-base font-semibold text-foreground">{seasonName || t("seasons.noActiveSeason")}</p>
        {status && (
          <span
            className={
              status === "active"
                ? "rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700"
                : "rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground"
            }
          >
            {status === "active" ? t("seasons.active") : t("seasons.closedStatus")}
          </span>
        )}
      </div>

      <p className="mt-3 text-3xl font-bold tracking-tight text-foreground font-mono">
        <bdi>{Math.round(progress)}<span className="text-lg">%</span></bdi>
      </p>
      <p className="text-xs text-muted-foreground">{t("dashboard.seasonProgress")}</p>
      <Progress value={progress} className="mt-2 h-2" aria-label="Season completion" />

      <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <div>
          <dt className="text-muted-foreground">{t("seasons.startDate")}</dt>
          <dd className="mt-0.5 font-semibold text-foreground">{fmt(startDate)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("seasons.endDate")}</dt>
          <dd className="mt-0.5 font-semibold text-foreground">{fmt(endDate)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("dashboard.daysLeft")}</dt>
          <dd className="mt-0.5 font-semibold text-foreground font-mono"><bdi>{daysLeft}</bdi></dd>
        </div>
      </dl>

      <Button variant="outline" className="mt-4 min-h-11 w-full" onClick={() => navigate("/seasons")}>
        {t("dashboard.seasonDetails")}
      </Button>
    </section>
  );
};

export default SeasonProgressCard;
