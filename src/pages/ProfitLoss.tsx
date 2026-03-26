import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSeason } from "@/contexts/SeasonContext";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight, Leaf } from "lucide-react";

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
      <div>
        <h1 className="text-2xl font-serif font-bold text-foreground">{t("profitLoss.title")}</h1>
        <p className="text-muted-foreground">
          {t("profitLoss.subtitle")}
          {selectedSeason && <span className="ml-2 inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full"><Leaf className="h-3 w-3" />{selectedSeason.name}</span>}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="group hover:shadow-md transition-all overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-foreground font-mono">₨ {data.income.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground mt-1">{t("profitLoss.totalIncome")}</p>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-md transition-all overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/10">
                <TrendingDown className="h-5 w-5 text-destructive" />
              </div>
              <ArrowDownRight className="h-4 w-4 text-destructive" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-foreground font-mono">₨ {data.expenses.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground mt-1">{t("profitLoss.totalExpenses")}</p>
          </CardContent>
        </Card>

        <Card className={`group hover:shadow-md transition-all overflow-hidden border-2 ${profit >= 0 ? "border-primary/30" : "border-destructive/30"}`}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${profit >= 0 ? "bg-primary/10" : "bg-destructive/10"}`}>
                <DollarSign className={`h-5 w-5 ${profit >= 0 ? "text-primary" : "text-destructive"}`} />
              </div>
            </div>
            <div className={`text-2xl sm:text-3xl font-bold font-mono ${profit >= 0 ? "text-primary" : "text-destructive"}`}>
              ₨ {Math.abs(profit).toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{t("profitLoss.netProfit")}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfitLoss;
