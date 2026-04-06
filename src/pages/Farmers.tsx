import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Phone, MapPin, Pencil, Trash2, Users, UserPlus } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

const Farmers = () => {
  const { user, isManagerOrAdmin, isAdmin } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [farmers, setFarmers] = useState<Tables<"farmers">[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingFarmer, setEditingFarmer] = useState<Tables<"farmers"> | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", address: "", farm_details: "", initial_balance: "0" });
  const [editForm, setEditForm] = useState({ name: "", phone: "", address: "", farm_details: "", initial_balance: "0" });

  const fetchFarmers = async () => {
    const { data } = await supabase.from("farmers").select("*").order("created_at", { ascending: false });
    if (data) setFarmers(data);
  };

  useEffect(() => { fetchFarmers(); }, []);

  const handleSave = async () => {
    if (!user) return;
    const { error } = await supabase.from("farmers").insert({
      name: form.name, phone: form.phone || null, address: form.address || null,
      farm_details: form.farm_details || null, initial_balance: Number(form.initial_balance) || 0, created_by: user.id,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Farmer added successfully" }); setForm({ name: "", phone: "", address: "", farm_details: "", initial_balance: "0" }); setOpen(false); setConfirmOpen(false); fetchFarmers(); }
  };

  const openEdit = (farmer: Tables<"farmers">) => {
    setEditingFarmer(farmer);
    setEditForm({ name: farmer.name, phone: farmer.phone || "", address: farmer.address || "", farm_details: farmer.farm_details || "", initial_balance: String(farmer.initial_balance) });
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingFarmer) return;
    const { error } = await supabase.from("farmers").update({
      name: editForm.name, phone: editForm.phone || null, address: editForm.address || null,
      farm_details: editForm.farm_details || null, initial_balance: Number(editForm.initial_balance) || 0,
    }).eq("id", editingFarmer.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Farmer updated successfully" }); setEditOpen(false); setEditingFarmer(null); fetchFarmers(); }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("farmers").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Farmer deleted" }); fetchFarmers(); }
  };

  const filtered = farmers.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Page Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-6 sm:p-8 text-primary-foreground shadow-xl shadow-primary/20">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-accent-foreground/5 -translate-y-1/2 translate-x-1/4 blur-2xl" />
        <div className="absolute bottom-0 left-1/2 w-32 h-32 rounded-full bg-accent-foreground/10 translate-y-1/2 blur-xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-foreground/15 backdrop-blur-md border border-accent-foreground/10">
              <Users className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight">{t("farmers.title")}</h1>
              <p className="text-accent-foreground/70 text-sm mt-0.5">{t("farmers.subtitle")}</p>
            </div>
          </div>
          {isManagerOrAdmin && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary-foreground text-accent hover:bg-primary-foreground/90 font-semibold shadow-lg shadow-black/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl">
                  <Plus className="mr-2 h-4 w-4" />{t("farmers.addFarmer")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{t("farmers.addNew")}</DialogTitle><DialogDescription>{t("farmers.enterDetails")}</DialogDescription></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2"><Label>{t("common.name")} *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                  <div className="space-y-2"><Label>{t("common.phone")}</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                  <div className="space-y-2"><Label>{t("common.address")}</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                  <div className="space-y-2"><Label>{t("farmers.farmDetails")}</Label><Textarea value={form.farm_details} onChange={(e) => setForm({ ...form, farm_details: e.target.value })} /></div>
                  <div className="space-y-2"><Label>{t("farmers.initialBalance")} (₨)</Label><Input type="number" value={form.initial_balance} onChange={(e) => setForm({ ...form, initial_balance: e.target.value })} /></div>
                </div>
                <DialogFooter>
                  <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                    <DialogTrigger asChild><Button disabled={!form.name} className="bg-gradient-to-r from-primary to-accent">{t("farmers.saveFarmer")}</Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>{t("common.confirm")}</DialogTitle><DialogDescription>{t("farmers.deleteConfirm")} {form.name}?</DialogDescription></DialogHeader>
                      <DialogFooter><Button variant="outline" onClick={() => setConfirmOpen(false)}>{t("common.cancel")}</Button><Button onClick={handleSave}>{t("common.confirm")}</Button></DialogFooter>
                    </DialogContent>
                  </Dialog>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder={t("farmers.searchFarmers")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-11 rounded-xl border-border/50 focus:border-primary/50 transition-colors" />
      </div>

      {/* Farmer Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((farmer, i) => (
          <Card key={farmer.id} className="group hover:shadow-xl transition-all duration-500 hover:-translate-y-1 overflow-hidden border-border/50 animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="h-1.5 bg-gradient-to-r from-accent to-chart-5" />
            <CardHeader className="pb-2 flex flex-row items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent/70 text-accent-foreground text-sm font-bold shadow-md">
                  {farmer.name.charAt(0).toUpperCase()}
                </div>
                <CardTitle className="text-lg">{farmer.name}</CardTitle>
              </div>
              <div className="flex gap-1">
                {isManagerOrAdmin && (<Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-primary/10 hover:text-primary transition-colors" onClick={() => openEdit(farmer)}><Pencil className="h-3.5 w-3.5" /></Button>)}
                {isAdmin && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>{t("farmers.deleteFarmer")}</AlertDialogTitle>
                        <AlertDialogDescription>{t("farmers.deleteConfirm")} <strong>{farmer.name}</strong>? {t("farmers.deleteWarning")}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(farmer.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("common.delete")}</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              {farmer.phone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-accent" />{farmer.phone}</div>}
              {farmer.address && <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-primary" />{farmer.address}</div>}
              <div className="pt-3 border-t border-border/50">
                <span className="text-foreground font-bold font-mono text-base">{t("farmers.balance")}: ₨ {Number(farmer.initial_balance).toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-muted-foreground">
            <UserPlus className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="font-medium">{t("farmers.noFarmers")}</p>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("farmers.editFarmer")}</DialogTitle><DialogDescription>{t("farmers.updateDetails")}</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>{t("common.name")} *</Label><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>{t("common.phone")}</Label><Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></div>
            <div className="space-y-2"><Label>{t("common.address")}</Label><Input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} /></div>
            <div className="space-y-2"><Label>{t("farmers.farmDetails")}</Label><Textarea value={editForm.farm_details} onChange={(e) => setEditForm({ ...editForm, farm_details: e.target.value })} /></div>
            <div className="space-y-2"><Label>{t("farmers.initialBalance")} (₨)</Label><Input type="number" value={editForm.initial_balance} onChange={(e) => setEditForm({ ...editForm, initial_balance: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleUpdate} disabled={!editForm.name} className="bg-gradient-to-r from-primary to-accent">{t("farmers.updateFarmer")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Farmers;
