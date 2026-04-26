// Offline-first repository: every read/write goes through here.
// - Writes: apply to Dexie immediately, then either push to Supabase (online) or queue (offline).
// - Reads: prefer Supabase when online (and refresh cache); fall back to Dexie when offline.
import { supabase } from "@/integrations/supabase/client";
import { offlineDB, SyncableTable, PendingOp } from "./db";
import { isOnline } from "./network";

const uuid = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "tmp-" + Math.random().toString(36).slice(2) + Date.now());

const tbl = (name: SyncableTable) => (offlineDB as any)[name];

const enqueue = async (op: Omit<PendingOp, "id" | "createdAt" | "attempts">) => {
  await offlineDB.pending_ops.add({ ...op, createdAt: Date.now(), attempts: 0 });
  console.log(`[Offline] Queued ${op.op} on ${op.table} (${op.recordId})`);
};

export const offlineRepo = {
  /** Read all (non-deleted) cached rows, optionally filtered. */
  async listLocal(table: SyncableTable, predicate?: (r: any) => boolean) {
    const rows = await tbl(table).toArray();
    return rows.filter((r: any) => !r._deleted && (!predicate || predicate(r)));
  },

  /** Replace local cache for a table from a server response. */
  async hydrate(table: SyncableTable, rows: any[]) {
    await tbl(table).clear();
    if (rows?.length) await tbl(table).bulkPut(rows);
    console.log(`[Offline] Hydrated ${table}: ${rows?.length ?? 0} rows`);
  },

  /** Insert a record. Generates UUID locally so the same id is used after sync. */
  async insert<T extends Record<string, any>>(table: SyncableTable, payload: T): Promise<T & { id: string }> {
    const id = (payload as any).id || uuid();
    const now = new Date().toISOString();
    const record = { ...payload, id, created_at: now, updated_at: now, _dirty: true };
    await tbl(table).put(record);

    if (isOnline()) {
      const { _dirty, ...clean } = record as any;
      const { error } = await (supabase as any).from(table).insert(clean);
      if (error) {
        console.warn(`[Offline] Insert failed online, queueing:`, error.message);
        await enqueue({ table, op: "insert", recordId: id, payload: clean });
      } else {
        await tbl(table).update(id, { _dirty: false });
      }
    } else {
      const { _dirty, ...clean } = record as any;
      await enqueue({ table, op: "insert", recordId: id, payload: clean });
    }
    return record as any;
  },

  async update(table: SyncableTable, id: string, patch: Record<string, any>) {
    const updated = { ...patch, updated_at: new Date().toISOString(), _dirty: true };
    await tbl(table).update(id, updated);

    if (isOnline()) {
      const { _dirty, ...clean } = updated as any;
      const { error } = await (supabase as any).from(table).update(clean).eq("id", id);
      if (error) {
        await enqueue({ table, op: "update", recordId: id, payload: clean });
      } else {
        await tbl(table).update(id, { _dirty: false });
      }
    } else {
      const { _dirty, ...clean } = updated as any;
      await enqueue({ table, op: "update", recordId: id, payload: clean });
    }
  },

  /** Soft-delete locally; queue/execute hard delete on server. */
  async remove(table: SyncableTable, id: string) {
    await tbl(table).update(id, { _deleted: true, _dirty: true });
    if (isOnline()) {
      const { error } = await (supabase as any).from(table).delete().eq("id", id);
      if (error) {
        await enqueue({ table, op: "delete", recordId: id, payload: null });
      } else {
        await tbl(table).delete(id);
      }
    } else {
      await enqueue({ table, op: "delete", recordId: id, payload: null });
    }
  },

  /** Pending op count (for UI badge). */
  async pendingCount() {
    return offlineDB.pending_ops.count();
  },
};
