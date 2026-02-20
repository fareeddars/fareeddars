import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, AlertTriangle, Pencil, Trash2, Download } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

const Inventory = () => {
  const { user, isManagerOrAdmin, isAdmin } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<Tables<"inventory">[]>([]);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Tables<"inventory"> | null>(null);
  const [form, setForm] = useState({ item_name: "", current_stock: "", unit: "bags", price_per_unit: "", low_stock_threshold: "5" });
  const [editForm, setEditForm] = useState({ item_name: "", current_stock: "", unit: "bags", price_per_unit: "", low_stock_threshold: "5" });

  const fetchItems = async () => {
    const { data } = await supabase.from("inventory").select("*").order("item_name");
    if (data) setItems(data);
  };

  useEffect(() => { fetchItems(); }, []);

  const downloadCSV = () => {
    const headers = ["Item Name", "Stock", "Unit", "Price/Unit (Rs)", "Low Stock Threshold"];
    const rows = items.map(i => [i.item_name, i.current_stock, i.unit, i.price_per_unit, i.low_stock_threshold]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventory.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSave = async () => {
    if (!user) return;
    const { error } = await supabase.from("inventory").insert({
      item_name: form.item_name,
      current_stock: Number(form.current_stock),
      unit: form.unit,
      price_per_unit: Number(form.price_per_unit),
      low_stock_threshold: Number(form.low_stock_threshold),
      created_by: user.id,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Item added" });
      setOpen(false);
      setForm({ item_name: "", current_stock: "", unit: "bags", price_per_unit: "", low_stock_threshold: "5" });
      fetchItems();
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
    const { error } = await supabase.from("inventory").update({
      item_name: editForm.item_name,
      current_stock: Number(editForm.current_stock),
      unit: editForm.unit,
      price_per_unit: Number(editForm.price_per_unit),
      low_stock_threshold: Number(editForm.low_stock_threshold),
    }).eq("id", editingItem.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Item updated" });
      setEditOpen(false);
      setEditingItem(null);
      fetchItems();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("inventory").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Item deleted" });
      fetchItems();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">Inventory</h1>
          <p className="text-muted-foreground">Track your stock items</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={downloadCSV} disabled={items.length === 0}>
            <Download className="mr-2 h-4 w-4" />Download CSV
          </Button>
          {isManagerOrAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add Item</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Inventory Item</DialogTitle><DialogDescription>Enter item details</DialogDescription></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>Item Name *</Label><Input value={form.item_name} onChange={(e) => setForm({ ...form, item_name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Current Stock</Label><Input type="number" value={form.current_stock} onChange={(e) => setForm({ ...form, current_stock: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Unit</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Price/Unit (₨)</Label><Input type="number" value={form.price_per_unit} onChange={(e) => setForm({ ...form, price_per_unit: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Low Stock Alert</Label><Input type="number" value={form.low_stock_threshold} onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })} /></div>
                </div>
              </div>
              <DialogFooter><Button onClick={handleSave} disabled={!form.item_name}>Save Item</Button></DialogFooter>
            </DialogContent>
          </Dialog>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Card key={item.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2 flex flex-row items-start justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-lg">{item.item_name}</CardTitle>
                {item.current_stock <= item.low_stock_threshold && (
                  <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Low</Badge>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                {isManagerOrAdmin && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
                {isAdmin && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Item</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete <strong>{item.item_name}</strong>? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(item.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Stock:</span><span className="font-medium">{item.current_stock} {item.unit}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Price:</span><span className="font-mono">₨ {Number(item.price_per_unit).toLocaleString()}/{item.unit}</span></div>
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && <div className="col-span-full text-center py-12 text-muted-foreground">No inventory items yet.</div>}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Inventory Item</DialogTitle><DialogDescription>Update item details</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Item Name *</Label><Input value={editForm.item_name} onChange={(e) => setEditForm({ ...editForm, item_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Current Stock</Label><Input type="number" value={editForm.current_stock} onChange={(e) => setEditForm({ ...editForm, current_stock: e.target.value })} /></div>
              <div className="space-y-2"><Label>Unit</Label><Input value={editForm.unit} onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Price/Unit (₨)</Label><Input type="number" value={editForm.price_per_unit} onChange={(e) => setEditForm({ ...editForm, price_per_unit: e.target.value })} /></div>
              <div className="space-y-2"><Label>Low Stock Alert</Label><Input type="number" value={editForm.low_stock_threshold} onChange={(e) => setEditForm({ ...editForm, low_stock_threshold: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={!editForm.item_name}>Update Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
