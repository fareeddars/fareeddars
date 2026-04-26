// Real-time online/offline detection with light heartbeat fallback.
import { useEffect, useState } from "react";

type Listener = (online: boolean) => void;
const listeners = new Set<Listener>();
let currentOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

const emit = (online: boolean) => {
  if (currentOnline === online) return;
  currentOnline = online;
  console.log(`[Offline] Network changed → ${online ? "ONLINE" : "OFFLINE"}`);
  listeners.forEach((l) => l(online));
};

if (typeof window !== "undefined") {
  window.addEventListener("online", () => emit(true));
  window.addEventListener("offline", () => emit(false));
}

export const isOnline = () => currentOnline;

export const onNetworkChange = (l: Listener) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useOnlineStatus = () => {
  const [online, setOnline] = useState(currentOnline);
  useEffect(() => onNetworkChange(setOnline), []);
  return online;
};
