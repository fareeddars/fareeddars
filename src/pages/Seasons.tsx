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
import { Plus, Leaf, Lock, Users, CalendarDays, CheckCircle2, ArrowRight, Sprout, Trash2, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";
import { useEffect } from "react";

const Seasons = () => {
  const { user, isAdmin, isManagerOrAdmin } = useAuth();
  const { seasons, activeSeason, selectedSeason, setSelectedSeasonId, farmerSeasons, refreshSeasons, refreshFarmerSeasons } = useSeason();
  const { t } = useLanguage();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [allFarmers, setAllFarmers] = useState<Tables<"farmers">[]>([]);
  const [selectedFarmerIds, setSelectedFarmerIds] = useState<string[]>([]);
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ name: "", start_date: "", end_date: "" });

  const fetchAllFarmers = async () => {
    const { data } = await supabase.from("farmers").select("*").order("name");
    if (data) setAllFarmers(data);
  };

  const handleCreateSeason = async () => {
    if (!user || !form.name || !form.start_date) return;
    if (activeSeason) {
      await supabase.from("seasons").update({ status: "closed" as any }).eq("id", activeSeason.id);
    }
    const { error } = await supabase.from("seasons").insert({
      name: form.name, start_date: form.start_date, end_date: form.end_date || null,
      status: "active" as any, created_by: user.id,
    } as any);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: t("seasons.created") }); setForm({ name: "", start_date: "", end_date: "" }); setCreateOpen(false); await refreshSeasons(); }
  };

  const handleCloseSeason = async (seasonId: string) => {
    const { error } = await supabase.from("seasons").update({ status: "closed" as any }).eq("id", seasonId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: t("seasons.closed") }); await refreshSeasons(); }
  };

  const handleReopenSeason = async (seasonId: string) => {
    // Close any currently active season first
    if (activeSeason) {
      await supabase.from("seasons").update({ status: "closed" as any }).eq("id", activeSeason.id);
    }
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
    // First delete associated farmer_seasons, then the season itself
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
    <div className="space-y-6">
      {/* Page Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-6 sm:p-8 text-primary-foreground shadow-xl shadow-primary/20">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-primary-foreground/5 -translate-y-1/2 translate-x-1/4 blur-2xl" />
        <div className="absolute bottom-0 left-1/3 w-32 h-32 rounded-full bg-primary-foreground/10 translate-y-1/2 blur-xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-foreground/15 backdrop-blur-md border border-primary-foreground/10">
              <Sprout className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight">{t("seasons.title")}</h1>
              <p className="text-primary-foreground/70 text-sm mt-0.5">{t("seasons.subtitle")}</p>
            </div>
          </div>
          {isAdmin && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-semibold shadow-lg shadow-black/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl rounded-xl">
                  <Plus className="mr-2 h-4 w-4" />{t("seasons.createSeason")}
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] sm:w-full max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-serif">{t("seasons.createSeason")}</DialogTitle>
                  <DialogDescription>{t("seasons.createDescription")}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t("common.name")} *</Label>
                    <Input className="h-11" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("seasons.namePlaceholder")} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>{t("seasons.startDate")} *</Label><Input type="date" className="h-11" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
                    <div className="space-y-2"><Label>{t("seasons.endDate")}</Label><Input type="date" className="h-11" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
                  </div>
                  {activeSeason && (
                    <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-700 dark:text-amber-400">
                      ⚠️ {t("seasons.activeWillClose")} <strong>{activeSeason.name}</strong>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button onClick={handleCreateSeason} disabled={!form.name || !form.start_date} className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-lg shadow-primary/20 rounded-xl">
                    {t("seasons.createSeason")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Season Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {seasons.map((season, i) => {
          const isSelected = selectedSeason?.id === season.id;
          const isActive = season.status === "active";
          return (
            <Card
              key={season.id}
              className={`cursor-pointer transition-all duration-500 hover:shadow-xl hover:-translate-y-1 overflow-hidden animate-fade-in ${
                isSelected ? "ring-2 ring-primary shadow-xl" : "hover:shadow-lg"
              } ${isActive ? "border-primary/30" : "border-border/50 opacity-75"}`}
              style={{ animationDelay: `${i * 80}ms` }}
              onClick={() => setSelectedSeasonId(season.id)}
            >
              <div className={`h-1.5 ${isActive ? "bg-gradient-to-r from-primary to-primary/70" : "bg-muted"}`} />
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl shadow-md ${isActive ? "bg-gradient-to-br from-primary to-primary/70 text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      <Leaf className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">{season.name}</h3>
                      <p className="text-xs text-muted-foreground">{season.start_date}{season.end_date ? ` → ${season.end_date}` : ""}</p>
                    </div>
                  </div>
                  <Badge variant={isActive ? "default" : "secondary"} className={isActive ? "bg-chart-5/15 text-chart-5 border-chart-5/30" : ""}>
                    {isActive ? t("seasons.active") : t("seasons.closedStatus")}
                  </Badge>
                </div>
                {isSelected && isActive && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
                    {isManagerOrAdmin && (
                      <Button size="sm" className="flex-1 text-xs bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-md rounded-xl" onClick={(e) => { e.stopPropagation(); openAssignDialog(); }}>
                        <Users className="h-3 w-3 mr-1" />{t("seasons.addFarmers")}
                      </Button>
                    )}
                    {isAdmin && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" className="text-xs border-destructive/30 text-destructive hover:bg-destructive/10" onClick={(e) => e.stopPropagation()}>
                            <Lock className="h-3 w-3 mr-1" />{t("seasons.closeSeason")}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>{t("seasons.closeConfirmTitle")}</AlertDialogTitle><AlertDialogDescription>{t("seasons.closeConfirmDesc")}</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleCloseSeason(season.id)} className="bg-destructive text-destructive-foreground">{t("seasons.closeSeason")}</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                )}
                {isSelected && !isActive && isAdmin && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" className="text-xs bg-chart-5/15 text-chart-5 hover:bg-chart-5/20 border border-chart-5/30 font-semibold rounded-xl" onClick={(e) => e.stopPropagation()}>
                          <RotateCcw className="h-3 w-3 mr-1" />{t("seasons.reopenSeason")}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>{t("seasons.reopenConfirmTitle")}</AlertDialogTitle><AlertDialogDescription>{t("seasons.reopenConfirmDesc")}</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleReopenSeason(season.id)} className="bg-primary text-primary-foreground">{t("seasons.reopenSeason")}</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" className="text-xs border-destructive/30 text-destructive hover:bg-destructive/10" onClick={(e) => e.stopPropagation()}>
                          <Trash2 className="h-3 w-3 mr-1" />{t("seasons.deleteSeason")}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>{t("seasons.deleteConfirmTitle")}</AlertDialogTitle><AlertDialogDescription>{t("seasons.deleteConfirmDesc")}</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteSeason(season.id)} className="bg-destructive text-destructive-foreground">{t("seasons.deleteSeason")}</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
                {isSelected && isAdmin && isActive && (
                  <div className="flex gap-2 mt-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" className="text-xs border-destructive/30 text-destructive hover:bg-destructive/10" onClick={(e) => e.stopPropagation()}>
                          <Trash2 className="h-3 w-3 mr-1" />{t("seasons.deleteSeason")}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>{t("seasons.deleteConfirmTitle")}</AlertDialogTitle><AlertDialogDescription>{t("seasons.deleteConfirmDesc")}</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteSeason(season.id)} className="bg-destructive text-destructive-foreground">{t("seasons.deleteSeason")}</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {seasons.length === 0 && (
          <div className="col-span-full text-center py-16 text-muted-foreground">
            <Sprout className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="font-medium">{t("seasons.noSeasons")}</p>
            <p className="text-sm">{t("seasons.createFirst")}</p>
          </div>
        )}
      </div>

      {/* Selected Season's Farmers */}
      {selectedSeason && (
        <Card className="shadow-xl border-border/50 overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-primary to-primary/70" />
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-serif flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {t("seasons.seasonFarmers")} — {selectedSeason.name}
              <Badge variant="outline" className="ml-auto border-primary/30 text-primary">{farmerSeasons.length} {t("seasons.farmers")}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {farmerSeasons.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {farmerSeasons.map((fs) => (
                  <div key={fs.id} className={`rounded-xl border p-4 transition-all duration-300 hover:shadow-md ${
                    fs.status === "left" ? "opacity-60 border-destructive/30 bg-destructive/5" :
                    fs.status === "completed" ? "border-primary/30 bg-primary/5" : "border-border hover:border-primary/20 hover:-translate-y-0.5"
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-xs font-bold">
                          {fs.farmers?.name?.charAt(0) || "?"}
                        </div>
                        <span className="font-semibold text-foreground">{fs.farmers?.name || "—"}</span>
                      </div>
                      <Badge variant="outline" className={`text-[10px] ${
                        fs.status === "active" ? "border-chart-5/30 text-chart-5" :
                        fs.status === "left" ? "border-destructive/30 text-destructive" : "border-muted-foreground/30"
                      }`}>
                        {fs.status === "active" ? t("seasons.active") : fs.status === "left" ? t("seasons.left") : t("seasons.completed")}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground font-mono">{t("farmers.balance")}: ₨ {Number(fs.opening_balance).toLocaleString()}</p>
                    {fs.status === "active" && selectedSeason.status === "active" && isManagerOrAdmin && (
                      <Button size="sm" variant="ghost" className="mt-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleFarmerLeave(fs.id)}>
                        {t("seasons.markLeft")}
                      </Button>
                    )}
                    {fs.status === "left" && selectedSeason.status === "active" && isManagerOrAdmin && (
                      <Button size="sm" variant="ghost" className="mt-2 text-xs text-chart-5 hover:text-chart-5 hover:bg-chart-5/10" onClick={() => handleFarmerReactivate(fs.id)}>
                        <RotateCcw className="h-3 w-3 mr-1" />{t("seasons.markActive")}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">{t("seasons.noFarmersInSeason")}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Assign Farmers Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="w-[95vw] sm:w-full max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">{t("seasons.addFarmers")}</DialogTitle>
            <DialogDescription>{t("seasons.selectFarmersDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {allFarmers.map((farmer) => {
              const alreadyAssigned = farmerSeasons.some((fs) => fs.farmer_id === farmer.id);
              const isChecked = selectedFarmerIds.includes(farmer.id);
              return (
                <div key={farmer.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  alreadyAssigned ? "bg-muted/50 border-muted" : isChecked ? "bg-primary/5 border-primary/30" : "border-border hover:border-primary/20"
                }`}>
                  <Checkbox checked={isChecked} disabled={alreadyAssigned} onCheckedChange={() => toggleFarmer(farmer.id)} />
                  <div className="flex-1">
                    <span className="font-medium text-sm">{farmer.name}</span>
                    {alreadyAssigned && <span className="ml-2 text-xs text-muted-foreground">({t("seasons.alreadyAssigned")})</span>}
                  </div>
                  {isChecked && !alreadyAssigned && (
                    <Input type="number" placeholder="₨ 0" className="w-24 h-8 text-xs" value={balances[farmer.id] || ""} onChange={(e) => setBalances({ ...balances, [farmer.id]: e.target.value })} />
                  )}
                </div>
              );
            })}
            {allFarmers.length === 0 && <p className="text-center text-muted-foreground py-4">{t("farmers.noFarmers")}</p>}
          </div>
          <DialogFooter>
            <Button onClick={handleAssignFarmers} className="w-full h-11 bg-gradient-to-r from-chart-4 to-chart-3">
              {t("seasons.assignSelected")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Seasons;
