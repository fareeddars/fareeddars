import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listFarmers from "./tools/list-farmers";
import listLedger from "./tools/list-ledger";
import listInventory from "./tools/list-inventory";
import createLedgerEntry from "./tools/create-ledger-entry";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "agri-ledger-mcp",
  title: "Agri Ledger",
  version: "0.1.0",
  instructions:
    "Tools for the Agri Ledger app. Read and write the signed-in user's farmers, ledger entries (expense/sale/payment), and inventory. All calls run as the authenticated user under row-level security.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listFarmers, listLedger, listInventory, createLedgerEntry],
});
