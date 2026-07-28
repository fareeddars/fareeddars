import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSeason } from "@/contexts/SeasonContext";
import { Users, BookOpen, Package, TrendingUp, Zap, Leaf } from "lucide-react";

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
      title: t("dashboard.totalFarmers") || "Total Farmers",
      value: stats.farmers || 1,
      icon: Users,
      bgImage: "/images/farmer_card.jpg",
    },
    {
      title: t("dashboard.ledgerEntries") || "Ledger Entries",
      value: stats.entries || 1,
      icon: BookOpen,
      bgImage: "/images/ledger_card.jpg",
    },
    {
      title: t("dashboard.inventoryItems") || "Inventory Items",
      value: stats.inventory || 6,
      icon: Package,
      bgImage: "/images/inventory_card.jpg",
    },
    {
      title: t("dashboard.totalRevenue") || "Total Revenue",
      value: `Rs ${stats.revenue.toLocaleString()}`,
      icon: TrendingUp,
      bgImage: "/images/revenue_card.jpg",
    },
  ];

  const userName = profile?.full_name || "Fareed Hussain Dars";
  const [editableName, setEditableName] = useState(userName);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      {/* top greeting removed — name is now editable inside the hero */}

      {/* --- Hero Welcome Banner --- */}
      <div className="relative overflow-hidden rounded-3xl border border-[#2A4D3B]/30 shadow-2xl min-h-[160px] sm:min-h-[200px] md:min-h-[220px] flex items-center">
        {/* Farmland Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 scale-105"
          style={{ backgroundImage: `url('/images/hero_farmland.jpg')` }}
        />
        {/* Dark Forest Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#12281D]/95 via-[#12281D]/75 to-[#12281D]/40" />

        {/* Content Inside Hero Card */}
        <div className="relative z-10 p-4 sm:p-6 md:p-6 w-full flex items-center justify-center">
          <div className="w-full max-w-2xl flex items-center justify-center">
            <input
              aria-label="Display name"
              value={editableName}
              onChange={(e) => setEditableName(e.target.value)}
              className="bg-transparent border-0 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-sans font-semibold text-[#E2C391] text-center w-full truncate focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* --- Dark Wood Panel Section Framing 4 Metric Stat Cards --- */}
      <div 
        className="rounded-3xl p-3 sm:p-5 border border-[#2A4D3B]/40 shadow-2xl relative overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(rgba(27, 59, 43, 0.85), rgba(18, 40, 29, 0.95)), url('/images/wood_texture.jpg')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 relative z-10">
          {cards.map((card) => (
            <div
              key={card.title}
              className="group relative overflow-hidden rounded-2xl sm:rounded-3xl border border-[#C5A880]/30 shadow-xl h-[170px] sm:h-[190px] md:h-[200px] flex flex-col justify-between p-4 sm:p-5 cursor-pointer transition-all duration-500 hover:-translate-y-1.5 hover:shadow-2xl hover:border-[#C5A880]/70"
            >
              {/* Background Artwork */}
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-110"
                style={{ backgroundImage: `url('${card.bgImage}')` }}
              />

              {/* Dark Ambient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B1A13]/95 via-[#12281D]/70 to-[#12281D]/35 group-hover:from-[#0B1A13]/90 transition-colors duration-500" />

              {/* Top Badge Icon */}
              <div className="relative z-10 flex items-start justify-between">
                <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-[#12281D]/80 border border-[#C5A880]/40 flex items-center justify-center text-[#E2C391] shadow-lg backdrop-blur-md transition-transform duration-300 group-hover:scale-110">
                  <card.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
              </div>

              {/* Bottom Label & Count */}
              <div className="relative z-10 space-y-0.5 sm:space-y-1">
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold font-sans text-[#F4EFEA] tracking-tight drop-shadow-md">
                  {card.value}
                </div>
                <p className="text-xs sm:text-sm font-medium text-[#E2D8CD] tracking-wide opacity-90">
                  {card.title}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
