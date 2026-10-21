import { useEffect, useState, useMemo } from "react";
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
import { deriveSale, isBuyerPayment, getLinkedSaleId, money as fmtMoney, qty as fmtQty } from "@/lib/ledger/aggregate";
import { computeSale, averageYieldPerAcre, WEIGHT_UNITS, AREA_UNITS, num, money, qty, toKg, formatMaundCompound, type WeightUnit, type AreaUnit } from "@/lib/ledger/calc";
import { translateUnit } from "@/i18n/translations";

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
const SaleMeta = ({ e, linkedReceipts = 0 }: { e: any; linkedReceipts?: number }) => {
  const { language } = useLanguage();
  const s = deriveSale(e, linkedReceipts);
  const bits: string[] = [];

  const buyerPayable = s.grossSale - s.commission;
  const due = Math.max(buyerPayable - s.paid, 0);

  if (language === "sd") {
    if (e.buyer) bits.push(`خريدار: ${String(e.buyer)}`);
    if (e.crop_type) bits.push(String(e.crop_type));
    if (e.field_name) bits.push(String(e.field_name));
    if (s.netWeight > 0) {
      if (e.weight_unit === "maund") {
        bits.push(`${formatMaundCompound(s.netWeightKg, { lang: "sd" })} (${fmtQty(s.netWeight)} مڻ)`);
      } else {
        bits.push(`${fmtQty(s.netWeight)} ڪلو`);
      }
    }
    bits.push(`ڪل ₨ ${Math.round(s.grossSale).toLocaleString()}`);
    if (s.commission > 0) bits.push(`ڪميشن -₨ ${Math.round(s.commission).toLocaleString()}`);
    bits.push(`خريدار واجب ₨ ${Math.round(buyerPayable).toLocaleString()}`);
    bits.push(`وصول ₨ ${Math.round(s.paid).toLocaleString()} · بقايو ₨ ${Math.round(due).toLocaleString()}`);
    if (s.transport > 0) bits.push(`ٽرانسپورٽ ₨ ${Math.round(s.transport).toLocaleString()}`);
    if (s.labour > 0) bits.push(`مزدوري ₨ ${Math.round(s.labour).toLocaleString()}`);
    if (s.other > 0) bits.push(`ٻيو ₨ ${Math.round(s.other).toLocaleString()}`);
    if (s.yieldPerAcre != null) bits.push(`${fmtQty(s.yieldPerAcre)} مڻ/ايڪڙ`);
  } else if (language === "ur") {
    if (e.buyer) bits.push(`خریدار: ${String(e.buyer)}`);
    if (e.crop_type) bits.push(String(e.crop_type));
    if (e.field_name) bits.push(String(e.field_name));
    if (s.netWeight > 0) {
      if (e.weight_unit === "maund") {
        bits.push(`${formatMaundCompound(s.netWeightKg, { lang: "ur" })} (${fmtQty(s.netWeight)} من)`);
      } else {
        bits.push(`${fmtQty(s.netWeight)} کلو`);
      }
    }
    bits.push(`کل ₨ ${Math.round(s.grossSale).toLocaleString()}`);
    if (s.commission > 0) bits.push(`کمیشن -₨ ${Math.round(s.commission).toLocaleString()}`);
    bits.push(`خریدار واجب ₨ ${Math.round(buyerPayable).toLocaleString()}`);
    bits.push(`وصول ₨ ${Math.round(s.paid).toLocaleString()} · بقایا ₨ ${Math.round(due).toLocaleString()}`);
    if (s.transport > 0) bits.push(`ٹرانسپورٹ ₨ ${Math.round(s.transport).toLocaleString()}`);
    if (s.labour > 0) bits.push(`مزدوری ₨ ${Math.round(s.labour).toLocaleString()}`);
    if (s.other > 0) bits.push(`دیگر ₨ ${Math.round(s.other).toLocaleString()}`);
    if (s.yieldPerAcre != null) bits.push(`${fmtQty(s.yieldPerAcre)} من/ایکڑ`);
  } else {
    if (e.buyer) bits.push(`Buyer: ${String(e.buyer)}`);
    if (e.crop_type) bits.push(String(e.crop_type));
    if (e.field_name) bits.push(String(e.field_name));
    if (s.netWeight > 0) {
      if (e.weight_unit === "maund") {
        bits.push(`${formatMaundCompound(s.netWeightKg)} (${fmtQty(s.netWeight)} Mnds)`);
      } else {
        bits.push(`${fmtQty(s.netWeight)} ${e.weight_unit || "kg"}`);
      }
    }
    bits.push(`Gross ${fmtMoney(s.grossSale)}`);
    if (s.commission > 0) bits.push(`Commission -${fmtMoney(s.commission)}`);
    bits.push(`Buyer Payable ${fmtMoney(buyerPayable)}`);
    bits.push(`Paid ${fmtMoney(s.paid)} · Due ${fmtMoney(due)}`);
    if (s.transport > 0) bits.push(`Transport ${fmtMoney(s.transport)}`);
    if (s.labour > 0) bits.push(`Labour ${fmtMoney(s.labour)}`);
    if (s.other > 0) bits.push(`Other ${fmtMoney(s.other)}`);
    if (s.yieldPerAcre != null) bits.push(`${fmtQty(s.yieldPerAcre)} Maund/Acre`);
  }

  return <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground/80 text-start">{bits.join(" • ")}</p>;
};

const Ledger = () => {
  const { user, canCreate, canEdit, canDelete } = useAuth();
  const { t, language } = useLanguage();
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
  const [deductionUnit, setDeductionUnit] = useState<WeightUnit>("kg");
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

  // Payment Purpose / Direction: Farmer Payment (disbursed) vs Buyer Payment Received (collected)
  const [paymentPurpose, setPaymentPurpose] = useState<"farmer_payment" | "buyer_receipt">("farmer_payment");
  const [selectedReceiptBuyer, setSelectedReceiptBuyer] = useState("");
  const [selectedReceiptSaleId, setSelectedReceiptSaleId] = useState("");
  const [receiptAmount, setReceiptAmount] = useState("");
  const [receiptPaymentMethod, setReceiptPaymentMethod] = useState("cash");
  const [receiptNotes, setReceiptNotes] = useState("");

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
      try {
        let entriesQuery = supabase.from("ledger_entries").select("*, farmers(name, photo_url)").order("created_at", { ascending: false });
        if (selectedSeason) {
          entriesQuery = entriesQuery.eq("season_id", selectedSeason.id);
        }
        const [entriesRes, inventoryRes] = await Promise.all([
          entriesQuery,
          supabase.from("inventory").select("*"),
        ]);
        if (!entriesRes.error && entriesRes.data && entriesRes.data.length > 0) {
          setEntries(entriesRes.data);
          await offlineRepo.hydrate("ledger_entries", entriesRes.data.map(({ farmers, ...rest }: any) => rest));
          if (inventoryRes.data) {
            setInventory(inventoryRes.data);
            await offlineRepo.hydrate("inventory", inventoryRes.data);
          }
          return;
        }
      } catch (err) {
        console.warn("[Ledger] remote fetch failed, falling back to offline data:", err);
      }
    }
    // Offline / fallback: read from local cache, manually join farmer name
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
    deductionUnit,
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

  // Map of buyer receipts per sale ID
  const buyerReceiptsBySale = useMemo(() => {
    const map = new Map<string, number>();
    entries.forEach((e: any) => {
      if (isBuyerPayment(e)) {
        const sid = getLinkedSaleId(e);
        if (sid) {
          map.set(sid, (map.get(sid) || 0) + Number(e.amount || 0));
        }
      }
    });
    return map;
  }, [entries]);

  // Distinct buyers list from recorded sales
  const distinctBuyers = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e: any) => {
      if (e.entry_type === "sale" && e.buyer && e.buyer.trim()) {
        set.add(e.buyer.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [entries]);

  // Outstanding sales for the selected buyer
  const buyerSales = useMemo(() => {
    if (!selectedReceiptBuyer) return [];
    return entries
      .filter((e: any) =>
        e.entry_type === "sale" &&
        (e.buyer || "").trim().toLowerCase() === selectedReceiptBuyer.trim().toLowerCase()
      )
      .map((s: any) => {
        const netBuyerPayable = Math.max(Number(s.amount || 0) - Number(s.commission_cost || 0), 0);
        const allReceipts = buyerReceiptsBySale.get(s.id) || 0;
        // If editing this specific receipt, subtract its current amount so it can be re-allocated
        const currentEditingAmt = (editingId && selectedReceiptSaleId === s.id)
          ? Number(entries.find((x: any) => x.id === editingId)?.amount || 0)
          : 0;
        const effectiveReceipts = allReceipts - currentEditingAmt;
        const totalPaid = Number(s.paid_amount || 0) + effectiveReceipts;
        const outstanding = Math.max(netBuyerPayable - totalPaid, 0);
        return {
          ...s,
          netBuyerPayable,
          totalPaid,
          outstanding,
        };
      });
  }, [entries, selectedReceiptBuyer, buyerReceiptsBySale, editingId, selectedReceiptSaleId]);

  // Selected sale record and current outstanding
  const selectedReceiptSale = useMemo(() => {
    return buyerSales.find((s) => s.id === selectedReceiptSaleId) || null;
  }, [buyerSales, selectedReceiptSaleId]);

  const resetForm = () => {
    setFarmerId(""); setEntryDate(new Date()); setDescription("");
    setCategory(""); setInventoryItemId(""); setPrice(""); setQuantity(""); setExpenseAmount(""); setCostAllocation("farmer");
    setGrossWeight(""); setDeductionsVal(""); setDeductionUnit("kg"); setSaleRate(""); setWeightUnit("kg"); setRateUnit("kg");
    setBuyer(""); setFieldName(""); setTransportCost(""); setLabourCost(""); setCommissionCost(""); setOtherCosts("");
    setTotalArea(""); setAreaUnit("acre"); setTotalYield(""); setYieldUnit("maund"); setPaidAmount(""); setSaleNotes("");
    setPaymentPurpose("farmer_payment"); setSelectedReceiptBuyer(""); setSelectedReceiptSaleId(""); setReceiptAmount(""); setReceiptPaymentMethod("cash"); setReceiptNotes("");
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
      const wUnit = (e.weight_unit as WeightUnit) || "kg";
      setWeightUnit(wUnit);
      setRateUnit((e.rate_unit as WeightUnit) || "kg");
      let dUnit: WeightUnit = "kg";
      if (wUnit === "maund" && e.deductions && e.gross_weight && e.net_weight) {
        const directDiff = Number(e.gross_weight) - Number(e.deductions);
        if (Math.abs(directDiff - Number(e.net_weight)) < 0.001) {
          dUnit = "maund";
        }
      }
      setDeductionUnit(dUnit);
      setBuyer(e.buyer || "");
      setFieldName(e.field_name || "");
      setCropType(e.crop_type || "");
      setCommissionCost(e.commission_cost ? String(e.commission_cost) : "");

      // Find any linked separate crop expenses saved with this sale
      const linked = entries.filter((x: any) =>
        x.entry_type === "expense" &&
        (x.notes?.includes(`Linked Sale: ${e.id}`) || x.notes?.includes(`[sale:${e.id}]`))
      );
      const tExp = linked.find((x: any) => x.category?.toLowerCase() === "tractor" || x.description?.toLowerCase().includes("transport") || x.description?.toLowerCase().includes("kiraya"));
      const lExp = linked.find((x: any) => x.category?.toLowerCase() === "labour" || x.description?.toLowerCase().includes("labour") || x.description?.toLowerCase().includes("loading"));
      const oExp = linked.find((x: any) => x !== tExp && x !== lExp);

      setTransportCost(tExp ? String(tExp.amount) : (e.transport_cost ? String(e.transport_cost) : ""));
      setLabourCost(lExp ? String(lExp.amount) : (e.labour_cost ? String(e.labour_cost) : ""));
      setOtherCosts(oExp ? String(oExp.amount) : (e.other_costs ? String(e.other_costs) : ""));
      if (tExp || lExp || oExp) {
        const firstExp = tExp || lExp || oExp;
        setCostAllocation(firstExp.payment_method === "landlord_only" ? "landlord" : firstExp.is_shared ? "shared" : "farmer");
      }
      setTotalArea(e.total_area != null ? String(e.total_area) : "");
      setAreaUnit((e.area_unit as AreaUnit) || "acre");
      setTotalYield(e.total_yield != null ? String(e.total_yield) : "");
      setYieldUnit((e.yield_unit as WeightUnit) || "maund");
      setPaidAmount(e.paid_amount ? String(e.paid_amount) : "");
      setSaleNotes(e.notes || "");
    } else if (e.entry_type === "payment") {
      if (isBuyerPayment(e)) {
        setPaymentPurpose("buyer_receipt");
        setSelectedReceiptBuyer(e.buyer || "");
        const sid = getLinkedSaleId(e);
        setSelectedReceiptSaleId(sid || "");
        setReceiptAmount(e.amount ? String(e.amount) : "");
        setReceiptPaymentMethod(e.payment_method || "cash");
        const cleanNotes = (e.notes || "")
          .replace(/\[buyer_receipt\]/g, "")
          .replace(/\[sale:[^\]]+\]/g, "")
          .replace(/Linked Sale:\s*[^\s,]+/g, "")
          .trim();
        setReceiptNotes(cleanNotes);
      } else {
        setPaymentPurpose("farmer_payment");
        setPaymentMethod(e.payment_method || "cash");
        if ((e.payment_method || "cash") === "cash") setCashAmount(String(e.amount ?? ""));
        else { setCropType(e.crop_type || ""); setCropWeight(e.crop_weight != null ? String(e.crop_weight) : ""); setCropRate(e.rate != null ? String(e.rate) : ""); }
      }
    } else if (e.entry_type === "loan") {
      setLoanAmount(String(e.amount ?? ""));
    }
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const entryToDelete = entries.find((e: any) => e.id === id);
      if (
        entryToDelete &&
        entryToDelete.entry_type === "expense" &&
        entryToDelete.inventory_item_id &&
        Number(entryToDelete.quantity) > 0
      ) {
        const item = inventory.find((i: any) => i.id === entryToDelete.inventory_item_id);
        const restoredStock = Number(item?.current_stock ?? 0) + Number(entryToDelete.quantity);
        setInventory((prev) =>
          prev.map((i: any) =>
            i.id === entryToDelete.inventory_item_id ? { ...i, current_stock: restoredStock } : i
          )
        );
        await offlineRepo.update("inventory", entryToDelete.inventory_item_id, { current_stock: restoredStock });
      }

      // If deleting a sale, cascade delete any linked separate crop expenses
      if (entryToDelete && entryToDelete.entry_type === "sale") {
        const linkedExpenses = entries.filter((e: any) =>
          e.entry_type === "expense" &&
          (e.notes?.includes(`Linked Sale: ${id}`) || e.notes?.includes(`[sale:${id}]`))
        );
        for (const exp of linkedExpenses) {
          await offlineRepo.remove("ledger_entries", exp.id);
        }
        setEntries((prev) => prev.filter((e: any) => !linkedExpenses.some((l) => l.id === e.id)));
      }

      await offlineRepo.remove("ledger_entries", id);
      toast({ title: isOnline() ? "Entry deleted" : "Deleted offline — will sync" });
      fetchData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleSave = async () => {
    if (!user || !selectedSeason) return;
    if (saving) return;

    let effectiveFarmerId = farmerId;
    if (activeTab === "payment" && paymentPurpose === "buyer_receipt") {
      if (!selectedReceiptBuyer) {
        toast({ title: "Buyer required", description: "Please select a buyer", variant: "destructive" });
        return;
      }
      if (!selectedReceiptSaleId) {
        toast({ title: "Sale required", description: "Please select an outstanding sale for this buyer", variant: "destructive" });
        return;
      }
      const targetSale = entries.find((e: any) => e.id === selectedReceiptSaleId);
      if (!targetSale) {
        toast({ title: "Sale not found", variant: "destructive" });
        return;
      }
      effectiveFarmerId = targetSale.farmer_id;
    } else {
      if (!farmerId) return;
    }

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
      if (dw < 0) { toast({ title: "Deductions cannot be negative", variant: "destructive" }); return; }
      const gwKg = toKg(gw, weightUnit);
      const dwKg = toKg(dw, deductionUnit);
      if (dwKg >= gwKg && gwKg > 0) {
        toast({ title: t("ledger.deductionsExceed") || "Deductions cannot exceed gross weight", variant: "destructive" });
        return;
      }
      if (nw <= 0) { toast({ title: "Net weight must be > 0 (Gross − Deductions)", variant: "destructive" }); return; }
      if (rt <= 0) { toast({ title: `Rate per ${rateUnit === "maund" ? "Maund" : rateUnit} required`, variant: "destructive" }); return; }
      amount = saleTotal();
    } else if (activeTab === "payment") {
      if (paymentPurpose === "buyer_receipt") {
        amount = Number(receiptAmount) || 0;
        if (amount <= 0) { toast({ title: "Receipt amount must be > 0", variant: "destructive" }); return; }
        const targetSaleOutstanding = selectedReceiptSale?.outstanding ?? 0;
        if (amount > targetSaleOutstanding + 0.01) {
          toast({
            title: "Amount exceeds outstanding",
            description: `Amount cannot exceed the current outstanding balance of ₨ ${targetSaleOutstanding.toLocaleString()}`,
            variant: "destructive",
          });
          return;
        }
      } else {
        amount = paymentMethod === "cash" ? (Number(cashAmount) || 0) : cropTotal();
        if (paymentMethod === "crop_return" && !cropType.trim()) { toast({ title: "Crop name required", variant: "destructive" }); return; }
        if (amount <= 0) { toast({ title: "Payment amount must be > 0", variant: "destructive" }); return; }
      }
    } else if (activeTab === "loan") {
      amount = Number(loanAmount) || 0;
      if (amount <= 0) { toast({ title: "Loan amount must be > 0", variant: "destructive" }); return; }
    }

    // === INVENTORY STOCK CHECK & ATOMIC MOVEMENT CALCULATION ===
    const stockUpdates: Array<{ id: string; newStock: number }> = [];
    if (activeTab === "expense") {
      const qtyNum = Number(quantity) || 0;
      const targetItemId = inventoryItemId && inventoryItemId !== "none" ? inventoryItemId : null;

      if (editingId) {
        const existingEntry = entries.find((e: any) => e.id === editingId);
        const oldItemId = existingEntry?.inventory_item_id || null;
        const oldQty = Number(existingEntry?.quantity) || 0;

        if (oldItemId === targetItemId && targetItemId) {
          // Same item: delta is newQty - oldQty
          const delta = qtyNum - oldQty;
          const item = inventory.find((i: any) => i.id === targetItemId);
          if (item) {
            if (delta > 0 && Number(item.current_stock) < delta) {
              toast({
                title: "Insufficient stock",
                description: `Cannot add ${delta} ${item.unit}. Only ${item.current_stock} ${item.unit} available in stock.`,
                variant: "destructive",
              });
              return;
            }
            stockUpdates.push({ id: targetItemId, newStock: Number(item.current_stock) - delta });
          }
        } else {
          // Item changed or unlinked:
          if (oldItemId && oldQty > 0) {
            const oldItem = inventory.find((i: any) => i.id === oldItemId);
            if (oldItem) {
              stockUpdates.push({ id: oldItemId, newStock: Number(oldItem.current_stock) + oldQty });
            }
          }
          if (targetItemId && qtyNum > 0) {
            const newItem = inventory.find((i: any) => i.id === targetItemId);
            if (newItem) {
              if (Number(newItem.current_stock) < qtyNum) {
                toast({
                  title: "Insufficient stock",
                  description: `Cannot issue ${qtyNum} ${newItem.unit}. Only ${newItem.current_stock} ${newItem.unit} available in stock.`,
                  variant: "destructive",
                });
                return;
              }
              stockUpdates.push({ id: targetItemId, newStock: Number(newItem.current_stock) - qtyNum });
            }
          }
        }
      } else {
        // New expense entry:
        if (targetItemId && qtyNum > 0) {
          const item = inventory.find((i: any) => i.id === targetItemId);
          if (item) {
            if (Number(item.current_stock) < qtyNum) {
              toast({
                title: "Insufficient stock",
                description: `Cannot issue ${qtyNum} ${item.unit}. Only ${item.current_stock} ${item.unit} available in stock.`,
                variant: "destructive",
              });
              return;
            }
            stockUpdates.push({ id: targetItemId, newStock: Number(item.current_stock) - qtyNum });
          }
        }
      }
    }

    // === DUPLICATE CHECK (block) ===
    const isDuplicate = entries.some((e: any) =>
      e.id !== editingId &&
      e.farmer_id === effectiveFarmerId &&
      e.entry_type === activeTab &&
      e.entry_date === dateStr &&
      Math.abs(Number(e.amount) - amount) < 0.01 &&
      (activeTab !== "payment" || (isBuyerPayment(e) === (paymentPurpose === "buyer_receipt") && (!isBuyerPayment(e) || getLinkedSaleId(e) === selectedReceiptSaleId)))
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
      const fs = farmerSeasons.find(fs => fs.farmer_id === effectiveFarmerId && fs.season_id === selectedSeason.id);
      let entryData: Record<string, unknown> = {
        farmer_id: effectiveFarmerId, entry_type: activeTab, description, created_by: user.id,
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
      }

      // Linked separate crop expenses when activeTab === "sale"
      const linkedExpenseInserts: any[] = [];
      const linkedExpenseUpdates: Array<{ id: string; patch: any }> = [];
      const linkedExpenseDeletes: string[] = [];

      if (activeTab === "sale") {
        const commCost = num(commissionCost);
        const netBuyerPayable = Math.max(sale.grossSale - commCost, 0);
        const buyerPaid = num(paidAmount);
        const buyerPaymentStatus =
          buyerPaid <= 0 ? "unpaid" : buyerPaid >= netBuyerPayable - 0.01 ? "paid" : "partial";

        const targetSaleId =
          editingId ||
          ((typeof crypto !== "undefined" && "randomUUID" in crypto)
            ? crypto.randomUUID()
            : `sale-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);

        if (!editingId) {
          (entryData as any).id = targetSaleId;
        }

        entryData = {
          ...entryData,
          amount, // grossSale
          gross_weight: num(grossWeight),
          deductions: num(deductionsVal),
          net_weight: sale.netWeight,
          rate: num(saleRate),
          weight_unit: weightUnit,
          rate_unit: rateUnit,
          buyer: buyer.trim() || null,
          field_name: fieldName.trim() || null,
          crop_type: cropType.trim() || description.trim() || null,
          transport_cost: 0,
          labour_cost: 0,
          commission_cost: commCost,
          other_costs: 0,
          total_area: num(totalArea) || null,
          area_unit: areaUnit,
          total_yield: num(totalYield) || null,
          yield_unit: yieldUnit,
          paid_amount: buyerPaid,
          payment_status: buyerPaymentStatus,
          notes: saleNotes.trim() || null,
        };

        // Separate crop expenses entered during Post Sale
        const tCost = num(transportCost);
        const lCost = num(labourCost);
        const oCost = num(otherCosts);
        const cropLabel = cropType.trim() || description.trim() || "Crop";
        const buyerLabel = buyer.trim() ? ` (${buyer.trim()})` : "";
        const isSharedExp = costAllocation === "shared";
        const isLandlordOnly = costAllocation === "landlord";

        const existingLinked = editingId
          ? entries.filter(
              (x: any) =>
                x.entry_type === "expense" &&
                (x.notes?.includes(`Linked Sale: ${editingId}`) || x.notes?.includes(`[sale:${editingId}]`))
            )
          : [];

        const existingT = existingLinked.find(
          (x: any) =>
            x.category?.toLowerCase() === "tractor" ||
            x.description?.toLowerCase().includes("transport") ||
            x.description?.toLowerCase().includes("kiraya")
        );
        const existingL = existingLinked.find(
          (x: any) =>
            x.category?.toLowerCase() === "labour" ||
            x.description?.toLowerCase().includes("labour") ||
            x.description?.toLowerCase().includes("loading")
        );
        const existingO = existingLinked.find(
          (x: any) => x !== existingT && x !== existingL
        );

        const syncExp = (val: number, existing: any, cat: string, desc: string) => {
          if (val > 0) {
            const expFields = {
              farmer_id: farmerId,
              season_id: selectedSeason.id,
              farmer_season_id: fs?.id || null,
              entry_type: "expense",
              entry_date: dateStr,
              amount: val,
              category: cat,
              description: desc,
              notes: `Linked Sale: ${targetSaleId}`,
              crop_type: cropType.trim() || description.trim() || null,
              is_shared: isSharedExp,
              shared_amount: isSharedExp ? val / 2 : null,
              payment_method: isLandlordOnly ? "landlord_only" : null,
              created_by: user.id,
            };
            if (existing) {
              linkedExpenseUpdates.push({ id: existing.id, patch: expFields });
            } else {
              const newId =
                typeof crypto !== "undefined" && "randomUUID" in crypto
                  ? crypto.randomUUID()
                  : `exp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
              linkedExpenseInserts.push({ ...expFields, id: newId });
            }
          } else if (existing) {
            linkedExpenseDeletes.push(existing.id);
          }
        };

        syncExp(tCost, existingT, "Tractor", `Transport / Kiraya for ${cropLabel} sale${buyerLabel}`);
        syncExp(lCost, existingL, "Labour", `Labour / Loading for ${cropLabel} sale${buyerLabel}`);
        syncExp(oCost, existingO, "Others", `Crop sale expenses for ${cropLabel} sale${buyerLabel}`);
      } else if (activeTab === "payment") {
        if (paymentPurpose === "buyer_receipt") {
          const targetSale = entries.find((e: any) => e.id === selectedReceiptSaleId);
          entryData = {
            ...entryData,
            amount,
            farmer_id: targetSale?.farmer_id || effectiveFarmerId,
            category: "buyer_payment",
            buyer: targetSale?.buyer || selectedReceiptBuyer,
            crop_type: targetSale?.crop_type || null,
            payment_method: receiptPaymentMethod,
            notes: `[buyer_receipt] [sale:${targetSale?.id || selectedReceiptSaleId}] ${receiptNotes.trim()}`.trim(),
            description: receiptNotes.trim() || `Buyer payment received - ${targetSale?.buyer || selectedReceiptBuyer}`,
          };
        } else {
          entryData = { ...entryData, amount, payment_method: paymentMethod, crop_type: paymentMethod === "crop_return" ? cropType : null, crop_weight: paymentMethod === "crop_return" && cropWeight ? Number(cropWeight) : null, rate: paymentMethod === "crop_return" && cropRate ? Number(cropRate) : null };
        }
      } else if (activeTab === "loan") {
        entryData = { ...entryData, amount, entry_type: "loan" };
      }

      // ===== Optimistic UI: update list instantly =====
      const farmerRow = (farmerSeasons.find((x: any) => x.farmer_id === effectiveFarmerId) as any)?.farmers;
      const farmerName = farmerRow?.name || "";
      const farmerPhoto = farmerRow?.photo_url || null;
      const nowIso = new Date().toISOString();

      if (editingId) {
        setEntries((prev) => {
          let updated = prev.map((e: any) =>
            e.id === editingId ? { ...e, ...entryData, updated_at: nowIso } : e
          );
          for (const u of linkedExpenseUpdates) {
            updated = updated.map((e: any) => (e.id === u.id ? { ...e, ...u.patch, updated_at: nowIso } : e));
          }
          if (linkedExpenseDeletes.length > 0) {
            updated = updated.filter((e: any) => !linkedExpenseDeletes.includes(e.id));
          }
          for (const ins of linkedExpenseInserts) {
            updated = [
              { ...ins, created_at: nowIso, updated_at: nowIso, farmers: { name: farmerName, photo_url: farmerPhoto } },
              ...updated,
            ];
          }
          return updated;
        });
      } else {
        const optimisticEntry: any = {
          ...entryData,
          created_at: nowIso,
          updated_at: nowIso,
          farmers: { name: farmerName, photo_url: farmerPhoto },
        };
        const optimisticExpenses = linkedExpenseInserts.map((ins) => ({
          ...ins,
          created_at: nowIso,
          updated_at: nowIso,
          farmers: { name: farmerName, photo_url: farmerPhoto },
        }));
        setEntries((prev) => [optimisticEntry, ...optimisticExpenses, ...prev]);
      }

      // Optimistic inventory update
      if (stockUpdates.length > 0) {
        setInventory((prev) =>
          prev.map((i: any) => {
            const up = stockUpdates.find((u) => u.id === i.id);
            return up ? { ...i, current_stock: up.newStock } : i;
          })
        );
      }

      // Reset/close UI immediately so it feels instant
      const wasEditing = !!editingId;

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
          for (const ins of linkedExpenseInserts) {
            await offlineRepo.insert("ledger_entries", ins);
          }
          for (const u of linkedExpenseUpdates) {
            await offlineRepo.update("ledger_entries", u.id, u.patch);
          }
          for (const delId of linkedExpenseDeletes) {
            await offlineRepo.remove("ledger_entries", delId);
          }
          for (const up of stockUpdates) {
            await offlineRepo.update("inventory", up.id, { current_stock: up.newStock });
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

  const typeBadge = (type: string, isBuyerRec = false) => {
    if (isBuyerRec) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
          {t("ledger.buyerReceiptBadge")}
        </span>
      );
    }
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
    if (filterType !== "all") {
      if (filterType === "buyer_payment") {
        if (!isBuyerPayment(e)) return false;
      } else if (filterType === "farmer_payment") {
        if (e.entry_type !== "payment" || isBuyerPayment(e)) return false;
      } else if (filterType === "payment") {
        if (e.entry_type !== "payment") return false;
      } else if (e.entry_type !== filterType) {
        return false;
      }
    }
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
      const hay = [e.farmers?.name, e.description, (e as any).category, (e as any).buyer, e.entry_type].filter(Boolean).join(" ").toLowerCase();
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
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-4 flex items-center gap-3 text-amber-700 dark:text-amber-400 shadow-sm">
          <Lock className="h-5 w-5 shrink-0" /> <span className="font-medium text-sm">{t("seasons.seasonClosed")}</span>
        </div>
      )}
      {!selectedSeason && (
        <div className="rounded-lg bg-muted border border-border p-5 text-center text-muted-foreground font-medium">
          {t("seasons.noActiveSeason")}
        </div>
      )}

      {/* --- Premium Header Banner with crop background --- */}
      <div
        className="relative overflow-hidden rounded-lg sm:rounded-lg p-4 sm:p-10 text-white shadow-2xl border border-violet-900/40 bg-cover bg-center"
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
            <div className="hidden sm:flex h-16 w-16 items-center justify-center rounded-lg bg-card/15 backdrop-blur-xl border border-white/20 shadow-inner shrink-0">
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
                  <Button className="w-full sm:w-auto bg-card text-violet-900 hover:bg-card/90 font-bold shadow-xl shadow-black/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl rounded-xl sm:rounded-lg h-11 sm:h-14 px-5 sm:px-8 shrink-0 text-sm sm:text-base">
                    <Plus className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />{t("ledger.newTransaction")}
                  </Button>
                </DialogTrigger>
                    <DialogContent
                  className="sm:max-w-xl h-dvh sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-none sm:rounded-lg"
                  onKeyDown={(e) => { if (e.key === "Enter" && saving) { e.preventDefault(); e.stopPropagation(); } }}
                  onEscapeKeyDown={(e) => { if (saving) e.preventDefault(); }}
                  onPointerDownOutside={(e) => { if (saving) e.preventDefault(); }}
                  onInteractOutside={(e) => { if (saving) e.preventDefault(); }}
                >
                  <DialogHeader className="px-3 sm:px-6 py-2 sm:py-5 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 border-b">
                    <DialogTitle className="font-serif text-base sm:text-2xl flex items-center gap-2 text-violet-900 dark:text-violet-100">
                      <BookOpen className="h-4 w-4 sm:h-6 sm:w-6 text-violet-600 dark:text-violet-400" />
                      {editingId ? t("ledger.editEntry") : t("ledger.newTransaction")}
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
                            <Select
                              value={activeTab === "payment" && paymentPurpose === "buyer_receipt" ? (selectedReceiptSale?.farmer_id || farmerId) : farmerId}
                              onValueChange={setFarmerId}
                              disabled={activeTab === "payment" && paymentPurpose === "buyer_receipt"}
                            >
                              <SelectTrigger className="h-8 sm:h-11 bg-background text-[10px] sm:text-sm"><SelectValue placeholder={t("ledger.selectFarmer")} /></SelectTrigger>
                              <SelectContent>{seasonFarmers.map((fs) => <SelectItem key={fs.farmer_id} value={fs.farmer_id}>{fs.farmers?.name || "—"}</SelectItem>)}</SelectContent>
                            </Select>
                            {activeTab === "payment" && paymentPurpose === "buyer_receipt" && selectedReceiptSale && (
                              <span className="text-[8px] sm:text-[10px] text-muted-foreground block truncate">
                                Farmer from selected sale: {seasonFarmers.find(f => f.farmer_id === selectedReceiptSale.farmer_id)?.farmers?.name || "Farmer"}
                              </span>
                            )}
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
                          <p className="text-[9px] sm:text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">🌾 {t("ledger.cropDetails")}</p>
                          <div className="grid grid-cols-2 gap-1.5 sm:gap-4">
                            <div className="space-y-0.5 sm:space-y-1.5"><Label className="text-[9px] sm:text-sm font-semibold">{t("ledger.cropType")}</Label><Input className="h-8 sm:h-11 bg-background text-[10px] sm:text-sm" value={cropType} onChange={(e) => setCropType(e.target.value)} placeholder={language === "sd" ? "ڪڻڪ / ڦٽيون" : language === "ur" ? "گندم / کپاس" : "Wheat / Cotton"} /></div>
                            <div className="space-y-0.5 sm:space-y-1.5"><Label className="text-[9px] sm:text-sm font-semibold">{t("ledger.buyer")}</Label><Input className="h-8 sm:h-11 bg-background text-[10px] sm:text-sm" value={buyer} onChange={(e) => setBuyer(e.target.value)} placeholder={t("ledger.buyerPlaceholder")} /></div>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5 sm:gap-4">
                            <div className="space-y-0.5 sm:space-y-1.5"><Label className="text-[9px] sm:text-sm font-semibold">{t("ledger.fieldPlot")}</Label><Input className="h-8 sm:h-11 bg-background text-[10px] sm:text-sm" value={fieldName} onChange={(e) => setFieldName(e.target.value)} placeholder={t("ledger.fieldPlaceholder")} /></div>
                            <div className="space-y-0.5 sm:space-y-1.5"><Label className="text-[9px] sm:text-sm font-semibold">{t("common.description")}</Label><Input className="h-8 sm:h-11 bg-background text-[10px] sm:text-sm" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("ledger.enterDescription")} /></div>
                          </div>
                        </div>

                        {/* --- Weight & Rate --- */}
                        <div className="rounded-lg sm:rounded-xl border border-border bg-muted/30 p-2 sm:p-4 space-y-2 sm:space-y-3">
                          <p className="text-[9px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">⚖️ {t("ledger.weightAndRate")}</p>
                          <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
                            <div className="space-y-0.5 sm:space-y-1.5">
                              <Label className="text-[9px] sm:text-sm font-semibold truncate block">
                                {language === "ur"
                                  ? `کل وزن (${weightUnit === "maund" ? "من" : weightUnit === "ton" ? "ٹن" : "کلو"})`
                                  : language === "sd"
                                  ? `ڪُل وزن (${weightUnit === "maund" ? "مڻ" : weightUnit === "ton" ? "ٽن" : "ڪلو"})`
                                  : `Gross (${weightUnit === "maund" ? "Mnds" : weightUnit === "ton" ? "Ton" : "Kg"})`}
                              </Label>
                              <Input className="h-8 sm:h-11 bg-background text-[10px] sm:text-sm" type="number" inputMode="decimal" min="0" step="0.01" value={grossWeight} onChange={(e) => setGrossWeight(e.target.value)} placeholder="0" />
                            </div>

                            <div className="space-y-0.5 sm:space-y-1.5">
                              <div className="flex items-center justify-between gap-1">
                                <Label className="text-[9px] sm:text-sm font-semibold truncate">
                                  {deductionUnit === "maund"
                                    ? (t("ledger.deductionsMaund") || "Deduction (Mnds)")
                                    : (t("ledger.deductionsKg") || "Deduction (Kg)")}
                                </Label>
                                <div className="inline-flex items-center rounded border border-border bg-background p-0.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => setDeductionUnit("kg")}
                                    className={cn(
                                      "px-1 sm:px-1.5 py-0.5 text-[8px] sm:text-[10px] rounded font-semibold transition-colors",
                                      deductionUnit === "kg"
                                        ? "bg-emerald-600 text-white shadow-xs"
                                        : "text-muted-foreground hover:text-foreground"
                                    )}
                                  >
                                    {translateUnit("kg", language)}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeductionUnit("maund")}
                                    className={cn(
                                      "px-1 sm:px-1.5 py-0.5 text-[8px] sm:text-[10px] rounded font-semibold transition-colors",
                                      deductionUnit === "maund"
                                        ? "bg-emerald-600 text-white shadow-xs"
                                        : "text-muted-foreground hover:text-foreground"
                                    )}
                                  >
                                    {translateUnit("maund", language)}
                                  </button>
                                </div>
                              </div>
                              <Input className="h-8 sm:h-11 bg-background text-red-600 font-medium text-[10px] sm:text-sm" type="number" inputMode="decimal" min="0" step="0.01" value={deductionsVal} onChange={(e) => setDeductionsVal(e.target.value)} placeholder="0" />
                            </div>

                            <div className="space-y-0.5 sm:space-y-1.5">
                              <Label className="text-[9px] sm:text-sm font-semibold">{t("common.unit")}</Label>
                              <Select
                                value={weightUnit}
                                onValueChange={(v) => {
                                  const u = v as WeightUnit;
                                  setWeightUnit(u);
                                  setDeductionUnit("kg");
                                }}
                              >
                                <SelectTrigger className="h-8 sm:h-11 bg-background text-[10px] sm:text-sm">
                                  <SelectValue>{translateUnit(weightUnit, language)}</SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="kg">{translateUnit("kg", language)}</SelectItem>
                                  <SelectItem value="maund">{translateUnit("maund", language)}</SelectItem>
                                  <SelectItem value="ton">{translateUnit("ton", language)}</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="rounded-md sm:rounded-lg bg-background border border-border p-2 sm:p-3 text-[10px] sm:text-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-muted-foreground">{t("ledger.netWeight")}</span>
                              <span className="text-[7px] sm:text-[9px] uppercase tracking-wider text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-500/10 px-1 py-0.5 rounded">
                                {t("ledger.autoCalculated")}
                              </span>
                            </div>
                            <div className="text-left sm:text-right flex flex-col sm:items-end">
                              {weightUnit === "maund" ? (
                                <>
                                  <span className="font-mono font-bold text-xs sm:text-base text-emerald-700 dark:text-emerald-400">
                                    {formatMaundCompound(sale.netWeightKg, { lang: language as any })}
                                  </span>
                                  {num(grossWeight) > 0 && (
                                    <span className="text-[8px] sm:text-xs font-normal text-muted-foreground">
                                      ({qty(sale.netWeight)} {translateUnit("maund", language)} · {qty(sale.netWeightKg)} {translateUnit("kg", language)})
                                    </span>
                                  )}
                                </>
                              ) : (
                                <>
                                  <span className="font-mono font-bold text-xs sm:text-base text-emerald-700 dark:text-emerald-400">
                                    {qty(sale.netWeight)} {translateUnit(weightUnit, language)}
                                  </span>
                                  {num(grossWeight) > 0 && weightUnit !== "kg" && (
                                    <span className="text-[8px] sm:text-xs font-normal text-muted-foreground">
                                      ({qty(sale.netWeightKg)} {translateUnit("kg", language)})
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5 sm:gap-3">
                            <div className="space-y-0.5 sm:space-y-1.5"><Label className="text-[9px] sm:text-sm font-semibold">{t("ledger.rate")} (₨)</Label><Input className="h-8 sm:h-11 bg-background font-mono text-[10px] sm:text-sm" type="number" inputMode="decimal" min="0" step="0.01" value={saleRate} onChange={(e) => setSaleRate(e.target.value)} placeholder="0" /></div>
                            <div className="space-y-0.5 sm:space-y-1.5">
                              <Label className="text-[9px] sm:text-sm font-semibold">{t("ledger.ratePer")}</Label>
                              <Select value={rateUnit} onValueChange={(v) => setRateUnit(v as WeightUnit)}>
                                <SelectTrigger className="h-8 sm:h-11 bg-background text-[10px] sm:text-sm">
                                  <SelectValue>{`${t("ledger.per")} ${translateUnit(rateUnit, language)}`}</SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {WEIGHT_UNITS.map((u) => (
                                    <SelectItem key={u.value} value={u.value}>
                                      {`${t("ledger.per")} ${translateUnit(u.value, language)}`}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="rounded-md sm:rounded-lg bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 p-2 sm:p-3 text-[10px] sm:text-sm font-semibold flex justify-between items-center">
                            <div className="text-start">
                              <span className="text-emerald-700 dark:text-emerald-400 block">{t("dashboard.totalSaleGross")}</span>
                              {num(saleRate) > 0 && num(grossWeight) > 0 && weightUnit === "maund" && (
                                <span className="text-[8px] sm:text-[11px] text-muted-foreground font-normal block">
                                  {formatMaundCompound(sale.netWeightKg, { lang: language as any })} ({qty(sale.netWeight)} {translateUnit("maund", language)}) × ₨ {qty(num(saleRate))} / {translateUnit(rateUnit, language)}
                                </span>
                              )}
                            </div>
                            <span className="text-xs sm:text-lg font-mono text-emerald-600 dark:text-emerald-400"><bdi>{money(sale.grossSale)}</bdi></span>
                          </div>
                        </div>

                        {/* --- Buyer Commission --- */}
                        <div className="rounded-lg sm:rounded-xl border border-amber-500/30 bg-amber-50/40 dark:bg-amber-950/20 p-2 sm:p-4 space-y-2 sm:space-y-3 text-start">
                          <div className="flex items-center justify-between">
                            <p className="text-[9px] sm:text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                              <span>🤝 {t("ledger.buyerCommissionTitle")}</span>
                              <span className="text-[8px] sm:text-[10px] font-normal normal-case text-muted-foreground">{t("ledger.buyerCommissionHint")}</span>
                            </p>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-3 items-center">
                            <div className="space-y-0.5 sm:space-y-1.5">
                              <Label className="text-[9px] sm:text-sm font-semibold">{t("ledger.commission")} (₨)</Label>
                              <Input
                                className="h-8 sm:h-11 bg-background font-mono text-red-600 font-bold text-[10px] sm:text-sm"
                                type="number"
                                inputMode="decimal"
                                min="0"
                                step="0.01"
                                value={commissionCost}
                                onChange={(e) => setCommissionCost(e.target.value)}
                                placeholder="0"
                              />
                            </div>
                            <div className="rounded-md sm:rounded-lg bg-background border border-amber-500/20 p-2 sm:p-3 text-[10px] sm:text-sm flex flex-col justify-center">
                              <span className="text-muted-foreground font-semibold text-[9px] sm:text-xs">{t("ledger.netBuyerPayable")}</span>
                              <span className="font-mono font-bold text-xs sm:text-base text-amber-700 dark:text-amber-400">
                                <bdi>{money(Math.max(sale.grossSale - num(commissionCost), 0))}</bdi>
                              </span>
                              <span className="text-[8px] sm:text-[10px] text-muted-foreground">
                                {money(sale.grossSale)} − {money(num(commissionCost))}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* --- Separate Crop Expenses (Farmer / Landlord) --- */}
                        <div className="rounded-lg sm:rounded-xl border border-orange-500/30 bg-orange-50/40 dark:bg-orange-950/20 p-2 sm:p-4 space-y-2 sm:space-y-3 text-start">
                          <div className="flex items-center justify-between">
                            <p className="text-[9px] sm:text-xs font-bold uppercase tracking-wider text-orange-700 dark:text-orange-400 flex items-center gap-1.5">
                              <span>🚜 {t("ledger.separateCropExpensesTitle")}</span>
                              <span className="text-[8px] sm:text-[10px] font-normal normal-case text-muted-foreground">{t("ledger.separateCropExpensesSubtitle")}</span>
                            </p>
                          </div>
                          <p className="text-[8px] sm:text-[11px] text-muted-foreground">
                            {t("ledger.separateCropExpensesNotice")}
                          </p>
                          <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
                            <div className="space-y-0.5 sm:space-y-1.5">
                              <Label className="text-[9px] sm:text-sm font-semibold truncate block">{t("ledger.transportKiraya")}</Label>
                              <Input
                                className="h-8 sm:h-11 bg-background text-[10px] sm:text-sm font-mono"
                                type="number"
                                inputMode="decimal"
                                min="0"
                                step="0.01"
                                value={transportCost}
                                onChange={(e) => setTransportCost(e.target.value)}
                                placeholder="0"
                              />
                            </div>
                            <div className="space-y-0.5 sm:space-y-1.5">
                              <Label className="text-[9px] sm:text-sm font-semibold truncate block">{t("ledger.labourLoading")}</Label>
                              <Input
                                className="h-8 sm:h-11 bg-background text-[10px] sm:text-sm font-mono"
                                type="number"
                                inputMode="decimal"
                                min="0"
                                step="0.01"
                                value={labourCost}
                                onChange={(e) => setLabourCost(e.target.value)}
                                placeholder="0"
                              />
                            </div>
                            <div className="space-y-0.5 sm:space-y-1.5">
                              <Label className="text-[9px] sm:text-sm font-semibold truncate block">{t("ledger.otherCropCosts")}</Label>
                              <Input
                                className="h-8 sm:h-11 bg-background text-[10px] sm:text-sm font-mono"
                                type="number"
                                inputMode="decimal"
                                min="0"
                                step="0.01"
                                value={otherCosts}
                                onChange={(e) => setOtherCosts(e.target.value)}
                                placeholder="0"
                              />
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1 border-t border-orange-200 dark:border-orange-900/50">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Label className="text-[9px] sm:text-xs font-semibold text-muted-foreground">{t("ledger.allocationLabel")}</Label>
                              <div className="inline-flex items-center rounded-lg border border-border bg-background p-0.5 text-[9px] sm:text-xs">
                                <button
                                  type="button"
                                  onClick={() => setCostAllocation("farmer")}
                                  className={cn(
                                    "px-2 py-0.5 rounded font-medium transition-colors",
                                    costAllocation === "farmer" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                                  )}
                                >
                                  {t("ledger.farmerOnly")}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setCostAllocation("shared")}
                                  className={cn(
                                    "px-2 py-0.5 rounded font-medium transition-colors",
                                    costAllocation === "shared" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                                  )}
                                >
                                  {t("ledger.sharedFifty")}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setCostAllocation("landlord")}
                                  className={cn(
                                    "px-2 py-0.5 rounded font-medium transition-colors",
                                    costAllocation === "landlord" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                                  )}
                                >
                                  {t("ledger.landlordOnly")}
                                </button>
                              </div>
                            </div>
                            <div className="text-[10px] sm:text-sm font-semibold text-orange-700 dark:text-orange-400">
                              {t("ledger.totalCropExpensesLabel")} <span className="font-mono"><bdi>{money(num(transportCost) + num(labourCost) + num(otherCosts))}</bdi></span>
                            </div>
                          </div>
                        </div>

                        {/* --- Yield Summary --- */}
                        <div className="rounded-lg sm:rounded-xl border border-amber-500/20 bg-amber-50/40 dark:bg-amber-950/20 p-2 sm:p-4 space-y-2 sm:space-y-3 text-start">
                          <p className="text-[9px] sm:text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">🌱 {t("dashboard.totalYield")}</p>
                          <div className="grid grid-cols-2 gap-1.5 sm:gap-3">
                            <div className="space-y-0.5 sm:space-y-1.5"><Label className="text-[9px] sm:text-sm font-semibold">{t("dashboard.totalArea")}</Label><Input className="h-8 sm:h-11 bg-background text-[10px] sm:text-sm" type="number" inputMode="decimal" min="0" step="0.01" value={totalArea} onChange={(e) => setTotalArea(e.target.value)} placeholder="0" /></div>
                            <div className="space-y-0.5 sm:space-y-1.5">
                              <Label className="text-[9px] sm:text-sm font-semibold">{t("ledger.areaUnit")}</Label>
                              <Select value={areaUnit} onValueChange={(v) => setAreaUnit(v as AreaUnit)}>
                                <SelectTrigger className="h-8 sm:h-11 bg-background text-[10px] sm:text-sm">
                                  <SelectValue>{translateUnit(areaUnit, language)}</SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {AREA_UNITS.map((u) => (
                                    <SelectItem key={u.value} value={u.value}>
                                      {translateUnit(u.value, language)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-0.5 sm:space-y-1.5"><Label className="text-[9px] sm:text-sm font-semibold">{t("dashboard.totalYield")}</Label><Input className="h-8 sm:h-11 bg-background text-[10px] sm:text-sm" type="number" inputMode="decimal" min="0" step="0.01" value={totalYield} onChange={(e) => setTotalYield(e.target.value)} placeholder="0" /></div>
                            <div className="space-y-0.5 sm:space-y-1.5">
                              <Label className="text-[9px] sm:text-sm font-semibold">{t("ledger.yieldUnit")}</Label>
                              <Select value={yieldUnit} onValueChange={(v) => setYieldUnit(v as WeightUnit)}>
                                <SelectTrigger className="h-8 sm:h-11 bg-background text-[10px] sm:text-sm">
                                  <SelectValue>{translateUnit(yieldUnit, language)}</SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {WEIGHT_UNITS.map((u) => (
                                    <SelectItem key={u.value} value={u.value}>
                                      {translateUnit(u.value, language)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5 sm:gap-3 text-[8px] sm:text-xs">
                            <div className="rounded-md bg-background border p-1.5 sm:p-2.5 flex flex-col"><span className="text-muted-foreground font-semibold">{t("dashboard.yieldPerAcre")}</span><span className="font-mono font-bold text-amber-700 dark:text-amber-400">{sale.yieldPerAcre != null ? `${qty(sale.yieldPerAcre)} ${translateUnit(yieldUnit, language)}` : "—"}</span></div>
                            <div className="rounded-md bg-background border p-1.5 sm:p-2.5 flex flex-col"><span className="text-muted-foreground font-semibold">{t("dashboard.profitPerAcre")}</span><span className="font-mono font-bold text-emerald-600">{sale.saleValuePerAcre != null ? money(sale.saleValuePerAcre) : "—"}</span></div>
                          </div>
                        </div>

                        {/* --- Payment --- */}
                        <div className="rounded-lg sm:rounded-xl border border-blue-500/20 bg-blue-50/40 dark:bg-blue-950/20 p-2 sm:p-4 space-y-2 sm:space-y-3 text-start">
                          <p className="text-[9px] sm:text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">💰 {t("ledger.buyerReceipt")}</p>
                          <div className="grid grid-cols-2 gap-1.5 sm:gap-3">
                            <div className="space-y-0.5 sm:space-y-1.5">
                              <Label className="text-[9px] sm:text-sm font-semibold">{t("ledger.paidByBuyer")} (₨)</Label>
                              <Input className="h-8 sm:h-11 bg-background font-mono text-[10px] sm:text-sm" type="number" inputMode="decimal" min="0" step="0.01" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} placeholder="0" />
                            </div>
                            <div className="space-y-0.5 sm:space-y-1.5"><Label className="text-[9px] sm:text-sm font-semibold">{t("ledger.notes")}</Label><Input className="h-8 sm:h-11 bg-background text-[10px] sm:text-sm" value={saleNotes} onChange={(e) => setSaleNotes(e.target.value)} placeholder={t("ledger.optional")} /></div>
                          </div>
                          {(() => {
                            const netBuyerPayable = Math.max(sale.grossSale - num(commissionCost), 0);
                            const paidNum = num(paidAmount);
                            const buyerRemaining = Math.max(netBuyerPayable - paidNum, 0);
                            const buyerStatus = paidNum <= 0 ? "unpaid" : paidNum >= netBuyerPayable - 0.01 ? "paid" : "partial";
                            return (
                              <div className="grid grid-cols-3 gap-1.5 sm:gap-3 text-[8px] sm:text-xs">
                                <div className="rounded-md bg-background border p-1.5 sm:p-2.5 flex flex-col">
                                  <span className="text-muted-foreground font-semibold">{t("ledger.netBuyerPayable")}</span>
                                  <span className="font-mono font-bold text-emerald-600">{money(netBuyerPayable)}</span>
                                </div>
                                <div className="rounded-md bg-background border p-1.5 sm:p-2.5 flex flex-col">
                                  <span className="text-muted-foreground font-semibold">{t("ledger.dueFromBuyer")}</span>
                                  <span className="font-mono font-bold text-red-600">{money(buyerRemaining)}</span>
                                </div>
                                <div className="rounded-md bg-background border p-1.5 sm:p-2.5 flex flex-col">
                                  <span className="text-muted-foreground font-semibold">{t("ledger.status")}</span>
                                  <span className={cn("font-bold uppercase", buyerStatus === "paid" ? "text-emerald-600" : buyerStatus === "partial" ? "text-amber-600" : "text-red-600")}>
                                    {buyerStatus === "paid" ? t("ledger.statusPaid") : buyerStatus === "partial" ? t("ledger.statusPartial") : t("ledger.statusUnpaid")}
                                  </span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        <div className="rounded-lg sm:rounded-xl bg-gradient-to-r from-emerald-500/15 to-teal-500/15 border border-emerald-500/30 p-2 sm:p-4 text-[10px] sm:text-sm font-semibold flex justify-between items-center">
                          <div>
                            <span className="text-emerald-700 dark:text-emerald-400 block">{t("ledger.totalAmount")} ({t("ledger.gross")})</span>
                            {num(commissionCost) > 0 && (
                              <span className="text-[8px] sm:text-[11px] text-muted-foreground font-normal">
                                {t("ledger.netBuyerPayable")}: {money(Math.max(sale.grossSale - num(commissionCost), 0))} ({t("ledger.after")} {money(num(commissionCost))} {t("ledger.commission")})
                              </span>
                            )}
                          </div>
                          <span className="text-sm sm:text-xl font-mono text-emerald-600 dark:text-emerald-400">{money(sale.grossSale)}</span>
                        </div>
                      </TabsContent>

                      {/* PAYMENT TAB */}
                      <TabsContent value="payment" className="space-y-2 sm:space-y-4">
                        {/* Purpose / Direction selector */}
                        <div className="space-y-1 sm:space-y-1.5">
                          <Label className="text-[9px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            {t("ledger.paymentPurpose")}
                          </Label>
                          <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                            <button
                              type="button"
                              onClick={() => setPaymentPurpose("farmer_payment")}
                              className={cn(
                                "p-2 sm:p-3 rounded-lg border text-start flex items-center gap-2 transition-all",
                                paymentPurpose === "farmer_payment"
                                  ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold ring-1 ring-amber-500"
                                  : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                              )}
                            >
                              <span className="text-base sm:text-lg">👨‍🌾</span>
                              <div className="min-w-0">
                                <div className="text-[10px] sm:text-xs font-semibold">{t("ledger.farmerPayment")}</div>
                                <div className="text-[7px] sm:text-[9px] text-muted-foreground font-normal truncate">{t("ledger.farmerPaymentDesc")}</div>
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => setPaymentPurpose("buyer_receipt")}
                              className={cn(
                                "p-2 sm:p-3 rounded-lg border text-start flex items-center gap-2 transition-all",
                                paymentPurpose === "buyer_receipt"
                                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold ring-1 ring-emerald-500"
                                  : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                              )}
                            >
                              <span className="text-base sm:text-lg">🏪</span>
                              <div className="min-w-0">
                                <div className="text-[10px] sm:text-xs font-semibold">{t("ledger.buyerReceipt")}</div>
                                <div className="text-[7px] sm:text-[9px] text-muted-foreground font-normal truncate">{t("ledger.buyerReceiptDesc")}</div>
                              </div>
                            </button>
                          </div>
                        </div>

                        {paymentPurpose === "farmer_payment" ? (
                          <>
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
                          </>
                        ) : (
                          /* BUYER PAYMENT RECEIVED WORKFLOW */
                          <div className="space-y-2 sm:space-y-3.5">
                            {/* Buyer Selector */}
                            <div className="space-y-0.5 sm:space-y-1.5">
                              <Label className="text-[9px] sm:text-sm font-semibold">{t("ledger.buyerCustomer")} *</Label>
                              <Select
                                value={selectedReceiptBuyer}
                                onValueChange={(b) => {
                                  setSelectedReceiptBuyer(b);
                                  setSelectedReceiptSaleId("");
                                  setReceiptAmount("");
                                }}
                              >
                                <SelectTrigger className="h-8 sm:h-11 bg-background text-[10px] sm:text-sm">
                                  <SelectValue placeholder={t("ledger.selectBuyer")} />
                                </SelectTrigger>
                                <SelectContent>
                                  {distinctBuyers.length === 0 ? (
                                    <SelectItem value="__none" disabled>No buyers with recorded sales</SelectItem>
                                  ) : (
                                    distinctBuyers.map((b) => (
                                      <SelectItem key={b} value={b}>{b}</SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Outstanding Sale Selector */}
                            <div className="space-y-0.5 sm:space-y-1.5">
                              <div className="flex justify-between items-center">
                                <Label className="text-[9px] sm:text-sm font-semibold">{t("ledger.relatedSale")} *</Label>
                                {buyerSales.length > 0 && (
                                  <span className="text-[8px] sm:text-[10px] text-muted-foreground">
                                    {buyerSales.filter(s => s.outstanding > 0.01).length} {t("ledger.pendingSales")}
                                  </span>
                                )}
                              </div>
                              <Select
                                value={selectedReceiptSaleId}
                                onValueChange={(id) => {
                                  setSelectedReceiptSaleId(id);
                                  const s = buyerSales.find((x) => x.id === id);
                                  if (s) {
                                    setReceiptAmount(String(s.outstanding));
                                    setFarmerId(s.farmer_id);
                                  }
                                }}
                                disabled={!selectedReceiptBuyer}
                              >
                                <SelectTrigger className="h-8 sm:h-11 bg-background text-[10px] sm:text-sm">
                                  <SelectValue placeholder={!selectedReceiptBuyer ? "Select buyer first" : "Choose outstanding sale"} />
                                </SelectTrigger>
                                <SelectContent>
                                  {buyerSales.length === 0 ? (
                                    <SelectItem value="__none" disabled>No recorded sales for this buyer</SelectItem>
                                  ) : (
                                    buyerSales.map((s) => {
                                      const label = `${s.crop_type || "Crop"} (${s.entry_date || "Date"}) — Payable ₨${s.netBuyerPayable.toLocaleString()} · Due ₨${s.outstanding.toLocaleString()}`;
                                      return (
                                        <SelectItem key={s.id} value={s.id} disabled={s.outstanding <= 0.01 && s.id !== selectedReceiptSaleId}>
                                          {label} {s.outstanding <= 0.01 ? "(Settled)" : ""}
                                        </SelectItem>
                                      );
                                    })
                                  )}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Selected Sale Detail Card */}
                            {selectedReceiptSale && (
                              <div className="rounded-lg sm:rounded-xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 p-2 sm:p-3.5 space-y-1.5">
                                <div className="flex items-center justify-between text-[9px] sm:text-xs">
                                  <span className="font-bold text-emerald-800 dark:text-emerald-300">
                                    Sale #{selectedReceiptSale.id.slice(0, 8)} • {selectedReceiptSale.crop_type || "Crop"}
                                  </span>
                                  <span className="text-[8px] sm:text-[10px] text-muted-foreground">
                                    {selectedReceiptSale.entry_date}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[8px] sm:text-xs">
                                  <div className="bg-background/80 rounded p-1.5 border border-border/50">
                                    <span className="text-muted-foreground block text-[7px] sm:text-[9px]">{t("dashboard.totalSaleGross")}</span>
                                    <span className="font-mono font-bold">{money(selectedReceiptSale.amount)}</span>
                                  </div>
                                  <div className="bg-background/80 rounded p-1.5 border border-border/50">
                                    <span className="text-muted-foreground block text-[7px] sm:text-[9px]">{t("ledger.commission")}</span>
                                    <span className="font-mono font-bold text-amber-600">−{money(num(selectedReceiptSale.commission_cost))}</span>
                                  </div>
                                  <div className="bg-background/80 rounded p-1.5 border border-border/50">
                                    <span className="text-muted-foreground block text-[7px] sm:text-[9px]">{t("ledger.netBuyerPayable")}</span>
                                    <span className="font-mono font-bold text-emerald-600">{money(selectedReceiptSale.netBuyerPayable)}</span>
                                  </div>
                                  <div className="bg-background/80 rounded p-1.5 border border-border/50">
                                    <span className="text-muted-foreground block text-[7px] sm:text-[9px]">{t("ledger.dueFromBuyer")}</span>
                                    <span className="font-mono font-bold text-red-600">{money(selectedReceiptSale.outstanding)}</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Amount & Quick Full-Pay */}
                            <div className="space-y-0.5 sm:space-y-1.5">
                              <div className="flex items-center justify-between">
                                <Label className="text-[9px] sm:text-sm font-semibold">{t("ledger.paidByBuyer")} (₨) *</Label>
                                {selectedReceiptSale && selectedReceiptSale.outstanding > 0 && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-6 text-[8px] sm:text-xs text-emerald-700 dark:text-emerald-400 border-emerald-500/30 bg-emerald-50/50 hover:bg-emerald-100"
                                    onClick={() => setReceiptAmount(String(selectedReceiptSale.outstanding))}
                                  >
                                    {t("ledger.payFull")} (₨ {selectedReceiptSale.outstanding.toLocaleString()})
                                  </Button>
                                )}
                              </div>
                              <Input
                                className="h-8 sm:h-11 bg-background font-mono text-emerald-600 font-bold text-[10px] sm:text-sm"
                                type="number"
                                inputMode="decimal"
                                min="0.01"
                                max={selectedReceiptSale ? selectedReceiptSale.outstanding : undefined}
                                step="0.01"
                                value={receiptAmount}
                                onChange={(e) => setReceiptAmount(e.target.value)}
                                placeholder="0"
                              />
                              {selectedReceiptSale && num(receiptAmount) > selectedReceiptSale.outstanding + 0.01 && (
                                <p className="text-[8px] sm:text-[11px] text-red-600 font-medium">
                                  ⚠️ {t("ledger.dueFromBuyer")}: ₨ {selectedReceiptSale.outstanding.toLocaleString()}
                                </p>
                              )}
                            </div>

                            {/* Payment Method */}
                            <div className="space-y-0.5 sm:space-y-1.5">
                              <Label className="text-[9px] sm:text-sm font-semibold">{t("ledger.paymentMethod")}</Label>
                              <Select value={receiptPaymentMethod} onValueChange={setReceiptPaymentMethod}>
                                <SelectTrigger className="h-8 sm:h-11 bg-background text-[10px] sm:text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="cash">{t("ledger.cashPayment")}</SelectItem>
                                  <SelectItem value="bank_transfer">{t("ledger.bankTransfer")}</SelectItem>
                                  <SelectItem value="cheque">{t("ledger.cheque")}</SelectItem>
                                  <SelectItem value="online">{t("ledger.onlineOther")}</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Reference / Notes */}
                            <div className="space-y-0.5 sm:space-y-1.5">
                              <Label className="text-[9px] sm:text-sm font-semibold">{t("ledger.notes")}</Label>
                              <Input
                                className="h-8 sm:h-11 bg-background text-[10px] sm:text-sm"
                                value={receiptNotes}
                                onChange={(e) => setReceiptNotes(e.target.value)}
                                placeholder={t("ledger.optional")}
                              />
                            </div>
                          </div>
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
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={
                        (activeTab === "payment" && paymentPurpose === "buyer_receipt"
                          ? (!selectedReceiptSaleId || !receiptAmount || num(receiptAmount) <= 0 || (selectedReceiptSale && num(receiptAmount) > selectedReceiptSale.outstanding + 0.01))
                          : !farmerId) || saving
                      }
                      className="w-full h-9 sm:h-12 text-xs sm:text-base font-bold bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg transition-all duration-300 rounded-md sm:rounded-xl"
                    >
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
          <Card key={key} className={cn("relative overflow-hidden rounded-lg border-0 ring-1 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 bg-gradient-to-br", accent, ring)}>
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
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1.5 sm:mt-2 font-medium">{t("ledger.totalAllFarmers")}</p>
            </CardContent>
          </Card>
        ))}
      </div>


      {/* --- Premium Entries Table Card --- */}
      <Card className="shadow-2xl border-border/50 bg-card/80 backdrop-blur-xl rounded-lg overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-violet-500 to-purple-500" />
        <CardHeader className="pb-3 sm:pb-4 pt-4 sm:pt-6 px-4 sm:px-6 border-b border-border/40 space-y-3 sm:space-y-5">
          <div className="flex items-center justify-between gap-3 sm:gap-4 flex-wrap">
            <CardTitle className="text-base sm:text-xl font-serif flex items-center gap-2">
              <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-violet-500 shrink-0" />
              <span>{t("ledger.recentEntries")}</span>
            </CardTitle>
            <Badge variant="outline" className="border-violet-500/30 text-violet-600 dark:text-violet-400 bg-violet-500/10 font-bold px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs">
              <bdi>{filteredEntries.length} / {entries.length} {t("ledger.entriesCount")}</bdi>
            </Badge>
          </div>

          {/* Premium Filters */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-6 gap-2 sm:gap-3">
            <div className="relative lg:col-span-2 group col-span-2 sm:col-span-2">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground group-focus-within:text-violet-500 transition-colors" />
              <Input
                placeholder={t("ledger.searchPlaceholder")}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="ps-9 sm:ps-10 h-9 sm:h-10 rounded-lg sm:rounded-xl bg-background/50 border-border/60 focus:border-violet-500/50 transition-all text-xs sm:text-sm text-start"
              />
            </div>
            <Select value={filterFarmer} onValueChange={setFilterFarmer}>
              <SelectTrigger className="h-9 sm:h-10 rounded-lg sm:rounded-xl bg-background/50 text-xs sm:text-sm"><SelectValue placeholder={t("ledger.farmer")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("ledger.allFarmers")}</SelectItem>
                {seasonFarmers.map((fs) => (
                  <SelectItem key={fs.farmer_id} value={fs.farmer_id}>{fs.farmers?.name || "—"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={(v) => { setFilterType(v); if (v !== "expense") setFilterCategory("all"); }}>
              <SelectTrigger className="h-9 sm:h-10 rounded-lg sm:rounded-xl bg-background/50 text-xs sm:text-sm"><SelectValue placeholder={t("ledger.type")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("ledger.filterByType")}</SelectItem>
                <SelectItem value="expense">{t("ledger.expense")}</SelectItem>
                <SelectItem value="sale">{t("ledger.sale")}</SelectItem>
                <SelectItem value="payment">{t("ledger.payment")}</SelectItem>
                <SelectItem value="farmer_payment">{t("ledger.farmerPayment")}</SelectItem>
                <SelectItem value="buyer_payment">{t("ledger.buyerReceipt")}</SelectItem>
                <SelectItem value="loan">{t("ledger.loan")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={setFilterCategory} disabled={filterType !== "all" && filterType !== "expense"}>
              <SelectTrigger className="h-9 sm:h-10 rounded-lg sm:rounded-xl bg-background/50 text-xs sm:text-sm"><SelectValue placeholder={t("ledger.category")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                {EXPENSE_CATEGORIES.map((c) => (
                  <SelectItem key={c.key} value={c.key}>{t(c.label)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-1.5 sm:gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("h-9 sm:h-10 flex-1 justify-start text-start font-normal text-[10px] sm:text-xs rounded-lg sm:rounded-xl bg-background/50", !filterFromDate && "text-muted-foreground")}>
                    <CalendarIcon className="me-1 h-3 w-3 sm:me-1.5 sm:h-3.5 sm:w-3.5 shrink-0" />
                    <span>{filterFromDate ? format(filterFromDate, "MMM d") : t("common.from")}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={filterFromDate} onSelect={setFilterFromDate} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("h-9 sm:h-10 flex-1 justify-start text-start font-normal text-[10px] sm:text-xs rounded-lg sm:rounded-xl bg-background/50", !filterToDate && "text-muted-foreground")}>
                    <CalendarIcon className="me-1 h-3 w-3 sm:me-1.5 sm:h-3.5 sm:w-3.5 shrink-0" />
                    <span>{filterToDate ? format(filterToDate, "MMM d") : t("common.to")}</span>
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
                <X className="h-3.5 w-3.5 me-1" /> {t("ledger.clearFilters")}
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
                      {typeBadge(e.entry_type, isBuyerPayment(e))}
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                        {e.entry_date ? new Date(e.entry_date + "T00:00:00").toLocaleDateString() : new Date(e.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FarmerAvatar name={e.farmers?.name} photoUrl={(e.farmers as any)?.photo_url} className="h-8 w-8" />
                      <p className="text-sm font-bold text-foreground truncate">{e.farmers?.name ?? "—"}</p>
                    </div>
                    {isBuyerPayment(e) && (e as any).buyer && (
                      <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 truncate mt-0.5">
                        Received from: {(e as any).buyer}
                      </p>
                    )}
                    {e.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{e.description}</p>
                    )}
                    {e.entry_type === "sale" && <SaleMeta e={e} linkedReceipts={buyerReceiptsBySale.get(e.id) || 0} />}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={cn(
                      "font-mono font-bold text-[15px] whitespace-nowrap",
                      e.entry_type === "expense" && "text-red-600 dark:text-red-400",
                      e.entry_type === "sale" && "text-emerald-600 dark:text-emerald-400",
                      e.entry_type === "payment" && (isBuyerPayment(e) ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"),
                      e.entry_type === "loan" && "text-blue-600 dark:text-blue-400"
                    )}>₨ {Number(e.amount).toLocaleString()}</span>
                    
                    {(canEdit || canDelete) && !isSeasonClosed && (
                      <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
                        {canEdit && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-card dark:hover:bg-background hover:text-violet-600 shadow-sm transition-all" onClick={() => openEdit(e)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {canDelete && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-destructive hover:text-destructive hover:bg-card dark:hover:bg-background shadow-sm transition-all">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-lg">
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
                  <TableHead className="text-xs font-bold uppercase tracking-wider h-11 text-start">{t("common.date")}</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider h-11 text-start">{t("ledger.farmer")}</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider h-11 text-start">{t("ledger.category")}</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider h-11 hidden md:table-cell text-start">{t("common.description")}</TableHead>
                  <TableHead className="text-end text-xs font-bold uppercase tracking-wider h-11">{t("common.amount")} (₨)</TableHead>
                  {(canEdit || canDelete) && !isSeasonClosed && <TableHead className="text-end text-xs font-bold uppercase tracking-wider h-11 w-[100px]">{t("common.actions")}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((e) => {
                  const isBuyer = isBuyerPayment(e);
                  const catObj = EXPENSE_CATEGORIES.find(c => c.key.toLowerCase() === ((e as any).category || "").toLowerCase());
                  const catLabel = catObj ? t(catObj.label) : ((e as any).category ? String((e as any).category) : null);
                  const typeLabel = e.entry_type === "expense" ? t("ledger.expense") : e.entry_type === "sale" ? t("ledger.sale") : e.entry_type === "payment" ? (isBuyer ? t("ledger.buyerReceipt") : t("ledger.payment")) : t("ledger.loan");
                  const displayCategory = isBuyer ? t("ledger.buyerReceipt") : (catLabel || typeLabel);
                  return (
                  <TableRow key={e.id} className="hover:bg-muted/30 transition-colors border-b border-border/30">
                    <TableCell className="text-xs font-medium py-3 text-muted-foreground whitespace-nowrap text-start">
                      {e.entry_date ? new Date(e.entry_date + "T00:00:00").toLocaleDateString() : new Date(e.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-foreground text-start">
                      <div className="flex items-center gap-2.5">
                        <FarmerAvatar name={e.farmers?.name} photoUrl={(e.farmers as any)?.photo_url} className="h-9 w-9 ring-2 ring-white dark:ring-background shadow-sm shrink-0" />
                        <span className="truncate">{e.farmers?.name ?? "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-start">
                      <span className={cn("capitalize text-sm font-medium", isBuyer ? "text-emerald-700 dark:text-emerald-400 font-semibold" : "text-foreground/90")}>{displayCategory}</span>
                      {isBuyer && (e as any).buyer && (
                        <span className="block text-[10px] text-muted-foreground truncate">
                          {language === "sd" ? "خريدار: " : language === "ur" ? "خریدار: " : "Buyer: "}{(e as any).buyer}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm hidden md:table-cell max-w-[300px] text-muted-foreground text-start" title={e.description || ""}>
                      <span className="block truncate">{e.description || "—"}</span>
                      {e.entry_type === "sale" && <SaleMeta e={e} linkedReceipts={buyerReceiptsBySale.get(e.id) || 0} />}
                    </TableCell>
                    <TableCell className={cn(
                      "text-end font-mono font-bold text-sm whitespace-nowrap",
                      e.entry_type === "expense" && "text-rose-600 dark:text-rose-400",
                      e.entry_type === "sale" && "text-emerald-600 dark:text-emerald-400",
                      e.entry_type === "payment" && (isBuyer ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"),
                      e.entry_type === "loan" && "text-sky-600 dark:text-sky-400"
                    )}>
                      <bdi>₨ {Number(e.amount).toLocaleString()}</bdi>
                    </TableCell>
                    {(canEdit || canDelete) && !isSeasonClosed && (
                      <TableCell className="text-end py-2">
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
                              <AlertDialogContent className="rounded-lg">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t("common.delete")} {e.entry_type === "expense" ? t("ledger.expense") : e.entry_type === "sale" ? t("ledger.sale") : e.entry_type === "payment" ? t("ledger.payment") : t("ledger.loan")}?</AlertDialogTitle>
                                  <AlertDialogDescription asChild>
                                    <div className="space-y-3 text-sm mt-2 text-start">
                                      <div className="rounded-xl border bg-muted/40 p-4 space-y-2">
                                        <div className="flex justify-between gap-4">
                                          <span className="text-muted-foreground">{t("ledger.farmer")}</span>
                                          <span className="font-bold text-foreground">{e.farmers?.name ?? "—"}</span>
                                        </div>
                                        <div className="flex justify-between gap-4">
                                          <span className="text-muted-foreground">{t("common.date")}</span>
                                          <span className="font-medium text-foreground">{e.entry_date ? new Date(e.entry_date + "T00:00:00").toLocaleDateString() : new Date(e.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex justify-between gap-4">
                                          <span className="text-muted-foreground">{t("ledger.type")}</span>
                                          <span className="font-bold uppercase tracking-wider text-[10px] text-foreground">{e.entry_type}</span>
                                        </div>
                                        {(e as any).category && (
                                          <div className="flex justify-between gap-4">
                                            <span className="text-muted-foreground">{t("ledger.category")}</span>
                                            <span className="font-medium capitalize text-foreground">{(e as any).category}</span>
                                          </div>
                                        )}
                                        {e.description && (
                                          <div className="flex justify-between gap-4">
                                            <span className="text-muted-foreground">{t("common.description")}</span>
                                            <span className="font-medium text-foreground text-end max-w-[60%] truncate">{e.description}</span>
                                          </div>
                                        )}
                                        <div className="flex justify-between gap-4 pt-3 border-t border-border/60 mt-3">
                                          <span className="text-muted-foreground uppercase text-xs font-bold tracking-wider pt-0.5">
                                            {t("common.amount")}
                                          </span>
                                          <span className={cn(
                                            "font-mono font-bold text-lg leading-none",
                                            e.entry_type === "expense" && "text-red-600 dark:text-red-400",
                                            e.entry_type === "sale" && "text-emerald-600 dark:text-emerald-400",
                                            e.entry_type === "payment" && "text-amber-600 dark:text-amber-400",
                                            e.entry_type === "loan" && "text-blue-600 dark:text-blue-400",
                                          )}><bdi>₨ {Number(e.amount).toLocaleString()}</bdi></span>
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
                        {hasActiveFilters ? t("ledger.noMatching") : t("ledger.noEntries")}
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
