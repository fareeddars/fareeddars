// Offline-first IndexedDB store using Dexie.
// Mirrors core Supabase tables + a sync queue for pending operations.
import Dexie, { Table } from "dexie";

export type SyncOp = "insert" | "update" | "delete";

export interface PendingOp {
  id?: number;             // auto-increment
  table: string;           // e.g. "farmers"
  op: SyncOp;
  recordId: string;        // primary key (uuid)
  payload: any;            // for insert/update
  createdAt: number;       // ms
  attempts: number;
  lastError?: string;
}

export interface CachedRow {
  id: string;
  _deleted?: boolean;      // soft-delete flag for offline UX
  _dirty?: boolean;        // local change not yet synced
  [k: string]: any;
}

class OfflineDB extends Dexie {
  farmers!: Table<CachedRow, string>;
  ledger_entries!: Table<CachedRow, string>;
  inventory!: Table<CachedRow, string>;
  seasons!: Table<CachedRow, string>;
  farmer_seasons!: Table<CachedRow, string>;
  expense_categories!: Table<CachedRow, string>;
  pending_ops!: Table<PendingOp, number>;

  constructor() {
    super("agri_offline_db_v1");
    this.version(1).stores({
      farmers: "id, name, created_at, _dirty, _deleted",
      ledger_entries: "id, farmer_id, entry_date, season_id, created_at, _dirty, _deleted",
      inventory: "id, item_name, _dirty, _deleted",
      seasons: "id, name, status, _dirty, _deleted",
      farmer_seasons: "id, farmer_id, season_id, _dirty, _deleted",
      expense_categories: "id, month, season_id, _dirty, _deleted",
      pending_ops: "++id, table, recordId, createdAt",
    });
  }
}

export const offlineDB = new OfflineDB();

export const SYNCABLE_TABLES = [
  "farmers",
  "ledger_entries",
  "inventory",
  "seasons",
  "farmer_seasons",
  "expense_categories",
] as const;

export type SyncableTable = typeof SYNCABLE_TABLES[number];
