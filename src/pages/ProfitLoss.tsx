import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSeason } from "@/contexts/SeasonContext";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight, Leaf, BarChart3, PieChart as PieChartIcon, Target, Zap } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface ProfitLossData {
  income: number;
  expenses: number;
  entries: Array<{ entry_type: string; amount: number }>;
}

const ProfitLoss = () => {
  const { t, language } = useLanguage();
  const { selectedSeason } = useSeason();
  const [data, setData] = useState<ProfitLossData>({ income: 0, expenses: 0, entries: [] });
  const [chartData, setChartData] = useState([
    { name: "Income", value: 0, fill: "#10b981" },
    { name: "Expenses", value: 0, fill: "#ef4444" },
  ]);

  // Language text mapping
  const langText = {
    en: {
      pageTitle: "Profit & Loss Analysis",
      subtitle: "Business Performance & Financial Insights",
      incomeLabel: "Total Income",
      expenseLabel: "Total Expenses",
      profitLabel: "Net Profit",
      marginLabel: "Profit Margin",
      incomeVsExpenses: "Income vs Expenses",
      profitDistribution: "Profit Distribution",
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
      pageTitle: "منافع اور نقصان کا تجزیہ",
      subtitle: "کاروباری کارکردگی اور مالیاتی بصیرتیں",
      incomeLabel: "کل آمدنی",
      expenseLabel: "کل اخراجات",
      profitLabel: "خالص منافع",
      marginLabel: "منافع کا تناسب",
      incomeVsExpenses: "آمدنی بمقابلہ اخراجات",
      profitDistribution: "منافع کی تقسیم",
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
      pageTitle: "منافع ۽ نقصان جو تجزيو",
      subtitle: "ڪاروباري ڪارڪردگي ۽ مالياتي بصيرتون",
      incomeLabel: "ڪل آمدني",
      expenseLabel: "ڪل خرچ",
      profitLabel: "خالص منافعو",
      marginLabel: "منافعن جو تناسب",
      incomeVsExpenses: "آمدني بمقابله خرچ",
      profitDistribution: "منافعن جي ورهاڱي",
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
      let query = supabase.from("ledger_entries").select("entry_type, amount");
      if (selectedSeason) query = query.eq("season_id", selectedSeason.id);
      const { data: entries } = await query;
      if (!entries) return;

      let income = 0, expenses = 0;
      entries.forEach((e) => {
        const amt = Number(e.amount) || 0;
        if (e.entry_type === "sale") income += amt;
        else if (e.entry_type === "expense") expenses += amt;
      });

      setData({ income, expenses, entries });
      setChartData([
        { name: language === "en" ? "Income" : language === "ur" ? "آمدنی" : "آمدني", value: income, fill: "#10b981" },
        { name: language === "en" ? "Expenses" : language === "ur" ? "اخراجات" : "خرچ", value: expenses, fill: "#ef4444" },
      ]);

      console.log("[ProfitLoss] sales:", income, "expenses:", expenses, "netProfit:", income - expenses);
    };
    fetch();
  }, [selectedSeason?.id, language]);

  const profit = data.income - data.expenses;
  const profitMargin = data.income > 0 ? ((profit / data.income) * 100).toFixed(2) : 0;
  const expenseRatio = data.income > 0 ? ((data.expenses / data.income) * 100).toFixed(2) : 0;
  const profitStatus = profit >= 0 ? "positive" : "negative";

  const pieChartData = [
    { name: language === "en" ? "Profit" : language === "ur" ? "منافع" : "منافعو", value: Math.max(profit, 0), fill: "#3b82f6" },
    { name: language === "en" ? "Expenses" : language === "ur" ? "اخراجات" : "خرچ", value: data.expenses, fill: "#ef4444" },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 p-4 sm:p-8 text-white shadow-xl shadow-blue-500/20">
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/4 blur-2xl" />
        <div className="absolute bottom-0 left-1/3 w-40 h-40 rounded-full bg-purple-400/20 translate-y-1/2 blur-xl" />
        <div className="relative z-10 flex items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden sm:flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
              <BarChart3 className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-xl sm:text-4xl font-bold tracking-tight">{labels.pageTitle}</h1>
              <p className="text-blue-100 text-xs sm:text-sm mt-0.5 sm:mt-1 flex flex-wrap items-center gap-1.5 sm:gap-2">
                {labels.subtitle}
                {selectedSeason && (
                  <span className="inline-flex items-center gap-1 bg-white/15 backdrop-blur-sm px-1.5 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium border border-white/20">
                    <Leaf className="h-2.5 w-2.5 sm:h-3 sm:w-3" />{selectedSeason.name}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className={`hidden sm:flex h-16 w-16 items-center justify-center rounded-2xl ${profitStatus === "positive" ? "bg-emerald-500/20 border-emerald-500/30" : "bg-red-500/20 border-red-500/30"} border backdrop-blur-md`}>
            {profitStatus === "positive" ? (
              <TrendingUp className="h-8 w-8 text-emerald-300" />
            ) : (
              <TrendingDown className="h-8 w-8 text-red-300" />
            )}
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
        {/* Income Card */}
        <Card className="group hover:shadow-xl transition-all duration-500 hover:-translate-y-1 overflow-hidden border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-25">
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-start justify-between mb-2 sm:mb-4">
              <div className="flex h-8 w-8 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-500">
                <ArrowUpRight className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-white" />
              </div>
            </div>
            <div className="text-base sm:text-2xl font-extrabold text-emerald-700 font-mono truncate">₨ {data.income.toLocaleString()}</div>
            <p className="text-[10px] sm:text-xs text-emerald-600 mt-0.5 sm:mt-1 font-medium">{labels.incomeLabel}</p>
          </CardContent>
        </Card>

        {/* Expenses Card */}
        <Card className="group hover:shadow-xl transition-all duration-500 hover:-translate-y-1 overflow-hidden border-red-200 bg-gradient-to-br from-red-50 to-red-25">
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-start justify-between mb-2 sm:mb-4">
              <div className="flex h-8 w-8 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-br from-red-500 to-red-600 shadow-lg shadow-red-500/30 group-hover:scale-110 transition-transform duration-500">
                <ArrowDownRight className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-white" />
              </div>
            </div>
            <div className="text-base sm:text-2xl font-extrabold text-red-700 font-mono truncate">₨ {data.expenses.toLocaleString()}</div>
            <p className="text-[10px] sm:text-xs text-red-600 mt-0.5 sm:mt-1 font-medium">{labels.expenseLabel}</p>
          </CardContent>
        </Card>

        {/* Net Profit Card */}
        <Card className={`group hover:shadow-xl transition-all duration-500 hover:-translate-y-1 overflow-hidden border-2 ${profitStatus === "positive" ? "border-blue-200 bg-gradient-to-br from-blue-50 to-blue-25" : "border-orange-200 bg-gradient-to-br from-orange-50 to-orange-25"}`}>
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-start justify-between mb-2 sm:mb-4">
              <div className={`flex h-8 w-8 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl shadow-lg transition-transform duration-500 group-hover:scale-110 ${profitStatus === "positive" ? "bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/30" : "bg-gradient-to-br from-orange-500 to-orange-600 shadow-orange-500/30"}`}>
                <DollarSign className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-white" />
              </div>
            </div>
            <div className={`text-base sm:text-2xl font-extrabold font-mono truncate ${profitStatus === "positive" ? "text-blue-700" : "text-orange-700"}`}>
              {profit >= 0 ? "+" : "-"} ₨ {Math.abs(profit).toLocaleString()}
            </div>
            <p className={`text-[10px] sm:text-xs mt-0.5 sm:mt-1 font-medium ${profitStatus === "positive" ? "text-blue-600" : "text-orange-600"}`}>{labels.profitLabel}</p>
          </CardContent>
        </Card>

        {/* Profit Margin Card */}
        <Card className="group hover:shadow-xl transition-all duration-500 hover:-translate-y-1 overflow-hidden border-violet-200 bg-gradient-to-br from-violet-50 to-violet-25">
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-start justify-between mb-2 sm:mb-4">
              <div className="flex h-8 w-8 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 shadow-lg shadow-violet-500/30 group-hover:scale-110 transition-transform duration-500">
                <Target className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-white" />
              </div>
            </div>
            <div className="text-base sm:text-2xl font-extrabold text-violet-700 font-mono">{profitMargin}%</div>
            <p className="text-[10px] sm:text-xs text-violet-600 mt-0.5 sm:mt-1 font-medium">{labels.marginLabel}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Bar Chart - Income vs Expenses */}
        <Card className="border-slate-200 shadow-md overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-3 sm:mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              {labels.incomeVsExpenses}
            </h3>
            <div className="h-[200px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px" }}
                    formatter={(value) => `₨ ${Number(value).toLocaleString()}`}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart - Profit vs Expenses */}
        <Card className="border-slate-200 shadow-md overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-3 sm:mb-4 flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
              {labels.profitDistribution}
            </h3>
            <div className="h-[200px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData.filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) => `${name} ₨ ${(value / 100000).toFixed(1)}L (${(percent * 100).toFixed(1)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `₨ ${Number(value).toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-cyan-200 bg-gradient-to-br from-cyan-50 to-cyan-25">
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-center justify-between mb-1.5 sm:mb-3">
              <h4 className="text-xs sm:text-sm font-semibold text-cyan-900">{labels.expenseRatio}</h4>
              <Zap className="h-3 w-3 sm:h-4 sm:w-4 text-cyan-600" />
            </div>
            <div className="text-base sm:text-2xl font-extrabold text-cyan-700">{expenseRatio}%</div>
            <p className="text-[10px] sm:text-xs text-cyan-600 mt-0.5 sm:mt-1">{labels.incomePercentage}</p>
          </CardContent>
        </Card>

        <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-indigo-25">
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-center justify-between mb-1.5 sm:mb-3">
              <h4 className="text-xs sm:text-sm font-semibold text-indigo-900">{labels.totalTransactions}</h4>
              <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 text-indigo-600" />
            </div>
            <div className="text-base sm:text-2xl font-extrabold text-indigo-700">{data.entries.length}</div>
            <p className="text-[10px] sm:text-xs text-indigo-600 mt-0.5 sm:mt-1">{labels.totalEntries}</p>
          </CardContent>
        </Card>

        <Card className={`border-2 ${profitStatus === "positive" ? "border-teal-200 bg-gradient-to-br from-teal-50 to-teal-25" : "border-amber-200 bg-gradient-to-br from-amber-50 to-amber-25"}`}>
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-center justify-between mb-1.5 sm:mb-3">
              <h4 className={`text-xs sm:text-sm font-semibold ${profitStatus === "positive" ? "text-teal-900" : "text-amber-900"}`}>{labels.businessStatus}</h4>
              {profitStatus === "positive" ? (
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-teal-600" />
              ) : (
                <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600" />
              )}
            </div>
            <div className={`text-base sm:text-2xl font-extrabold ${profitStatus === "positive" ? "text-teal-700" : "text-amber-700"}`}>
              {profitStatus === "positive" ? labels.goodStatus : labels.badStatus}
            </div>
            <p className={`text-[10px] sm:text-xs mt-0.5 sm:mt-1 ${profitStatus === "positive" ? "text-teal-600" : "text-amber-600"}`}>{labels.businessPerformance}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfitLoss;
