import { useEffect, useState } from "react";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { useOnlineStatus, onSyncStateChange, processQueue } from "@/lib/offline";
import { cn } from "@/lib/utils";

const NetworkStatusBadge = () => {
  const online = useOnlineStatus();
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const unsub = onSyncStateChange(setPending);
    return () => { unsub; };
  }, []);

  useEffect(() => {
    if (online && pending > 0) processQueue();
  }, [online, pending]);

  const showSyncing = online && pending > 0;

  return (
    <div
      className={cn(
        "hidden sm:flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-medium transition-colors",
        online
          ? showSyncing
            ? "bg-amber-500/20 text-amber-50 border border-amber-200/30"
            : "bg-emerald-500/20 text-emerald-50 border border-emerald-200/30"
          : "bg-destructive/30 text-destructive-foreground border border-destructive/40"
      )}
      title={
        !online
          ? "Offline — changes will sync when you reconnect"
          : pending > 0
          ? `Syncing ${pending} change(s)…`
          : "Online — all changes synced"
      }
    >
      {!online ? (
        <>
          <WifiOff className="h-3 w-3" />
          <span>Offline</span>
        </>
      ) : showSyncing ? (
        <>
          <RefreshCw className="h-3 w-3 animate-spin" />
          <span>Syncing {pending}</span>
        </>
      ) : (
        <>
          <Wifi className="h-3 w-3" />
          <span>Online</span>
        </>
      )}
    </div>
  );
};

export default NetworkStatusBadge;
