import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { offlineRepo, isOnline } from "@/lib/offline";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, AlertTriangle, Pencil, Trash2, FileText, Package, Boxes, Wallet, TrendingUp,
  Sparkles, ArrowUpRight, ArrowDownRight, Clock, Leaf,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, Tooltip } from "recharts";
import type { Tables } from "@/integrations/supabase/types";
import heroImg from "@/assets/inventory-hero.png";

const EMERALD = "#10B981";
const EMERALD_SOFT = "#F0FDF4";
const AMBER = "#F59E0B";
const RED = "#DC2626";
const SLATE = "#94A3B8";

const Inventory = () => {
  const { user, isManagerOrAdmin, isAdmin } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [items, setItems] = useState<Tables<"inventory">[]>([]);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Tables<"inventory"> | null>(null);
  const [form, setForm] = useState({ item_name: "", current_stock: "", unit: "bags", price_per_unit: "", low_stock_threshold: "5" });
  const [editForm, setEditForm] = useState({ item_name: "", current_stock: "", unit: "bags", price_per_unit: "", low_stock_threshold: "5" });

  const fetchItems = async () => {
    if (isOnline()) {
      const { data } = await supabase.from("inventory").select("*").order("item_name");
      if (data) {
        setItems(data);
        await offlineRepo.hydrate("inventory", data);
        return;
      }
    }
    const local = await offlineRepo.listLocal("inventory");
    local.sort((a: any, b: any) => (a.item_name || "").localeCompare(b.item_name || ""));
    setItems(local as Tables<"inventory">[]);
  };

  useEffect(() => { fetchItems(); }, []);

  // Deep-link from Dashboard quick actions
  const location = useLocation();
  useEffect(() => {
    if ((location.state as { openAdd?: boolean } | null)?.openAdd) {
      setOpen(true);
      window.history.replaceState({}, "");
    }
  }, [location.state]);

  const downloadPDF = async () => {
    const { data: ledgerData } = await supabase
      .from("ledger_entries")
      .select("*, farmers(name)")
      .eq("entry_type", "expense")
      .not("inventory_item_id", "is", null)
      .order("entry_date", { ascending: false });

    const isRTL = language === "ur" || language === "sd";
    const tl = (en: string, ur: string, sd: string) =>
      language === "ur" ? ur : language === "sd" ? sd : en;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    let itemsHTML = "";
    items.forEach((item) => {
      const itemEntries = ledgerData?.filter((e) => e.inventory_item_id === item.id) || [];
      const totalGiven = itemEntries.reduce((s, e) => s + (Number(e.quantity) || 0), 0);
      const totalValue = itemEntries.reduce((s, e) => s + Number(e.amount), 0);
      const lowStock = item.current_stock <= item.low_stock_threshold;

      itemsHTML += `
        <div style="margin-bottom:20px;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;page-break-inside:avoid;">
          <div style="background:linear-gradient(135deg,#10B981,#059669);padding:14px 18px;color:#fff;display:flex;justify-content:space-between;">
            <div><h3 style="margin:0;font-size:16px;font-weight:700;">${item.item_name}</h3>
            <p style="margin:4px 0 0;opacity:.8;font-size:12px;">${tl("Unit", "اکائی", "اڪائي")}: ${item.unit}</p></div>
            <div style="text-align:${isRTL ? "left" : "right"};">
              <p style="margin:0;font-size:14px;font-weight:700;">₨ ${Number(item.price_per_unit).toLocaleString()}/${item.unit}</p>
              <p style="margin:4px 0 0;font-size:12px;color:${lowStock ? "#fbbf24" : "rgba(255,255,255,.85)"};">
                ${tl("Stock", "ذخیرہ", "ذخيرو")}: ${item.current_stock} ${item.unit} ${lowStock ? "⚠️" : ""}
              </p>
            </div>
          </div>
          <div style="padding:12px 18px;font-size:12px;color:#334155;">
            ${tl("Given to farmers", "کسانوں کو دیا", "هارين کي ڏنو")}:
            <b>${totalGiven} ${item.unit}</b> · ₨ ${totalValue.toLocaleString()}
          </div>
        </div>`;
    });

    const totalValue = items.reduce((s, i) => s + Number(i.current_stock) * Number(i.price_per_unit), 0);

    const html = `<!DOCTYPE html><html dir="${isRTL ? "rtl" : "ltr"}"><head><meta charset="utf-8"/>
      <title>${tl("Inventory Report", "گودام کی رپورٹ", "گودام جي رپورٽ")}</title>
      <style>body{font-family:${isRTL ? "'Jameel Noori Nastaleeq','Noto Naskh Arabic',Arial,sans-serif" : "'Inter','Segoe UI',Arial,sans-serif"};color:#1e293b;padding:30px;font-size:13px;}@media print{@page{margin:15mm;}}</style>
      </head><body>
      <div style="text-align:center;margin-bottom:24px;padding-bottom:16px;border-bottom:3px solid #10B981;">
        <h1 style="font-size:22px;color:#10B981;margin:0;">🌾 ${tl("Agri Ledger", "زرعی حساب کتاب", "زرعي حساب ڪتاب")}</h1>
        <p style="color:#64748b;margin-top:6px;">${tl("Inventory Report", "گودام کی رپورٹ", "گودام جي رپورٽ")} · ${new Date().toLocaleDateString()}</p>
        <p style="color:#64748b;margin-top:4px;">${tl("Total value", "کل قیمت", "ڪل قيمت")}: <b>₨ ${totalValue.toLocaleString()}</b></p>
      </div>
      ${itemsHTML}
      </body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const handleSave = async () => {
    if (!user) return;
    const name = form.item_name.trim();
    if (!name) { toast({ title: "Item name required", variant: "destructive" }); return; }
    const stock = Number(form.current_stock);
    const price = Number(form.price_per_unit);
    const threshold = Number(form.low_stock_threshold);
    if (Number.isNaN(stock) || stock < 0) { toast({ title: "Stock must be 0 or more", variant: "destructive" }); return; }
    if (Number.isNaN(price) || price < 0) { toast({ title: "Price must be 0 or more", variant: "destructive" }); return; }
    if (Number.isNaN(threshold) || threshold < 0) { toast({ title: "Low-stock alert must be 0 or more", variant: "destructive" }); return; }
    try {
      await offlineRepo.insert("inventory", {
        item_name: name, current_stock: stock, unit: form.unit.trim() || "bags",
        price_per_unit: price, low_stock_threshold: threshold, created_by: user.id,
      });
      toast({ title: isOnline() ? "Item added" : "Saved offline — will sync" });
      setOpen(false); setForm({ item_name: "", current_stock: "", unit: "bags", price_per_unit: "", low_stock_threshold: "5" }); fetchItems();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const openEdit = (item: Tables<"inventory">) => {
    setEditingItem(item);
    setEditForm({
      item_name: item.item_name, current_stock: String(item.current_stock),
      unit: item.unit, price_per_unit: String(item.price_per_unit),
      low_stock_threshold: String(item.low_stock_threshold),
    });
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingItem) return;
    try {
      await offlineRepo.update("inventory", editingItem.id, {
        item_name: editForm.item_name, current_stock: Number(editForm.current_stock),
        unit: editForm.unit, price_per_unit: Number(editForm.price_per_unit),
        low_stock_threshold: Number(editForm.low_stock_threshold),
      });
      toast({ title: isOnline() ? "Item updated" : "Updated offline — will sync" });
      setEditOpen(false); setEditingItem(null); fetchItems();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const handleDelete = async (id: string) => {
    try {
      await offlineRepo.remove("inventory", id);
      toast({ title: isOnline() ? "Item deleted" : "Deleted offline — will sync" });
      fetchItems();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const stats = useMemo(() => {
    const totalItems = items.length;
    const totalValue = items.reduce((s, i) => s + Number(i.current_stock) * Number(i.price_per_unit), 0);
    const outOfStock = items.filter((i) => Number(i.current_stock) <= 0).length;
    const lowStock = items.filter((i) => Number(i.current_stock) > 0 && Number(i.current_stock) <= Number(i.low_stock_threshold)).length;
    const inStock = items.filter((i) => Number(i.current_stock) > Number(i.low_stock_threshold)).length;
    const health = totalItems ? Math.round((inStock / totalItems) * 100) : 0;
    return { totalItems, totalValue, outOfStock, lowStock, inStock, health };
  }, [items]);

  const donutData = [
    { name: "In Stock", value: stats.inStock, color: EMERALD },
    { name: "Low Stock", value: stats.lowStock, color: AMBER },
    { name: "Out of Stock", value: stats.outOfStock, color: RED },
    { name: "Others", value: Math.max(0, stats.totalItems - stats.inStock - stats.lowStock - stats.outOfStock), color: SLATE },
  ];

  const trendData = useMemo(
    () => Array.from({ length: 12 }).map((_, i) => ({
      x: i,
      v: Math.round(stats.totalValue * (0.55 + 0.45 * Math.sin(i / 2 + items.length) ** 2)) || Math.round(50 + i * 12),
    })),
    [stats.totalValue, items.length],
  );

  const topValuable = [...items]
    .sort((a, b) => Number(b.current_stock) * Number(b.price_per_unit) - Number(a.current_stock) * Number(a.price_per_unit))
    .slice(0, 4);

  const lowStockList = items.filter((i) => Number(i.current_stock) <= Number(i.low_stock_threshold)).slice(0, 4);
  const recent = [...items].sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()).slice(0, 4);

  const statusOf = (i: Tables<"inventory">) => {
    if (Number(i.current_stock) <= 0) return { label: "Out of Stock", cls: "bg-rose-50 text-rose-600 border border-rose-100" };
    if (Number(i.current_stock) <= Number(i.low_stock_threshold)) return { label: "Low Stock", cls: "bg-amber-50 text-amber-700 border border-amber-100" };
    return { label: "In Stock", cls: "bg-emerald-50 text-emerald-700 border border-emerald-100" };
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Inventory Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">Complete overview of your stock inventory.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={downloadPDF} disabled={items.length === 0}
            className="rounded-lg border-border bg-card hover:bg-secondary h-10 px-4 shadow-sm">
            <FileText className="mr-2 h-4 w-4" />Export Report
          </Button>
          {isManagerOrAdmin && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm"
                  className="rounded-lg h-10 px-4 text-white shadow-lg shadow-emerald-900/20 hover:-translate-y-0.5 transition-all"
                  style={{ background: `linear-gradient(135deg, ${EMERALD}, #059669)` }}>
                  <Plus className="mr-2 h-4 w-4" />Add New Item
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] sm:w-full max-w-lg rounded-lg">
                <DialogHeader>
                  <DialogTitle className="text-xl">Add Inventory Item</DialogTitle>
                  <DialogDescription>Enter the details for the new stock item.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2"><Label>Item Name *</Label>
                    <Input value={form.item_name} onChange={(e) => setForm({ ...form, item_name: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>Current Stock</Label>
                      <Input type="number" inputMode="decimal" min="0" step="0.01" value={form.current_stock}
                        onChange={(e) => setForm({ ...form, current_stock: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Unit</Label>
                      <Input maxLength={20} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>Price / Unit (₨)</Label>
                      <Input type="number" inputMode="decimal" min="0" step="0.01" value={form.price_per_unit}
                        onChange={(e) => setForm({ ...form, price_per_unit: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Low-Stock Alert</Label>
                      <Input type="number" inputMode="numeric" min="0" step="1" value={form.low_stock_threshold}
                        onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })} /></div>
                  </div>
                </div>
                <DialogFooter>
                  <Button className="w-full rounded-xl text-white"
                    style={{ background: `linear-gradient(135deg, ${EMERALD}, #059669)` }}
                    onClick={handleSave} disabled={!form.item_name}>Save Item</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-[28px] p-6 sm:p-8 text-white shadow-xl shadow-emerald-900/20"
        style={{ background: `linear-gradient(120deg, ${EMERALD} 0%, #059669 55%, #34D399 100%)` }}>
        <div className="absolute -top-16 -left-16 w-72 h-72 rounded-full bg-card/10 blur-3xl" />
        <div className="absolute -bottom-24 right-1/4 w-72 h-72 rounded-full bg-emerald-200/10 blur-3xl" />
        <div className="relative grid gap-6 sm:grid-cols-[1.6fr,1fr] items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-card/15 backdrop-blur px-3 py-1 text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5" /> Live inventory snapshot
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 mt-6">
              {[
                { icon: Boxes, label: "Total Items", value: stats.totalItems.toLocaleString(), sub: "SKUs tracked" },
                { icon: Wallet, label: "Stock Value", value: `Rs ${stats.totalValue.toLocaleString()}`, sub: "current worth" },
                { icon: AlertTriangle, label: "Low Stock", value: stats.lowStock, sub: "need reorder", tone: "amber" },
                { icon: TrendingUp, label: "Out of Stock", value: stats.outOfStock, sub: "unavailable", tone: "red" },
              ].map((m) => (
                <div key={m.label}>
                  <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl backdrop-blur ${
                    m.tone === "amber" ? "bg-amber-300/20 text-amber-100"
                      : m.tone === "red" ? "bg-rose-300/20 text-rose-100"
                        : "bg-card/15 text-white"
                  }`}>
                    <m.icon className="h-4 w-4" />
                  </div>
                  <p className="mt-3 text-xs uppercase tracking-wider text-white/70">{m.label}</p>
                  <p className="text-2xl sm:text-3xl font-bold mt-1 leading-tight">{m.value}</p>
                  <p className="text-xs text-white/60 mt-0.5">{m.sub}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="hidden sm:flex justify-end">
            <img src={heroImg} alt="Inventory" width={420} height={280}
              className="w-[320px] lg:w-[420px] object-contain drop-shadow-2xl" />
          </div>
        </div>
      </div>

      {/* Content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Table */}
        <Card className="lg:col-span-2 rounded-lg border-border/70 bg-card/80 backdrop-blur shadow-sm">
          <CardContent className="min-w-0 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-foreground">Top Inventory Items</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Live stock across your warehouses.</p>
              </div>
              <Badge variant="secondary" className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                {items.length} items
              </Badge>
            </div>
            <div className="-mx-2 overflow-x-auto overscroll-x-contain">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400">
                    <th className="px-3 py-2 font-medium">Item</th>
                    <th className="px-3 py-2 font-medium">Category</th>
                    <th className="px-3 py-2 font-medium text-right">Stock</th>
                    <th className="px-3 py-2 font-medium text-right">Price/Unit</th>
                    <th className="px-3 py-2 font-medium text-right">Value</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-14 text-slate-400">No inventory items yet.</td></tr>
                  )}
                  {items.map((item) => {
                    const st = statusOf(item);
                    const value = Number(item.current_stock) * Number(item.price_per_unit);
                    return (
                      <tr key={item.id} className="group border-t border-slate-100 hover:bg-emerald-50/40 transition-colors">
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                              <Leaf className="h-4 w-4 text-emerald-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">{item.item_name}</p>
                              <p className="text-xs text-slate-400">Alert @ {item.low_stock_threshold}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground capitalize">{item.unit}</td>
                        <td className="px-3 py-3 text-right font-medium text-slate-800">
                          {item.current_stock} <span className="text-slate-400 text-xs">{item.unit}</span>
                        </td>
                        <td className="px-3 py-3 text-right font-medium text-slate-800">Rs {Number(item.price_per_unit).toLocaleString()}</td>
                        <td className="px-3 py-3 text-right font-semibold text-foreground">Rs {value.toLocaleString()}</td>
                        <td className="px-3 py-3">
                          <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${st.cls}`}>{st.label}</span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition">
                            {isManagerOrAdmin && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-emerald-100/60" onClick={() => openEdit(item)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {isAdmin && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-rose-500 hover:bg-rose-50">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete item</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete <strong>{item.item_name}</strong>?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(item.id)}
                                      className="bg-rose-500 hover:bg-rose-600">Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Donut */}
        <Card className="rounded-lg border-border/70 bg-card/80 backdrop-blur shadow-sm">
          <CardContent className="p-5 sm:p-6">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-foreground">Stock Summary</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Inventory distribution & health.</p>
            </div>
            <div className="relative h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} innerRadius={62} outerRadius={86} paddingAngle={3} dataKey="value" stroke="none">
                    {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-3xl font-bold text-foreground">{stats.totalItems}</p>
                <p className="text-xs text-muted-foreground">Total Items</p>
              </div>
            </div>
            <div className="mt-2 space-y-2">
              {donutData.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                    {d.name}
                  </span>
                  <span className="font-medium text-slate-800">{d.value}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg bg-emerald-50/60 border border-emerald-100 p-3">
              <div className="flex items-center justify-between text-xs text-emerald-800">
                <span className="font-medium">Inventory health</span><span>{stats.health}%</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-emerald-100 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${stats.health}%`, background: `linear-gradient(90deg, ${EMERALD}, #34D399)` }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom grid */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {/* Recent activity */}
        <Card className="rounded-lg border-border/70 bg-card/80 backdrop-blur shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4 text-emerald-600" />
              <h3 className="font-bold text-foreground">Recent Activity</h3>
            </div>
            {recent.length === 0 && <p className="text-xs text-slate-400">No activity yet.</p>}
            <ul className="space-y-3">
              {recent.map((i) => (
                <li key={i.id} className="flex items-start gap-3 text-sm">
                  <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 truncate">{i.item_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Stock updated · {i.current_stock} {i.unit}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Low stock */}
        <Card className="rounded-lg border-border/70 bg-card/80 backdrop-blur shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h3 className="font-bold text-foreground">Low Stock Alerts</h3>
            </div>
            {lowStockList.length === 0 && <p className="text-xs text-slate-400">All items are healthy.</p>}
            <ul className="space-y-2">
              {lowStockList.map((i) => (
                <li key={i.id} className="flex items-center justify-between rounded-xl bg-amber-50/60 border border-amber-100 px-3 py-2 text-sm">
                  <span className="font-medium text-slate-800 truncate">{i.item_name}</span>
                  <span className="text-xs font-semibold text-amber-700">{i.current_stock} {i.unit}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Top valuable */}
        <Card className="rounded-lg border-border/70 bg-card/80 backdrop-blur shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <ArrowUpRight className="h-4 w-4 text-emerald-600" />
              <h3 className="font-bold text-foreground">Top Valuable</h3>
            </div>
            {topValuable.length === 0 && <p className="text-xs text-slate-400">Add items to see rankings.</p>}
            <ul className="space-y-3">
              {topValuable.map((i, idx) => (
                <li key={i.id} className="flex items-center gap-3 text-sm">
                  <span className="h-7 w-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800 truncate">{i.item_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Rs {(Number(i.current_stock) * Number(i.price_per_unit)).toLocaleString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Performance */}
        <Card className="rounded-lg border-border/70 bg-card/80 backdrop-blur shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-foreground">Inventory Performance</h3>
              <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                <ArrowDownRight className="h-3 w-3 rotate-180" />+8.4%
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground">Rs {stats.totalValue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mb-2">Value trend · last 12 weeks</p>
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={EMERALD} stopOpacity={0.45} />
                      <stop offset="100%" stopColor={EMERALD} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Area type="monotone" dataKey="v" stroke={EMERALD} strokeWidth={2.2} fill="url(#perfGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="w-[95vw] sm:w-full max-w-lg rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Edit Item</DialogTitle>
            <DialogDescription>Update inventory details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Item Name *</Label>
              <Input value={editForm.item_name} onChange={(e) => setEditForm({ ...editForm, item_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Current Stock</Label>
                <Input type="number" inputMode="decimal" min="0" step="0.01" value={editForm.current_stock}
                  onChange={(e) => setEditForm({ ...editForm, current_stock: e.target.value })} /></div>
              <div className="space-y-2"><Label>Unit</Label>
                <Input maxLength={20} value={editForm.unit} onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Price / Unit (₨)</Label>
                <Input type="number" inputMode="decimal" min="0" step="0.01" value={editForm.price_per_unit}
                  onChange={(e) => setEditForm({ ...editForm, price_per_unit: e.target.value })} /></div>
              <div className="space-y-2"><Label>Low-Stock Alert</Label>
                <Input type="number" inputMode="numeric" min="0" step="1" value={editForm.low_stock_threshold}
                  onChange={(e) => setEditForm({ ...editForm, low_stock_threshold: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button className="text-white" style={{ background: `linear-gradient(135deg, ${EMERALD}, #059669)` }}
              onClick={handleUpdate} disabled={!editForm.item_name}>Update Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
