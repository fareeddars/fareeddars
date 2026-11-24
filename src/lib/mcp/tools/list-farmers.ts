import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

function getFarmersSupabaseConfig() {
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
  name: "list_farmers",
  title: "List farmers",
  description: "List farmers visible to the signed-in user, optionally filtered by name.",
  inputSchema: {
    search: z.string().optional().describe("Optional case-insensitive name filter"),
    limit: z.number().int().positive().optional().describe("Max rows (default 50)"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const config = getFarmersSupabaseConfig();
    if (!config) return { content: [{ type: "text", text: "Database configuration is missing" }], isError: true };
    const supabase = createClient(config.url, config.key, {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    let q = supabase.from("farmers").select("id,name,phone,cnic,landlord,initial_balance,created_at").order("created_at", { ascending: false }).limit(limit ?? 50);
    if (search) q = q.ilike("name", `%${search}%`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { farmers: data ?? [] } };
  },
});
