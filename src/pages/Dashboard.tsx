import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSeason } from "@/contexts/SeasonContext";
import { Card, CardContent } from "@/components/ui/card";
import { Users, BookOpen, Package, TrendingUp, Activity, Zap, Leaf, Sparkles, Sun, CloudRain, Cloud, Wind, Droplets } from "lucide-react";
import { fetchWeatherData, type WeatherData } from "@/lib/weatherUtils";

const Dashboard = () => {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const { selectedSeason, farmerSeasons } = useSeason();
  const [stats, setStats] = useState({ farmers: 0, entries: 0, inventory: 0, revenue: 0 });
  const [weather, setWeather] = useState<WeatherData>({
    temperature: null,
    humidity: null,
    rainChance: null,
    condition: "",
    location: "",
    timestamp: null,
  });
  const [locationGranted, setLocationGranted] = useState<boolean>(false);

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

  // Check location permission status
  useEffect(() => {
    const checkLocationPermission = async () => {
      if ('permissions' in navigator) {
        try {
          const permission = await navigator.permissions.query({ name: 'geolocation' });
          setLocationGranted(permission.state === 'granted');
          permission.addEventListener('change', () => {
            setLocationGranted(permission.state === 'granted');
          });
        } catch (error) {
          console.log('Permission API not supported');
        }
      }
    };
    checkLocationPermission();
  }, []);

  // Fetch weather data when location is granted or on initial load
  useEffect(() => {
    const loadWeatherData = async () => {
      const weatherData = await fetchWeatherData();
      setWeather(weatherData);
    };

    loadWeatherData();
  }, [locationGranted]);

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

  // Dynamic Weather Styles & Messages
  const isRainy = (weather.rainChance ?? 0) > 50 || weather.condition.toLowerCase().includes("rain");
  const isCloudy = weather.condition.toLowerCase().includes("cloud") && !isRainy;
  
  const weatherTheme = isRainy 
    ? { bg: "from-blue-600 to-indigo-900", icon: <CloudRain className="h-16 w-16 text-blue-200" />, accent: "bg-blue-500/30 text-blue-100", border: "border-blue-400/30" }
    : isCloudy 
      ? { bg: "from-slate-500 to-slate-800", icon: <Cloud className="h-16 w-16 text-slate-200" />, accent: "bg-slate-400/30 text-slate-100", border: "border-slate-400/30" }
      : { bg: "from-amber-400 to-orange-600", icon: <Sun className="h-16 w-16 text-amber-100 drop-shadow-lg" />, accent: "bg-amber-300/30 text-amber-50", border: "border-amber-300/30" };

  const weatherMessage = isRainy
      ? "🚨 Barish ka imkan hai, fasal sambhal lein!"
      : "✅ Mausam saaf hai, kaam jari rakhen.";

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-700">
      
      {/* --- Premium Welcome Banner --- */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 sm:p-10 shadow-2xl border border-slate-700/50">
        {/* Animated Background Orbs */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-primary/20 -translate-y-1/2 translate-x-1/3 blur-[80px] animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-accent/20 translate-y-1/3 -translate-x-1/4 blur-[60px]" />
        
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="hidden sm:flex h-20 w-20 items-center justify-center rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-inner">
            <Zap className="h-10 w-10 text-primary-foreground/90" />
          </div>
          
          <div className="flex-1 space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-xs font-medium text-white/80">
              <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
              <span>{t("dashboard.welcome")}</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl font-serif font-bold tracking-tight text-white leading-tight">
              Welcome back,<br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-yellow-400 to-orange-400 drop-shadow-sm">
                {profile?.full_name || "User"}
              </span>
            </h1>
            
            {selectedSeason && (
              <div className="pt-2">
                <span className="inline-flex items-center gap-1.5 bg-green-500/20 text-green-200 backdrop-blur-md px-3 py-1 rounded-full text-sm font-medium border border-green-500/30">
                  <Leaf className="h-4 w-4" /> 
                  Active Season: {selectedSeason.name}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- Premium Stats Grid --- */}
      <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4">
        {cards.map((card, i) => (
          <Card
            key={card.title}
            className={`group relative overflow-hidden bg-card/60 backdrop-blur-xl ${card.borderColor} border transition-all duration-500 hover:-translate-y-1.5 hover:shadow-2xl ${card.shadowColor}`}
          >
            {/* Subtle Gradient Overlay */}
            <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-50 group-hover:opacity-100 transition-opacity duration-500`} />
            
            <CardContent className="relative p-5 sm:p-6 z-10 flex flex-col justify-between h-full min-h-[140px]">
              <div className="flex items-start justify-between mb-2">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${card.iconBg} shadow-lg transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6`}>
                  <card.icon className={`h-6 w-6 ${card.iconColor}`} />
                </div>
                <Activity className="h-4 w-4 text-muted-foreground/30 group-hover:text-foreground/50 transition-colors duration-300" />
              </div>
              
              <div>
                <div className={`text-2xl sm:text-3xl font-bold font-mono tracking-tight ${card.valueColor} drop-shadow-sm`}>
                  {card.value}
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium tracking-wide">
                  {card.title}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* --- Dynamic Premium Weather Widget --- */}
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${weatherTheme.bg} p-6 sm:p-8 shadow-xl transition-all duration-700`}>
        {/* Decorative Weather Effects */}
        <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 mix-blend-overlay" />
        <div className="absolute -top-24 -right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-center gap-8 sm:gap-12">
          
          {/* Weather Info */}
          <div className="flex-1 w-full text-center sm:text-left space-y-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-xs font-semibold text-white uppercase tracking-wider mb-3">
                <Sun className="h-3 w-3" /> Mausam Ki Sorathal
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-md">
                {weather.location || "Loading location..."}
              </h2>
            </div>
            
            <div className="flex flex-wrap justify-center sm:justify-start gap-3 mt-4">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl backdrop-blur-md ${weatherTheme.accent} ${weatherTheme.border} border`}>
                <Wind className="h-5 w-5 opacity-80" />
                <span className="font-semibold text-lg">{weather.humidity !== null ? `${weather.humidity}%` : "—"}</span>
              </div>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl backdrop-blur-md ${weatherTheme.accent} ${weatherTheme.border} border`}>
                <Droplets className="h-5 w-5 opacity-80" />
                <span className="font-semibold text-lg">{weather.rainChance !== null ? `${weather.rainChance}%` : "—"}</span>
              </div>
            </div>

            <p className="mt-4 text-sm sm:text-base font-medium text-white/90 bg-black/20 inline-block px-4 py-2 rounded-xl backdrop-blur-md border border-white/10">
              {weatherMessage}
            </p>
          </div>

          {/* Large Temperature Display */}
          <div className="flex flex-col items-center shrink-0">
            <div className="relative">
              {weatherTheme.icon}
            </div>
            <div className="text-5xl sm:text-7xl font-bold font-mono text-white mt-4 drop-shadow-xl tracking-tighter">
              {weather.temperature !== null ? `${weather.temperature.toFixed(0)}°` : "—"}
            </div>
            <span className="text-white/70 font-medium text-lg capitalize tracking-wide mt-1">
              {weather.condition || "Loading..."}
            </span>
          </div>
          
        </div>
      </div>
      
    </div>
  );
};

export default Dashboard;
