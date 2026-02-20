import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { Plus, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

const EXPENSE_CATEGORIES = [
  "Seed", "Fertilizer", "Pesticide", "Labour", "Tractor", "Irrigation", "Cash", "Others",
];

const Ledger = () => {
  const { user, canCreate } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = useState<(Tables<"ledger_entries"> & { farmers?: { name: string } | null })[]>([]);
  const [farmers, setFarmers] = useState<Tables<"farmers">[]>([]);
  const [inventory, setInventory] = useState<Tables<"inventory">[]>([]);
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("expense");

  // Shared fields
  const [farmerId, setFarmerId] = useState("");
  const [entryDate, setEntryDate] = useState<Date>(new Date());
  const [description, setDescription] = useState("");

  // Expense fields
  const [category, setCategory] = useState("");
  const [inventoryItemId, setInventoryItemId] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [isShared, setIsShared] = useState(false);

  // Sale fields
  const [grossWeight, setGrossWeight] = useState("");
  const [deductionsVal, setDeductionsVal] = useState("");
  const [saleRate, setSaleRate] = useState("");

  // Payment fields
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [cashAmount, setCashAmount] = useState("");
  const [cropType, setCropType] = useState("");
  const [cropWeight, setCropWeight] = useState("");
  const [cropRate, setCropRate] = useState("");

  // Loan fields
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

  // Auto-fill price from inventory
  useEffect(() => {
    if (inventoryItemId) {
      const item = inventory.find((i) => i.id === inventoryItemId);
      if (item) setPrice(String(item.price_per_unit));
    }
  }, [inventoryItemId, inventory]);

  // Auto-calculate expense amount
  const computedExpenseAmount = () => {
    if (price && quantity) return Number(price) * Number(quantity);
    return Number(expenseAmount) || 0;
  };

  // Sale calculations
  const netWeight = () => (Number(grossWeight) || 0) - (Number(deductionsVal) || 0);
  const saleTotal = () => netWeight() * (Number(saleRate) || 0);

  // Payment crop return total
  const cropTotal = () => (Number(cropWeight) || 0) * (Number(cropRate) || 0);

  const resetForm = () => {
    setFarmerId(""); setEntryDate(new Date()); setDescription("");
    setCategory(""); setInventoryItemId(""); setPrice(""); setQuantity(""); setExpenseAmount(""); setIsShared(false);
    setGrossWeight(""); setDeductionsVal(""); setSaleRate("");
    setPaymentMethod("cash"); setCashAmount(""); setCropType(""); setCropWeight(""); setCropRate("");
    setLoanAmount("");
    setActiveTab("expense");
  };

  const handleSave = async () => {
    if (!user || !farmerId) return;

    let amount = 0;
    let entryData: Record<string, unknown> = {
      farmer_id: farmerId,
      entry_type: activeTab,
      description,
      created_by: user.id,
      entry_date: format(entryDate, "yyyy-MM-dd"),
    };

    if (activeTab === "expense") {
      amount = computedExpenseAmount();
      entryData = {
        ...entryData,
        amount,
        category,
        inventory_item_id: inventoryItemId || null,
        quantity: quantity ? Number(quantity) : null,
        rate: price ? Number(price) : null,
        is_shared: isShared,
        shared_amount: isShared ? amount / 2 : null,
      };
    } else if (activeTab === "sale") {
      amount = saleTotal();
      entryData = {
        ...entryData,
        amount,
        gross_weight: grossWeight ? Number(grossWeight) : null,
        deductions: deductionsVal ? Number(deductionsVal) : null,
        net_weight: netWeight() || null,
        rate: saleRate ? Number(saleRate) : null,
      };
    } else if (activeTab === "payment") {
      if (paymentMethod === "cash") {
        amount = Number(cashAmount) || 0;
      } else {
        amount = cropTotal();
      }
      entryData = {
        ...entryData,
        amount,
        payment_method: paymentMethod,
        crop_type: paymentMethod === "crop_return" ? cropType : null,
        crop_weight: paymentMethod === "crop_return" && cropWeight ? Number(cropWeight) : null,
        rate: paymentMethod === "crop_return" && cropRate ? Number(cropRate) : null,
      };
    } else if (activeTab === "loan") {
      amount = Number(loanAmount) || 0;
      entryData = {
        ...entryData,
        amount,
        entry_type: "loan",
      };
    }

    const { error } = await supabase.from("ledger_entries").insert(entryData as any);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    // Auto-deduct inventory stock
    if (activeTab === "expense" && inventoryItemId && quantity) {
      const item = inventory.find((i) => i.id === inventoryItemId);
      if (item) {
        await supabase.from("inventory").update({
          current_stock: item.current_stock - Number(quantity),
        }).eq("id", inventoryItemId);
      }
    }

    toast({ title: "Entry added successfully" });
    setOpen(false);
    resetForm();
    fetchData();
  };

  const typeBadge = (type: string) => {
    if (type === "loan") {
      return <Badge variant="outline" className="capitalize border-blue-500 text-blue-600">Loan</Badge>;
    }
    const variants: Record<string, "destructive" | "default" | "secondary"> = {
      expense: "destructive", sale: "default", payment: "secondary",
    };
    return <Badge variant={variants[type] || "default"} className="capitalize">{type}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">Ledger</h1>
          <p className="text-muted-foreground">Track expenses, sales, and payments</p>
        </div>
        {canCreate && (
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />New Transaction</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New Transaction</DialogTitle>
                <DialogDescription>Add a new ledger entry</DialogDescription>
              </DialogHeader>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full grid grid-cols-4">
                  <TabsTrigger value="expense">Expense</TabsTrigger>
                  <TabsTrigger value="sale">Sale</TabsTrigger>
                  <TabsTrigger value="payment">Payment</TabsTrigger>
                  <TabsTrigger value="loan">Loan</TabsTrigger>
                </TabsList>

                {/* Shared: Farmer + Date */}
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Farmer *</Label>
                    <Select value={farmerId} onValueChange={setFarmerId}>
                      <SelectTrigger><SelectValue placeholder="Select farmer" /></SelectTrigger>
                      <SelectContent>{farmers.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !entryDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {entryDate ? format(entryDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={entryDate} onSelect={(d) => d && setEntryDate(d)} initialFocus /></PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* EXPENSE TAB */}
                <TabsContent value="expense" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>{EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c.toLowerCase()}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Enter description" />
                  </div>
                  <div className="space-y-2">
                    <Label>Link to Inventory (Optional)</Label>
                    <Select value={inventoryItemId} onValueChange={setInventoryItemId}>
                      <SelectTrigger><SelectValue placeholder="Select inventory item" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {inventory.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.item_name} — ₨{item.price_per_unit}/{item.unit} (Stock: {item.current_stock})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Price (₨)</Label>
                      <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" />
                    </div>
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" />
                    </div>
                  </div>
                  {(!price || !quantity) && (
                    <div className="space-y-2">
                      <Label>Amount (₨)</Label>
                      <Input type="number" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} placeholder="Manual amount" />
                    </div>
                  )}
                  {(price && quantity) && (
                    <div className="rounded-md bg-accent p-3 text-sm font-medium">
                      Total: ₨ {computedExpenseAmount().toLocaleString()}
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Switch checked={isShared} onCheckedChange={setIsShared} />
                    <Label>50/50 Cost Sharing</Label>
                    {isShared && (
                      <span className="text-sm text-muted-foreground ml-auto">
                        Each pays: ₨ {(computedExpenseAmount() / 2).toLocaleString()}
                      </span>
                    )}
                  </div>
                </TabsContent>

                {/* SALE TAB */}
                <TabsContent value="sale" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Enter description" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Gross Weight (kg)</Label>
                      <Input type="number" value={grossWeight} onChange={(e) => setGrossWeight(e.target.value)} placeholder="0" />
                    </div>
                    <div className="space-y-2">
                      <Label>Deductions (kg)</Label>
                      <Input type="number" value={deductionsVal} onChange={(e) => setDeductionsVal(e.target.value)} placeholder="0" />
                    </div>
                  </div>
                  <div className="rounded-md bg-accent p-3 text-sm">
                    <span className="font-medium">Net Weight:</span> {netWeight().toLocaleString()} kg
                  </div>
                  <div className="space-y-2">
                    <Label>Rate per kg (₨)</Label>
                    <Input type="number" value={saleRate} onChange={(e) => setSaleRate(e.target.value)} placeholder="0" />
                  </div>
                  <div className="rounded-md bg-accent p-3 text-sm font-medium">
                    Total Amount: ₨ {saleTotal().toLocaleString()}
                  </div>
                </TabsContent>

                {/* PAYMENT TAB */}
                <TabsContent value="payment" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Enter description" />
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash Payment</SelectItem>
                        <SelectItem value="crop_return">Crop Return</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {paymentMethod === "cash" ? (
                    <div className="space-y-2">
                      <Label>Amount (₨)</Label>
                      <Input type="number" value={cashAmount} onChange={(e) => setCashAmount(e.target.value)} placeholder="0" />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label>Crop Type</Label>
                        <Input value={cropType} onChange={(e) => setCropType(e.target.value)} placeholder="e.g. Wheat, Rice" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Crop Weight (kg)</Label>
                          <Input type="number" value={cropWeight} onChange={(e) => setCropWeight(e.target.value)} placeholder="0" />
                        </div>
                        <div className="space-y-2">
                          <Label>Rate per kg (₨)</Label>
                          <Input type="number" value={cropRate} onChange={(e) => setCropRate(e.target.value)} placeholder="0" />
                        </div>
                      </div>
                      <div className="rounded-md bg-accent p-3 text-sm font-medium">
                        Total: ₨ {cropTotal().toLocaleString()}
                      </div>
                    </>
                  )}
                </TabsContent>

                {/* LOAN TAB */}
                <TabsContent value="loan" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Loan purpose / details" />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount (₨)</Label>
                    <Input type="number" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} placeholder="0" />
                  </div>
                  {loanAmount && (
                    <div className="rounded-md bg-accent p-3 text-sm font-medium">
                      Loan Amount: ₨ {Number(loanAmount).toLocaleString()}
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <DialogFooter>
                <Button onClick={handleSave} disabled={!farmerId} className="w-full">
                  Save Entry
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle>Recent Entries</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Farmer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount (₨)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-sm">{e.entry_date ? new Date(e.entry_date + "T00:00:00").toLocaleDateString() : new Date(e.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>{e.farmers?.name ?? "—"}</TableCell>
                  <TableCell>{typeBadge(e.entry_type)}</TableCell>
                  <TableCell className="capitalize">{(e as any).category || "—"}</TableCell>
                  <TableCell>{e.description || "—"}</TableCell>
                  <TableCell className="text-right font-mono">{Number(e.amount).toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {entries.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No entries yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Ledger;
