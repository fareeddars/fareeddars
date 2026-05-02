import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { offlineRepo, isOnline, useOnlineStatus } from "@/lib/offline";
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
import { Plus, Search, Phone, MapPin, Pencil, Trash2, Users, UserPlus, CreditCard, User, Home, StickyNote, BadgeDollarSign } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface Farmer {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  farm_details: string | null;
  initial_balance: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  cnic: string | null;
  landlord: string | null;
  notes: string | null;
}

const emptyForm = { name: "", phone: "", address: "", farm_details: "", initial_balance: "0", cnic: "", landlord: "", notes: "" };

const Farmers = () => {
  const { user, isManagerOrAdmin, isAdmin } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingFarmer, setEditingFarmer] = useState<Farmer | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [editForm, setEditForm] = useState({ ...emptyForm });
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);

  const fetchFarmers = async () => {
    if (isOnline()) {
      const { data } = await supabase.from("farmers").select("*").order("created_at", { ascending: false });
      if (data) {
        setFarmers(data as unknown as Farmer[]);
        // refresh cache
        await offlineRepo.hydrate("farmers", data);
        return;
      }
    }
    // Offline fallback → read from local cache
    const local = await offlineRepo.listLocal("farmers");
    local.sort((a: any, b: any) => (b.created_at || "").localeCompare(a.created_at || ""));
    setFarmers(local as Farmer[]);
  };

  useEffect(() => { fetchFarmers(); }, []);

  const handleSave = async () => {
    if (!user) return;
    const trimmedName = form.name.trim();
    if (!trimmedName) { toast({ title: "Name is required", variant: "destructive" }); return; }
    if (trimmedName.length > 100) { toast({ title: "Name too long (max 100 chars)", variant: "destructive" }); return; }
    const bal = Number(form.initial_balance);
    if (form.initial_balance !== "" && (Number.isNaN(bal) || bal < 0)) {
      toast({ title: "Initial balance must be a positive number", variant: "destructive" }); return;
    }
    try {
      await offlineRepo.insert("farmers", {
        name: trimmedName, phone: form.phone.trim() || null, address: form.address.trim() || null,
        farm_details: form.farm_details.trim() || null, initial_balance: bal || 0, created_by: user.id,
        cnic: form.cnic.trim() || null, landlord: form.landlord.trim() || null, notes: form.notes.trim() || null,
      });
      toast({ title: isOnline() ? "Farmer added successfully" : "Saved offline — will sync" });
      setForm({ ...emptyForm }); setOpen(false); setConfirmOpen(false); fetchFarmers();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const openEdit = (farmer: Farmer) => {
    setEditingFarmer(farmer);
    setEditForm({
      name: farmer.name, phone: farmer.phone || "", address: farmer.address || "",
      farm_details: farmer.farm_details || "", initial_balance: String(farmer.initial_balance),
      cnic: farmer.cnic || "", landlord: farmer.landlord || "", notes: farmer.notes || "",
    });
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingFarmer) return;
    try {
      await offlineRepo.update("farmers", editingFarmer.id, {
        name: editForm.name, phone: editForm.phone || null, address: editForm.address || null,
        farm_details: editForm.farm_details || null, initial_balance: Number(editForm.initial_balance) || 0,
        cnic: editForm.cnic || null, landlord: editForm.landlord || null, notes: editForm.notes || null,
      });
      toast({ title: isOnline() ? "Farmer updated successfully" : "Updated offline — will sync" });
      setEditOpen(false); setEditingFarmer(null); fetchFarmers();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await offlineRepo.remove("farmers", id);
      toast({ title: isOnline() ? "Farmer deleted" : "Deleted offline — will sync" });
      fetchFarmers();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const filtered = farmers.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()) || (f.cnic && f.cnic.includes(search)) || (f.phone && f.phone.includes(search)));

  const renderFarmerFormFields = (formData: typeof form, setFormData: (v: typeof form) => void) => (
    <div className="space-y-5">
      {/* Personal Info */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t("farmers.personalInfo")}</p>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-sm">{t("common.name")} *</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="pl-9" placeholder="Muhammad Ali" required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">{t("farmers.cnic")}</Label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={formData.cnic} onChange={(e) => setFormData({ ...formData, cnic: e.target.value })} className="pl-9" placeholder="42101-1234567-1" />
            </div>
          </div>
        </div>
      </div>
      <Separator />
      {/* Contact Info */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t("farmers.contactInfo")}</p>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-sm">{t("common.phone")}</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="pl-9" placeholder="03XX-XXXXXXX" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">{t("common.address")} / {t("farmers.village")}</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="pl-9" placeholder="Village name, District" />
            </div>
          </div>
        </div>
      </div>
      <Separator />
      {/* Farm & Financial */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t("farmers.financialInfo")}</p>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-sm">{t("farmers.landlord")}</Label>
            <div className="relative">
              <Home className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={formData.landlord} onChange={(e) => setFormData({ ...formData, landlord: e.target.value })} className="pl-9" placeholder="Landlord name" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">{t("farmers.initialBalance")} (₨)</Label>
            <div className="relative">
              <BadgeDollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="number" inputMode="decimal" min="0" step="0.01" value={formData.initial_balance} onChange={(e) => setFormData({ ...formData, initial_balance: e.target.value })} className="pl-9" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">{t("farmers.farmDetails")}</Label>
            <Textarea value={formData.farm_details} onChange={(e) => setFormData({ ...formData, farm_details: e.target.value })} placeholder="Crop types, land area..." rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">{t("farmers.notes")}</Label>
            <div className="relative">
              <StickyNote className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="pl-9" placeholder="Any additional notes..." rows={2} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Page Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-6 sm:p-8 text-primary-foreground shadow-xl shadow-primary/20">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-accent-foreground/5 -translate-y-1/2 translate-x-1/4 blur-2xl" />
        <div className="absolute bottom-0 left-1/2 w-32 h-32 rounded-full bg-accent-foreground/10 translate-y-1/2 blur-xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-foreground/15 backdrop-blur-md border border-primary-foreground/10">
              <Users className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight">{t("farmers.title")}</h1>
              <p className="text-primary-foreground/70 text-sm mt-0.5">{t("farmers.subtitle")}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block bg-primary-foreground/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-primary-foreground/10">
              <p className="text-xs text-primary-foreground/60">Total Farmers</p>
              <p className="text-xl font-bold">{farmers.length}</p>
            </div>
            {isManagerOrAdmin && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-semibold shadow-lg shadow-black/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl rounded-xl">
                    <Plus className="mr-2 h-4 w-4" />{t("farmers.addFarmer")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>{t("farmers.addNew")}</DialogTitle><DialogDescription>{t("farmers.enterDetails")}</DialogDescription></DialogHeader>
                  {renderFarmerFormFields(form, setForm)}
                  <DialogFooter>
                    <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                      <DialogTrigger asChild><Button disabled={!form.name} className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-lg shadow-primary/20 rounded-xl">{t("farmers.saveFarmer")}</Button></DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>{t("common.confirm")}</DialogTitle><DialogDescription>{t("farmers.saveFarmer")}: <strong>{form.name}</strong>?</DialogDescription></DialogHeader>
                        <DialogFooter><Button variant="outline" onClick={() => setConfirmOpen(false)}>{t("common.cancel")}</Button><Button onClick={handleSave}>{t("common.confirm")}</Button></DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
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
          <Card
            key={farmer.id}
            className="group hover:shadow-xl transition-all duration-500 hover:-translate-y-1 overflow-hidden border-border/50 animate-fade-in cursor-pointer"
            style={{ animationDelay: `${i * 60}ms` }}
            onClick={() => setSelectedFarmer(farmer)}
          >
            <div className="h-1.5 bg-gradient-to-r from-primary to-primary/70" />
            <CardHeader className="pb-2 flex flex-row items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-base font-bold shadow-lg shadow-primary/20 ring-2 ring-primary/20">
                  {farmer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <CardTitle className="text-base">{farmer.name}</CardTitle>
                  {farmer.cnic && <p className="text-xs text-muted-foreground mt-0.5 font-mono">{farmer.cnic}</p>}
                </div>
              </div>
              <div className="flex gap-1">
                {isManagerOrAdmin && (<Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-primary/10 hover:text-primary transition-colors" onClick={(e) => { e.stopPropagation(); openEdit(farmer); }}><Pencil className="h-3.5 w-3.5" /></Button>)}
                {isAdmin && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={(e) => e.stopPropagation()}><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger>
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
              {farmer.phone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-primary" />{farmer.phone}</div>}
              {farmer.address && <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-primary/70" />{farmer.address}</div>}
              {farmer.landlord && <div className="flex items-center gap-2"><Home className="h-3.5 w-3.5 text-primary/60" />{farmer.landlord}</div>}
              <div className="pt-3 border-t border-border/50 flex items-center justify-between">
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

      {/* Farmer Detail Dialog */}
      <Dialog open={!!selectedFarmer} onOpenChange={(v) => !v && setSelectedFarmer(null)}>
        <DialogContent className="sm:max-w-md">
          {selectedFarmer && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-xl font-bold shadow-lg shadow-primary/20 ring-2 ring-primary/20">
                    {selectedFarmer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <DialogTitle className="text-xl">{selectedFarmer.name}</DialogTitle>
                    {selectedFarmer.cnic && <p className="text-sm text-muted-foreground font-mono">{selectedFarmer.cnic}</p>}
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                {/* Contact */}
                <div className="rounded-xl bg-muted/50 p-4 space-y-2.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("farmers.contactInfo")}</p>
                  {selectedFarmer.phone && <div className="flex items-center gap-3 text-sm"><Phone className="h-4 w-4 text-primary" /><span>{selectedFarmer.phone}</span></div>}
                  {selectedFarmer.address && <div className="flex items-center gap-3 text-sm"><MapPin className="h-4 w-4 text-primary/70" /><span>{selectedFarmer.address}</span></div>}
                  {!selectedFarmer.phone && !selectedFarmer.address && <p className="text-sm text-muted-foreground italic">—</p>}
                </div>
                {/* Farm details */}
                <div className="rounded-xl bg-muted/50 p-4 space-y-2.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("farmers.financialInfo")}</p>
                  {selectedFarmer.landlord && <div className="flex items-center gap-3 text-sm"><Home className="h-4 w-4 text-primary/60" /><span>{selectedFarmer.landlord}</span></div>}
                  <div className="flex items-center gap-3">
                    <BadgeDollarSign className="h-4 w-4 text-chart-5" />
                    <span className="text-lg font-bold font-mono text-foreground">₨ {Number(selectedFarmer.initial_balance).toLocaleString()}</span>
                  </div>
                  {selectedFarmer.farm_details && <p className="text-sm text-muted-foreground mt-1">{selectedFarmer.farm_details}</p>}
                </div>
                {/* Notes */}
                {selectedFarmer.notes && (
                  <div className="rounded-xl bg-muted/50 p-4 space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("farmers.notes")}</p>
                    <p className="text-sm text-foreground">{selectedFarmer.notes}</p>
                  </div>
                )}
              </div>
              <DialogFooter className="mt-2">
                {isManagerOrAdmin && (
                  <Button onClick={() => { setSelectedFarmer(null); openEdit(selectedFarmer); }} className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl">
                    <Pencil className="mr-2 h-4 w-4" />{t("common.edit")}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t("farmers.editFarmer")}</DialogTitle><DialogDescription>{t("farmers.updateDetails")}</DialogDescription></DialogHeader>
          {renderFarmerFormFields(editForm, setEditForm)}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleUpdate} disabled={!editForm.name} className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-lg shadow-primary/20 rounded-xl">{t("farmers.updateFarmer")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Farmers;
