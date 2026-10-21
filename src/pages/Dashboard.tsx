import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSeason } from "@/contexts/SeasonContext";
import { useLanguage } from "@/contexts/LanguageContext";
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
  ShoppingCart, Store, TrendingUp, Users, Wallet,
} from "lucide-react";

const money = (n: number) => `Rs ${Math.round(n).toLocaleString()}`;

const Dashboard = () => {
  const { profile } = useAuth();
  const { seasons, selectedSeason, setSelectedSeasonId } = useSeason();
  const { t, language } = useLanguage();
  const { kpis, overview, outstanding, alerts, season, totals, crops, buyers, avgYield } = useDashboardData();

  const firstName = (profile?.full_name || "Farmer").split(" ")[0];

  const overviewItems = useMemo<OverviewItem[]>(
    () => [
      { label: t("dashboard.salesMonth"), sublabel: t("dashboard.thisMonth"), value: money(overview.salesMonth), trend: overview.salesTrend, icon: ShoppingCart, tone: "emerald" },
      { label: t("dashboard.expensesMonth"), sublabel: t("dashboard.thisMonth"), value: money(overview.expensesMonth), trend: overview.expensesTrend, icon: Package, tone: "rose" },
      { label: t("dashboard.netProfit"), sublabel: t("dashboard.thisMonth"), value: money(overview.profitMonth), trend: overview.profitTrend, icon: BarChart3, tone: "sky" },
      { label: t("dashboard.collectionMonth"), sublabel: t("dashboard.thisMonth"), value: money(overview.collectionMonth), trend: overview.collectionTrend, icon: Wallet, tone: "amber" },
    ],
    [overview, t]
  );

  const insights = useMemo<Insight[]>(() => {
    const list: Insight[] = [];
    if (overview.profitTrend !== 0) {
      const verb = overview.profitTrend >= 0 ? t("dashboard.profitIncreased") : t("dashboard.profitDecreased");
      list.push({
        title: `${verb} (${Math.abs(overview.profitTrend).toFixed(0)}%)`,
        description: t("dashboard.comparedLastMonth"),
        icon: TrendingUp,
        tone: overview.profitTrend >= 0 ? "emerald" : "amber",
      });
    }
    if (alerts.length > 0) {
      list.push({
        title: t("dashboard.inventoryRefill"),
        description: language === "sd"
          ? `${alerts.length} شيون گودام ۾ گهٽ يا ختم آهن.`
          : language === "ur"
          ? `${alerts.length} اشیاء گودام میں کم یا ختم ہیں۔`
          : `${alerts.length} item${alerts.length > 1 ? "s are" : " is"} low or out of stock.`,
        icon: Boxes,
        tone: "sky",
      });
    }
    if (kpis.buyerOutstanding > 0) {
      list.push({
        title: t("dashboard.buyerDuesPending"),
        description: language === "sd"
          ? `${money(kpis.buyerOutstanding)} خريدارن کان وٺڻو آهي.`
          : language === "ur"
          ? `${money(kpis.buyerOutstanding)} خریداروں سے وصول کرنا ہے۔`
          : `${money(kpis.buyerOutstanding)} is still receivable from buyers/mills.`,
        icon: Store,
        tone: "amber",
      });
    }
    if (kpis.farmerPayables > 0) {
      list.push({
        title: t("dashboard.farmerBalancePayable"),
        description: language === "sd"
          ? `${money(kpis.farmerPayables)} هارين کي ڏيڻو آهي.`
          : language === "ur"
          ? `${money(kpis.farmerPayables)} کسانوں کو ادا کرنا ہے۔`
          : `${money(kpis.farmerPayables)} is payable to farmers.`,
        icon: PiggyBank,
        tone: "emerald",
      });
    }
    if (overview.collectionTrend !== 0) {
      list.push({
        title: t("dashboard.collectionRate"),
        description: `${Math.abs(overview.collectionTrend).toFixed(0)}% ${overview.collectionTrend >= 0 ? "+" : "−"}`,
        icon: Wallet,
        tone: "violet",
      });
    }
    return list.slice(0, 4);
  }, [overview, alerts.length, kpis.buyerOutstanding, kpis.farmerPayables, t, language]);

  const notifications = useMemo<NotificationItem[]>(() => {
    const list: NotificationItem[] = [];
    const overdue = outstanding.filter((o) => o.days >= 30).slice(0, 2);
    overdue.forEach((o) =>
      list.push({
        id: `due-${o.farmerId}`,
        title: o.isPayable ? t("dashboard.farmerCredit") : t("dashboard.paymentDue"),
        description: `${o.name} — ${money(Math.abs(o.amount))}`,
        time: `${o.days}d`,
        icon: Wallet,
        status: o.isPayable ? "info" : "danger",
      })
    );
    alerts.slice(0, 2).forEach((a) =>
      list.push({
        id: `stock-${a.id}`,
        title: a.level === "out" ? t("inventory.outOfStock") : t("inventory.lowStock"),
        description: `${a.name} — ${a.level === "out" ? t("inventory.reorderNeeded") : `${a.stock} ${a.unit}`}`,
        time: t("dashboard.today"),
        icon: AlertTriangle,
        status: a.level === "out" ? "danger" : "warning",
      })
    );
    if (selectedSeason && season.daysLeft > 0 && season.daysLeft <= 30) {
      list.push({
        id: "season-closing",
        title: t("dashboard.seasonClosingSoon"),
        description: `${selectedSeason.name} — ${season.daysLeft} ${t("dashboard.daysLeft")}`,
        time: `${season.daysLeft}d`,
        icon: CalendarClock,
        status: "warning",
      });
    }
    if (outstanding.length > 0) {
      list.push({
        id: "accounts-pending",
        title: t("dashboard.farmerAccountsOpen"),
        description: `${outstanding.length} ${t("dashboard.farmerBalances")}`,
        time: t("dashboard.now"),
        icon: Users,
        status: "info",
      });
    }
    list.push({
      id: "bills-ready",
      title: t("dashboard.billsReady"),
      description: t("dashboard.billsReadyDesc"),
      time: t("dashboard.now"),
      icon: FileCheck2,
      status: "success",
    });
    return list.slice(0, 6);
  }, [outstanding, alerts, selectedSeason, season.daysLeft, t, language]);


  return (
    <div className="mx-auto max-w-7xl space-y-5 animate-in fade-in duration-500">
      <DashboardHero
        name={firstName}
        seasons={seasons}
        selectedSeasonId={selectedSeason?.id}
        onSeasonChange={setSelectedSeasonId}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardStatCard label={t("dashboard.buyerOutstanding")} value={money(kpis.buyerOutstanding)} hint={t("dashboard.buyerOutstandingHint")} icon={Store} />
        <DashboardStatCard
          label={kpis.farmerPayables > 0 ? t("dashboard.farmerPayables") : t("dashboard.farmerReceivables")}
          value={kpis.farmerPayables > 0 ? money(kpis.farmerPayables) : money(kpis.farmerReceivables)}
          hint={kpis.farmerPayables > 0 ? t("dashboard.farmerPayablesHint") : t("dashboard.farmerReceivablesHint")}
          icon={Users}
        />
        <DashboardStatCard label={t("dashboard.collectionToday")} value={money(kpis.collectionToday)} hint={t("dashboard.vsYesterday")} trend={kpis.collectionTodayTrend} icon={Wallet} />
        <DashboardStatCard label={t("dashboard.profitToday")} value={money(kpis.profitToday)} hint={t("dashboard.vsYesterday")} trend={kpis.profitTodayTrend} icon={TrendingUp} />
      </div>

      <QuickActions />

      <KeyOverviewCard items={overviewItems} />

      <CropPerformanceCard totals={totals} crops={crops} avgYield={avgYield} seasonName={selectedSeason?.name} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SaleCostsCard totals={totals} />
        <BuyerOutstandingCard rows={buyers} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <OutstandingCard
          rows={outstanding}
          buyerOutstanding={kpis.buyerOutstanding}
          farmerPayables={kpis.farmerPayables}
          farmerReceivables={kpis.farmerReceivables}
        />
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
