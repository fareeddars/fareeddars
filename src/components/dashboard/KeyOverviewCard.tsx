import { LucideIcon, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

export interface OverviewItem {
  label: string;
  sublabel: string;
  value: string;
  trend: number;
  icon: LucideIcon;
  tone: "emerald" | "rose" | "sky" | "amber";
}

const tones = {
  emerald: "bg-emerald-100 text-emerald-700",
  rose: "bg-rose-100 text-rose-700",
  sky: "bg-sky-100 text-sky-700",
  amber: "bg-amber-100 text-amber-700",
};

const KeyOverviewCard = ({ items }: { items: OverviewItem[] }) => {
  const { t } = useLanguage();
  return (
    <section aria-label={t("dashboard.keyOverview")} className="rounded-lg border border-border bg-secondary/40 p-4 sm:p-5">
      <h2 className="mb-3 text-sm font-semibold text-foreground">{t("dashboard.keyOverview")}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <article
            key={item.label}
            className="rounded-lg border border-border bg-card p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
          >
            <div className="flex items-start gap-2.5">
              <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", tones[item.tone])}>
                <item.icon className="h-4.5 w-4.5 h-[18px] w-[18px]" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium leading-tight text-foreground">{item.label}</p>
                <p className="text-[11px] text-muted-foreground">{item.sublabel}</p>
              </div>
            </div>
            <p className="mt-3 text-xl font-bold tracking-tight text-foreground tabular-nums">
              <bdi>{item.value}</bdi>
            </p>
          <span
            className={cn(
              "mt-1 inline-flex items-center gap-1 text-xs font-semibold",
              item.trend >= 0 ? "text-emerald-700" : "text-destructive"
            )}
          >
            {item.trend >= 0 ? <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" /> : <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />}
            {Math.abs(item.trend).toFixed(0)}%
          </span>
        </article>
      ))}
      </div>
    </section>
  );
};

export default KeyOverviewCard;
