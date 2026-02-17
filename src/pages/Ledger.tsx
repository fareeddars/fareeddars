import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

const Ledger = () => {
  const { user, canCreate } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = useState<(Tables<"ledger_entries"> & { farmers?: { name: string } | null })[]>([]);
  const [farmers, setFarmers] = useState<Tables<"farmers">[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    farmer_id: "", entry_type: "expense" as string, description: "", amount: "",
    quantity: "", rate: "", net_weight: "", is_shared: false,
  });

  const fetchData = async () => {
    const [entriesRes, farmersRes] = await Promise.all([
      supabase.from("ledger_entries").select("*, farmers(name)").order("created_at", { ascending: false }),
      supabase.from("farmers").select("*"),
    ]);
    if (entriesRes.data) setEntries(entriesRes.data);
    if (farmersRes.data) setFarmers(farmersRes.data);
  };

  useEffect(() => { fetchData(); }, []);

  const computedAmount = () => {
    if (form.entry_type === "sale" && form.net_weight && form.rate) {
      return Number(form.net_weight) * Number(form.rate);
    }
    return Number(form.amount) || 0;
  };

  const handleSave = async () => {
    if (!user) return;
    const amount = computedAmount();
    const sharedAmount = form.is_shared ? amount / 2 : null;

    const { error } = await supabase.from("ledger_entries").insert({
      farmer_id: form.farmer_id,
      entry_type: form.entry_type,
      description: form.description,
      amount,
      quantity: form.quantity ? Number(form.quantity) : null,
      rate: form.rate ? Number(form.rate) : null,
      net_weight: form.net_weight ? Number(form.net_weight) : null,
      is_shared: form.is_shared,
      shared_amount: sharedAmount,
      created_by: user.id,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Entry added" });
      setOpen(false);
      setForm({ farmer_id: "", entry_type: "expense", description: "", amount: "", quantity: "", rate: "", net_weight: "", is_shared: false });
      fetchData();
    }
  };

  const typeBadge = (type: string) => {
    const colors: Record<string, string> = { expense: "destructive", sale: "default", payment: "secondary" };
    return <Badge variant={colors[type] as any || "default"}>{type}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">Ledger</h1>
          <p className="text-muted-foreground">Track expenses, sales, and payments</p>
        </div>
        {canCreate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New Entry</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>New Ledger Entry</DialogTitle><DialogDescription>Add a new transaction record</DialogDescription></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Farmer *</Label>
                  <Select value={form.farmer_id} onValueChange={(v) => setForm({ ...form, farmer_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select farmer" /></SelectTrigger>
                    <SelectContent>{farmers.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Type *</Label>
                  <Select value={form.entry_type} onValueChange={(v) => setForm({ ...form, entry_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="sale">Sale</SelectItem>
                      <SelectItem value="payment">Payment (Return)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                
                {form.entry_type === "sale" ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Net Weight (kg)</Label><Input type="number" value={form.net_weight} onChange={(e) => setForm({ ...form, net_weight: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Rate (₨/kg)</Label><Input type="number" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} /></div>
                    <div className="col-span-2 text-sm text-muted-foreground">Calculated: ₨ {computedAmount().toLocaleString()}</div>
                  </div>
                ) : (
                  <div className="space-y-2"><Label>Amount (₨)</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
                )}

                {form.entry_type === "expense" && (
                  <div className="flex items-center gap-3">
                    <Switch checked={form.is_shared} onCheckedChange={(v) => setForm({ ...form, is_shared: v })} />
                    <Label>50/50 Cost Sharing</Label>
                    {form.is_shared && <span className="text-sm text-muted-foreground">Each pays: ₨ {(computedAmount() / 2).toLocaleString()}</span>}
                  </div>
                )}
              </div>
              <DialogFooter><Button onClick={handleSave} disabled={!form.farmer_id}>Save Entry</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle>Recent Entries</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Farmer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount (₨)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-sm">{new Date(e.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>{e.farmers?.name ?? "—"}</TableCell>
                  <TableCell>{typeBadge(e.entry_type)}</TableCell>
                  <TableCell>{e.description}</TableCell>
                  <TableCell className="text-right font-mono">{Number(e.amount).toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {entries.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No entries yet</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Ledger;
