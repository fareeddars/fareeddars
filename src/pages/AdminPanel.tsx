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
import { Plus, Trash2, KeyRound, Shield, Users, UserPlus, Crown } from "lucide-react";
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
  const [createOpen, setCreateOpen] = useState(false);
  const [resetPwOpen, setResetPwOpen] = useState(false);
  const [resetPwUserId, setResetPwUserId] = useState("");
  const [resetPwName, setResetPwName] = useState("");
  const [resetPwValue, setResetPwValue] = useState("");
  const [resettingPw, setResettingPw] = useState(false);
  const [creating, setCreating] = useState(false);
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
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", { body: { action: "delete", user_id: userId } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "User deleted" }); fetchUsers();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
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

  return (
    <div className="space-y-6">
      {/* Page Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-6 sm:p-8 text-primary-foreground shadow-xl shadow-primary/20">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-primary-foreground/5 -translate-y-1/2 translate-x-1/4 blur-2xl" />
        <div className="absolute bottom-0 left-1/3 w-32 h-32 rounded-full bg-primary-foreground/10 translate-y-1/2 blur-xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-foreground/15 backdrop-blur-md border border-primary-foreground/10">
              <Crown className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight">{t("admin.title")}</h1>
              <p className="text-primary-foreground/70 text-sm mt-0.5">{t("admin.subtitle")}</p>
            </div>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-semibold shadow-lg shadow-black/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl rounded-xl">
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

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-md">
              <Users className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono text-primary">{users.length}</p>
              <p className="text-xs text-muted-foreground">Total Users</p>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-chart-3/20 bg-gradient-to-br from-chart-3/10 to-chart-3/5 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-chart-3 to-chart-3/70 shadow-md">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono text-chart-3">{users.filter(u => u.role.role === "admin").length}</p>
              <p className="text-xs text-muted-foreground">Admins</p>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1 overflow-hidden border-chart-5/20 bg-gradient-to-br from-chart-5/10 to-chart-5/5 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-chart-5 to-chart-5/70 shadow-md">
              <Users className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono text-chart-5">{users.filter(u => u.role.is_active).length}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Table */}
      <Card className="overflow-hidden shadow-xl border-border/50">
        <div className="h-1.5 bg-gradient-to-r from-primary to-primary/70" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> {t("admin.userManagement")}</CardTitle>
          <CardDescription>{t("admin.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>{t("common.name")}</TableHead>
                <TableHead className="hidden sm:table-cell">{t("admin.email")}</TableHead>
                <TableHead>{t("admin.role")}</TableHead>
                <TableHead className="hidden sm:table-cell">{t("admin.create")}</TableHead>
                <TableHead className="hidden sm:table-cell">{t("common.edit")}</TableHead>
                <TableHead className="hidden sm:table-cell">{t("common.delete")}</TableHead>
                <TableHead>{t("admin.active")}</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.profile.user_id} className="hover:bg-muted/20 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-xs font-bold">
                        {(u.profile.full_name || u.profile.email).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{u.profile.full_name || "—"}</p>
                        <p className="text-xs text-muted-foreground sm:hidden">{u.profile.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm">{u.profile.email}</TableCell>
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
                  <TableCell className="hidden sm:table-cell"><Switch checked={u.role.can_create} onCheckedChange={(v) => updateRole(u.profile.user_id, "can_create", v)} /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Switch checked={u.role.can_edit} onCheckedChange={(v) => updateRole(u.profile.user_id, "can_edit", v)} /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Switch checked={u.role.can_delete} onCheckedChange={(v) => updateRole(u.profile.user_id, "can_delete", v)} /></TableCell>
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
