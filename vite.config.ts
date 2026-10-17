import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";

const cloudProjectId = process.env.VITE_SUPABASE_PROJECT_ID ?? "quegwrgjqedkhxztvtpa";
const cloudUrl =
  process.env.VITE_SUPABASE_URL ??
  process.env.SUPABASE_URL ??
  `https://${cloudProjectId}.supabase.co`;
const cloudPublishableKey =
  process.env.VITE_SUPABASE_ANON_KEY ??
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1ZWd3cmdqcWVka2h4enR2dHBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNDM0NDYsImV4cCI6MjA4NjkxOTQ0Nn0.w6s9e2bHYinBkLqqZRgwb0AkiitorTlC7boNNWoiAWY";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "0.0.0.0",
    port: 3000,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mcpPlugin()],
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(cloudUrl),
    "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(cloudPublishableKey),
    "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(cloudProjectId),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
