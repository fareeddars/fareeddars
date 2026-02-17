import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Phone, MapPin } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

const Farmers = () => {
  const { user, isManagerOrAdmin } = useAuth();
  const { toast } = useToast();
  const [farmers, setFarmers] = useState<Tables<"farmers">[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "", farm_details: "", initial_balance: "0" });

  const fetchFarmers = async () => {
    const { data } = await supabase.from("farmers").select("*").order("created_at", { ascending: false });
    if (data) setFarmers(data);
  };

  useEffect(() => { fetchFarmers(); }, []);

  const handleSave = async () => {
    if (!user) return;
    const { error } = await supabase.from("farmers").insert({
      name: form.name,
      phone: form.phone || null,
      address: form.address || null,
      farm_details: form.farm_details || null,
      initial_balance: Number(form.initial_balance) || 0,
      created_by: user.id,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Farmer added successfully" });
      setForm({ name: "", phone: "", address: "", farm_details: "", initial_balance: "0" });
      setOpen(false);
      setConfirmOpen(false);
      fetchFarmers();
    }
  };

  const filtered = farmers.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">Farmers</h1>
          <p className="text-muted-foreground">Manage your farmer records</p>
        </div>
        {isManagerOrAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Add Farmer</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Farmer</DialogTitle>
                <DialogDescription>Enter farmer details below</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div className="space-y-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                <div className="space-y-2"><Label>Farm Details</Label><Textarea value={form.farm_details} onChange={(e) => setForm({ ...form, farm_details: e.target.value })} /></div>
                <div className="space-y-2"><Label>Initial Balance (₨)</Label><Input type="number" value={form.initial_balance} onChange={(e) => setForm({ ...form, initial_balance: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                  <DialogTrigger asChild>
                    <Button disabled={!form.name}>Save Farmer</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Confirm</DialogTitle><DialogDescription>Are you sure you want to add {form.name}?</DialogDescription></DialogHeader>
                    <DialogFooter><Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button><Button onClick={handleSave}>Confirm</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search farmers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((farmer) => (
          <Card key={farmer.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{farmer.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              {farmer.phone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{farmer.phone}</div>}
              {farmer.address && <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" />{farmer.address}</div>}
              <div className="pt-2 border-t border-border">
                <span className="text-foreground font-medium">Balance: ₨ {Number(farmer.initial_balance).toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">No farmers found.</div>
        )}
      </div>
    </div>
  );
};

export default Farmers;
