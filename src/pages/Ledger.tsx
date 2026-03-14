import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
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
import { Plus, CalendarIcon, TrendingDown, TrendingUp, Wallet, HandCoins } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

const EXPENSE_CATEGORIES = [
  "Seed", "Fertilizer", "Pesticide", "Labour", "Tractor", "Irrigation", "Cash", "Others",
];

type CostAllocation = "farmer" | "shared" | "landlord";

const Ledger = () => {
  const { user, canCreate } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [entries, setEntries] = useState<(Tables<"ledger_entries"> & { farmers?: { name: string } | null })[]>([]);
  const [farmers, setFarmers] = useState<Tables<"farmers">[]>([]);
  const [inventory, setInventory] = useState<Tables<"inventory">[]>([]);
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("expense");

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

  const fetchData = async () => {
    const [entriesRes, farmersRes, inventoryRes] = await Promise.all([
      supabase.from("ledger_entries").select("*, farmers(name)").order("created_at", { ascending: false }),
      supabase.from("farmers").select("*"),
      supabase.from("inventory").select("*"),
    ]);
    if (entriesRes.data) setEntries(entriesRes.data);
    if (farmersRes.data) setFarmers(farmersRes.data);
    if (inventoryRes.data) setInventory(inventoryRes.data);
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (inventoryItemId) {
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
  };

  const handleSave = async () => {
    if (!user || !farmerId) return;
    let amount = 0;
    let entryData: Record<string, unknown> = {
      farmer_id: farmerId, entry_type: activeTab, description, created_by: user.id,
      entry_date: format(entryDate, "yyyy-MM-dd"),
    };

    if (activeTab === "expense") {
      amount = computedExpenseAmount();
      const isShared = costAllocation === "shared";
      entryData = {
        ...entryData, amount, category,
        inventory_item_id: inventoryItemId || null,
        quantity: quantity ? Number(quantity) : null,
        rate: price ? Number(price) : null,
        is_shared: isShared,
        shared_amount: isShared ? amount / 2 : null,
        payment_method: costAllocation === "landlord" ? "landlord_only" : null,
      };
    } else if (activeTab === "sale") {
      amount = saleTotal();
      entryData = { ...entryData, amount, gross_weight: grossWeight ? Number(grossWeight) : null, deductions: deductionsVal ? Number(deductionsVal) : null, net_weight: netWeight() || null, rate: saleRate ? Number(saleRate) : null };
    } else if (activeTab === "payment") {
      amount = paymentMethod === "cash" ? (Number(cashAmount) || 0) : cropTotal();
      entryData = { ...entryData, amount, payment_method: paymentMethod, crop_type: paymentMethod === "crop_return" ? cropType : null, crop_weight: paymentMethod === "crop_return" && cropWeight ? Number(cropWeight) : null, rate: paymentMethod === "crop_return" && cropRate ? Number(cropRate) : null };
    } else if (activeTab === "loan") {
      amount = Number(loanAmount) || 0;
      entryData = { ...entryData, amount, entry_type: "loan" };
    }

    const { error } = await supabase.from("ledger_entries").insert(entryData as any);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }

    if (activeTab === "expense" && inventoryItemId && quantity) {
      const item = inventory.find((i) => i.id === inventoryItemId);
      if (item) { await supabase.from("inventory").update({ current_stock: item.current_stock - Number(quantity) }).eq("id", inventoryItemId); }
    }

    toast({ title: "Entry added successfully" });
    setOpen(false); resetForm(); fetchData();
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">{t("ledger.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("ledger.subtitle")}</p>
        </div>
        {canCreate && (
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5">
                <Plus className="mr-2 h-4 w-4" />{t("ledger.newTransaction")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle className="text-xl font-serif">{t("ledger.newTransaction")}</DialogTitle>
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
                      <SelectContent>{farmers.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
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
                      <SelectContent>{EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c.toLowerCase()}>{c}</SelectItem>)}</SelectContent>
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
                <Button onClick={handleSave} disabled={!farmerId} className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-lg transition-all duration-300">
                  {t("ledger.saveEntry")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
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
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-serif">{t("ledger.recentEntries")}</CardTitle>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e) => (
                <TableRow key={e.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell className="text-xs sm:text-sm py-3">{e.entry_date ? new Date(e.entry_date + "T00:00:00").toLocaleDateString() : new Date(e.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-xs sm:text-sm font-medium">{e.farmers?.name ?? "—"}</TableCell>
                  <TableCell>{typeBadge(e.entry_type)}</TableCell>
                  <TableCell className="capitalize text-xs hidden sm:table-cell">{(e as any).category || "—"}</TableCell>
                  <TableCell className="text-xs hidden md:table-cell max-w-[150px] truncate">{e.description || "—"}</TableCell>
                  <TableCell className="hidden sm:table-cell">{getAllocationLabel(e)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold text-sm">₨ {Number(e.amount).toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {entries.length === 0 && (<TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-12">{t("ledger.noEntries")}</TableCell></TableRow>)}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Ledger;
