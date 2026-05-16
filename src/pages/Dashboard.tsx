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

  // Fetch dashboard stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
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

        const farmersCount = farmerSeasons.length;
        const entriesCount = entriesRes.count ?? 0;
        const inventoryCount = inventoryRes.count ?? 0;
        const revenueTotal = revenueRes.data?.reduce((sum, e) => sum + Number(e.amount), 0) ?? 0;

        setStats({
          farmers: farmersCount,
          entries: entriesCount,
          inventory: inventoryCount,
          revenue: revenueTotal,
        });
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      }
    };
    
    fetchStats();
  }, [selectedSeason?.id, farmerSeasons.length]);

  const cards = [
    {
      title: t("dashboard.totalFarmers"),
      value: stats.farmers,
      icon: Users,
      gradient: "from-indigo-500/10 to-blue-500/5",
      borderColor: "border-indigo-500/20",
      iconBg: "bg-gradient-to-br from-indigo-500 to-blue-600",
      iconColor: "text-white",
      valueColor: "text-indigo-600 dark:text-indigo-400",
      shadowColor: "shadow-indigo-500/10",
    },
    {
      title: t("dashboard.ledgerEntries"),
      value: stats.entries,
      icon: BookOpen,
      gradient: "from-emerald-500/10 to-teal-500/5",
      borderColor: "border-emerald-500/20",
      iconBg: "bg-gradient-to-br from-emerald-500 to-teal-600",
      iconColor: "text-white",
      valueColor: "text-emerald-600 dark:text-emerald-400",
      shadowColor: "shadow-emerald-500/10",
    },
    {
      title: t("dashboard.inventoryItems"),
      value: stats.inventory,
      icon: Package,
      gradient: "from-rose-500/10 to-pink-500/5",
      borderColor: "border-rose-500/20",
      iconBg: "bg-gradient-to-br from-rose-500 to-pink-600",
      iconColor: "text-white",
      valueColor: "text-rose-600 dark:text-rose-400",
      shadowColor: "shadow-rose-500/10",
    },
    {
      title: t("dashboard.totalRevenue"),
      value: `₨ ${stats.revenue.toLocaleString()}`,
      icon: TrendingUp,
      gradient: "from-amber-500/10 to-orange-500/5",
      borderColor: "border-amber-500/20",
      iconBg: "bg-gradient-to-br from-amber-500 to-orange-600",
      iconColor: "text-white",
      valueColor: "text-amber-600 dark:text-amber-400",
      shadowColor: "shadow-amber-500/10",
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8 animate-in fade-in duration-700">
      
      {/* --- Welcome Banner (Mobile Optimized) --- */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6 md:p-10 shadow-2xl border border-slate-700/50">
        {/* Animated Background Orbs */}
        <div className="absolute top-0 right-0 w-[300px] sm:w-[400px] h-[300px] sm:h-[400px] rounded-full bg-primary/20 -translate-y-1/2 translate-x-1/3 blur-[60px] sm:blur-[80px] animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[200px] sm:w-[300px] h-[200px] sm:h-[300px] rounded-full bg-accent/20 translate-y-1/3 -translate-x-1/4 blur-[40px] sm:blur-[60px]" />
        
        <div className="relative z-10 flex flex-col items-start gap-4 sm:gap-6">
          <div className="hidden sm:flex h-16 sm:h-20 w-16 sm:w-20 items-center justify-center rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-inner">
            <Zap className="h-8 sm:h-10 w-8 sm:w-10 text-primary-foreground/90" />
          </div>
          
          <div className="flex-1 space-y-2 w-full">
            <div className="inline-flex items-center gap-2 px-2 sm:px-3 py-1 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-xs font-medium text-white/80">
              <Sparkles className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-yellow-400" />
              <span>{t("dashboard.welcome")}</span>
            </div>
            
            <h1 className="text-xl sm:text-4xl md:text-5xl font-serif font-bold tracking-tight text-white leading-snug sm:leading-tight">
              Welcome back,<br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-yellow-400 to-orange-400 drop-shadow-sm">
                {profile?.full_name || "User"}
              </span>
            </h1>
            
            {selectedSeason && (
              <div className="pt-1 sm:pt-2">
                <span className="inline-flex items-center gap-1.5 bg-green-500/20 text-green-200 backdrop-blur-md px-2 sm:px-3 py-1 rounded-full text-[11px] sm:text-sm font-medium border border-green-500/30">
                  <Leaf className="h-3 sm:h-4 w-3 sm:w-4 shrink-0" /> 
                  <span>Active Season: {selectedSeason.name}</span>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- 2x2 Stats Grid (Mobile First) --- */}
      <div className="grid gap-2.5 sm:gap-4 md:gap-6 grid-cols-2 lg:grid-cols-4">
        {cards.map((card, i) => (
          <Card
            key={card.title}
            className={`group relative overflow-hidden bg-card/60 backdrop-blur-xl ${card.borderColor} border transition-all duration-500 hover:-translate-y-1.5 hover:shadow-2xl ${card.shadowColor}`}
          >
            {/* Subtle Gradient Overlay */}
            <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-50 group-hover:opacity-100 transition-opacity duration-500`} />
            
            <CardContent className="relative p-3 sm:p-5 md:p-6 z-10 flex flex-col justify-between h-full min-h-[110px] sm:min-h-[140px]">
              <div className="flex items-start justify-between mb-2">
                <div className={`flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl ${card.iconBg} shadow-lg transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6`}>
                  <card.icon className={`h-4 w-4 sm:h-6 sm:w-6 ${card.iconColor}`} />
                </div>
                <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground/30 group-hover:text-foreground/50 transition-colors duration-300" />
              </div>
              
              <div>
                <div className={`text-lg sm:text-2xl md:text-3xl font-bold font-mono tracking-tight ${card.valueColor} drop-shadow-sm`}>
                  {card.value}
                </div>
                <p className="text-[10px] sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 font-medium tracking-wide leading-tight">
                  {card.title}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
    </div>
  );
};

export default Dashboard;
