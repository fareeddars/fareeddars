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
  name: "list_inventory",
  title: "List inventory items",
  description: "List inventory items (name, stock, price per unit) for the signed-in user.",
  inputSchema: {
    low_stock_only: z.boolean().optional().describe("Only return items at or below their low-stock threshold"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ low_stock_only }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await sb(ctx)
      .from("inventory")
      .select("id,item_name,unit,current_stock,price_per_unit,low_stock_threshold")
      .order("item_name", { ascending: true });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const rows = low_stock_only ? (data ?? []).filter((r) => r.current_stock <= r.low_stock_threshold) : data ?? [];
    return { content: [{ type: "text", text: JSON.stringify(rows) }], structuredContent: { items: rows } };
  },
});
