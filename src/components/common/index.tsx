import * as React from "react";
import { Loader2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";

/* ---------------- PageHero ---------------- */
export const PageHero = ({
  title,
  subtitle,
  icon: Icon,
  actions,
  className,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  className?: string;
}) => (
  <section
    className={cn(
      "rounded-lg border border-border bg-secondary/60 px-4 py-4 sm:px-6 sm:py-5",
      className
    )}
  >
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        {Icon && (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="truncate font-serif text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            {title}
          </h1>
          {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  </section>
);

/* ---------------- StatCard ---------------- */
export const StatCard = ({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: LucideIcon;
  tone?: "primary" | "positive" | "warning" | "danger" | "neutral";
  className?: string;
}) => {
  const tones: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    positive: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    danger: "bg-destructive/10 text-destructive",
    neutral: "bg-muted text-muted-foreground",
  };
  return (
    <article
      className={cn(
        "rounded-lg border border-border bg-card p-4 shadow-sm transition-shadow duration-150 hover:shadow-md",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {Icon && (
          <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md", tones[tone])}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
      </div>
      <p className="mt-2 font-serif text-xl font-semibold tabular-nums tracking-tight text-foreground sm:text-2xl">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </article>
  );
};

/* ---------------- SectionCard ---------------- */
export const SectionCard = ({
  title,
  description,
  icon: Icon,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) => (
  <section className={cn("rounded-lg border border-border bg-card shadow-sm", className)}>
    {(title || action) && (
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          {Icon && <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
          <div className="min-w-0">
            {title && <h2 className="truncate font-serif text-sm font-semibold text-foreground sm:text-base">{title}</h2>}
            {description && <p className="truncate text-xs text-muted-foreground">{description}</p>}
          </div>
        </div>
        {action}
      </header>
    )}
    <div className={cn("p-4 sm:p-5", bodyClassName)}>{children}</div>
  </section>
);

/* ---------------- StatusBadge ---------------- */
export type BadgeTone = "success" | "warning" | "danger" | "info" | "neutral";

export const StatusBadge = ({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}) => {
  const tones: Record<BadgeTone, string> = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    danger: "border-destructive/30 bg-destructive/10 text-destructive",
    info: "border-sky-200 bg-sky-50 text-sky-700",
    neutral: "border-border bg-muted text-muted-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
};

/* ---------------- ActionButton ---------------- */
export const ActionButton = React.forwardRef<
  HTMLButtonElement,
  ButtonProps & { icon?: LucideIcon; loading?: boolean }
>(({ icon: Icon, loading, children, className, disabled, ...props }, ref) => (
  <Button
    ref={ref}
    disabled={disabled || loading}
    className={cn("h-10 rounded-md px-4 text-sm font-semibold", className)}
    {...props}
  >
    {loading ? (
      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
    ) : (
      Icon && <Icon className="mr-2 h-4 w-4" aria-hidden="true" />
    )}
    {children}
  </Button>
));
ActionButton.displayName = "ActionButton";

/* ---------------- EmptyState ---------------- */
export const EmptyState = ({
  title,
  description,
  icon: Icon,
  action,
  className,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-secondary/40 px-4 py-10 text-center",
      className
    )}
  >
    {Icon && (
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
    )}
    <p className="font-serif text-sm font-semibold text-foreground">{title}</p>
    {description && <p className="max-w-sm text-xs text-muted-foreground">{description}</p>}
    {action && <div className="mt-2">{action}</div>}
  </div>
);

/* ---------------- LoadingState ---------------- */
export const LoadingState = ({ label = "Loading…", className }: { label?: string; className?: string }) => (
  <div className={cn("flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground", className)}>
    <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
    {label}
  </div>
);

/* ---------------- DataTable ---------------- */
export interface DataColumn<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
  hideOnMobile?: boolean;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  empty,
  className,
}: {
  columns: DataColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  empty?: React.ReactNode;
  className?: string;
}) {
  if (!rows.length) return <>{empty ?? <EmptyState title="No records yet" />}</>;

  return (
    <div className={cn("w-full", className)}>
      {/* Desktop / tablet table */}
      <div className="hidden w-full overflow-hidden rounded-lg border border-border md:block">
        <table className="w-full table-fixed text-sm">
          <thead className="bg-secondary/60">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn("px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground", c.className)}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={rowKey(row, i)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "border-t border-border align-middle",
                  onRowClick && "cursor-pointer hover:bg-secondary/50"
                )}
              >
                {columns.map((c) => (
                  <td key={c.key} className={cn("truncate px-3 py-2.5 text-foreground", c.className)}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile labeled rows */}
      <div className="grid gap-2 md:hidden">
        {rows.map((row, i) => (
          <div
            key={rowKey(row, i)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={cn(
              "rounded-lg border border-border bg-card p-3 shadow-sm",
              onRowClick && "active:bg-secondary/60"
            )}
          >
            {columns
              .filter((c) => !c.hideOnMobile)
              .map((c) => (
                <div key={c.key} className="flex items-start justify-between gap-3 py-1">
                  <span className="text-xs font-medium text-muted-foreground">{c.header}</span>
                  <span className="min-w-0 text-right text-sm text-foreground">{c.render(row)}</span>
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
