import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, AlertTriangle } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

const Inventory = () => {
  const { user, isManagerOrAdmin } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<Tables<"inventory">[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ item_name: "", current_stock: "", unit: "bags", price_per_unit: "", low_stock_threshold: "5" });

  const fetchItems = async () => {
    const { data } = await supabase.from("inventory").select("*").order("item_name");
    if (data) setItems(data);
  };

  useEffect(() => { fetchItems(); }, []);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">Inventory</h1>
          <p className="text-muted-foreground">Track your stock items</p>
        </div>
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Card key={item.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-lg">{item.item_name}</CardTitle>
              {item.current_stock <= item.low_stock_threshold && (
                <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Low</Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Stock:</span><span className="font-medium">{item.current_stock} {item.unit}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Price:</span><span className="font-mono">₨ {Number(item.price_per_unit).toLocaleString()}/{item.unit}</span></div>
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && <div className="col-span-full text-center py-12 text-muted-foreground">No inventory items yet.</div>}
      </div>
    </div>
  );
};

export default Inventory;
