import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, Package, TrendingUp, ArrowUpRight } from "lucide-react";

const Dashboard = () => {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [stats, setStats] = useState({ farmers: 0, entries: 0, inventory: 0, revenue: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const [farmersRes, entriesRes, inventoryRes, revenueRes] = await Promise.all([
        supabase.from("farmers").select("id", { count: "exact", head: true }),
        supabase.from("ledger_entries").select("id", { count: "exact", head: true }),
        supabase.from("inventory").select("id", { count: "exact", head: true }),
        supabase.from("ledger_entries").select("amount").eq("entry_type", "sale"),
      ]);
      setStats({
        farmers: farmersRes.count ?? 0,
        entries: entriesRes.count ?? 0,
        inventory: inventoryRes.count ?? 0,
        revenue: revenueRes.data?.reduce((sum, e) => sum + Number(e.amount), 0) ?? 0,
      });
    };
    fetchStats();
  }, []);

  const cards = [
    { title: t("dashboard.totalFarmers"), value: stats.farmers, icon: Users, accent: "bg-primary/10 text-primary" },
    { title: t("dashboard.ledgerEntries"), value: stats.entries, icon: BookOpen, accent: "bg-accent text-accent-foreground" },
    { title: t("dashboard.inventoryItems"), value: stats.inventory, icon: Package, accent: "bg-primary/10 text-primary" },
    { title: t("dashboard.totalRevenue"), value: `₨ ${stats.revenue.toLocaleString()}`, icon: TrendingUp, accent: "bg-accent text-accent-foreground" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="relative overflow-hidden rounded-xl bg-card border border-border p-6">
        <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-primary/5" />
        <div className="absolute -bottom-10 -right-10 w-24 h-24 rounded-full bg-accent/20" />
        <div className="relative">
          <p className="text-sm text-muted-foreground mb-1">{t("dashboard.welcome")}</p>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">
            {profile?.full_name || "User"} 👋
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("dashboard.overview")}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title} className="group hover:shadow-md transition-all duration-200 cursor-default overflow-hidden">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-start justify-between mb-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.accent} transition-transform group-hover:scale-110`}>
                  <card.icon className="h-5 w-5" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-foreground font-mono tracking-tight">{card.value}</div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-tight">{card.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
