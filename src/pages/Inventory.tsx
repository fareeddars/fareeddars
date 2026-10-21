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
  Plus, Pencil, Trash2, FileText, Search,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

const Inventory = () => {
  const { user, isManagerOrAdmin, isAdmin } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [items, setItems] = useState<Tables<"inventory">[]>([]);
  const [search, setSearch] = useState("");
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
        <div style="margin-bottom:16px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;page-break-inside:avoid;">
          <div style="background:#064E3B;padding:12px 16px;color:#fff;display:flex;justify-content:space-between;align-items:center;">
            <div>
              <h3 style="margin:0;font-size:15px;font-weight:700;">${item.item_name}</h3>
              <p style="margin:2px 0 0;opacity:.85;font-size:11px;">${tl("Unit", "اکائی", "اڪائي")}: ${item.unit}</p>
            </div>
            <div style="text-align:${isRTL ? "left" : "right"};">
              <p style="margin:0;font-size:13px;font-weight:700;">₨ ${Number(item.price_per_unit).toLocaleString()}/${item.unit}</p>
              <p style="margin:2px 0 0;font-size:11px;color:${lowStock ? "#f59e0b" : "#86efac"};">
                ${tl("Stock", "موجودہ مقدار", "موجود مقدار")}: ${item.current_stock} ${item.unit}
              </p>
            </div>
          </div>
          <div style="padding:10px 16px;font-size:12px;color:#334155;background:#f8fafc;">
            ${tl("Given to farmers", "کسانوں کو دیا", "هارين کي ڏنو")}:
            <b>${totalGiven} ${item.unit}</b> · ₨ ${totalValue.toLocaleString()}
          </div>
        </div>`;
    });

    const totalVal = items.reduce((s, i) => s + Number(i.current_stock) * Number(i.price_per_unit), 0);

    const html = `<!DOCTYPE html><html dir="${isRTL ? "rtl" : "ltr"}"><head><meta charset="utf-8"/>
      <title>${t("inventory.title")}</title>
      <style>body{font-family:${isRTL ? "'Noto Sans Arabic', 'Noto Naskh Arabic', Arial, sans-serif" : "'Segoe UI', Arial, sans-serif"};color:#1e293b;padding:24px;font-size:13px;}@media print{@page{margin:12mm;}}</style>
      </head><body>
      <div style="text-align:center;margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid #059669;">
        <h1 style="font-size:20px;color:#064E3B;margin:0;">🌾 ${t("nav.appName")}</h1>
        <p style="color:#64748b;margin-top:4px;font-size:12px;">${t("inventory.title")} · ${new Date().toLocaleDateString()}</p>
        <p style="color:#064E3B;margin-top:4px;font-size:13px;">${t("inventory.stockValue")}: <b>₨ ${totalVal.toLocaleString()}</b></p>
      </div>
      ${itemsHTML}
      </body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 400);
  };

  const handleSave = async () => {
    if (!user) return;
    const name = form.item_name.trim();
    if (!name) { toast({ title: t("inventory.itemName") + " required", variant: "destructive" }); return; }
    const stock = Number(form.current_stock);
    const price = Number(form.price_per_unit);
    const threshold = Number(form.low_stock_threshold);
    if (Number.isNaN(stock) || stock < 0) { toast({ title: "Stock must be 0 or more", variant: "destructive" }); return; }
    if (Number.isNaN(price) || price < 0) { toast({ title: "Price must be 0 or more", variant: "destructive" }); return; }
    if (Number.isNaN(threshold) || threshold < 0) { toast({ title: "Low-stock alert must be 0 or more", variant: "destructive" }); return; }
    try {
      await offlineRepo.insert("inventory", {
        item_name: name,
        current_stock: stock,
        unit: form.unit.trim() || "bags",
        price_per_unit: price,
        low_stock_threshold: threshold,
        created_by: user.id,
      });
      toast({ title: t("inventory.saveItem") });
      setOpen(false);
      setForm({ item_name: "", current_stock: "", unit: "bags", price_per_unit: "", low_stock_threshold: "5" });
      fetchItems();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const openEdit = (item: Tables<"inventory">) => {
    setEditingItem(item);
    setEditForm({
      item_name: item.item_name,
      current_stock: String(item.current_stock),
      unit: item.unit,
      price_per_unit: String(item.price_per_unit),
      low_stock_threshold: String(item.low_stock_threshold),
    });
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingItem) return;
    const name = editForm.item_name.trim();
    if (!name) { toast({ title: t("inventory.itemName") + " required", variant: "destructive" }); return; }
    const stock = Number(editForm.current_stock);
    const price = Number(editForm.price_per_unit);
    const threshold = Number(editForm.low_stock_threshold);
    if (Number.isNaN(stock) || stock < 0) { toast({ title: "Stock must be 0 or more", variant: "destructive" }); return; }
    if (Number.isNaN(price) || price < 0) { toast({ title: "Price must be 0 or more", variant: "destructive" }); return; }
    if (Number.isNaN(threshold) || threshold < 0) { toast({ title: "Low-stock alert must be 0 or more", variant: "destructive" }); return; }
    try {
      await offlineRepo.update("inventory", editingItem.id, {
        item_name: name,
        current_stock: stock,
        unit: editForm.unit.trim() || "bags",
        price_per_unit: price,
        low_stock_threshold: threshold,
      });
      toast({ title: t("inventory.updateItem") });
      setEditOpen(false);
      setEditingItem(null);
      fetchItems();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await offlineRepo.remove("inventory", id);
      toast({ title: t("inventory.deleteItem") });
      fetchItems();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const stats = useMemo(() => {
    const totalItems = items.length;
    const totalValue = items.reduce((s, i) => s + (Number(i.current_stock) || 0) * (Number(i.price_per_unit) || 0), 0);
    const lowStock = items.filter((i) => Number(i.current_stock) > 0 && Number(i.current_stock) <= Number(i.low_stock_threshold)).length;
    const outOfStock = items.filter((i) => Number(i.current_stock) <= 0).length;
    const inStock = totalItems - lowStock - outOfStock;
    return { totalItems, totalValue, lowStock, outOfStock, inStock };
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) =>
      (i.item_name || "").toLowerCase().includes(q) ||
      (i.unit || "").toLowerCase().includes(q)
    );
  }, [items, search]);

  const statusOf = (i: Tables<"inventory">) => {
    if (Number(i.current_stock) <= 0) {
      return { label: t("inventory.outOfStock"), cls: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/40" };
    }
    if (Number(i.current_stock) <= Number(i.low_stock_threshold)) {
      return { label: t("inventory.lowStock"), cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40" };
    }
    return { label: t("inventory.inStock"), cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/40" };
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{t("inventory.title")}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{t("inventory.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={downloadPDF}
            disabled={items.length === 0}
            className="h-9 px-3 text-xs sm:text-sm rounded-lg border-border bg-card shadow-xs"
          >
            <FileText className="me-1.5 h-4 w-4" />
            {t("inventory.exportReport")}
          </Button>

          {isManagerOrAdmin && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="h-9 px-3.5 text-xs sm:text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  <Plus className="me-1.5 h-4 w-4" />
                  {t("inventory.addItem")}
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] sm:w-full max-w-md rounded-lg">
                <DialogHeader>
                  <DialogTitle className="text-lg">{t("inventory.addInventoryItem")}</DialogTitle>
                  <DialogDescription className="text-xs">{t("inventory.enterDetails")}</DialogDescription>
                </DialogHeader>
                <div className="space-y-3.5 pt-1">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">{t("inventory.itemName")} *</Label>
                    <Input
                      value={form.item_name}
                      onChange={(e) => setForm({ ...form, item_name: e.target.value })}
                      placeholder="e.g. DAP, Urea, Beaj"
                      className="h-10 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">{t("inventory.stock")}</Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        value={form.current_stock}
                        onChange={(e) => setForm({ ...form, current_stock: e.target.value })}
                        placeholder="0"
                        className="h-10 text-sm font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">{t("inventory.unit")}</Label>
                      <Input
                        maxLength={20}
                        value={form.unit}
                        onChange={(e) => setForm({ ...form, unit: e.target.value })}
                        placeholder="bags, kg, lit"
                        className="h-10 text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">{t("inventory.pricePerUnit")}</Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        value={form.price_per_unit}
                        onChange={(e) => setForm({ ...form, price_per_unit: e.target.value })}
                        placeholder="0"
                        className="h-10 text-sm font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">{t("inventory.lowStockThreshold")}</Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        step="1"
                        value={form.low_stock_threshold}
                        onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })}
                        placeholder="5"
                        className="h-10 text-sm font-mono"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-0 pt-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={handleSave}
                    disabled={!form.item_name}
                  >
                    {t("inventory.saveItem")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Simple, Professional, Clean Metric Summary (No bags picture, clean responsive layout) */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
        <Card className="rounded-lg border border-border bg-card shadow-xs">
          <CardContent className="p-3.5 sm:p-4">
            <span className="text-[11px] sm:text-xs font-medium text-muted-foreground block truncate">
              {t("inventory.totalItems")}
            </span>
            <p className="mt-1 text-xl sm:text-2xl font-bold font-mono tracking-tight text-foreground">
              {stats.totalItems}
            </p>
            <p className="mt-0.5 text-[10px] sm:text-xs text-muted-foreground truncate">
              {stats.inStock} {t("inventory.inStock")}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-lg border border-border bg-card shadow-xs">
          <CardContent className="p-3.5 sm:p-4">
            <span className="text-[11px] sm:text-xs font-medium text-muted-foreground block truncate">
              {t("inventory.stockValue")}
            </span>
            <p className="mt-1 text-xl sm:text-2xl font-bold font-mono tracking-tight text-emerald-700 dark:text-emerald-400">
              <bdi>₨ {Math.round(stats.totalValue).toLocaleString()}</bdi>
            </p>
            <p className="mt-0.5 text-[10px] sm:text-xs text-muted-foreground truncate">
              {t("inventory.totalVal")}
            </p>
          </CardContent>
        </Card>

        <Card className={`rounded-lg border shadow-xs ${stats.lowStock > 0 ? "border-amber-300 bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-800" : "border-border bg-card"}`}>
          <CardContent className="p-3.5 sm:p-4">
            <span className="text-[11px] sm:text-xs font-medium text-muted-foreground block truncate">
              {t("inventory.lowStock")}
            </span>
            <p className={`mt-1 text-xl sm:text-2xl font-bold font-mono tracking-tight ${stats.lowStock > 0 ? "text-amber-700 dark:text-amber-400" : "text-foreground"}`}>
              {stats.lowStock}
            </p>
            <p className="mt-0.5 text-[10px] sm:text-xs text-muted-foreground truncate">
              {stats.lowStock > 0 ? t("inventory.reorderNeeded") : t("inventory.healthyStock")}
            </p>
          </CardContent>
        </Card>

        <Card className={`rounded-lg border shadow-xs ${stats.outOfStock > 0 ? "border-rose-300 bg-rose-50/40 dark:bg-rose-950/20 dark:border-rose-800" : "border-border bg-card"}`}>
          <CardContent className="p-3.5 sm:p-4">
            <span className="text-[11px] sm:text-xs font-medium text-muted-foreground block truncate">
              {t("inventory.outOfStock")}
            </span>
            <p className={`mt-1 text-xl sm:text-2xl font-bold font-mono tracking-tight ${stats.outOfStock > 0 ? "text-rose-700 dark:text-rose-400" : "text-foreground"}`}>
              {stats.outOfStock}
            </p>
            <p className="mt-0.5 text-[10px] sm:text-xs text-muted-foreground truncate">
              {stats.outOfStock > 0 ? t("inventory.reorderNeeded") : t("inventory.allAvailable")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Stock Table Card */}
      <Card className="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
        <div className="p-3.5 sm:p-5 border-b border-border flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-foreground">{t("inventory.liveStock")}</h2>
            <Badge variant="secondary" className="text-xs">
              {filteredItems.length}
            </Badge>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("common.search")}
              className="ps-9 h-9 text-xs sm:text-sm rounded-lg"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground text-start">
                <th className="px-3.5 sm:px-4 py-2.5 font-semibold text-start">{t("inventory.item")}</th>
                <th className="px-3.5 sm:px-4 py-2.5 font-semibold text-start">{t("inventory.category")}</th>
                <th className="px-3.5 sm:px-4 py-2.5 font-semibold text-end">{t("inventory.stock")}</th>
                <th className="px-3.5 sm:px-4 py-2.5 font-semibold text-end">{t("inventory.rate")}</th>
                <th className="px-3.5 sm:px-4 py-2.5 font-semibold text-end">{t("inventory.totalVal")}</th>
                <th className="px-3.5 sm:px-4 py-2.5 font-semibold text-start">{t("inventory.status")}</th>
                <th className="px-3.5 sm:px-4 py-2.5 font-semibold text-end">{t("inventory.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground text-xs sm:text-sm">
                    {t("inventory.noItemsFound")}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const st = statusOf(item);
                  const itemValue = Number(item.current_stock) * Number(item.price_per_unit);
                  return (
                    <tr key={item.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-3.5 sm:px-4 py-3">
                        <span className="font-semibold text-foreground block">{item.item_name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {t("inventory.lowStockThreshold")}: {item.low_stock_threshold}
                        </span>
                      </td>
                      <td className="px-3.5 sm:px-4 py-3 text-muted-foreground capitalize">
                        {item.unit}
                      </td>
                      <td className="px-3.5 sm:px-4 py-3 text-end font-mono font-medium text-foreground">
                        <bdi>{Number(item.current_stock).toLocaleString()} <span className="text-muted-foreground text-[11px]">{item.unit}</span></bdi>
                      </td>
                      <td className="px-3.5 sm:px-4 py-3 text-end font-mono text-muted-foreground">
                        <bdi>₨ {Number(item.price_per_unit).toLocaleString()}</bdi>
                      </td>
                      <td className="px-3.5 sm:px-4 py-3 text-end font-mono font-bold text-foreground">
                        <bdi>₨ {Math.round(itemValue).toLocaleString()}</bdi>
                      </td>
                      <td className="px-3.5 sm:px-4 py-3 text-start">
                        <span className={`text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-md border ${st.cls}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-3.5 sm:px-4 py-3 text-end">
                        <div className="flex items-center justify-end gap-1">
                          {isManagerOrAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => openEdit(item)}
                              title={t("common.edit")}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {isAdmin && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                  title={t("common.delete")}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="rounded-lg">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t("inventory.deleteItem")}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t("inventory.deleteConfirm")} <strong>{item.item_name}</strong>?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(item.id)}
                                    className="bg-rose-600 hover:bg-rose-700 text-white"
                                  >
                                    {t("common.delete")}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="w-[95vw] sm:w-full max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg">{t("inventory.editItem")}</DialogTitle>
            <DialogDescription className="text-xs">{t("inventory.updateDetails")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">{t("inventory.itemName")} *</Label>
              <Input
                value={editForm.item_name}
                onChange={(e) => setEditForm({ ...editForm, item_name: e.target.value })}
                className="h-10 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{t("inventory.stock")}</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={editForm.current_stock}
                  onChange={(e) => setEditForm({ ...editForm, current_stock: e.target.value })}
                  className="h-10 text-sm font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{t("inventory.unit")}</Label>
                <Input
                  maxLength={20}
                  value={editForm.unit}
                  onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                  className="h-10 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{t("inventory.pricePerUnit")}</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={editForm.price_per_unit}
                  onChange={(e) => setEditForm({ ...editForm, price_per_unit: e.target.value })}
                  className="h-10 text-sm font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{t("inventory.lowStockThreshold")}</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  value={editForm.low_stock_threshold}
                  onChange={(e) => setEditForm({ ...editForm, low_stock_threshold: e.target.value })}
                  className="h-10 text-sm font-mono"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>{t("common.cancel")}</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleUpdate}
              disabled={!editForm.item_name}
            >
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
