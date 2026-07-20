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
  name: "create_ledger_entry",
  title: "Create ledger entry",
  description: "Create a ledger entry (expense, sale, or payment) for a farmer as the signed-in user.",
  inputSchema: {
    farmer_id: z.string().uuid(),
    entry_type: z.enum(["expense", "sale", "payment"]),
    amount: z.number().positive(),
    description: z.string().trim().min(1),
    category: z.string().optional(),
    entry_date: z.string().optional().describe("ISO date; defaults to today"),
    season_id: z.string().uuid().optional(),
    farmer_season_id: z.string().uuid().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await sb(ctx)
      .from("ledger_entries")
      .insert({
        farmer_id: input.farmer_id,
        entry_type: input.entry_type,
        amount: input.amount,
        description: input.description,
        category: input.category ?? null,
        entry_date: input.entry_date ?? new Date().toISOString().slice(0, 10),
        season_id: input.season_id ?? null,
        farmer_season_id: input.farmer_season_id ?? null,
        created_by: ctx.getUserId()!,
      })
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: `Created entry ${data.id}` }], structuredContent: { entry: data } };
  },
});
