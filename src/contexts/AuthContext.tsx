import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { Session, User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

const bootOfflineSync = () => {
  import("@/lib/offline")
    .then((m) => m.initOfflineSync())
    .catch((e) => console.warn("[Offline] init skipped:", e?.message));
};

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserRole {
  role: AppRole;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  is_active: boolean;
}

interface Profile {
  full_name: string;
  email: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  userRole: UserRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isManagerOrAdmin: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  isPasswordRecovery: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const initializedRef = useRef(false);
  const currentUserIdRef = useRef<string | null>(null);
  const navigate = useNavigate();

  const fetchUserData = useCallback(async (userId: string) => {
    // Prevent duplicate fetches for the same user
    if (currentUserIdRef.current === userId && profile && userRole) return;
    currentUserIdRef.current = userId;
    
    try {
      const [profileRes, roleRes] = await Promise.all([
        supabase.from("profiles").select("full_name, email").eq("user_id", userId).single(),
        supabase.from("user_roles").select("role, can_create, can_edit, can_delete, is_active").eq("user_id", userId).single(),
      ]);
      if (profileRes.data) setProfile(profileRes.data);
      if (roleRes.data) setUserRole(roleRes.data);
    } catch (err) {
      console.error("Failed to fetch user data:", err);
    }
  }, [profile, userRole]);

  const signOut = useCallback(async () => {
    try {
      localStorage.removeItem("agri_demo_user");
    } catch {}
    currentUserIdRef.current = null;
    setProfile(null);
    setUserRole(null);
    setSession(null);
    setUser(null);
    try {
      await supabase.auth.signOut();
    } catch {}
  }, []);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // Clear any leftover demo flag so real user account login is used
    try {
      localStorage.removeItem("agri_demo_user");
    } catch {}

    const initializeAuth = async () => {
      try {

        // Detect recovery from URL OR from a flag we persist across the PKCE
        // code-exchange redirect (Supabase strips ?code=... after using it).
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = urlParams.get('access_token') || hashParams.get('access_token');
        const isRecoveryType = urlParams.get('type') === 'recovery' || hashParams.get('type') === 'recovery';
        let recoveryFlag = false;
        try { recoveryFlag = sessionStorage.getItem('pw_recovery_active') === '1'; } catch {}
        const onResetPage = window.location.pathname === '/reset-password';
        const hasRecoveryToken = Boolean(accessToken || isRecoveryType || (recoveryFlag && onResetPage));

        if (hasRecoveryToken) {
          console.log('[Auth] Recovery flow detected');
          setIsPasswordRecovery(true);
          try { sessionStorage.setItem('pw_recovery_active', '1'); } catch {}
        }

        // Safe timeout so getSession never hangs indefinitely
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) =>
          setTimeout(() => resolve({ data: { session: null } }), 1800)
        );

        const { data: { session: restoredSession } } = await Promise.race([sessionPromise, timeoutPromise]);
        if (restoredSession?.user) {
          setSession(restoredSession);
          setUser(restoredSession.user);
          fetchUserData(restoredSession.user.id);
          bootOfflineSync();
        }
      } catch (error) {
        console.error('[Auth] initialization failed:', error);
        currentUserIdRef.current = null;
        setSession(null);
        setUser(null);
        setProfile(null);
        setUserRole(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Step 2: Listen for FUTURE auth changes only
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log("[Auth] Event:", event);

        // Skip INITIAL_SESSION — we handle it via getSession above
        if (event === "INITIAL_SESSION") return;

        // TOKEN_REFRESHED: Only update session reference, don't trigger re-renders
        // that would cascade into more API calls
        if (event === "TOKEN_REFRESHED") {
          if (newSession) {
            setSession(newSession);
            // Don't setUser or fetchUserData — user hasn't changed
          }
          return;
        }

        if (event === "PASSWORD_RECOVERY") {
          setSession(newSession);
          setUser(newSession?.user ?? null);
          setIsPasswordRecovery(true);
          setLoading(false);
          navigate("/reset-password");
          return;
        }

        if (event === "SIGNED_IN") {
          setSession(newSession);
          setUser(newSession?.user ?? null);
          // Re-check the persistent recovery flag — the PKCE code exchange
          // triggers SIGNED_IN without firing PASSWORD_RECOVERY.
          let recoveryFlag = false;
          try { recoveryFlag = sessionStorage.getItem('pw_recovery_active') === '1'; } catch {}
          const inRecovery = isPasswordRecovery || recoveryFlag;
          if (inRecovery) {
            setIsPasswordRecovery(true);
            setLoading(false);
            if (window.location.pathname !== "/reset-password") navigate("/reset-password");
            return;
          }
          if (newSession?.user) {
            // Defer to avoid deadlock inside onAuthStateChange
            setTimeout(() => { fetchUserData(newSession.user.id); bootOfflineSync(); }, 0);
          }
          setLoading(false);
          return;
        }

        if (event === "SIGNED_OUT") {
          currentUserIdRef.current = null;
          setSession(null);
          setUser(null);
          setProfile(null);
          setUserRole(null);
          setIsPasswordRecovery(false);
          try { sessionStorage.removeItem('pw_recovery_active'); } catch {}
          setLoading(false);
          return;
        }

        // USER_UPDATED
        if (event === "USER_UPDATED" && newSession?.user) {
          setSession(newSession);
          setUser(newSession.user);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []); // Empty deps — runs once

  const isAdmin = userRole?.role === "admin";
  const isManagerOrAdmin = userRole?.role === "admin" || userRole?.role === "manager";

  return (
    <AuthContext.Provider value={{
      session, user, profile, userRole, loading, signOut,
      isAdmin, isManagerOrAdmin,
      canCreate: userRole?.can_create ?? false,
      canEdit: userRole?.can_edit ?? false,
      canDelete: userRole?.can_delete ?? false,
      isPasswordRecovery,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
