import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Users, BookOpen, Package, TrendingUp, Activity, Zap } from "lucide-react";

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
    {
      title: t("dashboard.totalFarmers"),
      value: stats.farmers,
      icon: Users,
      gradient: "from-primary to-primary/70",
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      title: t("dashboard.ledgerEntries"),
      value: stats.entries,
      icon: BookOpen,
      gradient: "from-accent to-accent/70",
      iconBg: "bg-accent/10",
      iconColor: "text-accent",
    },
    {
      title: t("dashboard.inventoryItems"),
      value: stats.inventory,
      icon: Package,
      gradient: "from-destructive to-destructive/70",
      iconBg: "bg-destructive/10",
      iconColor: "text-destructive",
    },
    {
      title: t("dashboard.totalRevenue"),
      value: `₨ ${stats.revenue.toLocaleString()}`,
      icon: TrendingUp,
      gradient: "from-chart-5 to-chart-4",
      iconBg: "bg-chart-5/10",
      iconColor: "text-chart-5",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-primary/80 p-6 sm:p-8 text-primary-foreground">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-primary-foreground/5 -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-1/2 w-32 h-32 rounded-full bg-primary-foreground/5 translate-y-1/2" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="hidden sm:flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-foreground/15 backdrop-blur-sm">
            <Zap className="h-7 w-7" />
          </div>
          <div>
            <p className="text-sm text-primary-foreground/70 mb-1">{t("dashboard.welcome")}</p>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold">
              {profile?.full_name || "User"} 👋
            </h1>
            <p className="text-primary-foreground/60 mt-1 text-sm">{t("dashboard.overview")}</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {cards.map((card, i) => (
          <Card
            key={card.title}
            className="group hover:shadow-lg transition-all duration-300 cursor-default overflow-hidden border-border/50 animate-fade-in"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${card.iconBg} transition-transform duration-300 group-hover:scale-110`}>
                  <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
                <Activity className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-foreground font-mono tracking-tight">{card.value}</div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 leading-tight font-medium">{card.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
