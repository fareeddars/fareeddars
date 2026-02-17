import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserWithRole {
  profile: Tables<"profiles">;
  role: Tables<"user_roles">;
}

const AdminPanel = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);

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
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Updated" });
      fetchUsers();
    }
  };

  if (!isAdmin) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Access denied. Admin only.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-foreground">Admin Panel</h1>
        <p className="text-muted-foreground">Manage users, roles, and permissions</p>
      </div>

      <Card>
        <CardHeader><CardTitle>User Management</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Create</TableHead>
                <TableHead>Edit</TableHead>
                <TableHead>Delete</TableHead>
                <TableHead>Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.profile.user_id}>
                  <TableCell className="font-medium">{u.profile.full_name || "—"}</TableCell>
                  <TableCell>{u.profile.email}</TableCell>
                  <TableCell>
                    <Select value={u.role.role} onValueChange={(v) => updateRole(u.profile.user_id, "role", v)}>
                      <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPanel;
