import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSeason } from "@/contexts/SeasonContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import DashboardHero from "@/components/dashboard/DashboardHero";
import DashboardStatCard from "@/components/dashboard/DashboardStatCard";
import QuickActions from "@/components/dashboard/QuickActions";
import KeyOverviewCard, { OverviewItem } from "@/components/dashboard/KeyOverviewCard";
import OutstandingCard from "@/components/dashboard/OutstandingCard";
import InventoryAlertsCard from "@/components/dashboard/InventoryAlertsCard";
import SeasonProgressCard from "@/components/dashboard/SeasonProgressCard";
import AIInsightsCard, { Insight } from "@/components/dashboard/AIInsightsCard";
import NotificationsCard, { NotificationItem } from "@/components/dashboard/NotificationsCard";
import CropPerformanceCard from "@/components/dashboard/CropPerformanceCard";
import SaleCostsCard from "@/components/dashboard/SaleCostsCard";
import BuyerOutstandingCard from "@/components/dashboard/BuyerOutstandingCard";
import {
  AlertTriangle, BarChart3, Boxes, CalendarClock, FileCheck2, Package, PiggyBank,
  ShoppingCart, TrendingUp, Users, Wallet,
} from "lucide-react";

const money = (n: number) => `Rs ${Math.round(n).toLocaleString()}`;

const Dashboard = () => {
  const { profile } = useAuth();
  const { seasons, selectedSeason, setSelectedSeasonId } = useSeason();
  const { kpis, overview, outstanding, alerts, season, totals, crops, buyers, avgYield } = useDashboardData();

  const firstName = (profile?.full_name || "Farmer").split(" ")[0];

  const overviewItems = useMemo<OverviewItem[]>(
    () => [
      { label: "Total Sales", sublabel: "(This Month)", value: money(overview.salesMonth), trend: overview.salesTrend, icon: ShoppingCart, tone: "emerald" },
      { label: "Total Expenses", sublabel: "(This Month)", value: money(overview.expensesMonth), trend: overview.expensesTrend, icon: Package, tone: "rose" },
      { label: "Net Profit", sublabel: "(This Month)", value: money(overview.profitMonth), trend: overview.profitTrend, icon: BarChart3, tone: "sky" },
      { label: "Collection", sublabel: "(This Month)", value: money(overview.collectionMonth), trend: overview.collectionTrend, icon: Wallet, tone: "amber" },
    ],
    [overview]
  );

  const insights = useMemo<Insight[]>(() => {
    const list: Insight[] = [];
    if (overview.profitTrend !== 0) {
      list.push({
        title: `Profit ${overview.profitTrend >= 0 ? "increased" : "decreased"} by ${Math.abs(overview.profitTrend).toFixed(0)}%`,
        description: "Compared with last month's net profit.",
        icon: TrendingUp,
        tone: overview.profitTrend >= 0 ? "emerald" : "amber",
      });
    }
    if (alerts.length > 0) {
      list.push({
        title: "Inventory needs refill",
        description: `${alerts.length} item${alerts.length > 1 ? "s are" : " is"} low or out of stock.`,
        icon: Boxes,
        tone: "sky",
      });
    }
    if (kpis.totalOutstanding > 0) {
      list.push({
        title: "Outstanding balance pending",
        description: `${money(kpis.totalOutstanding)} is still receivable from farmers.`,
        icon: PiggyBank,
        tone: "amber",
      });
    }
    if (overview.collectionTrend !== 0) {
      list.push({
        title: `Collection rate ${overview.collectionTrend >= 0 ? "improved" : "dropped"}`,
        description: `Collections are ${Math.abs(overview.collectionTrend).toFixed(0)}% ${overview.collectionTrend >= 0 ? "higher" : "lower"} than last month.`,
        icon: Wallet,
        tone: "violet",
      });
    }
    return list.slice(0, 4);
  }, [overview, alerts.length, kpis.totalOutstanding]);

  const notifications = useMemo<NotificationItem[]>(() => {
    const list: NotificationItem[] = [];
    const overdue = outstanding.filter((o) => o.days >= 30).slice(0, 2);
    overdue.forEach((o) =>
      list.push({
        id: `due-${o.farmerId}`,
        title: "Payment Due",
        description: `${o.name} has ${money(o.amount)} pending for ${o.days} days.`,
        time: `${o.days}d`,
        icon: Wallet,
        status: "danger",
      })
    );
    alerts.slice(0, 2).forEach((a) =>
      list.push({
        id: `stock-${a.id}`,
        title: a.level === "out" ? "Out of Stock Alert" : "Low Stock Alert",
        description: `${a.name} — ${a.level === "out" ? "refill required" : `${a.stock} ${a.unit} left`}.`,
        time: "Today",
        icon: AlertTriangle,
        status: a.level === "out" ? "danger" : "warning",
      })
    );
    if (selectedSeason && season.daysLeft > 0 && season.daysLeft <= 30) {
      list.push({
        id: "season-closing",
        title: "Season Closing Soon",
        description: `${selectedSeason.name} ends in ${season.daysLeft} days.`,
        time: `${season.daysLeft}d`,
        icon: CalendarClock,
        status: "warning",
      });
    }
    if (outstanding.length > 0) {
      list.push({
        id: "accounts-pending",
        title: "Farmer Accounts Pending",
        description: `${outstanding.length} farmer account${outstanding.length > 1 ? "s have" : " has"} an open balance.`,
        time: "Now",
        icon: Users,
        status: "info",
      });
    }
    list.push({
      id: "bills-ready",
      title: "Bills Ready to Generate",
      description: "Account statements can be printed from Reports.",
      time: "Now",
      icon: FileCheck2,
      status: "success",
    });
    return list.slice(0, 6);
  }, [outstanding, alerts, selectedSeason, season.daysLeft]);

  return (
    <div className="mx-auto max-w-7xl space-y-5 animate-in fade-in duration-500">
      <DashboardHero
        name={firstName}
        seasons={seasons}
        selectedSeasonId={selectedSeason?.id}
        onSeasonChange={setSelectedSeasonId}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardStatCard label="Total Outstanding" value={money(kpis.totalOutstanding)} hint="Receivable from farmers" icon={PiggyBank} />
        <DashboardStatCard label="Today's Collection" value={money(kpis.collectionToday)} hint="vs yesterday" trend={kpis.collectionTodayTrend} icon={Wallet} />
        <DashboardStatCard label="Today's Profit" value={money(kpis.profitToday)} hint="vs yesterday" trend={kpis.profitTodayTrend} icon={TrendingUp} />
        <DashboardStatCard label="Total Farmers" value={String(kpis.totalFarmers)} hint="Active this season" icon={Users} />
      </div>

      <QuickActions />

      <KeyOverviewCard items={overviewItems} />

      <CropPerformanceCard totals={totals} crops={crops} avgYield={avgYield} seasonName={selectedSeason?.name} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SaleCostsCard totals={totals} />
        <BuyerOutstandingCard rows={buyers} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <OutstandingCard rows={outstanding} total={kpis.totalOutstanding} />
        <InventoryAlertsCard alerts={alerts as any} />
        <SeasonProgressCard
          seasonName={selectedSeason?.name}
          status={selectedSeason?.status}
          startDate={selectedSeason?.start_date}
          endDate={selectedSeason?.end_date}
          progress={season.seasonProgress}
          daysLeft={season.daysLeft}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AIInsightsCard insights={insights} />
        <NotificationsCard items={notifications} />
      </div>
    </div>
  );
};

export default Dashboard;
