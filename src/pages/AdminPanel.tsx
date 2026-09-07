import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, KeyRound, Shield, Users, UserPlus, Crown, Search, Sparkles, UserCog } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserWithRole {
  profile: Tables<"profiles">;
  role: Tables<"user_roles">;
}

const AdminPanel = () => {
  const { isAdmin, user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [resetPwOpen, setResetPwOpen] = useState(false);
  const [resetPwUserId, setResetPwUserId] = useState("");
  const [resetPwName, setResetPwName] = useState("");
  const [resetPwValue, setResetPwValue] = useState("");
  const [resettingPw, setResettingPw] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: "", password: "", full_name: "", role: "staff" as AppRole,
    can_create: false, can_edit: false, can_delete: false,
  });

  const fetchUsers = async () => {
    const [profilesRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("user_roles").select("*"),
    ]);
    if (profilesRes.data && rolesRes.data) {
      const merged = profilesRes.data.map((p) => ({
        profile: p,
        role: rolesRes.data.find((r) => r.user_id === p.user_id) as Tables<"user_roles">,
      })).filter((u) => u.role);
      setUsers(merged);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const updateRole = async (userId: string, field: string, value: any) => {
    const { error } = await supabase.from("user_roles").update({ [field]: value }).eq("user_id", userId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Updated" }); fetchUsers(); }
  };

  const handleCreateUser = async () => {
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: { action: "create", email: form.email, password: form.password, full_name: form.full_name, role: form.role, can_create: form.can_create, can_edit: form.can_edit, can_delete: form.can_delete },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "User created successfully!" });
      setCreateOpen(false);
      setForm({ email: "", password: "", full_name: "", role: "staff", can_create: false, can_edit: false, can_delete: false });
      fetchUsers();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setCreating(false); }
  };

  const handleDeleteUser = async (userId: string) => {
    setDeletingId(userId);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", { body: { action: "delete", user_id: userId } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "User deleted" });
      // Optimistic UI: remove immediately
      setUsers((prev) => prev.filter((x) => x.profile.user_id !== userId));
      fetchUsers();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setDeletingId(null); }
  };

  const handleResetPassword = async () => {
    if (resetPwValue.length < 6) { toast({ title: "Password must be at least 6 characters", variant: "destructive" }); return; }
    setResettingPw(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", { body: { action: "reset_password", user_id: resetPwUserId, new_password: resetPwValue } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Password reset successfully!" }); setResetPwOpen(false); setResetPwValue("");
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setResettingPw(false); }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Shield className="h-12 w-12 text-muted-foreground/50" />
        <p className="text-muted-foreground">{t("admin.accessDenied")}</p>
      </div>
    );
  }

  const filteredUsers = users.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (u.profile.full_name || "").toLowerCase().includes(q) || (u.profile.email || "").toLowerCase().includes(q);
  });

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role.role === "admin").length,
    managers: users.filter(u => u.role.role === "manager").length,
    active: users.filter(u => u.role.is_active).length,
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-indigo-600 via-primary to-blue-500 p-5 sm:p-8 text-primary-foreground shadow-2xl shadow-primary/30">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-card/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-10 w-72 h-72 rounded-full bg-blue-300/20 blur-3xl" />
        <div className="absolute top-4 right-4 opacity-20">
          <Sparkles className="h-24 w-24" />
        </div>
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-lg bg-card/15 backdrop-blur-md border border-white/20 shadow-inner">
              <Crown className="h-7 w-7 sm:h-8 sm:w-8" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight">{t("admin.title")}</h1>
              <p className="text-primary-foreground/80 text-sm mt-1 flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" /> {t("admin.subtitle")}
              </p>
            </div>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-card text-primary hover:bg-card/95 font-semibold shadow-xl shadow-black/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl rounded-xl h-11 px-5">
                <UserPlus className="mr-2 h-4 w-4" /> {t("admin.createUser")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" /> {t("admin.createNewUser")}</DialogTitle>
                <DialogDescription>{t("admin.enterCredentials")}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>{t("admin.fullName")}</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Ahmed Khan" className="h-11" /></div>
                <div className="space-y-2"><Label>{t("admin.email")} *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="user@example.com" className="h-11" /></div>
                <div className="space-y-2"><Label>{t("admin.password")} *</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" className="h-11" /></div>
                <div className="space-y-2">
                  <Label>{t("admin.role")}</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as AppRole })}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label>{t("admin.permissions")}</Label>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 text-sm"><Switch checked={form.can_create} onCheckedChange={(v) => setForm({ ...form, can_create: v })} />{t("admin.create")}</label>
                    <label className="flex items-center gap-2 text-sm"><Switch checked={form.can_edit} onCheckedChange={(v) => setForm({ ...form, can_edit: v })} />{t("common.edit")}</label>
                    <label className="flex items-center gap-2 text-sm"><Switch checked={form.can_delete} onCheckedChange={(v) => setForm({ ...form, can_delete: v })} />{t("common.delete")}</label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>{t("common.cancel")}</Button>
                <Button onClick={handleCreateUser} disabled={creating || !form.email || !form.password} className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-lg shadow-primary/20 rounded-xl">
                  {creating ? t("admin.creating") : t("admin.createUser")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats — 4 colorful tiles */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Users", value: stats.total, icon: Users, from: "from-indigo-500", to: "to-blue-500", text: "text-indigo-600" },
          { label: "Admins", value: stats.admins, icon: Crown, from: "from-amber-500", to: "to-orange-500", text: "text-amber-600" },
          { label: "Managers", value: stats.managers, icon: UserCog, from: "from-emerald-500", to: "to-teal-500", text: "text-emerald-600" },
          { label: "Active", value: stats.active, icon: Sparkles, from: "from-pink-500", to: "to-rose-500", text: "text-pink-600" },
        ].map((s) => (
          <Card key={s.label} className="overflow-hidden border-border/50 bg-card hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 group">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${s.from} ${s.to} shadow-md group-hover:scale-110 transition-transform`}>
                <s.icon className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className={`text-2xl font-bold font-mono ${s.text}`}>{s.value}</p>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide truncate">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* User Management */}
      <Card className="overflow-hidden shadow-xl border-border/50">
        <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-primary to-blue-500" />
        <CardHeader className="gap-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> {t("admin.userManagement")}</CardTitle>
              <CardDescription>{t("admin.subtitle")}</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className="pl-9 h-10 rounded-xl" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-border">
            {filteredUsers.map((u) => (
              <div key={u.profile.user_id} className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-xs font-bold">
                      {(u.profile.full_name || u.profile.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{u.profile.full_name || "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.profile.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" onClick={() => {
                      setResetPwUserId(u.profile.user_id);
                      setResetPwName(u.profile.full_name || u.profile.email);
                      setResetPwOpen(true);
                    }}><KeyRound className="h-3.5 w-3.5" /></Button>
                    {u.profile.user_id !== user?.id && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>{t("admin.deleteUser")}</AlertDialogTitle><AlertDialogDescription>{t("admin.deleteUserConfirm")}</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteUser(u.profile.user_id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("common.delete")}</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={u.role.role} onValueChange={(v) => updateRole(u.profile.user_id, "role", v)}>
                    <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                  <label className="flex items-center gap-1.5 text-xs"><Switch checked={u.role.is_active} onCheckedChange={(v) => updateRole(u.profile.user_id, "is_active", v)} />{t("admin.active")}</label>
                </div>
                <div className="flex items-center gap-3 flex-wrap text-xs">
                  <label className="flex items-center gap-1.5"><Switch checked={u.role.can_create} onCheckedChange={(v) => updateRole(u.profile.user_id, "can_create", v)} />{t("admin.create")}</label>
                  <label className="flex items-center gap-1.5"><Switch checked={u.role.can_edit} onCheckedChange={(v) => updateRole(u.profile.user_id, "can_edit", v)} />{t("common.edit")}</label>
                  <label className="flex items-center gap-1.5"><Switch checked={u.role.can_delete} onCheckedChange={(v) => updateRole(u.profile.user_id, "can_delete", v)} />{t("common.delete")}</label>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>{t("common.name")}</TableHead>
                  <TableHead>{t("admin.email")}</TableHead>
                  <TableHead>{t("admin.role")}</TableHead>
                  <TableHead>{t("admin.create")}</TableHead>
                  <TableHead>{t("common.edit")}</TableHead>
                  <TableHead>{t("common.delete")}</TableHead>
                  <TableHead>{t("admin.active")}</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow key={u.profile.user_id} className="hover:bg-muted/20 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-xs font-bold">
                          {(u.profile.full_name || u.profile.email).charAt(0).toUpperCase()}
                        </div>
                        <p className="font-medium">{u.profile.full_name || "—"}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{u.profile.email}</TableCell>
                    <TableCell>
                      <Select value={u.role.role} onValueChange={(v) => updateRole(u.profile.user_id, "role", v)}>
                        <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell><Switch checked={u.role.can_create} onCheckedChange={(v) => updateRole(u.profile.user_id, "can_create", v)} /></TableCell>
                    <TableCell><Switch checked={u.role.can_edit} onCheckedChange={(v) => updateRole(u.profile.user_id, "can_edit", v)} /></TableCell>
                    <TableCell><Switch checked={u.role.can_delete} onCheckedChange={(v) => updateRole(u.profile.user_id, "can_delete", v)} /></TableCell>
                    <TableCell><Switch checked={u.role.is_active} onCheckedChange={(v) => updateRole(u.profile.user_id, "is_active", v)} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-primary/10 hover:text-primary" onClick={() => {
                          setResetPwUserId(u.profile.user_id);
                          setResetPwName(u.profile.full_name || u.profile.email);
                          setResetPwOpen(true);
                        }}><KeyRound className="h-3.5 w-3.5" /></Button>
                        {u.profile.user_id !== user?.id && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>{t("admin.deleteUser")}</AlertDialogTitle><AlertDialogDescription>{t("admin.deleteUserConfirm")}</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteUser(u.profile.user_id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("common.delete")}</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Reset Password Dialog */}
      <Dialog open={resetPwOpen} onOpenChange={setResetPwOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" /> {t("admin.resetPassword")}</DialogTitle>
            <DialogDescription>{t("admin.newPasswordForUser")}: {resetPwName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{t("admin.password")}</Label>
            <Input type="password" value={resetPwValue} onChange={(e) => setResetPwValue(e.target.value)} placeholder="••••••••" className="h-11" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPwOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleResetPassword} disabled={resettingPw || !resetPwValue} className="bg-gradient-to-r from-chart-3 to-primary">
              {resettingPw ? t("admin.resetting") : t("admin.resetPassword")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPanel;
