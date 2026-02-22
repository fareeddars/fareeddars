import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

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
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

const SESSION_HIDDEN_KEY = "app_hidden_at";
const AUTO_LOGOUT_SECONDS = 10;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const dataFetchedRef = useRef(false);

  const fetchUserData = async (userId: string) => {
    const [profileRes, roleRes] = await Promise.all([
      supabase.from("profiles").select("full_name, email").eq("user_id", userId).single(),
      supabase.from("user_roles").select("role, can_create, can_edit, can_delete, is_active").eq("user_id", userId).single(),
    ]);
    if (profileRes.data) setProfile(profileRes.data);
    if (roleRes.data) setUserRole(roleRes.data);
  };

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setUserRole(null);
    localStorage.removeItem(SESSION_HIDDEN_KEY);
  }, []);

  // Auto-logout: track when app is hidden/closed
  useEffect(() => {
    // On mount, check if we were away for more than 10 seconds
    const hiddenAt = localStorage.getItem(SESSION_HIDDEN_KEY);
    if (hiddenAt) {
      const elapsed = (Date.now() - Number(hiddenAt)) / 1000;
      if (elapsed > AUTO_LOGOUT_SECONDS) {
        // Force sign out
        localStorage.removeItem(SESSION_HIDDEN_KEY);
        supabase.auth.signOut();
        return;
      }
      localStorage.removeItem(SESSION_HIDDEN_KEY);
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        localStorage.setItem(SESSION_HIDDEN_KEY, String(Date.now()));
      } else {
        const storedAt = localStorage.getItem(SESSION_HIDDEN_KEY);
        if (storedAt) {
          const elapsed = (Date.now() - Number(storedAt)) / 1000;
          localStorage.removeItem(SESSION_HIDDEN_KEY);
          if (elapsed > AUTO_LOGOUT_SECONDS) {
            signOut();
          }
        }
      }
    };

    const handleBeforeUnload = () => {
      localStorage.setItem(SESSION_HIDDEN_KEY, String(Date.now()));
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [signOut]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          dataFetchedRef.current = false;
        }
        if (!dataFetchedRef.current) {
          dataFetchedRef.current = true;
          setTimeout(() => fetchUserData(session.user.id), 0);
        }
      } else {
        setProfile(null);
        setUserRole(null);
        dataFetchedRef.current = false;
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user && !dataFetchedRef.current) {
        dataFetchedRef.current = true;
        fetchUserData(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAdmin = userRole?.role === "admin";
  const isManagerOrAdmin = userRole?.role === "admin" || userRole?.role === "manager";

  return (
    <AuthContext.Provider value={{
      session, user, profile, userRole, loading, signOut,
      isAdmin, isManagerOrAdmin,
      canCreate: userRole?.can_create ?? false,
      canEdit: userRole?.can_edit ?? false,
      canDelete: userRole?.can_delete ?? false,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
