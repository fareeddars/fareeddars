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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const dataFetchedRef = useRef(false);
  const isReadyRef = useRef(false);

  const fetchUserData = useCallback(async (userId: string) => {
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
  }, []);

  const signOut = useCallback(async () => {
    dataFetchedRef.current = false;
    setProfile(null);
    setUserRole(null);
    setSession(null);
    setUser(null);
    await supabase.auth.signOut();
  }, []);

  useEffect(() => {
    // IMPORTANT: Set up listener BEFORE calling getSession
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        // Skip INITIAL_SESSION if we haven't restored from getSession yet
        if (event === 'INITIAL_SESSION' && !isReadyRef.current) {
          return;
        }

        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
            if (!dataFetchedRef.current) {
              dataFetchedRef.current = true;
              // Use setTimeout to avoid deadlock in onAuthStateChange
              setTimeout(() => fetchUserData(newSession.user.id), 0);
            }
          }
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
          setUserRole(null);
          dataFetchedRef.current = false;
        }

        setLoading(false);
      }
    );

    // Restore session from storage
    supabase.auth.getSession().then(({ data: { session: restoredSession } }) => {
      isReadyRef.current = true;
      setSession(restoredSession);
      setUser(restoredSession?.user ?? null);

      if (restoredSession?.user && !dataFetchedRef.current) {
        dataFetchedRef.current = true;
        fetchUserData(restoredSession.user.id);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

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
