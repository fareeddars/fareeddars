import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

function getInventorySupabaseConfig() {
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
  name: "list_inventory",
  title: "List inventory items",
  description: "List inventory items (name, stock, price per unit) for the signed-in user.",
  inputSchema: {
    low_stock_only: z.boolean().optional().describe("Only return items at or below their low-stock threshold"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ low_stock_only }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const config = getInventorySupabaseConfig();
    if (!config) return { content: [{ type: "text", text: "Database configuration is missing" }], isError: true };
    const supabase = createClient(config.url, config.key, {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase
      .from("inventory")
      .select("id,item_name,unit,current_stock,price_per_unit,low_stock_threshold")
      .order("item_name", { ascending: true });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const rows = low_stock_only ? (data ?? []).filter((r) => r.current_stock <= r.low_stock_threshold) : data ?? [];
    return { content: [{ type: "text", text: JSON.stringify(rows) }], structuredContent: { items: rows } };
  },
});
