import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { offlineRepo, isOnline } from "@/lib/offline";
import { useSeason } from "@/contexts/SeasonContext";
import { computeTotals, groupByCrop, summarizeFarmer, averageYield } from "@/lib/ledger/aggregate";
import type { Tables } from "@/integrations/supabase/types";


type Entry = Tables<"ledger_entries">;
type Item = Tables<"inventory">;

const isSameDay = (d: string | null | undefined, ref: Date) => {
  if (!d) return false;
  const dt = new Date(d);
  return dt.getFullYear() === ref.getFullYear() && dt.getMonth() === ref.getMonth() && dt.getDate() === ref.getDate();
};
const monthKey = (d: string | null | undefined) => (d ? new Date(d).toISOString().slice(0, 7) : "");
const pct = (curr: number, prev: number) => {
  if (!prev) return curr > 0 ? 100 : 0;
  return ((curr - prev) / Math.abs(prev)) * 100;
};

export interface OutstandingRow {
  farmerId: string;
  name: string;
  photoUrl: string | null;
  amount: number;
  days: number;
}

/**
 * Single data source for the dashboard. Reuses the existing supabase tables and
 * the offline repository — no new business logic, only aggregation for display.
 */
export const useDashboardData = () => {
  const { selectedSeason, farmerSeasons } = useSeason();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [inventory, setInventory] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        if (isOnline()) {
          let q = supabase.from("ledger_entries").select("*");
          if (selectedSeason) q = q.eq("season_id", selectedSeason.id);
          const [entriesRes, invRes] = await Promise.all([q, supabase.from("inventory").select("*")]);
          if (cancelled) return;
          setEntries((entriesRes.data as Entry[]) ?? []);
          setInventory((invRes.data as Item[]) ?? []);
        } else {
          const [localEntries, localInv] = await Promise.all([
            offlineRepo.listLocal("ledger_entries", (e: any) => !selectedSeason || e.season_id === selectedSeason.id),
            offlineRepo.listLocal("inventory"),
          ]);
          if (cancelled) return;
          setEntries(localEntries as Entry[]);
          setInventory(localInv as Item[]);
        }
      } catch (err) {
        console.error("Dashboard data error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedSeason?.id]);

  return useMemo(() => {
    const today = new Date();
    const thisMonth = today.toISOString().slice(0, 7);
    const prevDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const prevMonth = prevDate.toISOString().slice(0, 7);
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);

    const dateOf = (e: Entry) => e.entry_date ?? e.created_at;
    const sum = (list: Entry[]) => list.reduce((s, e) => s + Number(e.amount || 0), 0);
    const byType = (type: string, filter?: (e: Entry) => boolean) =>
      entries.filter((e) => e.entry_type === type && (!filter || filter(e)));

    const inMonth = (m: string) => (e: Entry) => monthKey(dateOf(e)) === m;
    const onDay = (d: Date) => (e: Entry) => isSameDay(dateOf(e), d);

    const salesMonth = sum(byType("sale", inMonth(thisMonth)));
    const salesPrev = sum(byType("sale", inMonth(prevMonth)));
    const expensesMonth = sum(byType("expense", inMonth(thisMonth)));
    const expensesPrev = sum(byType("expense", inMonth(prevMonth)));
    const collectionMonth = sum(byType("payment", inMonth(thisMonth)));
    const collectionPrev = sum(byType("payment", inMonth(prevMonth)));
    const profitMonth = salesMonth - expensesMonth;
    const profitPrev = salesPrev - expensesPrev;

    const collectionToday = sum(byType("payment", onDay(today)));
    const collectionYesterday = sum(byType("payment", onDay(yesterday)));
    const profitToday = sum(byType("sale", onDay(today))) - sum(byType("expense", onDay(today)));
    const profitYesterday = sum(byType("sale", onDay(yesterday))) - sum(byType("expense", onDay(yesterday)));

    // Outstanding per farmer — derived from the shared aggregator so
    // Dashboard, Reports and Farmer pages never disagree.
    const outstanding: OutstandingRow[] = farmerSeasons
      .map((fs: any) => {
        const s = summarizeFarmer(entries as any[], fs.farmer_id, Number(fs.opening_balance || 0));
        const farmerEntries = entries.filter((e) => e.farmer_id === fs.farmer_id);
        const lastPayment = farmerEntries
          .filter((e) => e.entry_type === "payment")
          .map((e) => new Date(dateOf(e)).getTime())
          .sort((a, b) => b - a)[0];
        const since = lastPayment ?? new Date(fs.created_at).getTime();
        const days = Math.max(0, Math.round((today.getTime() - since) / 86400000));
        return {
          farmerId: fs.farmer_id,
          name: fs.farmers?.name ?? "—",
          photoUrl: fs.farmers?.photo_url ?? null,
          amount: s.balanceDue,
          days,
        };
      })
      .filter((r) => r.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    const totalOutstanding = outstanding.reduce((s, r) => s + r.amount, 0);


    const alerts = inventory
      .map((i) => {
        const stock = Number(i.current_stock || 0);
        const threshold = Number(i.low_stock_threshold || 0);
        const level: "out" | "low" | "ok" = stock <= 0 ? "out" : stock <= threshold ? "low" : "ok";
        return { id: i.id, name: i.item_name, stock, unit: i.unit, level };
      })
      .filter((i) => i.level !== "ok")
      .sort((a, b) => (a.level === "out" ? -1 : 1) - (b.level === "out" ? -1 : 1));

    // Season progress
    let seasonProgress = 0;
    let daysLeft = 0;
    if (selectedSeason?.start_date) {
      const start = new Date(selectedSeason.start_date).getTime();
      const end = selectedSeason.end_date ? new Date(selectedSeason.end_date).getTime() : null;
      if (end && end > start) {
        seasonProgress = Math.min(100, Math.max(0, ((today.getTime() - start) / (end - start)) * 100));
        daysLeft = Math.max(0, Math.round((end - today.getTime()) / 86400000));
      }
    }

    return {
      loading,
      entries,
      inventory,
      kpis: {
        totalOutstanding,
        collectionToday,
        collectionTodayTrend: pct(collectionToday, collectionYesterday),
        profitToday,
        profitTodayTrend: pct(profitToday, profitYesterday),
        totalFarmers: farmerSeasons.length,
      },
      overview: {
        salesMonth,
        salesTrend: pct(salesMonth, salesPrev),
        expensesMonth,
        expensesTrend: pct(expensesMonth, expensesPrev),
        profitMonth,
        profitTrend: pct(profitMonth, profitPrev),
        collectionMonth,
        collectionTrend: pct(collectionMonth, collectionPrev),
      },
      outstanding,
      alerts,
      season: { seasonProgress, daysLeft },
    };
  }, [entries, inventory, farmerSeasons, selectedSeason?.id, loading]);
};
