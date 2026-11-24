import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

function getLedgerSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  let key = process.env.SUPABASE_PUBLISHABLE_KEY;
  const keySet = process.env.SUPABASE_PUBLISHABLE_KEYS;
  if (!key && keySet) {
    try {
      const parsed: unknown = JSON.parse(keySet);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const keys = parsed as Record<string, unknown>;
        for (const candidate of [keys.default, ...Object.values(keys)]) {
          if (typeof candidate === "string" && candidate.trim().startsWith("sb_publishable_")) {
            key = candidate.trim();
            break;
          }
        }
      }
    } catch {
      // Fall back to the legacy anon key below.
    }
  }
  key ??= process.env.SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
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
    const config = getLedgerSupabaseConfig();
    if (!config) return { content: [{ type: "text", text: "Database configuration is missing" }], isError: true };
    const supabase = createClient(config.url, config.key, {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    let q = supabase
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
