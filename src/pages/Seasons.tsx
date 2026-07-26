import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSeason } from "@/contexts/SeasonContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Leaf, Lock, Users, CheckCircle2, ArrowRight, Sprout, Trash2, RotateCcw } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import FarmerAvatar from "@/components/FarmerAvatar";

const Seasons = () => {
  const { user, isAdmin, isManagerOrAdmin } = useAuth();
  const { seasons, selectedSeason, setSelectedSeasonId, farmerSeasons, refreshSeasons, refreshFarmerSeasons } = useSeason();
  const { t } = useLanguage();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [allFarmers, setAllFarmers] = useState<Tables<"farmers">[]>([]);
  const [selectedFarmerIds, setSelectedFarmerIds] = useState<string[]>([]);
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ name: "", start_date: "", end_date: "" });

  const getSeasonBackground = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("cotton") || n.includes("kapas")) return "/cotton-bg.jpg";
    if (n.includes("wheat") || n.includes("gandum")) return "/wheat-bg.jpg";
    if (n.includes("sugarcane") || n.includes("kamad")) return "/sugarcane-bg.jpg";
    return "/default-farm-bg.jpg";
  };

  const fetchAllFarmers = async () => {
    const { data } = await supabase.from("farmers").select("*").order("name");
    if (data) setAllFarmers(data);
  };

  const handleCreateSeason = async () => {
    if (!user || !form.name || !form.start_date) return;
    const { data, error } = await supabase.from("seasons").insert({
      name: form.name, start_date: form.start_date, end_date: form.end_date || null,
      status: "active" as any, created_by: user.id,
    } as any).select("id").single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: t("seasons.created") }); setForm({ name: "", start_date: "", end_date: "" }); setCreateOpen(false); if (data?.id) setSelectedSeasonId(data.id); await refreshSeasons(); }
  };

  const handleCloseSeason = async (seasonId: string) => {
    const { error } = await supabase.from("seasons").update({ status: "closed" as any }).eq("id", seasonId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: t("seasons.closed") }); await refreshSeasons(); }
  };

  const handleReopenSeason = async (seasonId: string) => {
    const { error } = await supabase.from("seasons").update({ status: "active" as any }).eq("id", seasonId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: t("seasons.reopened") }); await refreshSeasons(); }
  };

  const openAssignDialog = async () => {
    await fetchAllFarmers();
    const alreadyAssigned = farmerSeasons.map((fs) => fs.farmer_id);
    setSelectedFarmerIds(alreadyAssigned);
    setBalances({});
    setAssignOpen(true);
  };

  const toggleFarmer = (id: string) => {
    setSelectedFarmerIds((prev) => prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]);
  };

  const handleAssignFarmers = async () => {
    if (!user || !selectedSeason) return;
    const alreadyAssigned = farmerSeasons.map((fs) => fs.farmer_id);
    const toAdd = selectedFarmerIds.filter((id) => !alreadyAssigned.includes(id));
    if (toAdd.length > 0) {
      const inserts = toAdd.map((farmer_id) => ({
        farmer_id, season_id: selectedSeason.id,
        opening_balance: Number(balances[farmer_id] || 0), created_by: user.id,
      }));
      const { error } = await supabase.from("farmer_seasons").insert(inserts as any);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    }
    toast({ title: t("seasons.farmersAssigned") });
    setAssignOpen(false);
    await refreshFarmerSeasons();
  };

  const handleFarmerLeave = async (farmerSeasonId: string) => {
    const { error } = await supabase.from("farmer_seasons").update({ status: "left" as any }).eq("id", farmerSeasonId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: t("seasons.farmerLeft") }); await refreshFarmerSeasons(); }
  };

  const handleFarmerReactivate = async (farmerSeasonId: string) => {
    const { error } = await supabase.from("farmer_seasons").update({ status: "active" as any }).eq("id", farmerSeasonId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: t("seasons.farmerActivated") }); await refreshFarmerSeasons(); }
  };

  const handleDeleteSeason = async (seasonId: string) => {
    await supabase.from("farmer_seasons").delete().eq("season_id", seasonId);
    await supabase.from("ledger_entries").delete().eq("season_id", seasonId);
    await supabase.from("expense_categories").delete().eq("season_id", seasonId);
    const { error } = await supabase.from("seasons").delete().eq("id", seasonId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else {
      toast({ title: t("seasons.deleted") });
      if (selectedSeason?.id === seasonId) setSelectedSeasonId(null);
      await refreshSeasons();
    }
  };


  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-700">
      
      {/* --- Premium Page Header Banner --- */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 p-4 sm:p-10 text-primary-foreground shadow-2xl border border-emerald-700/50">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full bg-emerald-400/10 -translate-y-1/2 translate-x-1/3 blur-[60px] animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[200px] h-[200px] rounded-full bg-teal-400/10 translate-y-1/3 -translate-x-1/4 blur-[50px]" />
        
        <div className="relative z-10 flex flex-col gap-4 sm:gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5">
            <div className="hidden sm:flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 shadow-inner">
              <Sprout className="h-8 w-8 text-emerald-100" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-4xl font-serif font-bold tracking-tight text-white drop-shadow-sm">
                {t("seasons.title")}
              </h1>
              <p className="text-emerald-100/80 text-xs sm:text-sm mt-1 font-medium tracking-wide">
                {t("seasons.subtitle")}
              </p>
            </div>
          </div>
          
          {isAdmin && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-white text-emerald-900 hover:bg-white/90 font-bold shadow-xl shadow-black/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl rounded-xl h-11 sm:h-12 px-6 w-full sm:w-auto text-sm">
                  <Plus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />{t("seasons.createSeason")}
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] sm:w-full max-w-md rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="font-serif text-2xl flex items-center gap-2">
                    <Sprout className="h-6 w-6 text-emerald-600" />
                    {t("seasons.createSeason")}
                  </DialogTitle>
                  <DialogDescription>{t("seasons.createDescription")}</DialogDescription>
                </DialogHeader>
                <div className="space-y-5 py-4">
                  <div className="space-y-2">
                    <Label className="text-foreground/80">{t("common.name")} *</Label>
                    <Input className="h-12 bg-muted/50 rounded-xl" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("seasons.namePlaceholder")} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-foreground/80">{t("seasons.startDate")} *</Label>
                      <Input type="date" className="h-12 bg-muted/50 rounded-xl" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground/80">{t("seasons.endDate")}</Label>
                      <Input type="date" className="h-12 bg-muted/50 rounded-xl" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleCreateSeason} disabled={!form.name || !form.start_date} className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold shadow-lg rounded-xl transition-all">
                    {t("seasons.createSeason")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* --- Premium Season Cards --- */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
        {seasons.map((season, i) => {
          const isSelected = selectedSeason?.id === season.id;
          const isActive = season.status === "active";
          
          return (
            <Card
              key={season.id}
              className={`cursor-pointer group relative overflow-hidden transition-all duration-500 hover:-translate-y-1.5 animate-fade-in ${
                isSelected 
                  ? "ring-2 ring-emerald-500 shadow-2xl shadow-emerald-500/20" 
                  : "hover:shadow-xl shadow-sm border-border/50"
              } ${isActive ? "border-emerald-500/30" : "opacity-80 hover:opacity-100"}`}
              style={{
                animationDelay: `${i * 100}ms`,
                backgroundImage: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(${getSeasonBackground(season.name)})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
              onClick={() => setSelectedSeasonId(season.id)}
            >
              {/* Top Accent Bar */}
              <div className={`h-1.5 w-full ${isActive ? "bg-gradient-to-r from-emerald-400 to-teal-500" : "bg-slate-300 dark:bg-slate-700"}`} />
              
              <CardContent className="p-3 sm:p-6 relative z-10">
                <div className="flex items-start justify-between gap-1 sm:gap-2.5 mb-2 sm:mb-3">
                  <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
                    <div className={`flex h-8 w-8 sm:h-12 sm:w-12 items-center justify-center rounded-lg sm:rounded-2xl shadow-md transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 shrink-0 ${
                      isActive 
                        ? "bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-700 dark:from-emerald-900/50 dark:to-teal-900/50 dark:text-emerald-400" 
                        : "bg-white/90 text-emerald-800"
                    }`}>
                      <Leaf className="h-4 w-4 sm:h-6 sm:w-6" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-lg font-bold text-white font-serif tracking-tight drop-shadow-sm truncate">{season.name}</h3>
                      <p className="text-[10px] sm:text-xs text-white/80 font-medium mt-0.5 truncate">
                        {season.start_date} {season.end_date ? `→ ${season.end_date}` : ""}
                      </p>
                    </div>
                  </div>
                  <Badge variant={isActive ? "default" : "secondary"} className={`font-semibold text-[8px] sm:text-xs shrink-0 ${isActive ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30 dark:bg-emerald-500/20 shadow-sm" : ""}`}>
                    {isActive ? t("seasons.active") : t("seasons.closedStatus")}
                  </Badge>
                </div>

                {/* Actions Area */}
                {isSelected && (
                  <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-border/40 flex flex-col gap-1.5 sm:gap-2 animate-in slide-in-from-top-2 duration-300">
                    {isActive ? (
                      <>
                        {isManagerOrAdmin && (
                          <Button size="sm" className="flex-1 text-[10px] sm:text-xs bg-emerald-600 text-white hover:bg-emerald-700 font-semibold shadow-md rounded-lg sm:rounded-xl h-7 sm:h-9" onClick={(e) => { e.stopPropagation(); openAssignDialog(); }}>
                            <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-1.5" />{t("seasons.addFarmers")}
                          </Button>
                        )}
                        {isAdmin && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline" className="flex-1 text-[10px] sm:text-xs border-amber-500/30 text-amber-600 hover:bg-amber-500/10 hover:text-amber-700 rounded-lg sm:rounded-xl h-7 sm:h-9" onClick={(e) => e.stopPropagation()}>
                                <Lock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-1.5" />{t("seasons.closeSeason")}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-2xl">
                              <AlertDialogHeader><AlertDialogTitle>{t("seasons.closeConfirmTitle")}</AlertDialogTitle><AlertDialogDescription>{t("seasons.closeConfirmDesc")}</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-xl">{t("common.cancel")}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleCloseSeason(season.id)} className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl">{t("seasons.closeSeason")}</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                        {isAdmin && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline" className="text-[10px] sm:text-xs border-destructive/30 text-destructive hover:bg-destructive/10 rounded-lg sm:rounded-xl px-2 sm:px-3 h-7 sm:h-9" onClick={(e) => e.stopPropagation()}>
                                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-2xl">
                              <AlertDialogHeader><AlertDialogTitle>{t("seasons.deleteConfirmTitle")}</AlertDialogTitle><AlertDialogDescription>{t("seasons.deleteConfirmDesc")}</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-xl">{t("common.cancel")}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteSeason(season.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl">{t("seasons.deleteSeason")}</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </>
                    ) : (
                      <>
                        {isAdmin && (
                          <>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" className="flex-1 text-[10px] sm:text-xs bg-emerald-600/10 text-emerald-600 hover:bg-emerald-600/20 border border-emerald-600/30 font-semibold rounded-lg sm:rounded-xl h-7 sm:h-9" onClick={(e) => e.stopPropagation()}>
                                  <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-1.5" />{t("seasons.reopenSeason")}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="rounded-2xl">
                                <AlertDialogHeader><AlertDialogTitle>{t("seasons.reopenConfirmTitle")}</AlertDialogTitle><AlertDialogDescription>{t("seasons.reopenConfirmDesc")}</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="rounded-xl">{t("common.cancel")}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleReopenSeason(season.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">{t("seasons.reopenSeason")}</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="outline" className="flex-1 text-[10px] sm:text-xs border-destructive/30 text-destructive hover:bg-destructive/10 rounded-lg sm:rounded-xl h-7 sm:h-9" onClick={(e) => e.stopPropagation()}>
                                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-1.5" />{t("seasons.deleteSeason")}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="rounded-2xl">
                                <AlertDialogHeader><AlertDialogTitle>{t("seasons.deleteConfirmTitle")}</AlertDialogTitle><AlertDialogDescription>{t("seasons.deleteConfirmDesc")}</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="rounded-xl">{t("common.cancel")}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteSeason(season.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl">{t("seasons.deleteSeason")}</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {seasons.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 px-4 text-center bg-card/30 backdrop-blur-sm rounded-3xl border border-dashed border-border/60">
            <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mb-4">
              <Sprout className="h-10 w-10 text-muted-foreground/40" />
            </div>
            <h3 className="text-xl font-bold font-serif mb-1">{t("seasons.noSeasons")}</h3>
            <p className="text-muted-foreground">{t("seasons.createFirst")}</p>
          </div>
        )}
      </div>

      {/* --- Premium Selected Season's Farmers Area --- */}
      {selectedSeason && (
        <div className="space-y-3 sm:space-y-4 animate-in slide-in-from-bottom-4 duration-700">

          {/* Main Farmers Card */}
          <Card className="shadow-2xl border-border/50 overflow-hidden bg-card/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl">
            <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <CardHeader className="pb-3 pt-4 sm:pt-6 px-4 sm:px-6">
              <CardTitle className="text-lg sm:text-2xl font-serif flex items-center gap-2">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600 shrink-0" />
                <span className="truncate">Farmers in {selectedSeason.name}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              {farmerSeasons.length > 0 ? (
                <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-2 xl:grid-cols-3">
                  {farmerSeasons.map((fs) => (
                    <div key={fs.id} className={`group relative rounded-xl sm:rounded-2xl border p-2.5 sm:p-5 transition-all duration-300 hover:shadow-lg bg-background/50 backdrop-blur-sm ${
                      fs.status === "left" ? "opacity-60 border-destructive/30 bg-destructive/5" :
                      fs.status === "completed" ? "border-emerald-500/30 bg-emerald-500/5" : "border-border hover:border-emerald-500/30 hover:-translate-y-1"
                    }`}>
                      <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
                          <FarmerAvatar
                            name={fs.farmers?.name}
                            photoUrl={(fs.farmers as any)?.photo_url}
                            className={`h-7 w-7 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl shadow-sm ${fs.status === 'left' ? 'ring-2 ring-destructive/40' : ''}`}
                          />
                          <div className="min-w-0">
                            <h4 className="font-bold text-xs sm:text-base text-foreground leading-tight truncate">{fs.farmers?.name || "—"}</h4>
                            <Badge variant="outline" className={`mt-0.5 text-[8px] sm:text-[10px] px-1 sm:px-1.5 py-0 shadow-sm ${
                              fs.status === "active" ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/10" :
                              fs.status === "left" ? "border-destructive/30 text-destructive bg-destructive/10" : "border-blue-500/30 text-blue-600 bg-blue-500/10"
                            }`}>
                              {fs.status === "active" ? t("seasons.active") : fs.status === "left" ? t("seasons.left") : t("seasons.completed")}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-1.5 sm:gap-2 mt-1.5 sm:mt-2">
                        {fs.status === "active" && selectedSeason.status === "active" && isManagerOrAdmin && (
                          <Button size="sm" variant="ghost" className="w-full text-[10px] sm:text-xs text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg sm:rounded-xl h-7 sm:h-9" onClick={() => handleFarmerLeave(fs.id)}>
                            {t("seasons.markLeft")}
                          </Button>
                        )}
                        {fs.status === "left" && selectedSeason.status === "active" && isManagerOrAdmin && (
                          <Button size="sm" variant="ghost" className="w-full text-[10px] sm:text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-600/10 rounded-lg sm:rounded-xl h-7 sm:h-9" onClick={() => handleFarmerReactivate(fs.id)}>
                            <RotateCcw className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-1.5" />{t("seasons.markActive")}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 px-4 rounded-2xl bg-muted/20 border border-dashed border-border">
                  <Users className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground font-medium">{t("seasons.noFarmersInSeason")}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Assign Farmers Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="w-[95vw] sm:w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl p-0 overflow-hidden">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
            <DialogTitle className="font-serif text-lg sm:text-2xl flex items-center gap-2">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" />
              {t("seasons.addFarmers")}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">{t("seasons.selectFarmersDesc")}</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-2 space-y-2 sm:space-y-3">
            {allFarmers.map((farmer) => {
              const alreadyAssigned = farmerSeasons.some((fs) => fs.farmer_id === farmer.id);
              const isChecked = selectedFarmerIds.includes(farmer.id);
              return (
                <div key={farmer.id} className={`flex items-center gap-2 sm:gap-4 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border transition-all duration-300 ${
                  alreadyAssigned ? "bg-muted/30 border-muted opacity-60" : isChecked ? "bg-emerald-500/5 border-emerald-500/30 shadow-sm" : "border-border hover:border-emerald-500/20 bg-card hover:shadow-sm"
                }`}>
                  <Checkbox 
                    checked={isChecked} 
                    disabled={alreadyAssigned} 
                    onCheckedChange={() => toggleFarmer(farmer.id)} 
                    className={isChecked ? "data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600" : ""}
                  />
                  <FarmerAvatar name={farmer.name} photoUrl={(farmer as any).photo_url} className="h-9 w-9 sm:h-10 sm:w-10" />
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-xs sm:text-sm block truncate">{farmer.name}</span>
                    {alreadyAssigned && <span className="text-[8px] sm:text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{t("seasons.alreadyAssigned")}</span>}
                  </div>
                  {isChecked && !alreadyAssigned && (
                    <div className="relative shrink-0">
                      <span className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 text-[10px] sm:text-xs font-semibold text-muted-foreground">₨</span>
                      <Input 
                        type="number" 
                        inputMode="decimal" 
                        min="0" 
                        step="0.01" 
                        placeholder="0.00" 
                        className="w-20 sm:w-28 h-8 sm:h-10 text-xs sm:text-sm font-mono pl-5 sm:pl-7 rounded-lg sm:rounded-xl bg-background" 
                        value={balances[farmer.id] || ""} 
                        onChange={(e) => setBalances({ ...balances, [farmer.id]: e.target.value })} 
                      />
                    </div>
                  )}
                </div>
              );
            })}
            {allFarmers.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-muted-foreground">{t("farmers.noFarmers")}</p>
              </div>
            )}
          </div>
          <DialogFooter className="p-4 sm:p-6 bg-muted/20 mt-auto border-t">
            <Button onClick={handleAssignFarmers} className="w-full h-10 sm:h-12 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold shadow-lg rounded-xl text-sm sm:text-base transition-all">
              {t("seasons.assignSelected")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Seasons;
