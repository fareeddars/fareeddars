import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { offlineRepo, isOnline } from "@/lib/offline";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, AlertTriangle, Pencil, Trash2, FileText, Package, TrendingDown } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

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

  const downloadPDF = async () => {
    // Fetch ledger entries linked to inventory items
    const { data: ledgerData } = await supabase
      .from("ledger_entries")
      .select("*, farmers(name)")
      .eq("entry_type", "expense")
      .not("inventory_item_id", "is", null)
      .order("entry_date", { ascending: false });

    const isUrdu = language === "ur";
    const isSindhi = language === "sd";
    const isRTL = isUrdu || isSindhi;

    const tl = (en: string, ur: string, sd: string) => {
      if (isUrdu) return ur;
      if (isSindhi) return sd;
      return en;
    };

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    let itemsHTML = "";
    items.forEach((item) => {
      const itemEntries = ledgerData?.filter(e => e.inventory_item_id === item.id) || [];
      const totalGiven = itemEntries.reduce((s, e) => s + (Number(e.quantity) || 0), 0);
      const totalValue = itemEntries.reduce((s, e) => s + Number(e.amount), 0);

      let farmersTableHTML = "";
      if (itemEntries.length > 0) {
        const farmerRows = itemEntries.map(e => `
          <tr>
            <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;">${e.farmers?.name || "—"}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:center;">${e.quantity || "—"} ${item.unit}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:center;">₨ ${Number(e.rate || item.price_per_unit).toLocaleString()}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:${isRTL ? 'left' : 'right'};">₨ ${Number(e.amount).toLocaleString()}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:center;">${e.entry_date || "—"}</td>
          </tr>
        `).join("");

        farmersTableHTML = `
          <table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:12px;">
            <thead>
              <tr style="background:#f0f4ff;">
                <th style="padding:8px 10px;text-align:${isRTL ? 'right' : 'left'};border-bottom:2px solid #6366f1;color:#4338ca;font-weight:600;">${tl("Farmer", "کسان", "هاري")}</th>
                <th style="padding:8px 10px;text-align:center;border-bottom:2px solid #6366f1;color:#4338ca;font-weight:600;">${tl("Qty Given", "دی گئی مقدار", "ڏنل مقدار")}</th>
                <th style="padding:8px 10px;text-align:center;border-bottom:2px solid #6366f1;color:#4338ca;font-weight:600;">${tl("Rate", "قیمت", "قيمت")}</th>
                <th style="padding:8px 10px;text-align:${isRTL ? 'left' : 'right'};border-bottom:2px solid #6366f1;color:#4338ca;font-weight:600;">${tl("Total", "کل", "ڪُل")}</th>
                <th style="padding:8px 10px;text-align:center;border-bottom:2px solid #6366f1;color:#4338ca;font-weight:600;">${tl("Date", "تاریخ", "تاريخ")}</th>
              </tr>
            </thead>
            <tbody>${farmerRows}</tbody>
            <tfoot>
              <tr style="background:#f8fafc;font-weight:700;">
                <td style="padding:8px 10px;border-top:2px solid #6366f1;">${tl("Total", "کل", "ڪُل")}</td>
                <td style="padding:8px 10px;text-align:center;border-top:2px solid #6366f1;">${totalGiven} ${item.unit}</td>
                <td style="padding:8px 10px;border-top:2px solid #6366f1;"></td>
                <td style="padding:8px 10px;text-align:${isRTL ? 'left' : 'right'};border-top:2px solid #6366f1;">₨ ${totalValue.toLocaleString()}</td>
                <td style="padding:8px 10px;border-top:2px solid #6366f1;"></td>
              </tr>
            </tfoot>
          </table>
        `;
      } else {
        farmersTableHTML = `<p style="color:#9ca3af;font-style:italic;margin:8px 0;font-size:12px;">${tl("No distribution records", "کوئی ریکارڈ نہیں", "ڪو رڪارڊ ناهي")}</p>`;
      }

      const lowStock = item.current_stock <= item.low_stock_threshold;

      itemsHTML += `
        <div style="margin-bottom:24px;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;page-break-inside:avoid;">
          <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:14px 18px;display:flex;justify-content:space-between;align-items:center;">
            <div>
              <h3 style="margin:0;color:#fff;font-size:16px;font-weight:700;">${item.item_name}</h3>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:12px;">${tl("Unit", "اکائی", "اڪائي")}: ${item.unit}</p>
            </div>
            <div style="text-align:${isRTL ? 'left' : 'right'};">
              <p style="margin:0;color:#fff;font-size:14px;font-weight:700;">₨ ${Number(item.price_per_unit).toLocaleString()}/${item.unit}</p>
              <p style="margin:4px 0 0;color:${lowStock ? '#fbbf24' : 'rgba(255,255,255,0.8)'};font-size:12px;font-weight:${lowStock ? '700' : '400'};">
                ${tl("Stock", "ذخیرہ", "ذخيرو")}: ${item.current_stock} ${item.unit} ${lowStock ? '⚠️' : ''}
              </p>
            </div>
          </div>
          <div style="padding:12px 18px;">
            <div style="display:flex;gap:20px;margin-bottom:10px;flex-wrap:wrap;">
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 16px;flex:1;min-width:120px;text-align:center;">
                <p style="margin:0;color:#16a34a;font-size:11px;font-weight:600;">${tl("Purchased", "خریدا گیا", "خريديو ويو")}</p>
                <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:#15803d;">${item.current_stock + totalGiven} ${item.unit}</p>
              </div>
              <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 16px;flex:1;min-width:120px;text-align:center;">
                <p style="margin:0;color:#dc2626;font-size:11px;font-weight:600;">${tl("Given to Farmers", "کسانوں کو دیا", "هارين کي ڏنو")}</p>
                <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:#b91c1c;">${totalGiven} ${item.unit}</p>
              </div>
              <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px 16px;flex:1;min-width:120px;text-align:center;">
                <p style="margin:0;color:#2563eb;font-size:11px;font-weight:600;">${tl("Remaining", "باقی", "باقي")}</p>
                <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:#1d4ed8;">${item.current_stock} ${item.unit}</p>
              </div>
            </div>
            <h4 style="margin:14px 0 6px;font-size:13px;font-weight:700;color:#4338ca;border-bottom:1px solid #e5e7eb;padding-bottom:4px;">
              ${tl("Distribution Details — Which Farmer Got How Much", "تقسیم کی تفصیل — کس کسان کو کتنا دیا", "ورهاست جي تفصيل — ڪهڙي هاري کي ڪيترو ڏنو")}
            </h4>
            ${farmersTableHTML}
          </div>
        </div>
      `;
    });

    const totalStock = items.reduce((s, i) => s + Number(i.current_stock), 0);
    const totalValue = items.reduce((s, i) => s + (Number(i.current_stock) * Number(i.price_per_unit)), 0);

    const html = `<!DOCTYPE html>
<html dir="${isRTL ? 'rtl' : 'ltr'}">
<head>
  <meta charset="utf-8" />
  <title>${tl("Inventory Report", "گودام کی رپورٹ", "گودام جي رپورٽ")}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: ${isRTL ? "'Jameel Noori Nastaleeq','Noto Naskh Arabic','Noto Nastaliq Urdu','Scheherazade New','Tahoma',Arial,sans-serif" : "'Segoe UI','Helvetica Neue',Helvetica,Arial,sans-serif"}; color: #1e293b; padding: 30px; background: #fff; font-size: 13px; line-height: 1.5; }
    @media print { body { padding: 15px; } @page { margin: 15mm; } }
  </style>
</head>
<body>
  <div style="text-align:center;margin-bottom:30px;padding-bottom:20px;border-bottom:3px solid #6366f1;">
    <h1 style="font-size:24px;font-weight:800;color:#4338ca;margin-bottom:4px;">🌾 ${tl("Agriculture Ledger", "زرعی حساب کتاب", "زرعي حساب ڪتاب")}</h1>
    <h2 style="font-size:18px;font-weight:600;color:#6366f1;margin-bottom:8px;">${tl("Inventory Report", "گودام کی رپورٹ", "گودام جي رپورٽ")}</h2>
    <p style="color:#64748b;font-size:12px;">${tl("Generated", "بنائی گئی", "ٺاهي وئي")}: ${new Date().toLocaleDateString()} | ${tl("Total Items", "کل اشیاء", "ڪُل شيون")}: ${items.length}</p>
  </div>

  <div style="display:flex;gap:16px;margin-bottom:24px;flex-wrap:wrap;">
    <div style="flex:1;min-width:200px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:12px;padding:16px;color:#fff;">
      <p style="font-size:12px;opacity:0.8;margin-bottom:4px;">${tl("Total Items", "کل اشیاء", "ڪُل شيون")}</p>
      <p style="font-size:24px;font-weight:800;">${items.length}</p>
    </div>
    <div style="flex:1;min-width:200px;background:linear-gradient(135deg,#10b981,#059669);border-radius:12px;padding:16px;color:#fff;">
      <p style="font-size:12px;opacity:0.8;margin-bottom:4px;">${tl("Total Stock Value", "ذخیرے کی کل قیمت", "ذخيري جي ڪُل قيمت")}</p>
      <p style="font-size:24px;font-weight:800;">₨ ${totalValue.toLocaleString()}</p>
    </div>
    <div style="flex:1;min-width:200px;background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:12px;padding:16px;color:#fff;">
      <p style="font-size:12px;opacity:0.8;margin-bottom:4px;">${tl("Low Stock Items", "کم ذخیرے والی اشیاء", "گهٽ ذخيري واريون شيون")}</p>
      <p style="font-size:24px;font-weight:800;">${items.filter(i => i.current_stock <= i.low_stock_threshold).length}</p>
    </div>
  </div>

  ${itemsHTML}

  <div style="margin-top:30px;text-align:center;padding-top:20px;border-top:2px solid #e5e7eb;color:#94a3b8;font-size:11px;">
    <p>${tl("This is a computer-generated report", "یہ کمپیوٹر سے بنائی گئی رپورٹ ہے", "هي ڪمپيوٽر مان ٺهيل رپورٽ آهي")}</p>
  </div>
</body>
</html>`;

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
    setEditForm({ item_name: item.item_name, current_stock: String(item.current_stock), unit: item.unit, price_per_unit: String(item.price_per_unit), low_stock_threshold: String(item.low_stock_threshold) });
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingItem) return;
    try {
      await offlineRepo.update("inventory", editingItem.id, {
        item_name: editForm.item_name, current_stock: Number(editForm.current_stock), unit: editForm.unit,
        price_per_unit: Number(editForm.price_per_unit), low_stock_threshold: Number(editForm.low_stock_threshold),
      });
      toast({ title: isOnline() ? "Item updated" : "Updated offline — will sync" });
      setEditOpen(false); setEditingItem(null); fetchItems();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await offlineRepo.remove("inventory", id);
      toast({ title: isOnline() ? "Item deleted" : "Deleted offline — will sync" });
      fetchItems();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const totalStock = items.reduce((s, i) => s + Number(i.current_stock), 0);
  const totalValue = items.reduce((s, i) => s + (Number(i.current_stock) * Number(i.price_per_unit)), 0);
  const lowStockCount = items.filter(i => i.current_stock <= i.low_stock_threshold).length;

  return (
    <div className="space-y-6">
      {/* Page Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-6 sm:p-8 text-primary-foreground shadow-xl shadow-primary/20">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-primary-foreground/5 -translate-y-1/2 translate-x-1/4 blur-2xl" />
        <div className="absolute bottom-0 left-1/3 w-32 h-32 rounded-full bg-primary-foreground/10 translate-y-1/2 blur-xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-foreground/15 backdrop-blur-md border border-primary-foreground/10">
              <Package className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight">{t("inventory.title")}</h1>
              <p className="text-primary-foreground/70 text-sm mt-0.5">{t("inventory.subtitle")}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={downloadPDF} disabled={items.length === 0} className="rounded-2xl bg-white/95 text-primary shadow-sm border border-slate-200 hover:bg-white">
              <FileText className="mr-2 h-4 w-4" />{t("inventory.downloadPDF")}
            </Button>
            {isManagerOrAdmin && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-primary to-purple-600 text-white font-semibold shadow-lg shadow-primary/20 transition-transform duration-300 hover:-translate-y-0.5">
                  <Plus className="mr-2 h-4 w-4" />{t("inventory.addItem")}
                </Button>
              </DialogTrigger>
            <DialogContent className="w-[95vw] sm:w-full max-w-lg">
              <DialogHeader><DialogTitle className="font-serif">{t("inventory.addInventoryItem")}</DialogTitle><DialogDescription>{t("inventory.enterDetails")}</DialogDescription></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>{t("inventory.itemName")} *</Label><Input className="h-11" value={form.item_name} onChange={(e) => setForm({ ...form, item_name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>{t("inventory.currentStock")}</Label><Input className="h-11" type="number" inputMode="decimal" min="0" step="0.01" value={form.current_stock} onChange={(e) => setForm({ ...form, current_stock: e.target.value })} /></div>
                  <div className="space-y-2"><Label>{t("inventory.unit")}</Label><Input className="h-11" maxLength={20} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>{t("inventory.pricePerUnit")} (₨)</Label><Input className="h-11" type="number" inputMode="decimal" min="0" step="0.01" value={form.price_per_unit} onChange={(e) => setForm({ ...form, price_per_unit: e.target.value })} /></div>
                  <div className="space-y-2"><Label>{t("inventory.lowStockAlert")}</Label><Input className="h-11" type="number" inputMode="numeric" min="0" step="1" value={form.low_stock_threshold} onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })} /></div>
                </div>
              </div>
              <DialogFooter><Button onClick={handleSave} disabled={!form.item_name} className="w-full h-11 bg-gradient-to-r from-primary to-purple-600">{t("inventory.saveItem")}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
          )}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border border-slate-200 bg-white/95 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="rounded-2xl bg-slate-100 p-2">
                <Package className="h-5 w-5 text-slate-700" />
              </div>
              <span className="text-xs uppercase tracking-[.24em] text-slate-500">{t("dashboard.inventoryItems")}</span>
            </div>
            <p className="text-3xl font-bold text-slate-900 font-mono">{items.length}</p>
          </CardContent>
        </Card>
        <Card className="border border-emerald-200 bg-emerald-50/80 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="rounded-2xl bg-white p-2 shadow-sm">
                <TrendingDown className="h-5 w-5 text-emerald-600" />
              </div>
              <span className="text-xs uppercase tracking-[.24em] text-emerald-700">{t("inventory.stockValue")}</span>
            </div>
            <p className="text-3xl font-bold text-slate-900 font-mono">₨ {totalValue.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border border-amber-200 bg-amber-50/80 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="rounded-2xl bg-white p-2 shadow-sm">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <span className="text-xs uppercase tracking-[.24em] text-amber-700">{t("inventory.lowStockItems")}</span>
            </div>
            <p className="text-3xl font-bold text-slate-900 font-mono">{lowStockCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => {
          const accent = index % 3 === 0 ? "from-sky-500 to-cyan-400" : index % 3 === 1 ? "from-emerald-500 to-lime-400" : "from-violet-500 to-fuchsia-500";
          const lowStock = Number(item.current_stock) <= Number(item.low_stock_threshold);
          return (
            <Card key={item.id} className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-transform duration-300 hover:-translate-y-1 hover:shadow-2xl">
              <div className={`h-1 bg-gradient-to-r ${accent}`} />
              <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-lg font-serif">{item.item_name}</CardTitle>
                    <Badge variant={lowStock ? "destructive" : "secondary"} className="uppercase tracking-[.24em] text-[10px]">
                      {lowStock ? t("inventory.low") : "In Stock"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.unit}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  {isManagerOrAdmin && (<Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>)}
                  {isAdmin && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>{t("inventory.deleteItem")}</AlertDialogTitle>
                          <AlertDialogDescription>{t("inventory.deleteConfirm")} <strong>{item.item_name}</strong>?</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(item.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("common.delete")}</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[11px] uppercase tracking-[.24em] text-slate-500">{t("inventory.currentStock")}</p>
                    <p className={`mt-2 text-xl font-semibold ${lowStock ? "text-destructive" : "text-slate-900"}`}>{item.current_stock} {item.unit}</p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[11px] uppercase tracking-[.24em] text-slate-500">{t("inventory.pricePerUnit")}</p>
                    <p className="mt-2 text-xl font-semibold text-slate-900">₨ {Number(item.price_per_unit).toLocaleString()}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[11px] uppercase tracking-[.24em] text-slate-500">{t("inventory.lowStockAlert")}</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{item.low_stock_threshold}</p>
                  </div>
                  <div className="rounded-3xl bg-gradient-to-r from-slate-900 to-slate-700 p-4 text-white">
                    <p className="text-[11px] uppercase tracking-[.24em] opacity-80">Stock Value</p>
                    <p className="mt-2 text-xl font-semibold">₨ {(Number(item.current_stock) * Number(item.price_per_unit)).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {items.length === 0 && <div className="col-span-full text-center py-12 text-muted-foreground">{t("inventory.noItems")}</div>}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="w-[95vw] sm:w-full max-w-lg">
          <DialogHeader><DialogTitle className="font-serif">{t("inventory.editItem")}</DialogTitle><DialogDescription>{t("inventory.updateDetails")}</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>{t("inventory.itemName")} *</Label><Input className="h-11" value={editForm.item_name} onChange={(e) => setEditForm({ ...editForm, item_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{t("inventory.currentStock")}</Label><Input className="h-11" type="number" inputMode="decimal" min="0" step="0.01" value={editForm.current_stock} onChange={(e) => setEditForm({ ...editForm, current_stock: e.target.value })} /></div>
              <div className="space-y-2"><Label>{t("inventory.unit")}</Label><Input className="h-11" maxLength={20} value={editForm.unit} onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{t("inventory.pricePerUnit")} (₨)</Label><Input className="h-11" type="number" inputMode="decimal" min="0" step="0.01" value={editForm.price_per_unit} onChange={(e) => setEditForm({ ...editForm, price_per_unit: e.target.value })} /></div>
              <div className="space-y-2"><Label>{t("inventory.lowStockAlert")}</Label><Input className="h-11" type="number" inputMode="numeric" min="0" step="1" value={editForm.low_stock_threshold} onChange={(e) => setEditForm({ ...editForm, low_stock_threshold: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleUpdate} disabled={!editForm.item_name} className="bg-gradient-to-r from-primary to-purple-600">{t("inventory.updateItem")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
