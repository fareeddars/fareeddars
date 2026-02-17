import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, Package, TrendingUp } from "lucide-react";

const Dashboard = () => {
  const { profile } = useAuth();
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
    { title: "Total Farmers", value: stats.farmers, icon: Users, color: "text-primary" },
    { title: "Ledger Entries", value: stats.entries, icon: BookOpen, color: "text-accent-foreground" },
    { title: "Inventory Items", value: stats.inventory, icon: Package, color: "text-secondary" },
    { title: "Total Revenue", value: `₨ ${stats.revenue.toLocaleString()}`, icon: TrendingUp, color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-foreground">Welcome back, {profile?.full_name || "User"}</h1>
        <p className="text-muted-foreground">Here's an overview of your agriculture business.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
