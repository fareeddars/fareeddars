import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSeason } from "@/contexts/SeasonContext";
import { computeTotals } from "@/lib/ledger/aggregate";
import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bot,
  Calculator,
  Calendar,
  DollarSign,
  Download,
  FileSpreadsheet,
  Filter,
  Gauge,
  Leaf,
  PieChart as PieChartIcon,
  Search,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  Wallet,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Counter,
  EmptyState,
  SectionCard,
  StatCard,
  StatusBadge,
  fadeUp,
} from "@/components/pl/PLPrimitives";

interface Entry {
  entry_type: string;
  amount: number;
  category: string | null;
  crop_type: string | null;
  entry_date: string | null;
  created_at?: string | null;
  farmer_id?: string | null;
}

interface ProfitLossData {
  income: number;
  expenses: number;
  entries: Array<{ entry_type: string; amount: number }>;
}

const PALETTE = ["#1F6B3A", "#2563eb", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#84cc16", "#94a3b8"];

const money = (n: number) => `Rs ${Math.round(n).toLocaleString()}`;

const ProfitLoss = () => {
  const { language } = useLanguage();
  const { selectedSeason, seasons, setSelectedSeasonId } = useSeason();
  const [data, setData] = useState<ProfitLossData>({ income: 0, expenses: 0, entries: [] });
  const [rawEntries, setRawEntries] = useState<Entry[]>([]);
  const [farmers, setFarmers] = useState<Array<{ id: string; name: string; address: string | null }>>([]);

  // ---- filters (UI only, applied client-side) ----
  const [pending, setPending] = useState({ crop: "all", farmer: "all", category: "all", village: "all", from: "", to: "" });
  const [applied, setApplied] = useState(pending);
  const [cropSearch, setCropSearch] = useState("");

  const [chartData, setChartData] = useState([
    { name: "Income", value: 0, fill: "#1F6B3A" },
    { name: "Expenses", value: 0, fill: "#ef4444" },
  ]);

  // Language text mapping
  const langText = {
    en: {
      pageTitle: "Profit & Loss Dashboard",
      subtitle: "Simple Financial Overview of Your Farm",
      incomeLabel: "Total Income",
      expenseLabel: "Total Expenses",
      profitLabel: "Net Profit",
      marginLabel: "Profit Margin",
      incomeVsExpenses: "Income vs Expenses",
      profitDistribution: "Expense Breakdown",
      expenseRatio: "Expense Ratio",
      totalTransactions: "Total Transactions",
      businessStatus: "Business Status",
      goodStatus: "Good ✓",
      badStatus: "Poor ✗",
      businessPerformance: "Business Performance",
      totalEntries: "Total Ledger Entries",
      incomePercentage: "% of Income Spent",
    },
    ur: {
      pageTitle: "منافع اور نقصان کا ڈیش بورڈ",
      subtitle: "آپ کے فارم کا آسان مالیاتی جائزہ",
      incomeLabel: "کل آمدنی",
      expenseLabel: "کل اخراجات",
      profitLabel: "خالص منافع",
      marginLabel: "منافع کا تناسب",
      incomeVsExpenses: "آمدنی بمقابلہ اخراجات",
      profitDistribution: "اخراجات کی تقسیم",
      expenseRatio: "اخراج کا تناسب",
      totalTransactions: "کل لین دین",
      businessStatus: "حالت",
      goodStatus: "اچھی ✓",
      badStatus: "خراب ✗",
      businessPerformance: "کاروباری کارکردگی",
      totalEntries: "کل لیجر اندراجات",
      incomePercentage: "آمدنی کا کتنا حصہ خرچ ہوا",
    },
    sd: {
      pageTitle: "منافع ۽ نقصان جو ڊيش بورڊ",
      subtitle: "توهانجي فارم جو آسان مالياتي جائزو",
      incomeLabel: "ڪل آمدني",
      expenseLabel: "ڪل خرچ",
      profitLabel: "خالص منافعو",
      marginLabel: "منافعن جو تناسب",
      incomeVsExpenses: "آمدني بمقابله خرچ",
      profitDistribution: "خرچ جي ورهاڱي",
      expenseRatio: "خرچ جو تناسب",
      totalTransactions: "ڪل ڦيتين",
      businessStatus: "حالت",
      goodStatus: "سٺو ✓",
      badStatus: "خراب ✗",
      businessPerformance: "ڪاروباري ڪارڪردگي",
      totalEntries: "ڪل دفتري اندراجات",
      incomePercentage: "آمدني جو ڪهڙو حصو خرچ ٿيو",
    },
  };

  const currentLang = language === "en" ? "en" : language === "ur" ? "ur" : "sd";
  const labels = langText[currentLang as keyof typeof langText];

  useEffect(() => {
    const fetch = async () => {
      let query = supabase
        .from("ledger_entries")
        .select("*");
      if (selectedSeason) query = query.eq("season_id", selectedSeason.id);
      const { data: entries } = await query;
      if (!entries) return;

      setRawEntries(entries as Entry[]);

      const { data: farmerRows } = await supabase.from("farmers").select("id, name, address");
      if (farmerRows) setFarmers(farmerRows as any);
    };
    fetch();
  }, [selectedSeason?.id]);

  const farmerMap = useMemo(() => {
    const m = new Map<string, { name: string; address: string | null }>();
    farmers.forEach((f) => m.set(f.id, { name: f.name, address: f.address }));
    return m;
  }, [farmers]);

  // ---- client-side filtering (does not change stored data) ----
  const entries = useMemo(() => {
    return rawEntries.filter((e) => {
      if (applied.crop !== "all" && (e.crop_type || "—") !== applied.crop) return false;
      if (applied.farmer !== "all" && e.farmer_id !== applied.farmer) return false;
      if (applied.category !== "all" && (e.category || "—") !== applied.category) return false;
      if (applied.village !== "all") {
        const v = (e.farmer_id && farmerMap.get(e.farmer_id)?.address) || "—";
        if (v !== applied.village) return false;
      }
      const d = e.entry_date || e.created_at;
      if (applied.from && d && d.slice(0, 10) < applied.from) return false;
      if (applied.to && d && d.slice(0, 10) > applied.to) return false;
      return true;
    });
  }, [rawEntries, applied, farmerMap]);

  // ---- core calculations (centralised — src/lib/ledger/aggregate) ----
  useEffect(() => {
    const t = computeTotals(entries as any[]);
    // Gross sale is the revenue; sale-level costs (transport/labour/commission/
    // other) live on the sale row and are NOT separate expense entries, so
    // adding them to expenses here does not double-count.
    const income = t.grossSales;
    const expenses = t.expenses + t.saleCosts;

    setData({ income, expenses, entries: entries as any });
    setChartData([
      { name: language === "en" ? "Income" : language === "ur" ? "آمدنی" : "آمدني", value: income, fill: "#1F6B3A" },
      { name: language === "en" ? "Expenses" : language === "ur" ? "اخراجات" : "خرچ", value: expenses, fill: "#ef4444" },
    ]);

    console.log("[ProfitLoss] sales:", income, "expenses:", expenses, "netProfit:", income - expenses);
  }, [entries, language]);

  const profit = data.income - data.expenses;
  const profitMargin = data.income > 0 ? ((profit / data.income) * 100).toFixed(2) : 0;
  const expenseRatio = data.income > 0 ? ((data.expenses / data.income) * 100).toFixed(2) : 0;
  const profitStatus = profit >= 0 ? "positive" : "negative";

  const payments = useMemo(
    () => entries.filter((e) => e.entry_type === "payment").reduce((s, e) => s + Number(e.amount || 0), 0),
    [entries]
  );
  const loans = useMemo(
    () => entries.filter((e) => e.entry_type === "loan").reduce((s, e) => s + Number(e.amount || 0), 0),
    [entries]
  );
  const cashBalance = data.income + payments - data.expenses - loans;
  const outstanding = Math.max(loans - payments, 0);

  // ---- expense breakdown ----
  const expenseBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    entries
      .filter((e) => e.entry_type === "expense")
      .forEach((e) => map.set(e.category || "Other", (map.get(e.category || "Other") || 0) + Number(e.amount || 0)));
    return Array.from(map, ([name, value], i) => ({ name, value, fill: PALETTE[i % PALETTE.length] })).sort(
      (a, b) => b.value - a.value
    );
  }, [entries]);

  // ---- crop-wise analysis ----
  const cropRows = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    entries.forEach((e) => {
      const crop = e.crop_type || "Uncategorized";
      const cur = map.get(crop) || { income: 0, expense: 0 };
      const amt = Number(e.amount || 0);
      if (e.entry_type === "sale") cur.income += amt;
      else if (e.entry_type === "expense") cur.expense += amt;
      map.set(crop, cur);
    });
    return Array.from(map, ([crop, v]) => {
      const p = v.income - v.expense;
      const roi = v.expense > 0 ? (p / v.expense) * 100 : v.income > 0 ? 100 : 0;
      const status: "Excellent" | "Good" | "Average" | "Poor" =
        roi >= 50 ? "Excellent" : roi >= 25 ? "Good" : roi >= 0 ? "Average" : "Poor";
      return { crop, ...v, profit: p, roi, status };
    }).sort((a, b) => b.profit - a.profit);
  }, [entries]);

  const visibleCropRows = useMemo(
    () => cropRows.filter((r) => r.crop.toLowerCase().includes(cropSearch.toLowerCase())),
    [cropRows, cropSearch]
  );

  // ---- revenue sources ----
  const revenueSources = useMemo(() => {
    const map = new Map<string, number>();
    entries
      .filter((e) => e.entry_type === "sale")
      .forEach((e) => {
        const key = `${e.crop_type || "Other"}`;
        map.set(key, (map.get(key) || 0) + Number(e.amount || 0));
      });
    return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [entries]);

  // ---- monthly + seasonal ----
  const monthly = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    entries.forEach((e) => {
      const d = e.entry_date || e.created_at;
      if (!d) return;
      const key = d.slice(0, 7);
      const cur = map.get(key) || { income: 0, expense: 0 };
      const amt = Number(e.amount || 0);
      if (e.entry_type === "sale") cur.income += amt;
      else if (e.entry_type === "expense") cur.expense += amt;
      map.set(key, cur);
    });
    return Array.from(map, ([month, v]) => ({ month, ...v, profit: v.income - v.expense })).sort((a, b) =>
      a.month.localeCompare(b.month)
    );
  }, [entries]);

  const seasonal = useMemo(() => {
    const acc = { Kharif: { income: 0, expense: 0 }, Rabi: { income: 0, expense: 0 } };
    entries.forEach((e) => {
      const d = e.entry_date || e.created_at;
      if (!d) return;
      const m = Number(d.slice(5, 7));
      const bucket = m >= 4 && m <= 9 ? acc.Kharif : acc.Rabi;
      const amt = Number(e.amount || 0);
      if (e.entry_type === "sale") bucket.income += amt;
      else if (e.entry_type === "expense") bucket.expense += amt;
    });
    return (["Kharif", "Rabi"] as const).map((k) => ({
      season: k,
      income: acc[k].income,
      expense: acc[k].expense,
      profit: acc[k].income - acc[k].expense,
    }));
  }, [entries]);

  const bestMonth = useMemo(() => monthly.slice().sort((a, b) => b.profit - a.profit)[0], [monthly]);
  const bestCrop = cropRows[0];
  const worstCrop = cropRows[cropRows.length - 1];
  const topExpense = expenseBreakdown[0];

  // ---- health score ----
  const healthScore = useMemo(() => {
    const marginScore = Math.max(0, Math.min(50, (Number(profitMargin) / 60) * 50));
    const ratioScore = Math.max(0, Math.min(30, 30 - (Number(expenseRatio) / 100) * 30));
    const activityScore = Math.min(20, entries.length);
    return Math.round(marginScore + ratioScore + activityScore);
  }, [profitMargin, expenseRatio, entries.length]);

  const healthLabel = healthScore >= 80 ? "Excellent" : healthScore >= 60 ? "Good" : healthScore >= 40 ? "Average" : "Poor";

  // ---- AI-style insights (rule based, no backend) ----
  const insights = useMemo(() => {
    const out: string[] = [];
    if (bestCrop && bestCrop.profit > 0) out.push(`${bestCrop.crop} generated the highest profit — ${money(bestCrop.profit)}.`);
    if (topExpense) out.push(`${topExpense.name} is your biggest expense at ${money(topExpense.value)}.`);
    if (Number(expenseRatio) > 70) out.push("Expenses are above 70% of income — look for cost savings.");
    if (worstCrop && worstCrop.profit < 0) out.push(`${worstCrop.crop} is running at a loss. Review its input costs.`);
    if (outstanding > 0) out.push(`${money(outstanding)} is still outstanding from farmers.`);
    if (profit > 0) out.push(`Your farm is profitable with a ${profitMargin}% margin. Keep it up!`);
    return out.slice(0, 5);
  }, [bestCrop, topExpense, expenseRatio, worstCrop, outstanding, profit, profitMargin]);

  // ---- filter option lists ----
  const cropOptions = useMemo(() => Array.from(new Set(rawEntries.map((e) => e.crop_type || "—"))), [rawEntries]);
  const categoryOptions = useMemo(() => Array.from(new Set(rawEntries.map((e) => e.category || "—"))), [rawEntries]);
  const villageOptions = useMemo(() => Array.from(new Set(farmers.map((f) => f.address || "—"))), [farmers]);

  // ---- exports ----
  const exportExcel = () => {
    const rows = [
      ["Crop", "Income", "Expense", "Profit", "ROI %", "Status"],
      ...cropRows.map((r) => [r.crop, r.income, r.expense, r.profit, r.roi.toFixed(1), r.status]),
      [],
      ["Total Income", data.income],
      ["Total Expenses", data.expenses],
      ["Net Profit", profit],
      ["Profit Margin %", profitMargin],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `profit-loss-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    const reset = { crop: "all", farmer: "all", category: "all", village: "all", from: "", to: "" };
    setPending(reset);
    setApplied(reset);
  };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.05 } } }}
      className="space-y-5 sm:space-y-6 bg-[#F8FAFC] -m-2 sm:-m-4 p-2 sm:p-4 md:p-6 min-h-screen"
    >
      {/* ── Hero Banner ───────────────────────────────── */}
      <motion.header
        variants={fadeUp}
        className="relative overflow-hidden rounded-[20px] border border-emerald-900/10 bg-gradient-to-br from-[#124728] via-[#1F6B3A] to-[#2f9457] p-5 sm:p-8 text-white shadow-lg print:hidden"
      >
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute bottom-0 right-6 hidden md:flex items-end gap-1.5 opacity-30">
          {[28, 44, 60, 78, 100].map((h) => (
            <div key={h} className="w-5 rounded-t-md bg-white/70" style={{ height: h }} />
          ))}
          <Leaf className="ml-2 h-16 w-16 text-white/70" />
        </div>

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight">{labels.pageTitle}</h1>
            <p className="mt-1 text-sm sm:text-base text-emerald-50/90">{labels.subtitle}</p>
            {selectedSeason && (
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                <Leaf className="h-3.5 w-3.5" /> {selectedSeason.name}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedSeason?.id ?? ""} onValueChange={(v) => setSelectedSeasonId(v)}>
              <SelectTrigger className="h-10 w-[170px] rounded-xl border-white/25 bg-white/15 text-white backdrop-blur-sm">
                <Calendar className="mr-1.5 h-4 w-4" />
                <SelectValue placeholder="Season" />
              </SelectTrigger>
              <SelectContent>
                {seasons.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="secondary"
              className="h-10 rounded-xl bg-white text-emerald-800 hover:bg-emerald-50"
              onClick={() => window.print()}
            >
              <Download className="mr-2 h-4 w-4" /> Export PDF
            </Button>
            <Button
              variant="secondary"
              className="h-10 rounded-xl bg-white text-emerald-800 hover:bg-emerald-50"
              onClick={exportExcel}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Excel
            </Button>
            <Button
              className="h-10 rounded-xl bg-emerald-900/40 border border-white/25 hover:bg-emerald-900/60"
              onClick={() => document.getElementById("pl-filters")?.scrollIntoView({ behavior: "smooth" })}
            >
              <Filter className="mr-2 h-4 w-4" /> Filters
            </Button>
          </div>
        </div>
      </motion.header>

      {/* ── 1. Financial Summary ──────────────────────── */}
      <motion.div variants={fadeUp} className="space-y-3">
        <h2 className="text-base sm:text-lg font-semibold text-slate-900">1. Financial Summary</h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard label={labels.incomeLabel} value={data.income} prefix="Rs " icon={ArrowUpRight} tone="emerald" />
          <StatCard label={labels.expenseLabel} value={data.expenses} prefix="Rs " icon={ArrowDownRight} tone="red" />
          <StatCard label={labels.profitLabel} value={profit} prefix="Rs " icon={DollarSign} tone={profit >= 0 ? "blue" : "orange"} />
          <StatCard label={labels.marginLabel} value={Number(profitMargin)} suffix="%" decimals={2} icon={Target} tone="violet" />
          <StatCard label="Cash Balance" value={cashBalance} prefix="Rs " icon={Wallet} tone="orange" hint="Available Cash" />
          <StatCard label="Outstanding Payments" value={outstanding} prefix="Rs " icon={TrendingDown} tone="cyan" hint="Pending Receivables" />
        </div>
      </motion.div>

      {/* ── 2. Financial Analytics ────────────────────── */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <SectionCard title={`2. ${labels.incomeVsExpenses}`} icon={BarChart3}>
          <div className="h-[240px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: "rgba(31,107,58,0.06)" }}
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: 12 }}
                  formatter={(value) => money(Number(value))}
                />
                <Legend />
                <Bar dataKey="value" name="Amount" radius={[10, 10, 0, 0]}>
                  {chartData.map((d) => (
                    <Cell key={d.name} fill={d.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title={`3. ${labels.profitDistribution}`} icon={PieChartIcon}>
          {expenseBreakdown.length === 0 ? (
            <EmptyState message="No expenses recorded yet" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 items-center">
              <div className="h-[210px] sm:h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseBreakdown}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={2}
                    >
                      {expenseBreakdown.map((e) => (
                        <Cell key={e.name} fill={e.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => money(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-2">
                {expenseBreakdown.slice(0, 7).map((e) => (
                  <li key={e.name} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: e.fill }} />
                      <span className="truncate text-slate-700">{e.name}</span>
                    </span>
                    <span className="shrink-0 font-semibold text-slate-900 tabular-nums">{money(e.value)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </SectionCard>
      </div>

      {/* ── 3. Crop-wise + 4. Revenue sources ─────────── */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <SectionCard
          title="4. Crop-wise Profit Analysis"
          icon={Leaf}
          action={
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={cropSearch}
                onChange={(e) => setCropSearch(e.target.value)}
                placeholder="Search crop"
                className="h-9 w-40 rounded-xl pl-9 text-sm"
              />
            </div>
          }
        >
          {visibleCropRows.length === 0 ? (
            <EmptyState message="No crop data available" />
          ) : (
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-2 py-2 font-semibold">Crop</th>
                    <th className="px-2 py-2 text-right font-semibold">Income</th>
                    <th className="px-2 py-2 text-right font-semibold">Expense</th>
                    <th className="px-2 py-2 text-right font-semibold">Profit</th>
                    <th className="px-2 py-2 text-right font-semibold">ROI</th>
                    <th className="px-2 py-2 text-right font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleCropRows.map((r) => (
                    <tr key={r.crop} className="transition-colors hover:bg-emerald-50/50">
                      <td className="px-2 py-3 font-medium text-slate-900">{r.crop}</td>
                      <td className="px-2 py-3 text-right tabular-nums text-emerald-700">{money(r.income)}</td>
                      <td className="px-2 py-3 text-right tabular-nums text-red-600">{money(r.expense)}</td>
                      <td className={`px-2 py-3 text-right font-semibold tabular-nums ${r.profit >= 0 ? "text-blue-700" : "text-orange-600"}`}>
                        {money(r.profit)}
                      </td>
                      <td className="px-2 py-3 text-right tabular-nums text-slate-700">{r.roi.toFixed(0)}%</td>
                      <td className="px-2 py-3 text-right">
                        <StatusBadge status={r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <SectionCard title="5. Revenue Sources" icon={TrendingUp}>
          {revenueSources.length === 0 ? (
            <EmptyState message="No sales recorded yet" />
          ) : (
            <div className="h-[260px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueSources} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" width={90} stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => money(Number(value))} contentStyle={{ borderRadius: 12 }} />
                  <Bar dataKey="value" name="Revenue" fill="#1F6B3A" radius={[0, 8, 8, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>
      </div>

      {/* ── 6. KPI Insights ───────────────────────────── */}
      <motion.div variants={fadeUp} className="space-y-3">
        <h2 className="text-base sm:text-lg font-semibold text-slate-900">6. KPI Insights</h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {[
            { label: "Highest Profit Crop", value: bestCrop?.crop ?? "—", sub: bestCrop ? money(bestCrop.profit) : "—", icon: Trophy, color: "text-emerald-700 bg-emerald-50" },
            { label: "Highest Expense Category", value: topExpense?.name ?? "—", sub: topExpense ? money(topExpense.value) : "—", icon: ArrowDownRight, color: "text-red-600 bg-red-50" },
            { label: "Best Month", value: bestMonth?.month ?? "—", sub: bestMonth ? `${money(bestMonth.profit)} profit` : "—", icon: Calendar, color: "text-blue-700 bg-blue-50" },
            { label: "Lowest Performing Crop", value: worstCrop?.crop ?? "—", sub: worstCrop ? money(worstCrop.profit) : "—", icon: TrendingDown, color: "text-orange-600 bg-orange-50" },
          ].map((k) => (
            <motion.div
              key={k.label}
              whileHover={{ y: -4 }}
              className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-lg"
            >
              <div className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${k.color}`}>
                <k.icon className="h-5 w-5" />
              </div>
              <p className="mt-3 text-xs font-medium text-slate-500">{k.label}</p>
              <p className="mt-1 truncate text-lg font-bold text-slate-900">{k.value}</p>
              <p className="text-xs text-slate-500">{k.sub}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── 7. AI Insights ────────────────────────────── */}
      <SectionCard title="7. AI Financial Insights" icon={Sparkles}>
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex shrink-0 items-start justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-700 ring-4 ring-emerald-50">
              <Bot className="h-10 w-10" />
            </div>
          </div>
          <ul className="flex-1 space-y-2">
            {insights.length === 0 && <li className="text-sm text-slate-500">Add some entries to get insights.</li>}
            {insights.map((t) => (
              <li key={t} className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-sm text-slate-700">
                {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-3 text-center text-xs text-slate-400">Insights are generated from your own ledger data.</p>
      </SectionCard>

      {/* ── 8. Health score, 9. ROI, 10. Seasonal ─────── */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        <SectionCard title="8. Business Health Score" icon={Gauge}>
          <div className="flex flex-col items-center py-2">
            <div
              className="relative flex h-40 w-40 items-center justify-center rounded-full"
              style={{
                background: `conic-gradient(#1F6B3A ${healthScore * 3.6}deg, #E2E8F0 0deg)`,
              }}
            >
              <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full bg-white">
                <span className="text-4xl font-bold text-slate-900 tabular-nums">
                  <Counter value={healthScore} />
                </span>
                <span className="text-xs text-slate-500">/100</span>
              </div>
            </div>
            <p className="mt-4 text-lg font-semibold text-emerald-700">{healthLabel}</p>
            <p className="mt-1 text-center text-xs text-slate-500">
              Based on profit margin, expense ratio and activity level.
            </p>
          </div>
        </SectionCard>

        <SectionCard title="9. ROI Calculator" icon={Calculator}>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <p className="text-xs text-slate-500">Total Investment</p>
              <p className="mt-1 text-lg font-bold text-slate-900 tabular-nums">{money(data.expenses)}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <p className="text-xs text-slate-500">Total Profit</p>
              <p className="mt-1 text-lg font-bold text-slate-900 tabular-nums">{money(profit)}</p>
            </div>
          </div>
          <div className="mt-3 rounded-2xl bg-emerald-50 p-4">
            <p className="text-xs font-medium text-emerald-700">ROI (Return on Investment)</p>
            <p className="text-3xl font-bold text-emerald-800 tabular-nums">
              <Counter value={data.expenses > 0 ? (profit / data.expenses) * 100 : 0} suffix="%" decimals={1} />
            </p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl border border-slate-100 p-3">
              <p className="text-xs text-slate-500">{labels.expenseRatio}</p>
              <p className="font-semibold text-slate-900">{expenseRatio}%</p>
            </div>
            <div className="rounded-2xl border border-slate-100 p-3">
              <p className="text-xs text-slate-500">{labels.totalTransactions}</p>
              <p className="font-semibold text-slate-900">{data.entries.length}</p>
            </div>
          </div>
          <p className={`mt-3 rounded-xl px-3 py-2 text-xs font-medium ${profitStatus === "positive" ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"}`}>
            {labels.businessStatus}: {profitStatus === "positive" ? labels.goodStatus : labels.badStatus} — {labels.businessPerformance}
          </p>
        </SectionCard>

        <SectionCard title="10. Seasonal Comparison" icon={BarChart3}>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={seasonal}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="season" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => money(Number(value))} contentStyle={{ borderRadius: 12 }} />
                <Legend />
                <Bar dataKey="income" name="Income" fill="#1F6B3A" radius={[8, 8, 0, 0]} />
                <Bar dataKey="expense" name="Expenses" fill="#ef4444" radius={[8, 8, 0, 0]} />
                <Bar dataKey="profit" name="Profit" fill="#2563eb" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* ── 11. Advanced Filters ──────────────────────── */}
      <SectionCard title="11. Advanced Filters" icon={Filter} className="print:hidden">
        <div id="pl-filters" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <FilterSelect
            label="Crop"
            value={pending.crop}
            onChange={(v) => setPending((p) => ({ ...p, crop: v }))}
            options={cropOptions}
            allLabel="All Crops"
          />
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">Farmer</label>
            <Select value={pending.farmer} onValueChange={(v) => setPending((p) => ({ ...p, farmer: v }))}>
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Farmers</SelectItem>
                {farmers.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <FilterSelect
            label="Category"
            value={pending.category}
            onChange={(v) => setPending((p) => ({ ...p, category: v }))}
            options={categoryOptions}
            allLabel="All Categories"
          />
          <FilterSelect
            label="Village"
            value={pending.village}
            onChange={(v) => setPending((p) => ({ ...p, village: v }))}
            options={villageOptions}
            allLabel="All Villages"
          />
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">From</label>
            <Input
              type="date"
              value={pending.from}
              onChange={(e) => setPending((p) => ({ ...p, from: e.target.value }))}
              className="h-10 rounded-xl"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">To</label>
            <Input
              type="date"
              value={pending.to}
              onChange={(e) => setPending((p) => ({ ...p, to: e.target.value }))}
              className="h-10 rounded-xl"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button className="h-11 rounded-xl bg-[#1F6B3A] px-6 hover:bg-[#175530]" onClick={() => setApplied(pending)}>
            <Filter className="mr-2 h-4 w-4" /> Apply Filters
          </Button>
          <Button variant="outline" className="h-11 rounded-xl px-6" onClick={clearFilters}>
            <X className="mr-2 h-4 w-4" /> Clear Filters
          </Button>
        </div>
      </SectionCard>
    </motion.div>
  );
};

const FilterSelect = ({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  allLabel: string;
}) => (
  <div className="space-y-1">
    <label className="text-xs font-medium text-slate-500">{label}</label>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-10 rounded-xl">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

export default ProfitLoss;
