import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSeason } from "@/contexts/SeasonContext";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight, Leaf, BarChart3 } from "lucide-react";

const ProfitLoss = () => {
  const { t } = useLanguage();
  const { selectedSeason } = useSeason();
  const [data, setData] = useState({ income: 0, expenses: 0 });

  useEffect(() => {
    const fetch = async () => {
      let query = supabase.from("ledger_entries").select("entry_type, amount, is_shared, shared_amount");
      if (selectedSeason) query = query.eq("season_id", selectedSeason.id);
      const { data: entries } = await query;
      if (!entries) return;
      let income = 0, expenses = 0;
      entries.forEach((e) => {
        const amt = Number(e.amount);
        if (e.entry_type === "sale" || e.entry_type === "payment") income += amt;
        else if (e.entry_type === "expense") expenses += e.is_shared ? Number(e.shared_amount ?? amt / 2) : amt;
      });
      setData({ income, expenses });
    };
    fetch();
  }, [selectedSeason?.id]);

  const profit = data.income - data.expenses;

  return (
    <div className="space-y-6">
      {/* Page Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-6 sm:p-8 text-primary-foreground shadow-xl shadow-primary/20">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-primary-foreground/5 -translate-y-1/2 translate-x-1/4 blur-2xl" />
        <div className="absolute bottom-0 left-1/3 w-32 h-32 rounded-full bg-primary-foreground/10 translate-y-1/2 blur-xl" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="hidden sm:flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-foreground/15 backdrop-blur-md border border-primary-foreground/10">
            <BarChart3 className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight">{t("profitLoss.title")}</h1>
            <p className="text-primary-foreground/70 text-sm mt-0.5 flex items-center gap-2">
              {t("profitLoss.subtitle")}
              {selectedSeason && (
                <span className="inline-flex items-center gap-1 bg-primary-foreground/15 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-xs font-medium border border-primary-foreground/10">
                  <Leaf className="h-3 w-3" />{selectedSeason.name}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {/* Income Card - Soft Green */}
        <Card className="group hover:shadow-xl transition-all duration-500 hover:-translate-y-1 overflow-hidden border-chart-5/30 bg-gradient-to-br from-chart-5/15 via-chart-5/10 to-chart-5/5 shadow-md">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-chart-5 to-chart-5/70 shadow-lg shadow-chart-5/30 group-hover:scale-110 transition-transform duration-500">
                <TrendingUp className="h-5 w-5 text-primary-foreground" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-chart-5/60" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-chart-5 font-mono">₨ {data.income.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground mt-1">{t("profitLoss.totalIncome")}</p>
          </CardContent>
        </Card>

        {/* Expenses Card - Soft Red */}
        <Card className="group hover:shadow-xl transition-all duration-500 hover:-translate-y-1 overflow-hidden border-destructive/30 bg-gradient-to-br from-destructive/15 via-destructive/10 to-destructive/5 shadow-md">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-destructive to-destructive/70 shadow-lg shadow-destructive/30 group-hover:scale-110 transition-transform duration-500">
                <TrendingDown className="h-5 w-5 text-destructive-foreground" />
              </div>
              <ArrowDownRight className="h-4 w-4 text-destructive/60" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-destructive font-mono">₨ {data.expenses.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground mt-1">{t("profitLoss.totalExpenses")}</p>
          </CardContent>
        </Card>

        {/* Net Profit Card - Strong Blue */}
        <Card className="group hover:shadow-xl transition-all duration-500 hover:-translate-y-1 overflow-hidden border-2 border-primary/30 bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 shadow-md shadow-primary/10">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform duration-500">
                <DollarSign className="h-5 w-5 text-primary-foreground" />
              </div>
            </div>
            <div className={`text-2xl sm:text-3xl font-bold font-mono ${profit >= 0 ? "text-primary" : "text-destructive"}`}>
              {profit >= 0 ? "+" : "-"} ₨ {Math.abs(profit).toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{t("profitLoss.netProfit")}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfitLoss;
