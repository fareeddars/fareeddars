import { motion } from "framer-motion";
import { LucideIcon, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

/** Animated number counter */
export const Counter = ({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) => {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);

  useEffect(() => {
    const from = prev.current;
    const to = Number.isFinite(value) ? value : 0;
    prev.current = to;
    const duration = 600;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (to - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return (
    <span>
      {prefix}
      {display.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
};

type Tone = "emerald" | "red" | "blue" | "violet" | "orange" | "cyan";

const toneMap: Record<Tone, { icon: string; text: string; ring: string }> = {
  emerald: { icon: "bg-emerald-600", text: "text-emerald-700", ring: "ring-emerald-100" },
  red: { icon: "bg-red-500", text: "text-red-600", ring: "ring-red-100" },
  blue: { icon: "bg-blue-600", text: "text-blue-700", ring: "ring-blue-100" },
  violet: { icon: "bg-violet-600", text: "text-violet-700", ring: "ring-violet-100" },
  orange: { icon: "bg-orange-500", text: "text-orange-600", ring: "ring-orange-100" },
  cyan: { icon: "bg-cyan-600", text: "text-cyan-700", ring: "ring-cyan-100" },
};

/** Reusable KPI card */
export const StatCard = ({
  label,
  value,
  icon: Icon,
  tone = "emerald",
  trend,
  hint,
  prefix,
  suffix,
  decimals,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: Tone;
  trend?: number | null;
  hint?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) => {
  const t = toneMap[tone];
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="rounded-[20px] border border-slate-200 bg-white p-4 sm:p-5 shadow-sm hover:shadow-lg transition-shadow"
    >
      <div className="flex items-center gap-3">
        <div className={cn("h-10 w-10 sm:h-11 sm:w-11 shrink-0 rounded-2xl flex items-center justify-center text-white ring-4", t.icon, t.ring)}>
          <Icon className="h-5 w-5" />
        </div>
        <p className="text-[13px] sm:text-sm font-medium text-slate-600 leading-tight">{label}</p>
      </div>
      <div className={cn("mt-3 text-xl sm:text-2xl font-bold tracking-tight tabular-nums", t.text)}>
        <Counter value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
      </div>
      {typeof trend === "number" && (
        <div
          className={cn(
            "mt-1 inline-flex items-center gap-1 text-xs font-semibold",
            trend >= 0 ? "text-emerald-600" : "text-red-500"
          )}
        >
          {trend >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          {Math.abs(trend).toFixed(1)}%
        </div>
      )}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </motion.div>
  );
};

/** Reusable section shell */
export const SectionCard = ({
  title,
  icon: Icon,
  action,
  children,
  className,
}: {
  title: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) => (
  <motion.section
    variants={fadeUp}
    className={cn(
      "rounded-[20px] border border-slate-200 bg-white p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow",
      className
    )}
  >
    <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-base sm:text-lg font-semibold text-slate-900">
        {Icon && <Icon className="h-5 w-5 text-emerald-700" />}
        {title}
      </h2>
      {action}
    </header>
    {children}
  </motion.section>
);

export const StatusBadge = ({ status }: { status: "Excellent" | "Good" | "Average" | "Poor" }) => {
  const map = {
    Excellent: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Good: "bg-emerald-50/70 text-emerald-600 border-emerald-100",
    Average: "bg-orange-50 text-orange-600 border-orange-200",
    Poor: "bg-red-50 text-red-600 border-red-200",
  } as const;
  return (
    <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold", map[status])}>
      {status}
    </span>
  );
};

export const EmptyState = ({ message }: { message: string }) => (
  <div className="flex h-[180px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 text-sm text-slate-500">
    {message}
  </div>
);
