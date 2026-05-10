import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSeason } from "@/contexts/SeasonContext";
import { Card, CardContent } from "@/components/ui/card";
import { Users, BookOpen, Package, TrendingUp, Activity, Zap, Leaf, Sparkles } from "lucide-react";
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
      console.log("Loading weather data, location granted:", locationGranted);
      const weatherData = await fetchWeatherData();
      console.log("Weather data loaded:", weatherData);
      setWeather(weatherData);
    };

    // Always load on mount, and reload when location permission changes
    loadWeatherData();
  }, [locationGranted]);

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

  const getWeatherIcon = (condition: string, rainChance: number | null) => {
    const lowerCondition = condition.toLowerCase();
    if (lowerCondition.includes("rain") || lowerCondition.includes("shower") || lowerCondition.includes("storm") || (rainChance ?? 0) > 50) {
      return "🌧️";
    }
    if (lowerCondition.includes("cloud")) return "☁️";
    return "☀️";
  };

  const weatherMessage = (rainChance: number | null) =>
    (rainChance ?? 0) > 50
      ? "🚨 Barish ka imkan hai, fasal sambhal lein!"
      : "✅ Mausam saaf hai, kaam jari rakhen.";

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
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
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

      <div className="bg-blue-50 p-6 rounded-2xl shadow-lg border border-blue-100">
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <div className="min-w-[220px]">
            <h3 className="text-lg font-semibold text-blue-900">Mausam ki Sorathal</h3>
            <p className="text-sm text-blue-700 mb-1">{weather.location || "Loading location..."}</p>
            <p className="text-3xl font-bold text-blue-600">
              {weather.temperature !== null ? `${weather.temperature.toFixed(1)}°C` : "—"}
            </p>
            <div className="mt-3 space-y-1 text-sm text-blue-800">
              <p>Humidity: {weather.humidity !== null ? `${weather.humidity}%` : "—"}</p>
              <p>Rain chance: {weather.rainChance !== null ? `${weather.rainChance}%` : "—"}</p>
            </div>
          </div>
          <div className="text-6xl">{getWeatherIcon(weather.condition, weather.rainChance)}</div>
        </div>

        <div className="mt-5">
          <p className={`font-medium ${(weather.rainChance ?? 0) > 50 ? "text-blue-700" : "text-green-600"}`}>
            {weatherMessage(weather.rainChance)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
