import { useEffect, useState } from "react";
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
      let entriesQuery = supabase.from("ledger_entries").select("*, farmers(name)").order("created_at", { ascending: false });
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
    const farmerMap = new Map(localFarmers.map((f: any) => [f.id, f.name]));
    const merged = localEntries
      .map((e: any) => ({ ...e, farmers: farmerMap.has(e.farmer_id) ? { name: farmerMap.get(e.farmer_id) } : null }))
      .sort((a: any, b: any) => (b.created_at || "").localeCompare(a.created_at || ""));
    setEntries(merged as any);
    setInventory(localInv as any);
  };

  useEffect(() => { fetchData(); }, [selectedSeason?.id]);

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

  const netWeight = () => (Number(grossWeight) || 0) - (Number(deductionsVal) || 0);
  const saleTotal = () => netWeight() * (Number(saleRate) || 0);
  const cropTotal = () => (Number(cropWeight) || 0) * (Number(cropRate) || 0);

  const resetForm = () => {
    setFarmerId(""); setEntryDate(new Date()); setDescription("");
    setCategory(""); setInventoryItemId(""); setPrice(""); setQuantity(""); setExpenseAmount(""); setCostAllocation("farmer");
    setGrossWeight(""); setDeductionsVal(""); setSaleRate("");
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
        entryData = { ...entryData, amount, gross_weight: Number(grossWeight), deductions: Number(deductionsVal) || 0, net_weight: netWeight(), rate: Number(saleRate), crop_type: cropType.trim() || description.trim() || null };
      } else if (activeTab === "payment") {
        entryData = { ...entryData, amount, payment_method: paymentMethod, crop_type: paymentMethod === "crop_return" ? cropType : null, crop_weight: paymentMethod === "crop_return" && cropWeight ? Number(cropWeight) : null, rate: paymentMethod === "crop_return" && cropRate ? Number(cropRate) : null };
      } else if (activeTab === "loan") {
        entryData = { ...entryData, amount, entry_type: "loan" };
      }

      // ===== Optimistic UI: update list instantly =====
      const farmerName = (farmerSeasons.find((x: any) => x.farmer_id === farmerId) as any)?.farmers?.name || "";
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
          farmers: { name: farmerName },
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
      expense: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", label: t("ledger.expense") },
      sale: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400", label: t("ledger.sale") },
      payment: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400", label: t("ledger.payment") },
      loan: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400", label: t("ledger.loan") },
    };
    const c = config[type] || config.expense;
    return <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize", c.bg, c.text)}>{c.label}</span>;
  };

  const getAllocationLabel = (entry: any) => {
    if (entry.entry_type !== "expense") return null;
    if (entry.payment_method === "landlord_only") return <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">{t("ledger.landlordOnly")}</span>;
    if (entry.is_shared) return <span className="text-xs px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">50/50</span>;
    return <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{t("ledger.farmerOnly")}</span>;
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
    <div className="space-y-6">
      {/* Season Closed Banner */}
      {isSeasonClosed && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
          <Lock className="h-4 w-4 shrink-0" /> {t("seasons.seasonClosed")}
        </div>
      )}
      {!selectedSeason && (
        <div className="rounded-xl bg-muted border border-border p-4 text-center text-muted-foreground">
          {t("seasons.noActiveSeason")}
        </div>
      )}
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-accent/80 p-6 sm:p-8 text-primary-foreground shadow-xl shadow-primary/20">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-primary-foreground/5 -translate-y-1/2 translate-x-1/4 blur-2xl" />
        <div className="absolute bottom-0 left-1/3 w-32 h-32 rounded-full bg-primary-foreground/10 translate-y-1/2 blur-xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-foreground/15 backdrop-blur-md border border-primary-foreground/10">
              <BookOpen className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight">{t("ledger.title")}</h1>
              <p className="text-primary-foreground/70 text-sm mt-0.5">{t("ledger.subtitle")} {selectedSeason ? `— ${selectedSeason.name}` : ""}</p>
            </div>
          </div>
        {canCreate && !isSeasonClosed && selectedSeason && (
          <Dialog open={open} onOpenChange={(v) => { if (saving && !v) return; setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-semibold shadow-lg shadow-black/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl">
                <Plus className="mr-2 h-4 w-4" />{t("ledger.newTransaction")}
              </Button>
            </DialogTrigger>
            <DialogContent
              className="max-w-lg max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full p-4 sm:p-6"
              onKeyDown={(e) => {
                if (e.key === "Enter" && saving) {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
              onEscapeKeyDown={(e) => { if (saving) e.preventDefault(); }}
              onPointerDownOutside={(e) => { if (saving) e.preventDefault(); }}
              onInteractOutside={(e) => { if (saving) e.preventDefault(); }}
            >
              <DialogHeader>
                <DialogTitle className="text-xl font-serif">{editingId ? "Edit Entry" : t("ledger.newTransaction")}</DialogTitle>
                <DialogDescription>{t("ledger.addEntry")}</DialogDescription>
              </DialogHeader>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full grid grid-cols-4 h-auto gap-1 bg-muted/50 p-1.5 rounded-xl">
                  <TabsTrigger value="expense" className="data-[state=active]:bg-red-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-red-500/30 rounded-lg text-xs sm:text-sm py-2.5 transition-all duration-300 font-medium">
                    <TrendingDown className="h-3.5 w-3.5 mr-1 hidden sm:inline" />{t("ledger.expense")}
                  </TabsTrigger>
                  <TabsTrigger value="sale" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/30 rounded-lg text-xs sm:text-sm py-2.5 transition-all duration-300 font-medium">
                    <TrendingUp className="h-3.5 w-3.5 mr-1 hidden sm:inline" />{t("ledger.sale")}
                  </TabsTrigger>
                  <TabsTrigger value="payment" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-amber-500/30 rounded-lg text-xs sm:text-sm py-2.5 transition-all duration-300 font-medium">
                    <Wallet className="h-3.5 w-3.5 mr-1 hidden sm:inline" />{t("ledger.payment")}
                  </TabsTrigger>
                  <TabsTrigger value="loan" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/30 rounded-lg text-xs sm:text-sm py-2.5 transition-all duration-300 font-medium">
                    <HandCoins className="h-3.5 w-3.5 mr-1 hidden sm:inline" />{t("ledger.loan")}
                  </TabsTrigger>
                </TabsList>

                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label className="font-medium">{t("ledger.farmer")} *</Label>
                    <Select value={farmerId} onValueChange={setFarmerId}>
                      <SelectTrigger className="h-11"><SelectValue placeholder={t("ledger.selectFarmer")} /></SelectTrigger>
                      <SelectContent>{seasonFarmers.map((fs) => <SelectItem key={fs.farmer_id} value={fs.farmer_id}>{fs.farmers?.name || "—"}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-medium">{t("common.date")}</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-11", !entryDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {entryDate ? format(entryDate, "PPP") : t("ledger.pickDate")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={entryDate} onSelect={(d) => d && setEntryDate(d)} initialFocus /></PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* EXPENSE TAB */}
                <TabsContent value="expense" className="space-y-4">
                  <div className="space-y-2">
                    <Label className="font-medium">{t("ledger.category")}</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="h-11"><SelectValue placeholder={t("ledger.selectCategory")} /></SelectTrigger>
                      <SelectContent>{EXPENSE_CATEGORIES.map((c) => <SelectItem key={c.key} value={c.key.toLowerCase()}>{t(c.label)}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label className="font-medium">{t("common.description")}</Label><Input className="h-11" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("ledger.enterDescription")} /></div>
                  <div className="space-y-2">
                    <Label className="font-medium">{t("ledger.linkInventory")}</Label>
                    <Select value={inventoryItemId} onValueChange={setInventoryItemId}>
                      <SelectTrigger className="h-11"><SelectValue placeholder={t("ledger.selectInventory")} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t("ledger.none")}</SelectItem>
                        {inventory.map((item) => (<SelectItem key={item.id} value={item.id}>{item.item_name} — ₨{item.price_per_unit}/{item.unit} ({t("ledger.stock")}: {item.current_stock})</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label className="font-medium">{t("ledger.price")} (₨)</Label><Input className="h-11" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" /></div>
                    <div className="space-y-2"><Label className="font-medium">{t("ledger.quantity")}</Label><Input className="h-11" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" /></div>
                  </div>
                  {(!price || !quantity) && (<div className="space-y-2"><Label className="font-medium">{t("common.amount")} (₨)</Label><Input className="h-11" type="number" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} placeholder={t("ledger.manualAmount")} /></div>)}
                  {(price && quantity) && (<div className="rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 p-3 text-sm font-semibold text-foreground">{t("common.total")}: ₨ {computedExpenseAmount().toLocaleString()}</div>)}

                  {/* Cost Allocation - 3 options */}
                  <div className="space-y-3">
                    <Label className="font-medium text-sm">{t("ledger.costAllocation")}</Label>
                    <RadioGroup value={costAllocation} onValueChange={(v) => setCostAllocation(v as CostAllocation)} className="grid grid-cols-3 gap-2">
                      <Label htmlFor="alloc-farmer" className={cn(
                        "flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 cursor-pointer transition-all duration-200 text-center",
                        costAllocation === "farmer" ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md shadow-blue-500/20" : "border-muted hover:border-muted-foreground/30"
                      )}>
                        <RadioGroupItem value="farmer" id="alloc-farmer" className="sr-only" />
                        <span className="text-lg">👨‍🌾</span>
                        <span className="text-xs font-semibold leading-tight">{t("ledger.farmerOnly")}</span>
                      </Label>
                      <Label htmlFor="alloc-shared" className={cn(
                        "flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 cursor-pointer transition-all duration-200 text-center",
                        costAllocation === "shared" ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20 shadow-md shadow-orange-500/20" : "border-muted hover:border-muted-foreground/30"
                      )}>
                        <RadioGroupItem value="shared" id="alloc-shared" className="sr-only" />
                        <span className="text-lg">🤝</span>
                        <span className="text-xs font-semibold leading-tight">50/50</span>
                      </Label>
                      <Label htmlFor="alloc-landlord" className={cn(
                        "flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 cursor-pointer transition-all duration-200 text-center",
                        costAllocation === "landlord" ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-md shadow-purple-500/20" : "border-muted hover:border-muted-foreground/30"
                      )}>
                        <RadioGroupItem value="landlord" id="alloc-landlord" className="sr-only" />
                        <span className="text-lg">🏠</span>
                        <span className="text-xs font-semibold leading-tight">{t("ledger.landlordOnly")}</span>
                      </Label>
                    </RadioGroup>
                    {costAllocation === "shared" && computedExpenseAmount() > 0 && (
                      <div className="rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-2.5 text-xs font-medium text-orange-700 dark:text-orange-400 text-center">
                        {t("ledger.eachPays")}: ₨ {(computedExpenseAmount() / 2).toLocaleString()}
                      </div>
                    )}
                    {costAllocation === "landlord" && computedExpenseAmount() > 0 && (
                      <div className="rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 p-2.5 text-xs font-medium text-purple-700 dark:text-purple-400 text-center">
                        {t("ledger.landlordPays")}: ₨ {computedExpenseAmount().toLocaleString()}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* SALE TAB */}
                <TabsContent value="sale" className="space-y-4">
                  <div className="space-y-2"><Label className="font-medium">{t("common.description")}</Label><Input className="h-11" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("ledger.enterDescription")} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label className="font-medium">{t("ledger.grossWeight")}</Label><Input className="h-11" type="number" value={grossWeight} onChange={(e) => setGrossWeight(e.target.value)} placeholder="0" /></div>
                    <div className="space-y-2"><Label className="font-medium">{t("ledger.deductions")}</Label><Input className="h-11" type="number" value={deductionsVal} onChange={(e) => setDeductionsVal(e.target.value)} placeholder="0" /></div>
                  </div>
                  <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3 text-sm"><span className="font-semibold text-emerald-700 dark:text-emerald-400">{t("ledger.netWeight")}:</span> <span className="text-emerald-600 dark:text-emerald-300">{netWeight().toLocaleString()} kg</span></div>
                  <div className="space-y-2"><Label className="font-medium">{t("ledger.ratePerKg")} (₨)</Label><Input className="h-11" type="number" value={saleRate} onChange={(e) => setSaleRate(e.target.value)} placeholder="0" /></div>
                  <div className="rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-200 dark:border-emerald-800 p-3 text-sm font-bold text-emerald-700 dark:text-emerald-400">{t("ledger.totalAmount")}: ₨ {saleTotal().toLocaleString()}</div>
                </TabsContent>

                {/* PAYMENT TAB */}
                <TabsContent value="payment" className="space-y-4">
                  <div className="space-y-2"><Label className="font-medium">{t("common.description")}</Label><Input className="h-11" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("ledger.enterDescription")} /></div>
                  <div className="space-y-2">
                    <Label className="font-medium">{t("ledger.paymentMethod")}</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">{t("ledger.cashPayment")}</SelectItem>
                        <SelectItem value="crop_return">{t("ledger.cropReturn")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {paymentMethod === "cash" ? (
                    <div className="space-y-2"><Label className="font-medium">{t("common.amount")} (₨)</Label><Input className="h-11" type="number" value={cashAmount} onChange={(e) => setCashAmount(e.target.value)} placeholder="0" /></div>
                  ) : (
                    <>
                      <div className="space-y-2"><Label className="font-medium">{t("ledger.cropType")}</Label><Input className="h-11" value={cropType} onChange={(e) => setCropType(e.target.value)} placeholder="e.g. Wheat, Rice" /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2"><Label className="font-medium">{t("ledger.cropWeight")}</Label><Input className="h-11" type="number" value={cropWeight} onChange={(e) => setCropWeight(e.target.value)} placeholder="0" /></div>
                        <div className="space-y-2"><Label className="font-medium">{t("ledger.ratePerKg")} (₨)</Label><Input className="h-11" type="number" value={cropRate} onChange={(e) => setCropRate(e.target.value)} placeholder="0" /></div>
                      </div>
                      <div className="rounded-xl bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-200 dark:border-amber-800 p-3 text-sm font-bold text-amber-700 dark:text-amber-400">{t("common.total")}: ₨ {cropTotal().toLocaleString()}</div>
                    </>
                  )}
                </TabsContent>

                {/* LOAN TAB */}
                <TabsContent value="loan" className="space-y-4">
                  <div className="space-y-2"><Label className="font-medium">{t("common.description")}</Label><Input className="h-11" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("ledger.loanPurpose")} /></div>
                  <div className="space-y-2"><Label className="font-medium">{t("common.amount")} (₨)</Label><Input className="h-11" type="number" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} placeholder="0" /></div>
                  {loanAmount && (<div className="rounded-xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-200 dark:border-blue-800 p-3 text-sm font-bold text-blue-700 dark:text-blue-400">{t("ledger.loanAmount")}: ₨ {Number(loanAmount).toLocaleString()}</div>)}
                </TabsContent>
              </Tabs>
              <DialogFooter>
                <Button onClick={handleSave} disabled={!farmerId || saving} className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-lg transition-all duration-300">
                  {saving ? (<><Loader2 className="animate-spin" /> {t("common.saving") || "Saving..."}</>) : t("ledger.saveEntry")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-red-200 dark:border-red-800 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <span className="text-xs font-medium text-red-600 dark:text-red-400">{t("ledger.expense")}</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-red-700 dark:text-red-300">₨ {totalExpenses.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{t("ledger.sale")}</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-emerald-700 dark:text-emerald-300">₨ {totalSales.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">{t("ledger.payment")}</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-amber-700 dark:text-amber-300">₨ {totalPayments.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-1">
              <HandCoins className="h-4 w-4 text-blue-500" />
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400">{t("ledger.loan")}</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-blue-700 dark:text-blue-300">₨ {totalLoans.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Entries Table */}
      <Card className="shadow-lg border-border/50">
        <CardHeader className="pb-3 space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-lg font-serif">{t("ledger.recentEntries")}</CardTitle>
            <span className="text-xs text-muted-foreground">
              {filteredEntries.length} of {entries.length}
            </span>
          </div>
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search farmer, description…"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            <Select value={filterFarmer} onValueChange={setFilterFarmer}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Farmer" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Farmers</SelectItem>
                {seasonFarmers.map((fs) => (
                  <SelectItem key={fs.farmer_id} value={fs.farmer_id}>{fs.farmers?.name || "—"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={(v) => { setFilterType(v); if (v !== "expense") setFilterCategory("all"); }}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="expense">{t("ledger.expense")}</SelectItem>
                <SelectItem value="sale">{t("ledger.sale")}</SelectItem>
                <SelectItem value="payment">{t("ledger.payment")}</SelectItem>
                <SelectItem value="loan">{t("ledger.loan")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={setFilterCategory} disabled={filterType !== "all" && filterType !== "expense"}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {EXPENSE_CATEGORIES.map((c) => (
                  <SelectItem key={c.key} value={c.key}>{t(c.label)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("h-9 flex-1 justify-start text-left font-normal text-xs", !filterFromDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-1 h-3.5 w-3.5" />
                    {filterFromDate ? format(filterFromDate, "MMM d") : "From"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={filterFromDate} onSelect={setFilterFromDate} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("h-9 flex-1 justify-start text-left font-normal text-xs", !filterToDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-1 h-3.5 w-3.5" />
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
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
                <X className="h-3.5 w-3.5 mr-1" /> Clear filters
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 sm:p-6 sm:pt-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs font-semibold">{t("common.date")}</TableHead>
                <TableHead className="text-xs font-semibold">{t("ledger.farmer")}</TableHead>
                <TableHead className="text-xs font-semibold">{t("ledger.type")}</TableHead>
                <TableHead className="text-xs font-semibold hidden sm:table-cell">{t("ledger.category")}</TableHead>
                <TableHead className="text-xs font-semibold hidden md:table-cell">{t("common.description")}</TableHead>
                <TableHead className="text-xs font-semibold hidden sm:table-cell">{t("ledger.costAllocation")}</TableHead>
                <TableHead className="text-right text-xs font-semibold">{t("common.amount")} (₨)</TableHead>
                {(canEdit || canDelete) && !isSeasonClosed && <TableHead className="text-right text-xs font-semibold">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.map((e) => (
                <TableRow key={e.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell className="text-xs sm:text-sm py-3">{e.entry_date ? new Date(e.entry_date + "T00:00:00").toLocaleDateString() : new Date(e.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-xs sm:text-sm font-medium">{e.farmers?.name ?? "—"}</TableCell>
                  <TableCell>{typeBadge(e.entry_type)}</TableCell>
                  <TableCell className="capitalize text-xs hidden sm:table-cell">{(() => { const cat = EXPENSE_CATEGORIES.find(c => c.key.toLowerCase() === ((e as any).category || "").toLowerCase()); return cat ? t(cat.label) : ((e as any).category || "—"); })()}</TableCell>
                  <TableCell className="text-xs hidden md:table-cell max-w-[150px] truncate">{e.description || "—"}</TableCell>
                  <TableCell className="hidden sm:table-cell">{getAllocationLabel(e)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold text-sm">₨ {Number(e.amount).toLocaleString()}</TableCell>
                  {(canEdit || canDelete) && !isSeasonClosed && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-primary/10 hover:text-primary" onClick={() => openEdit(e)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {canDelete && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete {e.entry_type === "expense" ? "Expense" : e.entry_type === "sale" ? "Sale" : e.entry_type === "payment" ? "Payment" : "Entry"}?</AlertDialogTitle>
                                <AlertDialogDescription asChild>
                                  <div className="space-y-2 text-sm">
                                    <p>This action cannot be undone. Please review the details below:</p>
                                    <div className="rounded-md border bg-muted/40 p-3 space-y-1">
                                      <div className="flex justify-between gap-4">
                                        <span className="text-muted-foreground">Farmer</span>
                                        <span className="font-medium text-foreground">{e.farmers?.name ?? "—"}</span>
                                      </div>
                                      <div className="flex justify-between gap-4">
                                        <span className="text-muted-foreground">Date</span>
                                        <span className="font-medium text-foreground">{e.entry_date ? new Date(e.entry_date + "T00:00:00").toLocaleDateString() : new Date(e.created_at).toLocaleDateString()}</span>
                                      </div>
                                      <div className="flex justify-between gap-4">
                                        <span className="text-muted-foreground">Type</span>
                                        <span className="font-medium capitalize text-foreground">{e.entry_type}</span>
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
                                      <div className="flex justify-between gap-4 pt-1 border-t mt-1">
                                        <span className="text-muted-foreground">
                                          {e.entry_type === "expense" ? "Expense Amount" : e.entry_type === "sale" ? "Sale Amount" : e.entry_type === "payment" ? "Payment Amount" : "Amount"}
                                        </span>
                                        <span className={cn(
                                          "font-mono font-bold",
                                          e.entry_type === "expense" && "text-red-600 dark:text-red-400",
                                          e.entry_type === "sale" && "text-green-600 dark:text-green-400",
                                          e.entry_type === "payment" && "text-blue-600 dark:text-blue-400",
                                        )}>₨ {Number(e.amount).toLocaleString()}</span>
                                      </div>
                                    </div>
                                  </div>
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(e.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("common.delete")}</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {filteredEntries.length === 0 && (<TableRow><TableCell colSpan={(canEdit || canDelete) && !isSeasonClosed ? 8 : 7} className="text-center text-muted-foreground py-12">{hasActiveFilters ? "No entries match your filters" : t("ledger.noEntries")}</TableCell></TableRow>)}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Ledger;
