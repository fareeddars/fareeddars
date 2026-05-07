import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const INACTIVITY_MS = 10 * 60 * 1000; // 10 minutes
const LAST_ACTIVITY_KEY = "app_last_activity";
const SESSION_FLAG_KEY = "app_session_active";

/**
 * Auto-logout when:
 * 1. User is inactive for 10 minutes
 * 2. User closes the app/tab and reopens it (session flag missing)
 */
export const useAutoLogout = (enabled: boolean) => {
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const doLogout = async () => {
      try {
        localStorage.removeItem(LAST_ACTIVITY_KEY);
        sessionStorage.removeItem(SESSION_FLAG_KEY);
        await supabase.auth.signOut();
        window.location.href = "/auth";
      } catch (e) {
        console.warn("[AutoLogout] failed:", e);
      }
    };

    // Check on mount: if sessionStorage flag is missing, the app was closed/reopened
    if (!sessionStorage.getItem(SESSION_FLAG_KEY)) {
      doLogout();
      return;
    }

    // Also check inactivity gap since last activity (covers backgrounded tabs)
    const last = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || 0);
    if (last && Date.now() - last > INACTIVITY_MS) {
      doLogout();
      return;
    }

    const resetTimer = () => {
      localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(doLogout, INACTIVITY_MS);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        const lastSeen = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || 0);
        if (lastSeen && Date.now() - lastSeen > INACTIVITY_MS) {
          doLogout();
        } else {
          resetTimer();
        }
      }
    };

    sessionStorage.setItem(SESSION_FLAG_KEY, "1");
    resetTimer();

    const events = ["mousedown", "keydown", "touchstart", "scroll", "click"];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled]);
};
