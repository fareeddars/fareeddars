import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { offlineRepo, isOnline } from "@/lib/offline";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSeason } from "@/contexts/SeasonContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Plus, CalendarIcon, TrendingDown, TrendingUp, Wallet, HandCoins, Lock, BookOpen, Pencil, Trash2, Search, X, Loader2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";
import FarmerAvatar from "@/components/FarmerAvatar";
import { deriveSale, money as fmtMoney, qty as fmtQty } from "@/lib/ledger/aggregate";
import { computeSale, averageYieldPerAcre, WEIGHT_UNITS, AREA_UNITS, num, money, qty, type WeightUnit, type AreaUnit } from "@/lib/ledger/calc";

const EXPENSE_CATEGORIES = [
  { key: "Seed", label: "expense.seed" },
  { key: "Fertilizer", label: "expense.fertilizer" },
  { key: "Pesticide", label: "expense.pesticide" },
  { key: "Diesel", label: "expense.diesel" },
  { key: "Irrigation", label: "expense.irrigation" },
  { key: "Labour", label: "expense.labor" },
  { key: "Tractor", label: "expense.tractor" },
  { key: "Cash", label: "expense.cash" },
  { key: "Others", label: "expense.other" },
];

type CostAllocation = "farmer" | "shared" | "landlord";

/** Compact sale details derived from the shared aggregator (single source of truth). */
const SaleMeta = ({ e }: { e: any }) => {
  const s = deriveSale(e);
  const bits: string[] = [];
  if (e.crop_type) bits.push(String(e.crop_type));
  if (e.field_name) bits.push(String(e.field_name));
  if (s.netWeight > 0) bits.push(`${fmtQty(s.netWeight)} ${e.weight_unit || "kg"}`);
  if (s.costs > 0) bits.push(`Costs ${fmtMoney(s.costs)}`);
  bits.push(`Net ${fmtMoney(s.netSale)}`);
  if (s.paid > 0 || s.remaining > 0) bits.push(`Paid ${fmtMoney(s.paid)} · Due ${fmtMoney(s.remaining)}`);
  if (s.yieldPerAcre != null) bits.push(`${fmtQty(s.yieldPerAcre)} Maund/Acre`);
  return <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground/80">{bits.join(" • ")}</p>;
};

const Ledger = () => {
  const { user, canCreate, canEdit, canDelete } = useAuth();
  const { t } = useLanguage();
  const { selectedSeason, farmerSeasons, isSeasonClosed } = useSeason();
  const { toast } = useToast();
  const [entries, setEntries] = useState<(Tables<"ledger_entries"> & { farmers?: { name: string } | null })[]>([]);
  const [inventory, setInventory] = useState<Tables<"inventory">[]>([]);
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("expense");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [farmerId, setFarmerId] = useState("");
  const [entryDate, setEntryDate] = useState<Date>(new Date());
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [inventoryItemId, setInventoryItemId] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [costAllocation, setCostAllocation] = useState<CostAllocation>("farmer");
  const [grossWeight, setGrossWeight] = useState("");
  const [deductionsVal, setDeductionsVal] = useState("");
  const [saleRate, setSaleRate] = useState("");
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("kg");
  const [rateUnit, setRateUnit] = useState<WeightUnit>("kg");
  const [buyer, setBuyer] = useState("");
  const [fieldName, setFieldName] = useState("");
  const [transportCost, setTransportCost] = useState("");
  const [labourCost, setLabourCost] = useState("");
  const [commissionCost, setCommissionCost] = useState("");
  const [otherCosts, setOtherCosts] = useState("");
  const [totalArea, setTotalArea] = useState("");
  const [areaUnit, setAreaUnit] = useState<AreaUnit>("acre");
  const [totalYield, setTotalYield] = useState("");
  const [yieldUnit, setYieldUnit] = useState<WeightUnit>("maund");
  const [paidAmount, setPaidAmount] = useState("");
  const [saleNotes, setSaleNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [cashAmount, setCashAmount] = useState("");
  const [cropType, setCropType] = useState("");
  const [cropWeight, setCropWeight] = useState("");
  const [cropRate, setCropRate] = useState("");
  const [loanAmount, setLoanAmount] = useState("");

  // Filters
  const [searchText, setSearchText] = useState("");
  const [filterFarmer, setFilterFarmer] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterFromDate, setFilterFromDate] = useState<Date | undefined>(undefined);
  const [filterToDate, setFilterToDate] = useState<Date | undefined>(undefined);

  // Season farmers for dropdown (only active ones in selected season)
  const seasonFarmers = farmerSeasons.filter(fs => fs.status === "active");

  const fetchData = async () => {
    if (isOnline()) {
      let entriesQuery = supabase.from("ledger_entries").select("*, farmers(name, photo_url)").order("created_at", { ascending: false });
      if (selectedSeason) {
        entriesQuery = entriesQuery.eq("season_id", selectedSeason.id);
      }
      const [entriesRes, inventoryRes] = await Promise.all([
        entriesQuery,
        supabase.from("inventory").select("*"),
      ]);
      if (entriesRes.data) {
        setEntries(entriesRes.data);
        await offlineRepo.hydrate("ledger_entries", entriesRes.data.map(({ farmers, ...rest }: any) => rest));
      }
      if (inventoryRes.data) {
        setInventory(inventoryRes.data);
        await offlineRepo.hydrate("inventory", inventoryRes.data);
      }
      return;
    }
    // Offline: read from local cache, manually join farmer name
    const [localEntries, localInv, localFarmers] = await Promise.all([
      offlineRepo.listLocal("ledger_entries", (e) => !selectedSeason || e.season_id === selectedSeason.id),
      offlineRepo.listLocal("inventory"),
      offlineRepo.listLocal("farmers"),
    ]);
    const farmerMap = new Map(localFarmers.map((f: any) => [f.id, { name: f.name, photo_url: f.photo_url }]));
    const merged = localEntries
      .map((e: any) => ({ ...e, farmers: farmerMap.has(e.farmer_id) ? farmerMap.get(e.farmer_id) : null }))
      .sort((a: any, b: any) => (b.created_at || "").localeCompare(a.created_at || ""));
    setEntries(merged as any);
    setInventory(localInv as any);
  };

  useEffect(() => { fetchData(); }, [selectedSeason?.id]);

  // Deep-link from Dashboard quick actions: open the existing entry dialog on a tab
  const location = useLocation();
  useEffect(() => {
    const state = location.state as { openEntry?: boolean; tab?: string } | null;
    if (state?.openEntry) {
      if (state.tab) setActiveTab(state.tab);
      setOpen(true);
      window.history.replaceState({}, "");
    }
  }, [location.state]);

  useEffect(() => {
    if (inventoryItemId && inventoryItemId !== "none") {
      const item = inventory.find((i) => i.id === inventoryItemId);
      if (item) setPrice(String(item.price_per_unit));
    }
  }, [inventoryItemId, inventory]);

  const computedExpenseAmount = () => {
    if (price && quantity) return Number(price) * Number(quantity);
    return Number(expenseAmount) || 0;
  };

  const sale = computeSale({
    grossWeight: num(grossWeight),
    deductions: num(deductionsVal),
    weightUnit,
    rate: num(saleRate),
    rateUnit,
    transportCost: num(transportCost),
    labourCost: num(labourCost),
    commissionCost: num(commissionCost),
    otherCosts: num(otherCosts),
    totalArea: num(totalArea),
    areaUnit,
    totalYield: num(totalYield),
    yieldUnit,
    paidAmount: num(paidAmount),
  });
  const avgYield = averageYieldPerAcre(entries as any[], { cropType: cropType || description, excludeId: editingId });
  const netWeight = () => sale.netWeight;
  const saleTotal = () => sale.grossSale;
  const cropTotal = () => (Number(cropWeight) || 0) * (Number(cropRate) || 0);

  const resetForm = () => {
    setFarmerId(""); setEntryDate(new Date()); setDescription("");
    setCategory(""); setInventoryItemId(""); setPrice(""); setQuantity(""); setExpenseAmount(""); setCostAllocation("farmer");
    setGrossWeight(""); setDeductionsVal(""); setSaleRate(""); setWeightUnit("kg"); setRateUnit("kg");
    setBuyer(""); setFieldName(""); setTransportCost(""); setLabourCost(""); setCommissionCost(""); setOtherCosts("");
    setTotalArea(""); setAreaUnit("acre"); setTotalYield(""); setYieldUnit("maund"); setPaidAmount(""); setSaleNotes("");
    setPaymentMethod("cash"); setCashAmount(""); setCropType(""); setCropWeight(""); setCropRate("");
    setLoanAmount(""); setActiveTab("expense");
    setEditingId(null);
  };

  const openEdit = (e: any) => {
    setEditingId(e.id);
    setActiveTab(e.entry_type || "expense");
    setFarmerId(e.farmer_id || "");
    setEntryDate(e.entry_date ? new Date(e.entry_date + "T00:00:00") : new Date());
    setDescription(e.description || "");
    if (e.entry_type === "expense") {
      setCategory(e.category || "");
      setInventoryItemId(e.inventory_item_id || "");
      setPrice(e.rate != null ? String(e.rate) : "");
      setQuantity(e.quantity != null ? String(e.quantity) : "");
      setExpenseAmount(e.rate && e.quantity ? "" : String(e.amount ?? ""));
      setCostAllocation(e.payment_method === "landlord_only" ? "landlord" : e.is_shared ? "shared" : "farmer");
    } else if (e.entry_type === "sale") {
      setGrossWeight(e.gross_weight != null ? String(e.gross_weight) : "");
      setDeductionsVal(e.deductions != null ? String(e.deductions) : "");
      setSaleRate(e.rate != null ? String(e.rate) : "");
      setWeightUnit((e.weight_unit as WeightUnit) || "kg");
      setRateUnit((e.rate_unit as WeightUnit) || "kg");
      setBuyer(e.buyer || "");
      setFieldName(e.field_name || "");
      setCropType(e.crop_type || "");
      setTransportCost(e.transport_cost ? String(e.transport_cost) : "");
      setLabourCost(e.labour_cost ? String(e.labour_cost) : "");
      setCommissionCost(e.commission_cost ? String(e.commission_cost) : "");
      setOtherCosts(e.other_costs ? String(e.other_costs) : "");
      setTotalArea(e.total_area != null ? String(e.total_area) : "");
      setAreaUnit((e.area_unit as AreaUnit) || "acre");
      setTotalYield(e.total_yield != null ? String(e.total_yield) : "");
      setYieldUnit((e.yield_unit as WeightUnit) || "maund");
      setPaidAmount(e.paid_amount ? String(e.paid_amount) : "");
      setSaleNotes(e.notes || "");
    } else if (e.entry_type === "payment") {
      setPaymentMethod(e.payment_method || "cash");
      if ((e.payment_method || "cash") === "cash") setCashAmount(String(e.amount ?? ""));
      else { setCropType(e.crop_type || ""); setCropWeight(e.crop_weight != null ? String(e.crop_weight) : ""); setCropRate(e.rate != null ? String(e.rate) : ""); }
    } else if (e.entry_type === "loan") {
      setLoanAmount(String(e.amount ?? ""));
    }
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await offlineRepo.remove("ledger_entries", id);
      toast({ title: isOnline() ? "Entry deleted" : "Deleted offline — will sync" });
      fetchData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleSave = async () => {
    if (!user || !farmerId || !selectedSeason) return;
    if (saving) return;

    // === VALIDATION ===
    const dateStr = format(entryDate, "yyyy-MM-dd");
    let amount = 0;
    if (activeTab === "expense") {
      amount = computedExpenseAmount();
      if (!category) { toast({ title: "Category required", variant: "destructive" }); return; }
      if (amount <= 0) { toast({ title: "Amount must be greater than 0", variant: "destructive" }); return; }
    } else if (activeTab === "sale") {
      const gw = Number(grossWeight) || 0;
      const dw = Number(deductionsVal) || 0;
      const nw = netWeight();
      const rt = Number(saleRate) || 0;
      if (gw <= 0) { toast({ title: "Gross weight required", variant: "destructive" }); return; }
      if (nw <= 0) { toast({ title: "Net weight must be > 0 (Gross − Deductions)", variant: "destructive" }); return; }
      if (rt <= 0) { toast({ title: "Rate per kg required", variant: "destructive" }); return; }
      if (dw < 0) { toast({ title: "Deductions cannot be negative", variant: "destructive" }); return; }
      amount = saleTotal();
    } else if (activeTab === "payment") {
      amount = paymentMethod === "cash" ? (Number(cashAmount) || 0) : cropTotal();
      if (paymentMethod === "crop_return" && !cropType.trim()) { toast({ title: "Crop name required", variant: "destructive" }); return; }
      if (amount <= 0) { toast({ title: "Payment amount must be > 0", variant: "destructive" }); return; }
    } else if (activeTab === "loan") {
      amount = Number(loanAmount) || 0;
      if (amount <= 0) { toast({ title: "Loan amount must be > 0", variant: "destructive" }); return; }
    }

    // === DUPLICATE CHECK (block) ===
    const isDuplicate = entries.some((e: any) =>
      e.id !== editingId &&
      e.farmer_id === farmerId &&
      e.entry_type === activeTab &&
      e.entry_date === dateStr &&
      Math.abs(Number(e.amount) - amount) < 0.01
    );
    if (isDuplicate) {
      toast({
        title: "Duplicate entry blocked",
        description: `An entry with same farmer, type, date and amount (₨ ${amount.toLocaleString()}) already exists. Edit the existing one instead.`,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Find the farmer_season record
      const fs = farmerSeasons.find(fs => fs.farmer_id === farmerId && fs.season_id === selectedSeason.id);
      let entryData: Record<string, unknown> = {
        farmer_id: farmerId, entry_type: activeTab, description, created_by: user.id,
        entry_date: dateStr,
        season_id: selectedSeason.id,
        farmer_season_id: fs?.id || null,
      };

      if (activeTab === "expense") {
        const isShared = costAllocation === "shared";
        entryData = {
          ...entryData, amount, category,
          inventory_item_id: inventoryItemId && inventoryItemId !== "none" ? inventoryItemId : null,
          quantity: quantity ? Number(quantity) : null,
          rate: price ? Number(price) : null,
          is_shared: isShared,
          shared_amount: isShared ? amount / 2 : null,
          payment_method: costAllocation === "landlord" ? "landlord_only" : null,
        };
      } else if (activeTab === "sale") {
        entryData = {
          ...entryData, amount,
          gross_weight: num(grossWeight), deductions: num(deductionsVal), net_weight: sale.netWeight,
          rate: num(saleRate), weight_unit: weightUnit, rate_unit: rateUnit,
          buyer: buyer.trim() || null, field_name: fieldName.trim() || null,
          crop_type: cropType.trim() || description.trim() || null,
          transport_cost: num(transportCost), labour_cost: num(labourCost),
          commission_cost: num(commissionCost), other_costs: num(otherCosts),
          total_area: num(totalArea) || null, area_unit: areaUnit,
          total_yield: num(totalYield) || null, yield_unit: yieldUnit,
          paid_amount: num(paidAmount), payment_status: sale.paymentStatus,
          notes: saleNotes.trim() || null,
        };
      } else if (activeTab === "payment") {
        entryData = { ...entryData, amount, payment_method: paymentMethod, crop_type: paymentMethod === "crop_return" ? cropType : null, crop_weight: paymentMethod === "crop_return" && cropWeight ? Number(cropWeight) : null, rate: paymentMethod === "crop_return" && cropRate ? Number(cropRate) : null };
      } else if (activeTab === "loan") {
        entryData = { ...entryData, amount, entry_type: "loan" };
      }

      // ===== Optimistic UI: update list instantly =====
      const farmerRow = (farmerSeasons.find((x: any) => x.farmer_id === farmerId) as any)?.farmers;
      const farmerName = farmerRow?.name || "";
      const farmerPhoto = farmerRow?.photo_url || null;
      const nowIso = new Date().toISOString();

      if (editingId) {
        setEntries((prev) => prev.map((e: any) =>
          e.id === editingId ? { ...e, ...entryData, updated_at: nowIso } : e
        ));
      } else {
        const tempId = (typeof crypto !== "undefined" && "randomUUID" in crypto)
          ? crypto.randomUUID()
          : `tmp-${Date.now()}`;
        const optimisticEntry: any = {
          ...entryData,
          id: tempId,
          created_at: nowIso,
          updated_at: nowIso,
          farmers: { name: farmerName, photo_url: farmerPhoto },
        };
        (entryData as any).id = tempId;
        setEntries((prev) => [optimisticEntry, ...prev]);

        // Optimistic inventory deduction
        if (activeTab === "expense" && inventoryItemId && inventoryItemId !== "none" && quantity) {
          const item = inventory.find((i) => i.id === inventoryItemId);
          if (item) {
            setInventory((prev) => prev.map((i: any) =>
              i.id === inventoryItemId ? { ...i, current_stock: i.current_stock - Number(quantity) } : i
            ));
          }
        }
      }

      // Reset/close UI immediately so it feels instant
      const wasEditing = !!editingId;
      const inventoryItemForBg = inventoryItemId;
      const quantityForBg = quantity;
      const activeTabForBg = activeTab;

      if (wasEditing) {
        setOpen(false);
        resetForm();
      } else {
        const keepFarmer = farmerId;
        const keepTab = activeTab;
        resetForm();
        setFarmerId(keepFarmer);
        setActiveTab(keepTab);
      }
      toast({ title: wasEditing ? "Entry updated" : (isOnline() ? "Entry added successfully" : "Saved offline — will sync") });

      // ===== Background persistence (don't block UI) =====
      (async () => {
        try {
          if (wasEditing) {
            const { created_by, ...patch } = entryData as any;
            await offlineRepo.update("ledger_entries", editingId!, patch);
          } else {
            await offlineRepo.insert("ledger_entries", entryData);
          }
          if (!wasEditing && activeTabForBg === "expense" && inventoryItemForBg && inventoryItemForBg !== "none" && quantityForBg) {
            const item = inventory.find((i) => i.id === inventoryItemForBg);
            if (item) {
              await offlineRepo.update("inventory", inventoryItemForBg, { current_stock: item.current_stock - Number(quantityForBg) });
            }
          }
          // Quietly refresh in background to reconcile any server-side changes
          fetchData();
        } catch (e: any) {
          toast({ title: "Sync error", description: e.message, variant: "destructive" });
          fetchData();
        }
      })();
    } finally {
      setSaving(false);
    }
  };

  const typeBadge = (type: string) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      expense: { bg: "bg-red-500/10 dark:bg-red-500/20 border-red-500/20", text: "text-red-700 dark:text-red-400", label: t("ledger.expense") },
      sale: { bg: "bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/20", text: "text-emerald-700 dark:text-emerald-400", label: t("ledger.sale") },
      payment: { bg: "bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/20", text: "text-amber-700 dark:text-amber-400", label: t("ledger.payment") },
      loan: { bg: "bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/20", text: "text-blue-700 dark:text-blue-400", label: t("ledger.loan") },
    };
    const c = config[type] || config.expense;
    return <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider", c.bg, c.text)}>{c.label}</span>;
  };

  const getAllocationLabel = (entry: any) => {
    if (entry.entry_type !== "expense") return null;
    if (entry.payment_method === "landlord_only") return <span className="text-[10px] px-2 py-0.5 rounded-md border border-purple-500/20 bg-purple-500/10 text-purple-700 dark:text-purple-400 font-bold uppercase tracking-wider">{t("ledger.landlordOnly")}</span>;
    if (entry.is_shared) return <span className="text-[10px] px-2 py-0.5 rounded-md border border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-400 font-bold uppercase tracking-wider">50/50</span>;
    return <span className="text-[10px] px-2 py-0.5 rounded-md border border-muted-foreground/20 bg-muted/50 text-muted-foreground font-bold uppercase tracking-wider">{t("ledger.farmerOnly")}</span>;
  };

  // Stats
  const totalExpenses = entries.filter(e => e.entry_type === "expense").reduce((s, e) => s + Number(e.amount), 0);
  const totalSales = entries.filter(e => e.entry_type === "sale").reduce((s, e) => s + Number(e.amount), 0);
  const totalPayments = entries.filter(e => e.entry_type === "payment").reduce((s, e) => s + Number(e.amount), 0);
  const totalLoans = entries.filter(e => e.entry_type === "loan").reduce((s, e) => s + Number(e.amount), 0);

  // Filtered entries
  const filteredEntries = entries.filter((e) => {
    if (filterFarmer !== "all" && e.farmer_id !== filterFarmer) return false;
    if (filterType !== "all" && e.entry_type !== filterType) return false;
    if (filterCategory !== "all" && ((e as any).category || "").toLowerCase() !== filterCategory.toLowerCase()) return false;
    const d = e.entry_date ? new Date(e.entry_date + "T00:00:00") : new Date(e.created_at);
    if (filterFromDate && d < new Date(filterFromDate.setHours(0, 0, 0, 0))) return false;
    if (filterToDate) {
      const to = new Date(filterToDate);
      to.setHours(23, 59, 59, 999);
      if (d > to) return false;
    }
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      const hay = [e.farmers?.name, e.description, (e as any).category, e.entry_type].filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const hasActiveFilters = searchText || filterFarmer !== "all" || filterType !== "all" || filterCategory !== "all" || filterFromDate || filterToDate;
  const clearFilters = () => {
    setSearchText(""); setFilterFarmer("all"); setFilterType("all"); setFilterCategory("all");
    setFilterFromDate(undefined); setFilterToDate(undefined);
  };


  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-700">
      {/* Season Closed Banner */}
      {isSeasonClosed && (
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 flex items-center gap-3 text-amber-700 dark:text-amber-400 shadow-sm">
          <Lock className="h-5 w-5 shrink-0" /> <span className="font-medium text-sm">{t("seasons.seasonClosed")}</span>
        </div>
      )}
      {!selectedSeason && (
        <div className="rounded-2xl bg-muted border border-border p-5 text-center text-muted-foreground font-medium">
          {t("seasons.noActiveSeason")}
        </div>
      )}

      {/* --- Premium Header Banner with crop background --- */}
      <div
        className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-10 text-white shadow-2xl border border-violet-900/40 bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(120deg, rgba(46,16,101,0.92) 0%, rgba(76,29,149,0.82) 45%, rgba(88,28,135,0.75) 100%), url(${
            (() => {
              const n = (selectedSeason?.name || "").toLowerCase();
              if (n.includes("cotton") || n.includes("kapas")) return "/cotton-bg.jpg";
              if (n.includes("wheat") || n.includes("gandum")) return "/wheat-bg.jpg";
              return "/sugarcane-bg.jpg";
            })()
          })`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col xl:flex-row gap-4 sm:gap-8 justify-between">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
            <div className="hidden sm:flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-xl border border-white/20 shadow-inner shrink-0">
              <BookOpen className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-serif font-bold tracking-tight text-white drop-shadow-lg mb-1 sm:mb-2">
                {t("ledger.title")}
              </h1>
              <p className="text-white/85 text-xs sm:text-base font-medium tracking-wide max-w-lg drop-shadow">
                Track expenses, sales, and payments{selectedSeason ? ` — ${selectedSeason.name}` : ""}
              </p>
            </div>
          </div>

          {canCreate && !isSeasonClosed && selectedSeason && (
            <div className="flex items-center">
              <Dialog open={open} onOpenChange={(v) => { if (saving && !v) return; setOpen(v); if (!v) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto bg-white text-violet-900 hover:bg-white/90 font-bold shadow-xl shadow-black/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl rounded-xl sm:rounded-2xl h-11 sm:h-14 px-5 sm:px-8 shrink-0 text-sm sm:text-base">
                    <Plus className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />{t("ledger.newTransaction")}
                  </Button>
                </DialogTrigger>
                    <DialogContent
                  className="sm:max-w-xl h-dvh sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-none sm:rounded-2xl"
                  onKeyDown={(e) => { if (e.key === "Enter" && saving) { e.preventDefault(); e.stopPropagation(); } }}
                  onEscapeKeyDown={(e) => { if (saving) e.preventDefault(); }}
                  onPointerDownOutside={(e) => { if (saving) e.preventDefault(); }}
                  onInteractOutside={(e) => { if (saving) e.preventDefault(); }}
                >
                  <DialogHeader className="px-3 sm:px-6 py-2 sm:py-5 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 border-b">
                    <DialogTitle className="font-serif text-base sm:text-2xl flex items-center gap-2 text-violet-900 dark:text-violet-100">
                      <BookOpen className="h-4 w-4 sm:h-6 sm:w-6 text-violet-600 dark:text-violet-400" />
                      {editingId ? "Edit Entry" : t("ledger.newTransaction")}
                    </DialogTitle>
                    <DialogDescription className="text-[10px] sm:text-sm">{t("ledger.addEntry")}</DialogDescription>
                  </DialogHeader>
                  <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-2 sm:py-4">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                      <TabsList className="w-full grid grid-cols-4 h-auto gap-0.5 sm:gap-1 bg-muted/50 p-0.5 sm:p-1 rounded-md sm:rounded-lg mb-2 sm:mb-6">
                        <TabsTrigger value="expense" className="data-[state=active]:bg-red-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-red-500/30 rounded sm:rounded-lg text-[8px] sm:text-xs uppercase tracking-wider py-1.5 sm:py-2.5 transition-all duration-300 font-bold flex flex-col sm:flex-row items-center gap-0 sm:gap-1.5">
                          <TrendingDown className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" /> <span className="text-[7px] sm:text-xs leading-none">{t("ledger.expense")}</span>
                        </TabsTrigger>
                        <TabsTrigger value="sale" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/30 rounded sm:rounded-lg text-[8px] sm:text-xs uppercase tracking-wider py-1.5 sm:py-2.5 transition-all duration-300 font-bold flex flex-col sm:flex-row items-center gap-0 sm:gap-1.5">
                          <TrendingUp className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" /> <span className="text-[7px] sm:text-xs leading-none">{t("ledger.sale")}</span>
                        </TabsTrigger>
                        <TabsTrigger value="payment" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-amber-500/30 rounded sm:rounded-lg text-[8px] sm:text-xs uppercase tracking-wider py-1.5 sm:py-2.5 transition-all duration-300 font-bold flex flex-col sm:flex-row items-center gap-0 sm:gap-1.5">
                          <Wallet className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" /> <span className="text-[7px] sm:text-xs leading-none">{t("ledger.payment")}</span>
                        </TabsTrigger>
                        <TabsTrigger value="loan" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/30 rounded sm:rounded-lg text-[8px] sm:text-xs uppercase tracking-wider py-1.5 sm:py-2.5 transition-all duration-300 font-bold flex flex-col sm:flex-row items-center gap-0 sm:gap-1.5">
                          <HandCoins className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" /> <span className="text-[7px] sm:text-xs leading-none">{t("ledger.loan")}</span>
                        </TabsTrigger>
                      </TabsList>

                      <div className="space-y-1.5 sm:space-y-4 mb-2 sm:mb-6">
                        <div className="grid grid-cols-2 gap-1.5 sm:gap-4">
                          <div className="space-y-0.5 sm:space-y-1.5">
                            <Label className="text-[9px] sm:text-sm font-semibold">{t("ledger.farmer")} *</Label>
                            <Select value={farmerId} onValueChange={setFarmerId}>
                              <SelectTrigger className="h-8 sm:h-11 bg-background text-[10px] sm:text-sm"><SelectValue placeholder={t("ledger.selectFarmer")} /></SelectTrigger>
                              <SelectContent>{seasonFarmers.map((fs) => <SelectItem key={fs.farmer_id} value={fs.farmer_id}>{fs.farmers?.name || "—"}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-0.5 sm:space-y-1.5">
                            <Label className="text-[9px] sm:text-sm font-semibold">{t("common.date")}</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-8 sm:h-11 bg-background text-[10px] sm:text-sm", !entryDate && "text-muted-foreground")}>
                                  <CalendarIcon className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                                  {entryDate ? format(entryDate, "PPP") : t("ledger.pickDate")}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={entryDate} onSelect={(d) => d && setEntryDate(d)} initialFocus /></PopoverContent>
                            </Popover>
                          </div>
                        </div>
                      </div>

                      {/* EXPENSE TAB */}
                      <TabsContent value="expense" className="space-y-1.5 sm:space-y-5">
                        <div className="space-y-0.5 sm:space-y-1.5">
                          <Label className="text-[9px] sm:text-sm font-semibold">{t("ledger.category")}</Label>
                          <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger className="h-8 sm:h-11 bg-background text-[10px] sm:text-sm"><SelectValue placeholder={t("ledger.selectCategory")} /></SelectTrigger>
                            <SelectContent>{EXPENSE_CATEGORIES.map((c) => <SelectItem key={c.key} value={c.key.toLowerCase()}>{t(c.label)}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="hidden sm:block space-y-1.5"><Label className="text-sm font-semibold">{t("common.description")}</Label><Input className="h-11 bg-background" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("ledger.enterDescription")} /></div>
                        <div className="space-y-0.5 sm:space-y-1.5">
                          <Label className="text-[9px] sm:text-sm font-semibold">{t("ledger.linkInventory")}</Label>
                          <Select value={inventoryItemId} onValueChange={setInventoryItemId}>
                            <SelectTrigger className="h-8 sm:h-11 bg-background text-[10px] sm:text-sm"><SelectValue placeholder={t("ledger.selectInventory")} /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">{t("ledger.none")}</SelectItem>
                              {inventory.map((item) => (<SelectItem key={item.id} value={item.id}>{item.item_name} — ₨{item.price_per_unit}/{item.unit} ({t("ledger.stock")}: {item.current_stock})</SelectItem>))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 sm:gap-4">
                          <div className="space-y-0.5 sm:space-y-1.5"><Label className="text-[9px] sm:text-sm font-semibold">{t("ledger.price")} (₨)</Label><Input className="h-8 sm:h-11 bg-background text-[10px] sm:text-sm" type="number" inputMode="decimal" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" /></div>
                          <div className="space-y-0.5 sm:space-y-1.5"><Label className="text-[9px] sm:text-sm font-semibold">{t("ledger.quantity")}</Label><Input className="h-8 sm:h-11 bg-background text-[10px] sm:text-sm" type="number" inputMode="decimal" min="0" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" /></div>
                        </div>
                        {(!price || !quantity) && (<div className="space-y-0.5 sm:space-y-1.5"><Label className="text-[9px] sm:text-sm font-semibold">{t("common.amount")} (₨)</Label><Input className="h-8 sm:h-11 bg-background font-mono text-[10px] sm:text-sm" type="number" inputMode="decimal" min="0" step="0.01" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} placeholder={t("ledger.manualAmount")} /></div>)}
                        {(price && quantity) && (<div className="rounded sm:rounded-xl bg-gradient-to-r from-red-500/10 to-rose-500/10 border border-red-500/20 p-1 sm:p-4 text-[9px] sm:text-sm font-semibold flex justify-between items-center"><span className="text-red-700 dark:text-red-400">{t("common.total")}:</span> <span className="text-xs sm:text-xl font-mono text-red-600 dark:text-red-400">₨ {computedExpenseAmount().toLocaleString()}</span></div>)}

                        {/* Cost Allocation */}
                        <div className="space-y-1 sm:space-y-3 pt-0.5 sm:pt-2">
                          <Label className="text-[9px] sm:text-sm font-semibold">{t("ledger.costAllocation")}</Label>
                          <RadioGroup value={costAllocation} onValueChange={(v) => setCostAllocation(v as CostAllocation)} className="grid grid-cols-3 gap-0.5 sm:gap-2">
                            <Label htmlFor="alloc-farmer" className={cn(
                              "flex flex-col items-center gap-0 sm:gap-1 rounded sm:rounded-xl border-[1.5px] sm:border-2 p-0.5 sm:p-3 cursor-pointer transition-all duration-200 text-center",
                              costAllocation === "farmer" ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-md shadow-indigo-500/20" : "border-muted hover:border-muted-foreground/30 bg-background"
                            )}>
                              <RadioGroupItem value="farmer" id="alloc-farmer" className="sr-only" />
                              <span className="text-xs sm:text-lg">👨‍🌾</span>
                              <span className="text-[7px] sm:text-xs font-semibold leading-tight">{t("ledger.farmerOnly")}</span>
                            </Label>
                            <Label htmlFor="alloc-shared" className={cn(
                              "flex flex-col items-center gap-0 sm:gap-1 rounded sm:rounded-xl border-[1.5px] sm:border-2 p-0.5 sm:p-3 cursor-pointer transition-all duration-200 text-center",
                              costAllocation === "shared" ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20 shadow-md shadow-orange-500/20" : "border-muted hover:border-muted-foreground/30 bg-background"
                            )}>
                              <RadioGroupItem value="shared" id="alloc-shared" className="sr-only" />
                              <span className="text-xs sm:text-lg">🤝</span>
                              <span className="text-[7px] sm:text-xs font-semibold leading-tight">50/50</span>
                            </Label>
                            <Label htmlFor="alloc-landlord" className={cn(
                              "flex flex-col items-center gap-0 sm:gap-1 rounded sm:rounded-xl border-[1.5px] sm:border-2 p-0.5 sm:p-3 cursor-pointer transition-all duration-200 text-center",
                              costAllocation === "landlord" ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-md shadow-purple-500/20" : "border-muted hover:border-muted-foreground/30 bg-background"
                            )}>
                              <RadioGroupItem value="landlord" id="alloc-landlord" className="sr-only" />
                              <span className="text-xs sm:text-lg">🏠</span>
                              <span className="text-[7px] sm:text-xs font-semibold leading-tight">{t("ledger.landlordOnly")}</span>
                            </Label>
                          </RadioGroup>
                          {costAllocation === "shared" && computedExpenseAmount() > 0 && (
                            <div className="hidden sm:block rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-2.5 text-xs font-medium text-orange-700 dark:text-orange-400 text-center">
                              {t("ledger.eachPays")}: ₨ {(computedExpenseAmount() / 2).toLocaleString()}
                            </div>
                          )}
                          {costAllocation === "landlord" && computedExpenseAmount() > 0 && (
                            <div className="hidden sm:block rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 p-2.5 text-xs font-medium text-purple-700 dark:text-purple-400 text-center">
                              {t("ledger.landlordPays")}: ₨ {computedExpenseAmount().toLocaleString()}
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      {/* SALE TAB */}
                      <TabsContent value="sale" className="space-y-2 sm:space-y-4">
                        {/* --- Crop & Buyer --- */}
                        <div className="rounded-lg sm:rounded-xl border border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/20 p-2 sm:p-4 space-y-2 sm:space-y-3">
                          <p className="text-[9px] sm:text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">🌾 Crop Details</p>
                          <div className="grid grid-cols-2 gap-1.5 sm:gap-4">
                            <div className="space-y-0.5 sm:space-y-1.5"><Label className="text-[9px] sm:text-sm font-semibold">{t("ledger.cropType")}</Label><Input className="h-8 sm:h-11 bg-background text-[10px] sm:text-sm" value={cropType} onChange={(e) => setCropType(e.target.value)} placeholder="Wheat / Cotton" /></div>
                            <div className="space-y-0.5 sm:space-y-1.5"><Label className="text-[9px] sm:text-sm font-semibold">Buyer</Label><Input className="h-8 sm:h-11 bg-background text-[10px] sm:text-sm" value={buyer} onChange={(e) => setBuyer(e.target.value)} placeholder="Buyer / Mill name" /></div>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5 sm:gap-4">
                            <div className="space-y-0.5 sm:space-y-1.5"><Label className="text-[9px] sm:text-sm font-semibold">Field / Plot</Label><Input className="h-8 sm:h-11 bg-background text-[10px] sm:text-sm" value={fieldName} onChange={(e) => setFieldName(e.target.value)} placeholder="Field name" /></div>
                            <div className="space-y-0.5 sm:space-y-1.5"><Label className="text-[9px] sm:text-sm font-semibold">{t("common.description")}</Label><Input className="h-8 sm:h-11 bg-background text-[10px] sm:text-sm" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("ledger.enterDescription")} /></div>
                          </div>
                        </div>

                        {/* --- Weight & Rate --- */}
                        <div className="rounded-lg sm:rounded-xl border border-border bg-muted/30 p-2 sm:p-4 space-y-2 sm:space-y-3">
                          <p className="text-[9px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">⚖️ Weight & Rate</p>
                          <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
                            <div className="space-y-0.5 sm:space-y-1.5"><Label className="text-[9px] sm:text-sm font-semibold">{t("ledger.grossWeight")}</Label><Input className="h-8 sm:h-11 bg-background text-[10px] sm:text-sm" type="number" inputMode="decimal" min="0" step="0.01" value={grossWeight} onChange={(e) => setGrossWeight(e.target.value)} placeholder="0" /></div>
                            <div className="space-y-0.5 sm:space-y-1.5"><Label className="text-[9px] sm:text-sm font-semibold">{t("ledger.deductions")}</Label><Input className="h-8 sm:h-11 bg-background text-red-600 font-medium text-[10px] sm:text-sm" type="number" inputMode="decimal" min="0" step="0.01" value={deductionsVal} onChange={(e) => setDeductionsVal(e.target.value)} placeholder="0" /></div>
                            <div className="space-y-0.5 sm:space-y-1.5">
                              <Label className="text-[9px] sm:text-sm font-semibold">Unit</Label>
                              <Select value={weightUnit} onValueChange={(v) => setWeightUnit(v as WeightUnit)}>
                                <SelectTrigger className="h-8 sm:h-11 bg-background text-[10px] sm:text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>{WEIGHT_UNITS.map((u) => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="rounded-md sm:rounded-lg bg-background border border-border p-1.5 sm:p-3 text-[9px] sm:text-sm flex justify-between items-center">
                            <span className="font-semibold text-muted-foreground">{t("ledger.netWeight")} <span className="text-[7px] sm:text-[10px] uppercase tracking-wider text-emerald-600">Auto Calculated</span></span>
                            <span className="font-mono font-bold">{qty(sale.netWeight)} {weightUnit}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5 sm:gap-3">
                            <div className="space-y-0.5 sm:space-y-1.5"><Label className="text-[9px] sm:text-sm font-semibold">Rate (₨)</Label><Input className="h-8 sm:h-11 bg-background font-mono text-[10px] sm:text-sm" type="number" inputMode="decimal" min="0" step="0.01" value={saleRate} onChange={(e) => setSaleRate(e.target.value)} placeholder="0" /></div>
                            <div className="space-y-0.5 sm:space-y-1.5">
                              <Label className="text-[9px] sm:text-sm font-semibold">Rate per</Label>
                              <Select value={rateUnit} onValueChange={(v) => setRateUnit(v as WeightUnit)}>
                                <SelectTrigger className="h-8 sm:h-11 bg-background text-[10px] sm:text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>{WEIGHT_UNITS.map((u) => <SelectItem key={u.value} value={u.value}>Per {u.label}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="rounded-md sm:rounded-lg bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 p-1.5 sm:p-3 text-[9px] sm:text-sm font-semibold flex justify-between items-center">
                            <span className="text-emerald-700 dark:text-emerald-400">Gross Sale <span className="text-[7px] sm:text-[10px] uppercase tracking-wider">Auto</span></span>
                            <span className="text-xs sm:text-lg font-mono text-emerald-600 dark:text-emerald-400">{money(sale.grossSale)}</span>
                          </div>
                        </div>

                        {/* --- Costs --- */}
                        <div className="rounded-lg sm:rounded-xl border border-red-500/20 bg-red-50/40 dark:bg-red-950/20 p-2 sm:p-4 space-y-2 sm:space-y-3">
                          <p className="text-[9px] sm:text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-400">💸 Sale Costs</p>
                          <div className="grid grid-cols-2 gap-1.5 sm:gap-3">
                            <div className="space-y-0.5 sm:space-y-1.5"><Label className="text-[9px] sm:text-sm font-semibold">Transport (₨)</Label><Input className="h-8 sm:h-11 bg-background text-[10px] sm:text-sm" type="number" inputMode="decimal" min="0" step="0.01" value={transportCost} onChange={(e) => setTransportCost(e.target.value)} placeholder="0" /></div>
                            <div className="space-y-0.5 sm:space-y-1.5"><Label className="text-[9px] sm:text-sm font-semibold">Labour (₨)</Label><Input className="h-8 sm:h-11 bg-background text-[10px] sm:text-sm" type="number" inputMode="decimal" min="0" step="0.01" value={labourCost} onChange={(e) => setLabourCost(e.target.value)} placeholder="0" /></div>
                            <div className="space-y-0.5 sm:space-y-1.5"><Label className="text-[9px] sm:text-sm font-semibold">Commission (₨)</Label><Input className="h-8 sm:h-11 bg-background text-[10px] sm:text-sm" type="number" inputMode="decimal" min="0" step="0.01" value={commissionCost} onChange={(e) => setCommissionCost(e.target.value)} placeholder="0" /></div>
                            <div className="space-y-0.5 sm:space-y-1.5"><Label className="text-[9px] sm:text-sm font-semibold">Other (₨)</Label><Input className="h-8 sm:h-11 bg-background text-[10px] sm:text-sm" type="number" inputMode="decimal" min="0" step="0.01" value={otherCosts} onChange={(e) => setOtherCosts(e.target.value)} placeholder="0" /></div>
                          </div>
                          <div className="rounded-md sm:rounded-lg bg-background border border-red-500/20 p-1.5 sm:p-3 text-[9px] sm:text-sm font-semibold flex justify-between items-center">
                            <span className="text-red-700 dark:text-red-400">Total Costs <span className="text-[7px] sm:text-[10px] uppercase tracking-wider">Auto</span></span>
                            <span className="font-mono text-red-600">{money(sale.totalCosts)}</span>
                          </div>
                        </div>

                        {/* --- Yield Summary --- */}
                        <div className="rounded-lg sm:rounded-xl border border-amber-500/20 bg-amber-50/40 dark:bg-amber-950/20 p-2 sm:p-4 space-y-2 sm:space-y-3">
                          <p className="text-[9px] sm:text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">🌱 Yield Summary</p>
                          <div className="grid grid-cols-2 gap-1.5 sm:gap-3">
                            <div className="space-y-0.5 sm:space-y-1.5"><Label className="text-[9px] sm:text-sm font-semibold">Total Area</Label><Input className="h-8 sm:h-11 bg-background text-[10px] sm:text-sm" type="number" inputMode="decimal" min="0" step="0.01" value={totalArea} onChange={(e) => setTotalArea(e.target.value)} placeholder="0" /></div>
                            <div className="space-y-0.5 sm:space-y-1.5">
                              <Label className="text-[9px] sm:text-sm font-semibold">Area Unit</Label>
                              <Select value={areaUnit} onValueChange={(v) => setAreaUnit(v as AreaUnit)}>
                                <SelectTrigger className="h-8 sm:h-11 bg-background text-[10px] sm:text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>{AREA_UNITS.map((u) => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-0.5 sm:space-y-1.5"><Label className="text-[9px] sm:text-sm font-semibold">Total Yield</Label><Input className="h-8 sm:h-11 bg-background text-[10px] sm:text-sm" type="number" inputMode="decimal" min="0" step="0.01" value={totalYield} onChange={(e) => setTotalYield(e.target.value)} placeholder="0" /></div>
                            <div className="space-y-0.5 sm:space-y-1.5">
                              <Label className="text-[9px] sm:text-sm font-semibold">Yield Unit</Label>
                              <Select value={yieldUnit} onValueChange={(v) => setYieldUnit(v as WeightUnit)}>
                                <SelectTrigger className="h-8 sm:h-11 bg-background text-[10px] sm:text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>{WEIGHT_UNITS.map((u) => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5 sm:gap-3 text-[8px] sm:text-xs">
                            <div className="rounded-md bg-background border p-1.5 sm:p-2.5 flex flex-col"><span className="text-muted-foreground font-semibold">Yield / Acre</span><span className="font-mono font-bold text-amber-700 dark:text-amber-400">{sale.yieldPerAcre != null ? `${qty(sale.yieldPerAcre)} ${yieldUnit}` : "—"}</span></div>
                            <div className="rounded-md bg-background border p-1.5 sm:p-2.5 flex flex-col"><span className="text-muted-foreground font-semibold">Cost / Acre</span><span className="font-mono font-bold text-red-600">{sale.costPerAcre != null ? money(sale.costPerAcre) : "—"}</span></div>
                            <div className="rounded-md bg-background border p-1.5 sm:p-2.5 flex flex-col"><span className="text-muted-foreground font-semibold">Sale / Acre</span><span className="font-mono font-bold text-emerald-600">{sale.saleValuePerAcre != null ? money(sale.saleValuePerAcre) : "—"}</span></div>
                            <div className="rounded-md bg-background border p-1.5 sm:p-2.5 flex flex-col"><span className="text-muted-foreground font-semibold">Effective Rate</span><span className="font-mono font-bold">{sale.effectiveRate != null ? `${money(sale.effectiveRate)}/${weightUnit}` : "—"}</span></div>
                          </div>
                          <p className="text-[8px] sm:text-[11px] text-muted-foreground">
                            {avgYield ? `Your average: ${qty(avgYield.value)} ${avgYield.unit}/acre (${avgYield.samples} records)` : "Not enough history yet for average yield comparison."}
                          </p>
                        </div>

                        {/* --- Payment --- */}
                        <div className="rounded-lg sm:rounded-xl border border-blue-500/20 bg-blue-50/40 dark:bg-blue-950/20 p-2 sm:p-4 space-y-2 sm:space-y-3">
                          <p className="text-[9px] sm:text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">💰 Payment</p>
                          <div className="grid grid-cols-2 gap-1.5 sm:gap-3">
                            <div className="space-y-0.5 sm:space-y-1.5"><Label className="text-[9px] sm:text-sm font-semibold">Paid Amount (₨)</Label><Input className="h-8 sm:h-11 bg-background font-mono text-[10px] sm:text-sm" type="number" inputMode="decimal" min="0" step="0.01" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} placeholder="0" /></div>
                            <div className="space-y-0.5 sm:space-y-1.5"><Label className="text-[9px] sm:text-sm font-semibold">Notes</Label><Input className="h-8 sm:h-11 bg-background text-[10px] sm:text-sm" value={saleNotes} onChange={(e) => setSaleNotes(e.target.value)} placeholder="Optional" /></div>
                          </div>
                          <div className="grid grid-cols-3 gap-1.5 sm:gap-3 text-[8px] sm:text-xs">
                            <div className="rounded-md bg-background border p-1.5 sm:p-2.5 flex flex-col"><span className="text-muted-foreground font-semibold">Net Sale</span><span className="font-mono font-bold text-emerald-600">{money(sale.netSale)}</span></div>
                            <div className="rounded-md bg-background border p-1.5 sm:p-2.5 flex flex-col"><span className="text-muted-foreground font-semibold">Remaining</span><span className="font-mono font-bold text-red-600">{money(sale.remaining)}</span></div>
                            <div className="rounded-md bg-background border p-1.5 sm:p-2.5 flex flex-col"><span className="text-muted-foreground font-semibold">Status</span><span className={cn("font-bold uppercase", sale.paymentStatus === "paid" ? "text-emerald-600" : sale.paymentStatus === "partial" ? "text-amber-600" : "text-red-600")}>{sale.paymentStatus}</span></div>
                          </div>
                        </div>

                        <div className="rounded-lg sm:rounded-xl bg-gradient-to-r from-emerald-500/15 to-teal-500/15 border border-emerald-500/30 p-2 sm:p-4 text-[10px] sm:text-sm font-semibold flex justify-between items-center">
                          <span className="text-emerald-700 dark:text-emerald-400">{t("ledger.totalAmount")}</span>
                          <span className="text-sm sm:text-xl font-mono text-emerald-600 dark:text-emerald-400">{money(sale.grossSale)}</span>
                        </div>
                      </TabsContent>

                      {/* PAYMENT TAB */}
                      <TabsContent value="payment" className="space-y-1.5 sm:space-y-4">
                        <div className="hidden sm:block space-y-1.5"><Label className="text-sm font-semibold">{t("common.description")}</Label><Input className="h-11 bg-background" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("ledger.enterDescription")} /></div>
                        <div className="space-y-0.5 sm:space-y-1.5">
                          <Label className="text-[9px] sm:text-sm font-semibold">{t("ledger.paymentMethod")}</Label>
                          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                            <SelectTrigger className="h-8 sm:h-11 bg-background text-[10px] sm:text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">{t("ledger.cashPayment")}</SelectItem>
                              <SelectItem value="crop_return">{t("ledger.cropReturn")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {paymentMethod === "cash" ? (
                          <div className="space-y-0.5 sm:space-y-1.5"><Label className="text-[9px] sm:text-sm font-semibold">{t("common.amount")} (₨)</Label><Input className="h-8 sm:h-11 bg-background font-mono text-amber-600 font-bold text-[10px] sm:text-sm" type="number" inputMode="decimal" min="0" step="0.01" value={cashAmount} onChange={(e) => setCashAmount(e.target.value)} placeholder="0" /></div>
                        ) : (
                          <>
                            <div className="space-y-0.5 sm:space-y-1.5"><Label className="text-[9px] sm:text-sm font-semibold">{t("ledger.cropType")}</Label><Input className="h-8 sm:h-11 bg-background text-[10px] sm:text-sm" value={cropType} onChange={(e) => setCropType(e.target.value)} placeholder="e.g. Wheat, Rice" /></div>
                            <div className="grid grid-cols-2 gap-1.5 sm:gap-4">
                              <div className="space-y-0.5 sm:space-y-1.5"><Label className="text-[9px] sm:text-sm font-semibold">{t("ledger.cropWeight")}</Label><Input className="h-8 sm:h-11 bg-background text-[10px] sm:text-sm" type="number" inputMode="decimal" min="0" step="0.01" value={cropWeight} onChange={(e) => setCropWeight(e.target.value)} placeholder="0" /></div>
                              <div className="space-y-0.5 sm:space-y-1.5"><Label className="text-[9px] sm:text-sm font-semibold">{t("ledger.ratePerKg")} (₨)</Label><Input className="h-8 sm:h-11 bg-background font-mono text-[10px] sm:text-sm" type="number" inputMode="decimal" min="0" step="0.01" value={cropRate} onChange={(e) => setCropRate(e.target.value)} placeholder="0" /></div>
                            </div>
                            <div className="rounded sm:rounded-xl bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 p-1.5 sm:p-4 text-[9px] sm:text-sm font-semibold flex justify-between items-center"><span className="text-amber-700 dark:text-amber-400">{t("common.total")}:</span> <span className="text-xs sm:text-xl font-mono text-amber-600 dark:text-amber-400">₨ {cropTotal().toLocaleString()}</span></div>
                          </>
                        )}
                      </TabsContent>

                      {/* LOAN TAB */}
                      <TabsContent value="loan" className="space-y-1.5 sm:space-y-4">
                        <div className="space-y-0.5 sm:space-y-1.5"><Label className="text-[9px] sm:text-sm font-semibold">{t("common.description")}</Label><Input className="h-8 sm:h-11 bg-background text-[10px] sm:text-sm" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("ledger.loanPurpose")} /></div>
                        <div className="space-y-0.5 sm:space-y-1.5"><Label className="text-[9px] sm:text-sm font-semibold">{t("common.amount")} (₨)</Label><Input className="h-8 sm:h-11 bg-background font-mono text-blue-600 font-bold text-[10px] sm:text-sm" type="number" inputMode="decimal" min="0" step="0.01" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} placeholder="0" /></div>
                        {loanAmount && (<div className="rounded sm:rounded-xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 p-1.5 sm:p-4 text-[9px] sm:text-sm font-semibold flex justify-between items-center"><span className="text-blue-700 dark:text-blue-400">{t("ledger.loanAmount")}:</span> <span className="text-xs sm:text-xl font-mono text-blue-600 dark:text-blue-400">₨ {Number(loanAmount).toLocaleString()}</span></div>)}
                      </TabsContent>
                    </Tabs>
                  </div>
                  <DialogFooter className="p-2 sm:p-6 bg-muted/30 border-t mt-auto">
                    <Button size="sm" onClick={handleSave} disabled={!farmerId || saving} className="w-full h-9 sm:h-12 text-xs sm:text-base font-bold bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg transition-all duration-300 rounded-md sm:rounded-xl">
                      {saving ? (<><Loader2 className="animate-spin h-3.5 w-3.5 sm:h-5 sm:w-5 mr-1 sm:mr-2" /> {t("common.saving") || "Saving..."}</>) : t("ledger.saveEntry")}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </div>

      {/* --- Premium Summary Cards --- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {[
          { key: "expense", label: t("ledger.expense"), value: totalExpenses, Icon: TrendingDown, accent: "from-rose-50 to-rose-100/40 dark:from-rose-950/40 dark:to-rose-900/20", ring: "ring-rose-200/70 dark:ring-rose-900/40", iconBg: "bg-rose-100 dark:bg-rose-900/40", iconText: "text-rose-500", valueText: "text-rose-600 dark:text-rose-400" },
          { key: "sale", label: t("ledger.sale"), value: totalSales, Icon: TrendingUp, accent: "from-emerald-50 to-emerald-100/40 dark:from-emerald-950/40 dark:to-emerald-900/20", ring: "ring-emerald-200/70 dark:ring-emerald-900/40", iconBg: "bg-emerald-100 dark:bg-emerald-900/40", iconText: "text-emerald-500", valueText: "text-emerald-600 dark:text-emerald-400" },
          { key: "payment", label: t("ledger.payment"), value: totalPayments, Icon: Wallet, accent: "from-amber-50 to-amber-100/40 dark:from-amber-950/40 dark:to-amber-900/20", ring: "ring-amber-200/70 dark:ring-amber-900/40", iconBg: "bg-amber-100 dark:bg-amber-900/40", iconText: "text-amber-500", valueText: "text-amber-600 dark:text-amber-400" },
          { key: "loan", label: t("ledger.loan"), value: totalLoans, Icon: HandCoins, accent: "from-sky-50 to-sky-100/40 dark:from-sky-950/40 dark:to-sky-900/20", ring: "ring-sky-200/70 dark:ring-sky-900/40", iconBg: "bg-sky-100 dark:bg-sky-900/40", iconText: "text-sky-500", valueText: "text-sky-600 dark:text-sky-400" },
        ].map(({ key, label, value, Icon, accent, ring, iconBg, iconText, valueText }) => (
          <Card key={key} className={cn("relative overflow-hidden rounded-2xl border-0 ring-1 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 bg-gradient-to-br", accent, ring)}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
                <div className={cn("h-9 w-9 sm:h-11 sm:w-11 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
                  <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", iconText)} />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className={cn("text-xs sm:text-sm font-semibold", valueText, "opacity-70")}>Rs</span>
                <span className={cn("text-xl sm:text-3xl font-bold font-mono tracking-tight truncate", valueText)}>
                  {value.toLocaleString()}
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1.5 sm:mt-2 font-medium">Total from all farmers</p>
            </CardContent>
          </Card>
        ))}
      </div>


      {/* --- Premium Entries Table Card --- */}
      <Card className="shadow-2xl border-border/50 bg-card/80 backdrop-blur-xl rounded-3xl overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-violet-500 to-purple-500" />
        <CardHeader className="pb-3 sm:pb-4 pt-4 sm:pt-6 px-4 sm:px-6 border-b border-border/40 space-y-3 sm:space-y-5">
          <div className="flex items-center justify-between gap-3 sm:gap-4 flex-wrap">
            <CardTitle className="text-base sm:text-xl font-serif flex items-center gap-2">
              <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-violet-500" />
              {t("ledger.recentEntries")}
            </CardTitle>
            <Badge variant="outline" className="border-violet-500/30 text-violet-600 dark:text-violet-400 bg-violet-500/10 font-bold px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs">
              {filteredEntries.length} / {entries.length} Entries
            </Badge>
          </div>

          {/* Premium Filters */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-6 gap-2 sm:gap-3">
            <div className="relative lg:col-span-2 group col-span-2 sm:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground group-focus-within:text-violet-500 transition-colors" />
              <Input
                placeholder="Search farmer, description…"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-9 sm:pl-10 h-9 sm:h-10 rounded-lg sm:rounded-xl bg-background/50 border-border/60 focus:border-violet-500/50 transition-all text-xs sm:text-sm"
              />
            </div>
            <Select value={filterFarmer} onValueChange={setFilterFarmer}>
              <SelectTrigger className="h-9 sm:h-10 rounded-lg sm:rounded-xl bg-background/50 text-xs sm:text-sm"><SelectValue placeholder="Farmer" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Farmers</SelectItem>
                {seasonFarmers.map((fs) => (
                  <SelectItem key={fs.farmer_id} value={fs.farmer_id}>{fs.farmers?.name || "—"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={(v) => { setFilterType(v); if (v !== "expense") setFilterCategory("all"); }}>
              <SelectTrigger className="h-9 sm:h-10 rounded-lg sm:rounded-xl bg-background/50 text-xs sm:text-sm"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="expense">{t("ledger.expense")}</SelectItem>
                <SelectItem value="sale">{t("ledger.sale")}</SelectItem>
                <SelectItem value="payment">{t("ledger.payment")}</SelectItem>
                <SelectItem value="loan">{t("ledger.loan")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={setFilterCategory} disabled={filterType !== "all" && filterType !== "expense"}>
              <SelectTrigger className="h-9 sm:h-10 rounded-lg sm:rounded-xl bg-background/50 text-xs sm:text-sm"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {EXPENSE_CATEGORIES.map((c) => (
                  <SelectItem key={c.key} value={c.key}>{t(c.label)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-1.5 sm:gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("h-9 sm:h-10 flex-1 justify-start text-left font-normal text-[10px] sm:text-xs rounded-lg sm:rounded-xl bg-background/50", !filterFromDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-1 h-3 w-3 sm:mr-1.5 sm:h-3.5 sm:w-3.5" />
                    {filterFromDate ? format(filterFromDate, "MMM d") : "From"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={filterFromDate} onSelect={setFilterFromDate} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("h-9 sm:h-10 flex-1 justify-start text-left font-normal text-[10px] sm:text-xs rounded-lg sm:rounded-xl bg-background/50", !filterToDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-1 h-3 w-3 sm:mr-1.5 sm:h-3.5 sm:w-3.5" />
                    {filterToDate ? format(filterToDate, "MMM d") : "To"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={filterToDate} onSelect={setFilterToDate} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          {hasActiveFilters && (
            <div className="flex justify-end mt-1">
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs text-muted-foreground hover:text-foreground rounded-lg">
                <X className="h-3.5 w-3.5 mr-1" /> Clear active filters
              </Button>
            </div>
          )}
        </CardHeader>
        
        <CardContent className="p-0">
          {/* Mobile Layout */}
          <div className="sm:hidden divide-y divide-border/40">
            {filteredEntries.map((e) => (
              <div key={e.id} className="p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      {typeBadge(e.entry_type)}
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                        {e.entry_date ? new Date(e.entry_date + "T00:00:00").toLocaleDateString() : new Date(e.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FarmerAvatar name={e.farmers?.name} photoUrl={(e.farmers as any)?.photo_url} className="h-8 w-8" />
                      <p className="text-sm font-bold text-foreground truncate">{e.farmers?.name ?? "—"}</p>
                    </div>
                    {e.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{e.description}</p>
                    )}
                    {e.entry_type === "sale" && <SaleMeta e={e} />}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={cn(
                      "font-mono font-bold text-[15px] whitespace-nowrap",
                      e.entry_type === "expense" && "text-red-600 dark:text-red-400",
                      e.entry_type === "sale" && "text-emerald-600 dark:text-emerald-400",
                      e.entry_type === "payment" && "text-amber-600 dark:text-amber-400",
                      e.entry_type === "loan" && "text-blue-600 dark:text-blue-400"
                    )}>₨ {Number(e.amount).toLocaleString()}</span>
                    
                    {(canEdit || canDelete) && !isSeasonClosed && (
                      <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
                        {canEdit && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-white dark:hover:bg-background hover:text-violet-600 shadow-sm transition-all" onClick={() => openEdit(e)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {canDelete && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-destructive hover:text-destructive hover:bg-white dark:hover:bg-background shadow-sm transition-all">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-2xl">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete entry?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {e.farmers?.name ?? "—"} • {e.entry_type} • ₨ {Number(e.amount).toLocaleString()}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-xl">{t("common.cancel")}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(e.id)} className="bg-destructive hover:bg-destructive/90 text-white rounded-xl">{t("common.delete")}</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filteredEntries.length === 0 && (
              <div className="text-center py-16 px-4">
                <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground font-medium">{hasActiveFilters ? "No entries match your filters" : t("ledger.noEntries")}</p>
              </div>
            )}
          </div>

          {/* Desktop/Tablet Table Layout */}
          <div className="hidden sm:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20 hover:bg-muted/20 border-b border-border/40">
                  <TableHead className="text-xs font-bold uppercase tracking-wider h-11">{t("common.date")}</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider h-11">{t("ledger.farmer")}</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider h-11">{t("ledger.category")}</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider h-11 hidden md:table-cell">{t("common.description")}</TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase tracking-wider h-11">{t("common.amount")} (Rs)</TableHead>
                  {(canEdit || canDelete) && !isSeasonClosed && <TableHead className="text-right text-xs font-bold uppercase tracking-wider h-11 w-[100px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((e) => {
                  const catObj = EXPENSE_CATEGORIES.find(c => c.key.toLowerCase() === ((e as any).category || "").toLowerCase());
                  const catLabel = catObj ? t(catObj.label) : ((e as any).category ? String((e as any).category) : null);
                  const typeLabel = e.entry_type === "expense" ? t("ledger.expense") : e.entry_type === "sale" ? t("ledger.sale") : e.entry_type === "payment" ? t("ledger.payment") : t("ledger.loan");
                  const displayCategory = catLabel || typeLabel;
                  return (
                  <TableRow key={e.id} className="hover:bg-muted/30 transition-colors border-b border-border/30">
                    <TableCell className="text-xs font-medium py-3 text-muted-foreground whitespace-nowrap">
                      {e.entry_date ? new Date(e.entry_date + "T00:00:00").toLocaleDateString() : new Date(e.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-foreground">
                      <div className="flex items-center gap-2.5">
                        <FarmerAvatar name={e.farmers?.name} photoUrl={(e.farmers as any)?.photo_url} className="h-9 w-9 ring-2 ring-white dark:ring-background shadow-sm" />
                        <span className="truncate">{e.farmers?.name ?? "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="capitalize text-sm font-medium text-foreground/90">{displayCategory}</span>
                    </TableCell>
                    <TableCell className="text-sm hidden md:table-cell max-w-[300px] text-muted-foreground" title={e.description || ""}>
                      <span className="block truncate">{e.description || "—"}</span>
                      {e.entry_type === "sale" && <SaleMeta e={e} />}
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-mono font-bold text-sm whitespace-nowrap",
                      e.entry_type === "expense" && "text-rose-600 dark:text-rose-400",
                      e.entry_type === "sale" && "text-emerald-600 dark:text-emerald-400",
                      e.entry_type === "payment" && "text-amber-600 dark:text-amber-400",
                      e.entry_type === "loan" && "text-sky-600 dark:text-sky-400"
                    )}>
                      Rs {Number(e.amount).toLocaleString()}
                    </TableCell>
                    {(canEdit || canDelete) && !isSeasonClosed && (
                      <TableCell className="text-right py-2">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* We remove opacity-0 logic since TableRow hover state for children is tricky without group class, just show them slightly faded */}
                        </div>
                        <div className="flex items-center justify-end gap-1 opacity-60 hover:opacity-100 transition-opacity">
                          {canEdit && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-violet-500/10 hover:text-violet-600 rounded-lg transition-colors" onClick={() => openEdit(e)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="rounded-2xl">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete {e.entry_type === "expense" ? "Expense" : e.entry_type === "sale" ? "Sale" : e.entry_type === "payment" ? "Payment" : "Entry"}?</AlertDialogTitle>
                                  <AlertDialogDescription asChild>
                                    <div className="space-y-3 text-sm mt-2">
                                      <p>This action cannot be undone. Please review the details below:</p>
                                      <div className="rounded-xl border bg-muted/40 p-4 space-y-2">
                                        <div className="flex justify-between gap-4">
                                          <span className="text-muted-foreground">Farmer</span>
                                          <span className="font-bold text-foreground">{e.farmers?.name ?? "—"}</span>
                                        </div>
                                        <div className="flex justify-between gap-4">
                                          <span className="text-muted-foreground">Date</span>
                                          <span className="font-medium text-foreground">{e.entry_date ? new Date(e.entry_date + "T00:00:00").toLocaleDateString() : new Date(e.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex justify-between gap-4">
                                          <span className="text-muted-foreground">Type</span>
                                          <span className="font-bold uppercase tracking-wider text-[10px] text-foreground">{e.entry_type}</span>
                                        </div>
                                        {(e as any).category && (
                                          <div className="flex justify-between gap-4">
                                            <span className="text-muted-foreground">Category</span>
                                            <span className="font-medium capitalize text-foreground">{(e as any).category}</span>
                                          </div>
                                        )}
                                        {e.description && (
                                          <div className="flex justify-between gap-4">
                                            <span className="text-muted-foreground">Description</span>
                                            <span className="font-medium text-foreground text-right max-w-[60%] truncate">{e.description}</span>
                                          </div>
                                        )}
                                        <div className="flex justify-between gap-4 pt-3 border-t border-border/60 mt-3">
                                          <span className="text-muted-foreground uppercase text-xs font-bold tracking-wider pt-0.5">
                                            Amount
                                          </span>
                                          <span className={cn(
                                            "font-mono font-bold text-lg leading-none",
                                            e.entry_type === "expense" && "text-red-600 dark:text-red-400",
                                            e.entry_type === "sale" && "text-emerald-600 dark:text-emerald-400",
                                            e.entry_type === "payment" && "text-amber-600 dark:text-amber-400",
                                            e.entry_type === "loan" && "text-blue-600 dark:text-blue-400",
                                          )}>₨ {Number(e.amount).toLocaleString()}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="gap-2 sm:gap-0 mt-2">
                                  <AlertDialogCancel className="rounded-xl">{t("common.cancel")}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(e.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">{t("common.delete")}</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                  );
                })}
                {filteredEntries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={(canEdit || canDelete) && !isSeasonClosed ? 6 : 5} className="h-32 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center">
                        <BookOpen className="h-8 w-8 mb-2 opacity-20" />
                        {hasActiveFilters ? "No entries match your filters" : t("ledger.noEntries")}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Ledger;
