import { LucideIcon, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  trend?: number | null;
  icon: LucideIcon;
  className?: string;
}

const DashboardStatCard = ({ label, value, hint, trend, icon: Icon, className }: StatCardProps) => (
  <article
    className={cn(
      "group rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm transition-all duration-300",
      "hover:-translate-y-1 hover:shadow-lg focus-within:-translate-y-1",
      className
    )}
  >
    <div className="flex items-start justify-between gap-3">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
    </div>
    <p className="mt-3 text-2xl sm:text-[28px] font-bold tracking-tight text-foreground tabular-nums">{value}</p>
    <div className="mt-1.5 flex flex-wrap items-center gap-2">
      {typeof trend === "number" && Number.isFinite(trend) && (
        <span
          className={cn(
            "inline-flex items-center gap-1 text-xs font-semibold",
            trend >= 0 ? "text-emerald-700" : "text-destructive"
          )}
        >
          {trend >= 0 ? <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" /> : <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />}
          {Math.abs(trend).toFixed(0)}%
        </span>
      )}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  </article>
);

export default DashboardStatCard;
