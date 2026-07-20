import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function sb(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_ledger_entries",
  title: "List ledger entries",
  description: "List ledger entries (expense/sale/payment) for the signed-in user, optionally filtered by farmer, type, or date range.",
  inputSchema: {
    farmer_id: z.string().uuid().optional(),
    entry_type: z.enum(["expense", "sale", "payment"]).optional(),
    from_date: z.string().optional().describe("ISO date lower bound (inclusive)"),
    to_date: z.string().optional().describe("ISO date upper bound (inclusive)"),
    limit: z.number().int().positive().optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ farmer_id, entry_type, from_date, to_date, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    let q = sb(ctx)
      .from("ledger_entries")
      .select("id,farmer_id,entry_type,category,amount,description,entry_date,created_at")
      .order("entry_date", { ascending: false })
      .limit(limit ?? 100);
    if (farmer_id) q = q.eq("farmer_id", farmer_id);
    if (entry_type) q = q.eq("entry_type", entry_type);
    if (from_date) q = q.gte("entry_date", from_date);
    if (to_date) q = q.lte("entry_date", to_date);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { entries: data ?? [] } };
  },
});
