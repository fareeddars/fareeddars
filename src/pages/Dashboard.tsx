import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSeason } from "@/contexts/SeasonContext";
import { Card, CardContent } from "@/components/ui/card";
import { Users, BookOpen, Package, TrendingUp, Activity, Zap, Leaf, Sparkles } from "lucide-react";

const Dashboard = () => {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const { selectedSeason, farmerSeasons } = useSeason();
  const [stats, setStats] = useState({ farmers: 0, entries: 0, inventory: 0, revenue: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      let entriesQuery = supabase.from("ledger_entries").select("id", { count: "exact", head: true });
      let revenueQuery = supabase.from("ledger_entries").select("amount").eq("entry_type", "sale");
      
      if (selectedSeason) {
        entriesQuery = entriesQuery.eq("season_id", selectedSeason.id);
        revenueQuery = revenueQuery.eq("season_id", selectedSeason.id);
      }

      const [entriesRes, inventoryRes, revenueRes] = await Promise.all([
        entriesQuery,
        supabase.from("inventory").select("id", { count: "exact", head: true }),
        revenueQuery,
      ]);
      setStats({
        farmers: farmerSeasons.length,
        entries: entriesRes.count ?? 0,
        inventory: inventoryRes.count ?? 0,
        revenue: revenueRes.data?.reduce((sum, e) => sum + Number(e.amount), 0) ?? 0,
      });
    };
    fetchStats();
  }, [selectedSeason?.id, farmerSeasons.length]);

  const cards = [
    {
      title: t("dashboard.totalFarmers"),
      value: stats.farmers,
      icon: Users,
      gradient: "from-primary/10 to-primary/5",
      borderColor: "border-primary/20",
      iconBg: "bg-gradient-to-br from-primary to-primary/70",
      iconColor: "text-primary-foreground",
      valueColor: "text-primary",
    },
    {
      title: t("dashboard.ledgerEntries"),
      value: stats.entries,
      icon: BookOpen,
      gradient: "from-accent/10 to-accent/5",
      borderColor: "border-accent/20",
      iconBg: "bg-gradient-to-br from-accent to-accent/70",
      iconColor: "text-accent-foreground",
      valueColor: "text-accent",
    },
    {
      title: t("dashboard.inventoryItems"),
      value: stats.inventory,
      icon: Package,
      gradient: "from-destructive/10 to-destructive/5",
      borderColor: "border-destructive/20",
      iconBg: "bg-gradient-to-br from-destructive to-destructive/70",
      iconColor: "text-destructive-foreground",
      valueColor: "text-destructive",
    },
    {
      title: t("dashboard.totalRevenue"),
      value: `₨ ${stats.revenue.toLocaleString()}`,
      icon: TrendingUp,
      gradient: "from-chart-5/10 to-chart-5/5",
      borderColor: "border-chart-5/20",
      iconBg: "bg-gradient-to-br from-chart-5 to-chart-4",
      iconColor: "text-primary-foreground",
      valueColor: "text-chart-5",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-accent/80 p-6 sm:p-8 text-primary-foreground shadow-xl shadow-primary/20">
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-primary-foreground/5 -translate-y-1/2 translate-x-1/4 blur-2xl" />
        <div className="absolute bottom-0 left-1/3 w-40 h-40 rounded-full bg-accent/20 translate-y-1/2 blur-xl" />
        <div className="absolute top-1/2 right-1/4 w-24 h-24 rounded-full bg-primary-foreground/10 blur-lg" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="hidden sm:flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-foreground/15 backdrop-blur-md border border-primary-foreground/10 shadow-lg">
            <Zap className="h-8 w-8" />
          </div>
          <div>
            <p className="text-sm text-primary-foreground/70 mb-1 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> {t("dashboard.welcome")}
            </p>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight">
              {profile?.full_name || "User"} 👋
            </h1>
            <p className="text-primary-foreground/60 mt-1.5 text-sm flex items-center gap-2">
              {t("dashboard.overview")}
              {selectedSeason && (
                <span className="inline-flex items-center gap-1 bg-primary-foreground/15 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-xs font-medium border border-primary-foreground/10">
                  <Leaf className="h-3 w-3" /> {selectedSeason.name}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {cards.map((card, i) => (
          <Card
            key={card.title}
            className={`group hover:shadow-xl transition-all duration-500 cursor-default overflow-hidden ${card.borderColor} bg-gradient-to-br ${card.gradient} animate-fade-in hover:-translate-y-1`}
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${card.iconBg} shadow-lg transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
                  <card.icon className={`h-5.5 w-5.5 ${card.iconColor}`} />
                </div>
                <Activity className="h-4 w-4 text-muted-foreground/20 group-hover:text-primary transition-colors duration-300" />
              </div>
              <div className={`text-2xl sm:text-3xl font-bold font-mono tracking-tight ${card.valueColor}`}>{card.value}</div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 leading-tight font-medium">{card.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
