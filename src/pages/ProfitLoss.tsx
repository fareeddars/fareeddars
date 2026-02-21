import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";

const ProfitLoss = () => {
  const { t } = useLanguage();
  const [data, setData] = useState({ income: 0, expenses: 0 });

  useEffect(() => {
    const fetch = async () => {
      const { data: entries } = await supabase.from("ledger_entries").select("entry_type, amount, is_shared, shared_amount");
      if (!entries) return;

      let income = 0, expenses = 0;
      entries.forEach((e) => {
        const amt = Number(e.amount);
        if (e.entry_type === "sale" || e.entry_type === "payment") {
          income += amt;
        } else if (e.entry_type === "expense") {
          expenses += e.is_shared ? Number(e.shared_amount ?? amt / 2) : amt;
        }
      });
      setData({ income, expenses });
    };
    fetch();
  }, []);

  const profit = data.income - data.expenses;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-foreground">{t("profitLoss.title")}</h1>
        <p className="text-muted-foreground">{t("profitLoss.subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("profitLoss.totalIncome")}</CardTitle>
            <TrendingUp className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-foreground">₨ {data.income.toLocaleString()}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("profitLoss.totalExpenses")}</CardTitle>
            <TrendingDown className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-foreground">₨ {data.expenses.toLocaleString()}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("profitLoss.netProfit")}</CardTitle>
            <DollarSign className={`h-5 w-5 ${profit >= 0 ? "text-primary" : "text-destructive"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${profit >= 0 ? "text-primary" : "text-destructive"}`}>
              ₨ {profit.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfitLoss;
