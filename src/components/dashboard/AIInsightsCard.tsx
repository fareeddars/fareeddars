import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

export interface Insight {
  title: string;
  description: string;
  icon: LucideIcon;
  tone: "emerald" | "sky" | "amber" | "violet";
}

const tones = {
  emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
  sky: "bg-sky-50 border-sky-200 text-sky-700",
  amber: "bg-amber-50 border-amber-200 text-amber-700",
  violet: "bg-violet-50 border-violet-200 text-violet-700",
};

const AIInsightsCard = ({ insights }: { insights: Insight[] }) => {
  const { t } = useLanguage();
  return (
    <section aria-label={t("dashboard.aiInsights")} className="flex flex-col rounded-lg border border-border bg-card p-4 sm:p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-foreground text-start">{t("dashboard.aiInsights")}</h2>
      {insights.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t("dashboard.noInsights")}</p>
      ) : (
        <ul className="space-y-2">
          {insights.map((i) => (
            <li key={i.title} className={cn("flex items-start gap-3 rounded-xl border p-3", tones[i.tone])}>
              <i.icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div className="min-w-0 text-start">
                <p className="text-sm font-semibold">{i.title}</p>
                <p className="text-xs text-foreground/70">{i.description}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default AIInsightsCard;

