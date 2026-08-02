import { useEffect, useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
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
import { Plus, Search, Phone, MapPin, Pencil, Trash2, Users, UserPlus, CreditCard, User, Home, StickyNote, BadgeDollarSign, Wallet, Leaf, Camera, X } from "lucide-react";
import { Separator } from "@/components/ui/separator";

// Compress an image file to a small JPEG data URL (~max 384px, ~0.8 quality)
async function fileToCompressedDataUrl(file: File, maxDim = 384, quality = 0.82): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

// Deterministic dynamic farmer avatar based on name
function dynamicFarmerAvatar(name: string): string {
  const seed = encodeURIComponent((name || "farmer").trim().toLowerCase());
  return `https://api.dicebear.com/7.x/personas/svg?seed=${seed}&backgroundType=gradientLinear&backgroundColor=b6e3f4,c0aede,ffd5dc,ffdfbf`;
}

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
  photo_url: string | null;
}

const emptyForm = { name: "", phone: "", address: "", farm_details: "", initial_balance: "0", cnic: "", landlord: "", notes: "", photo_url: "" };

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
        await offlineRepo.hydrate("farmers", data);
        return;
      }
    }
    const local = await offlineRepo.listLocal("farmers");
    local.sort((a: any, b: any) => (b.created_at || "").localeCompare(a.created_at || ""));
    setFarmers(local as Farmer[]);
  };

  useEffect(() => { fetchFarmers(); }, []);

  // Deep-link from Dashboard quick actions
  const location = useLocation();
  useEffect(() => {
    if ((location.state as { openAdd?: boolean } | null)?.openAdd) {
      setOpen(true);
      window.history.replaceState({}, "");
    }
  }, [location.state]);

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
        photo_url: form.photo_url || null,
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
      photo_url: farmer.photo_url || "",
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
        photo_url: editForm.photo_url || null,
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

  const filtered = farmers.filter((f) => {
    const term = search.toLowerCase();
    return f.name.toLowerCase().includes(term) || 
           (f.cnic && f.cnic.includes(term)) || 
           (f.phone && f.phone.includes(term)) ||
           (f.landlord && f.landlord.toLowerCase().includes(term));
  });

  const totalPortfolioBalance = useMemo(() => {
    return farmers.reduce((sum, f) => sum + Number(f.initial_balance || 0), 0);
  }, [farmers]);

  const renderFarmerFormFields = (formData: typeof form, setFormData: (v: typeof form) => void) => (
    <div className="space-y-5 px-1 py-2">
      {/* Photo picker */}
      <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
        <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Camera className="h-4 w-4"/> Farmer Photo</p>
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-2xl overflow-hidden bg-muted border border-border/60 shrink-0">
            <img
              src={formData.photo_url || dynamicFarmerAvatar(formData.name || "farmer")}
              alt="Farmer preview"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <label className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-background border border-border cursor-pointer text-sm font-semibold hover:bg-muted/60 transition">
              <Camera className="h-4 w-4" />
              {formData.photo_url ? "Change photo" : "Upload photo"}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const url = await fileToCompressedDataUrl(file);
                    setFormData({ ...formData, photo_url: url });
                  } catch {
                    toast({ title: "Could not read image", variant: "destructive" });
                  } finally {
                    e.target.value = "";
                  }
                }}
              />
            </label>
            {formData.photo_url && (
              <button
                type="button"
                onClick={() => setFormData({ ...formData, photo_url: "" })}
                className="inline-flex items-center gap-1.5 text-xs text-destructive hover:underline self-start"
              >
                <X className="h-3 w-3" /> Remove photo (use dynamic avatar)
              </button>
            )}
            <p className="text-[11px] text-muted-foreground leading-snug">Optional. If not provided, a dynamic avatar will be generated automatically.</p>
          </div>
        </div>
      </div>

      {/* Personal Info */}
      <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
        <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-4 flex items-center gap-2"><User className="h-4 w-4"/> {t("farmers.personalInfo")}</p>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">{t("common.name")} *</Label>
            <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="h-11 bg-background" placeholder="Muhammad Ali" required maxLength={100} autoComplete="name" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">{t("farmers.cnic")}</Label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={formData.cnic} onChange={(e) => setFormData({ ...formData, cnic: e.target.value })} className="h-11 pl-9 bg-background" placeholder="42101-1234567-1" inputMode="numeric" maxLength={15} />
            </div>
          </div>
        </div>
      </div>
      
      {/* Contact Info */}
      <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
        <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Phone className="h-4 w-4"/> {t("farmers.contactInfo")}</p>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">{t("common.phone")}</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="tel" inputMode="tel" autoComplete="tel" maxLength={20} value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="h-11 pl-9 bg-background" placeholder="03XX-XXXXXXX" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">{t("common.address")} / {t("farmers.village")}</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="h-11 pl-9 bg-background" placeholder="Village name, District" />
            </div>
          </div>
        </div>
      </div>

      {/* Farm & Financial */}
      <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
        <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Wallet className="h-4 w-4"/> {t("farmers.financialInfo")}</p>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">{t("farmers.landlord")}</Label>
              <div className="relative">
                <Home className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={formData.landlord} onChange={(e) => setFormData({ ...formData, landlord: e.target.value })} className="h-11 pl-9 bg-background" placeholder="Landlord name" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{t("farmers.initialBalance")} (₨)</Label>
              <div className="relative">
                <BadgeDollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600/70" />
                <Input type="number" inputMode="decimal" min="0" step="0.01" value={formData.initial_balance} onChange={(e) => setFormData({ ...formData, initial_balance: e.target.value })} className="h-11 pl-9 bg-background border-emerald-500/30 focus-visible:ring-emerald-500/50 font-mono" />
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">{t("farmers.farmDetails")}</Label>
            <Textarea value={formData.farm_details} onChange={(e) => setFormData({ ...formData, farm_details: e.target.value })} placeholder="Crop types, land area..." className="bg-background resize-none" rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">{t("farmers.notes")}</Label>
            <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Any additional notes..." className="bg-background resize-none" rows={2} />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-700">
      
      {/* --- Premium Page Header Banner --- */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-indigo-950 via-blue-900 to-indigo-900 p-4 sm:p-10 text-white shadow-2xl border border-indigo-700/50">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-blue-400/10 -translate-y-1/3 translate-x-1/4 blur-[80px] animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[200px] h-[200px] rounded-full bg-indigo-400/20 translate-y-1/3 -translate-x-1/4 blur-[50px]" />
        
         <div className="relative z-10 flex flex-col xl:flex-row gap-4 sm:gap-8 justify-between">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
            <div className="hidden sm:flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 shadow-inner shrink-0">
              <Users className="h-10 w-10 text-blue-100" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-serif font-bold tracking-tight text-white drop-shadow-sm mb-1 sm:mb-2">
                {t("farmers.title")}
              </h1>
              <p className="text-blue-100/80 text-xs sm:text-base font-medium tracking-wide max-w-lg">
                {t("farmers.subtitle")}
              </p>
            </div>
          </div>
          
          {/* Quick Stats & Action Area */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full xl:w-auto">
            <div className="flex w-full sm:w-auto gap-2 sm:gap-4">
              <div className="flex-1 bg-black/20 backdrop-blur-md rounded-xl sm:rounded-2xl px-3 sm:px-5 py-2 sm:py-3 border border-white/10 flex flex-col justify-center min-w-0 sm:min-w-[140px]">
                <p className="text-[9px] sm:text-xs text-blue-200/70 font-semibold uppercase tracking-widest mb-0.5 sm:mb-1">Total Farmers</p>
                <p className="text-lg sm:text-3xl font-bold font-mono">{farmers.length}</p>
              </div>
              <div className="flex-1 bg-emerald-500/10 backdrop-blur-md rounded-xl sm:rounded-2xl px-3 sm:px-5 py-2 sm:py-3 border border-emerald-400/20 flex flex-col justify-center min-w-0 sm:min-w-[160px]">
                <p className="text-[9px] sm:text-xs text-emerald-200/80 font-semibold uppercase tracking-widest mb-0.5 sm:mb-1">Total Outstanding</p>
                <p className="text-base sm:text-2xl font-bold font-mono text-emerald-300 truncate">₨ {totalPortfolioBalance.toLocaleString()}</p>
              </div>
            </div>
            
            {isManagerOrAdmin && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto bg-white text-indigo-900 hover:bg-white/90 font-bold shadow-xl shadow-black/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl rounded-xl sm:rounded-2xl h-12 sm:h-14 px-5 sm:px-8 shrink-0 text-sm sm:text-base">
                    <Plus className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />{t("farmers.addFarmer")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-2xl">
                  <DialogHeader className="px-6 py-5 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 border-b">
                    <DialogTitle className="font-serif text-2xl flex items-center gap-2 text-indigo-900 dark:text-indigo-100">
                      <UserPlus className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                      {t("farmers.addNew")}
                    </DialogTitle>
                    <DialogDescription>{t("farmers.enterDetails")}</DialogDescription>
                  </DialogHeader>
                  <div className="flex-1 overflow-y-auto px-6 py-2">
                    {renderFarmerFormFields(form, setForm)}
                  </div>
                  <DialogFooter className="p-6 bg-muted/30 border-t mt-auto">
                    <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                      <DialogTrigger asChild>
                        <Button disabled={!form.name} className="w-full h-12 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold shadow-lg rounded-xl text-base">
                          {t("farmers.saveFarmer")}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="rounded-2xl">
                        <DialogHeader>
                          <DialogTitle className="font-serif text-xl">{t("common.confirm")}</DialogTitle>
                          <DialogDescription className="text-base mt-2">
                            {t("farmers.saveFarmer")}: <strong className="text-foreground">{form.name}</strong>?
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="gap-2 sm:gap-0">
                          <Button variant="outline" className="rounded-xl" onClick={() => setConfirmOpen(false)}>{t("common.cancel")}</Button>
                          <Button onClick={handleSave} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white">{t("common.confirm")}</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>

      {/* --- Premium Search Bar --- */}
      <div className="relative max-w-xl mx-auto sm:mx-0 group">
        <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
          <Search className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-focus-within:text-indigo-500 transition-colors" />
        </div>
        <Input 
          placeholder="Search by Name, CNIC, Phone, or Landlord..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          className="pl-10 sm:pl-12 h-11 sm:h-14 rounded-xl sm:rounded-2xl border-border/60 bg-card/50 backdrop-blur-sm focus:border-indigo-500/50 shadow-sm text-sm sm:text-base transition-all group-focus-within:shadow-md group-focus-within:bg-card" 
        />
      </div>

      {/* --- Premium Farmer Cards --- */}
      <div className="grid gap-3 sm:gap-6 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((farmer, i) => (
          <Card
            key={farmer.id}
            className="group relative cursor-pointer overflow-hidden bg-card/60 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-indigo-500/10 border-border/50 animate-fade-in"
            style={{ animationDelay: `${(i % 10) * 60}ms` }}
            onClick={() => setSelectedFarmer(farmer)}
          >
            {/* Top Color Accent */}
            <div className="h-1 w-full sm:h-1.5 bg-gradient-to-r from-indigo-500 to-blue-500 opacity-80 group-hover:opacity-100 transition-opacity" />
            
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-5 pt-3 sm:pt-5 flex flex-row items-start justify-between relative z-10">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="h-10 w-10 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-100 to-blue-100 dark:from-indigo-900/50 dark:to-blue-900/50 shadow-md shrink-0 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3">
                  <img src={farmer.photo_url || dynamicFarmerAvatar(farmer.name)} alt={farmer.name} className="h-full w-full object-cover" loading="lazy" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-sm sm:text-lg font-bold font-serif leading-tight truncate">{farmer.name}</CardTitle>
                  {farmer.cnic && <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 sm:mt-1 font-mono bg-muted/50 inline-block px-1 sm:px-1.5 py-0.5 rounded truncate max-w-full">{farmer.cnic}</p>}
                </div>
              </div>
              
              {/* Card Quick Actions */}
              <div className="flex gap-0.5 sm:gap-1 -mt-1 -mr-1 sm:-mr-2 shrink-0">
                {isManagerOrAdmin && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/30 rounded-full transition-colors" onClick={(e) => { e.stopPropagation(); openEdit(farmer); }}>
                    <Pencil className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                )}
                {isAdmin && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors" onClick={(e) => e.stopPropagation()}>
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-2xl">
                      <AlertDialogHeader><AlertDialogTitle>{t("farmers.deleteFarmer")}</AlertDialogTitle>
                        <AlertDialogDescription>{t("farmers.deleteConfirm")} <strong className="text-foreground">{farmer.name}</strong>? {t("farmers.deleteWarning")}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">{t("common.cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(farmer.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl">{t("common.delete")}</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="px-3 sm:px-5 pb-3 sm:pb-5 relative z-10">
              <div className="space-y-1.5 sm:space-y-2.5 text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-4">
                {farmer.phone && <div className="flex items-center gap-1.5 sm:gap-2.5 truncate"><Phone className="h-3 w-3 sm:h-4 sm:w-4 text-indigo-500/70 shrink-0" /><span className="truncate">{farmer.phone}</span></div>}
                {farmer.address && <div className="flex items-center gap-1.5 sm:gap-2.5 truncate"><MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-indigo-500/60 shrink-0" /><span className="truncate">{farmer.address}</span></div>}
                {farmer.landlord && <div className="flex items-center gap-1.5 sm:gap-2.5 truncate"><Home className="h-3 w-3 sm:h-4 sm:w-4 text-indigo-500/50 shrink-0" /><span className="truncate text-foreground/80 font-medium">{farmer.landlord}</span></div>}
              </div>
              
              <div className="pt-2 sm:pt-3 border-t border-border/40 flex items-center justify-between">
                <span className="text-[10px] sm:text-xs uppercase tracking-wider font-semibold text-muted-foreground">{t("farmers.balance")}</span>
                <span className="text-foreground font-bold font-mono text-sm sm:text-lg tracking-tight text-emerald-600 dark:text-emerald-400">
                  ₨ {Number(farmer.initial_balance).toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 px-4 text-center bg-card/30 backdrop-blur-sm rounded-3xl border border-dashed border-border/60">
            <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mb-4">
              <UserPlus className="h-10 w-10 text-muted-foreground/40" />
            </div>
            <h3 className="text-xl font-bold font-serif mb-1">{t("farmers.noFarmers")}</h3>
            <p className="text-muted-foreground text-sm">No farmers matched your search.</p>
          </div>
        )}
      </div>

      {/* --- Premium Profile Detail Popup --- */}
      <Dialog open={!!selectedFarmer} onOpenChange={(v) => !v && setSelectedFarmer(null)}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-3xl border-0 shadow-2xl">
          {selectedFarmer && (
            <>
              {/* Profile Cover Image / Gradient */}
              <div className="h-32 bg-gradient-to-r from-indigo-600 to-blue-500 relative">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 mix-blend-overlay"></div>
              </div>
              
              {/* Overlapping Avatar */}
              <div className="px-6 relative pb-2 -mt-12">
                <div className="flex justify-between items-end">
                  <div className="h-24 w-24 rounded-full bg-card p-1 shadow-xl">
                    <div className="h-full w-full rounded-full overflow-hidden bg-gradient-to-br from-indigo-100 to-blue-100 dark:from-indigo-900 dark:to-blue-900 border border-indigo-200 dark:border-indigo-800">
                      <img src={selectedFarmer.photo_url || dynamicFarmerAvatar(selectedFarmer.name)} alt={selectedFarmer.name} className="h-full w-full object-cover" />
                    </div>
                  </div>
                  {isManagerOrAdmin && (
                    <Button onClick={() => { setSelectedFarmer(null); openEdit(selectedFarmer); }} size="sm" className="bg-indigo-600 text-white hover:bg-indigo-700 shadow-md rounded-full px-4 mb-2">
                      <Pencil className="mr-2 h-3.5 w-3.5" />{t("common.edit")}
                    </Button>
                  )}
                </div>
                
                <div className="mt-3">
                  <DialogTitle className="text-2xl font-serif font-bold text-foreground">{selectedFarmer.name}</DialogTitle>
                  {selectedFarmer.cnic && (
                    <div className="inline-flex items-center gap-1.5 mt-1 bg-muted/50 px-2 py-0.5 rounded text-sm text-muted-foreground font-mono">
                      <CreditCard className="h-3.5 w-3.5" /> {selectedFarmer.cnic}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 pt-2 space-y-4 max-h-[50vh] overflow-y-auto">
                {/* Financial Highlight */}
                <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 p-5 flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><BadgeDollarSign className="h-4 w-4"/> {t("farmers.initialBalance")}</p>
                    <p className="text-3xl font-bold font-mono text-emerald-700 dark:text-emerald-300">₨ {Number(selectedFarmer.initial_balance).toLocaleString()}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Wallet className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-muted/30 p-4 border border-border/50">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1.5"><Phone className="h-3 w-3"/> {t("common.phone")}</p>
                    <p className="text-sm font-medium text-foreground break-all">{selectedFarmer.phone || "—"}</p>
                  </div>
                  <div className="rounded-2xl bg-muted/30 p-4 border border-border/50">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1.5"><Home className="h-3 w-3"/> {t("farmers.landlord")}</p>
                    <p className="text-sm font-medium text-foreground">{selectedFarmer.landlord || "—"}</p>
                  </div>
                </div>
                
                <div className="rounded-2xl bg-muted/30 p-4 border border-border/50">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1.5"><MapPin className="h-3 w-3"/> {t("common.address")}</p>
                  <p className="text-sm font-medium text-foreground">{selectedFarmer.address || "—"}</p>
                </div>

                {selectedFarmer.farm_details && (
                  <div className="rounded-2xl bg-muted/30 p-4 border border-border/50">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1.5"><Leaf className="h-3 w-3"/> {t("farmers.farmDetails")}</p>
                    <p className="text-sm text-foreground/90 leading-relaxed">{selectedFarmer.farm_details}</p>
                  </div>
                )}
                
                {selectedFarmer.notes && (
                  <div className="rounded-2xl bg-amber-500/5 p-4 border border-amber-500/20">
                    <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><StickyNote className="h-3 w-3"/> {t("farmers.notes")}</p>
                    <p className="text-sm text-foreground/90 leading-relaxed italic">{selectedFarmer.notes}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-2xl">
          <DialogHeader className="px-6 py-5 bg-muted/30 border-b">
            <DialogTitle className="font-serif text-2xl flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <Pencil className="h-5 w-5" />
              {t("farmers.editFarmer")}
            </DialogTitle>
            <DialogDescription>{t("farmers.updateDetails")}</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-2">
            {renderFarmerFormFields(editForm, setEditForm)}
          </div>
          <DialogFooter className="p-6 bg-muted/30 border-t mt-auto gap-2 sm:gap-0">
            <Button variant="outline" className="rounded-xl h-11" onClick={() => setEditOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleUpdate} disabled={!editForm.name} className="h-11 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold shadow-lg rounded-xl">{t("farmers.updateFarmer")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Farmers;
