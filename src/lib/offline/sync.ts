// Sync engine: drains pending_ops queue when online.
// - Last-write-wins: local wins for updates (we send our payload).
// - Insert idempotency: we use the same UUID locally and remotely; on conflict we treat as success.
// - Deletes are hard-deletes on server; row removed from cache after successful sync.
import { supabase } from "@/integrations/supabase/client";
import { offlineDB, SYNCABLE_TABLES, SyncableTable } from "./db";
import { isOnline, onNetworkChange } from "./network";

let running = false;
let listeners = new Set<(pending: number) => void>();

const notify = async () => {
  const c = await offlineDB.pending_ops.count();
  listeners.forEach((l) => l(c));
};

export const onSyncStateChange = (l: (pending: number) => void) => {
  listeners.add(l);
  notify();
  return () => listeners.delete(l);
};

const isDuplicate = (msg: string) =>
  /duplicate key|already exists|unique constraint/i.test(msg);

export const processQueue = async () => {
  if (running || !isOnline()) return;
  running = true;
  try {
    const ops = await offlineDB.pending_ops.orderBy("createdAt").toArray();
    if (ops.length === 0) return;
    console.log(`[Offline] Sync starting, ${ops.length} pending op(s)`);

    for (const op of ops) {
      try {
        const t = op.table as SyncableTable;
        let res: any;
        if (op.op === "insert") {
          res = await (supabase as any).from(t).insert(op.payload);
          if (res.error && isDuplicate(res.error.message)) {
            console.log(`[Offline] Duplicate insert ignored for ${t}/${op.recordId}`);
            res = { error: null };
          }
        } else if (op.op === "update") {
          res = await (supabase as any).from(t).update(op.payload).eq("id", op.recordId);
        } else if (op.op === "delete") {
          res = await (supabase as any).from(t).delete().eq("id", op.recordId);
        }

        if (res?.error) throw new Error(res.error.message);

        await offlineDB.pending_ops.delete(op.id!);
        if (op.op === "delete") {
          await (offlineDB as any)[t].delete(op.recordId);
        } else {
          await (offlineDB as any)[t].update(op.recordId, { _dirty: false });
        }
        console.log(`[Offline] Synced ${op.op} ${t}/${op.recordId}`);
      } catch (e: any) {
        console.error(`[Offline] Sync failed for ${op.table}/${op.recordId}:`, e.message);
        await offlineDB.pending_ops.update(op.id!, {
          attempts: (op.attempts || 0) + 1,
          lastError: e.message,
        });
        // Stop after 5 attempts to avoid hammering
        if ((op.attempts || 0) >= 5) {
          console.warn(`[Offline] Dropping op after 5 attempts: ${op.table}/${op.recordId}`);
          await offlineDB.pending_ops.delete(op.id!);
        }
      } finally {
        await notify();
      }
    }
    console.log(`[Offline] Sync complete`);
  } finally {
    running = false;
    await notify();
  }
};

/** Pull all data for current user from server into local cache. */
export const hydrateFromServer = async () => {
  if (!isOnline()) {
    console.log(`[Offline] Skipping hydration — offline`);
    return;
  }
  console.log(`[Offline] Hydrating cache from server…`);
  for (const t of SYNCABLE_TABLES) {
    try {
      const { data, error } = await (supabase as any).from(t).select("*");
      if (error) {
        console.warn(`[Offline] Hydrate ${t} failed:`, error.message);
        continue;
      }
      // Preserve any locally-dirty rows — overwrite only clean ones
      const local = await (offlineDB as any)[t].toArray();
      const dirtyIds = new Set(local.filter((r: any) => r._dirty || r._deleted).map((r: any) => r.id));
      const merged = (data || []).filter((r: any) => !dirtyIds.has(r.id));
      await (offlineDB as any)[t].bulkPut(merged);
    } catch (e: any) {
      console.warn(`[Offline] Hydrate ${t} threw:`, e.message);
    }
  }
  console.log(`[Offline] Hydration done`);
};

/** Initialize sync engine: hydrate, then react to network changes. */
let initialized = false;
export const initOfflineSync = () => {
  if (initialized) return;
  initialized = true;
  console.log(`[Offline] Engine initialized (online=${isOnline()})`);

  // First hydration + drain any leftover queue
  hydrateFromServer().then(() => processQueue());

  onNetworkChange((online) => {
    if (online) {
      console.log(`[Offline] Back online → draining queue & re-hydrating`);
      processQueue().then(() => hydrateFromServer());
    }
  });

  // Periodic safety drain
  setInterval(() => {
    if (isOnline()) processQueue();
  }, 30000);
};
