import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Season {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  status: "active" | "closed";
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FarmerSeason {
  id: string;
  farmer_id: string;
  season_id: string;
  opening_balance: number;
  status: "active" | "left" | "completed";
  created_by: string;
  created_at: string;
  updated_at: string;
  farmers?: { name: string; phone: string | null; address: string | null } | null;
}

interface SeasonContextType {
  seasons: Season[];
  activeSeason: Season | null;
  selectedSeason: Season | null;
  setSelectedSeasonId: (id: string | null) => void;
  farmerSeasons: FarmerSeason[];
  loading: boolean;
  refreshSeasons: () => Promise<void>;
  refreshFarmerSeasons: () => Promise<void>;
  isSeasonClosed: boolean;
}

const SeasonContext = createContext<SeasonContextType | null>(null);

export const useSeason = () => {
  const ctx = useContext(SeasonContext);
  if (!ctx) throw new Error("useSeason must be used within SeasonProvider");
  return ctx;
};

export const SeasonProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [farmerSeasons, setFarmerSeasons] = useState<FarmerSeason[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshSeasons = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("seasons")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data && data.length > 0) {
        setSeasons(data as unknown as Season[]);
        if (!selectedSeasonId) {
          const active = data.find((s: any) => s.status === "active");
          if (active) setSelectedSeasonId(active.id);
          else if (data.length > 0) setSelectedSeasonId(data[0].id);
        }
        setLoading(false);
        return;
      }
    } catch {}

    // Fallback to offline store
    try {
      const { offlineRepo } = await import("@/lib/offline");
      const localSeasons = await offlineRepo.listLocal("seasons");
      if (localSeasons && localSeasons.length > 0) {
        setSeasons(localSeasons as unknown as Season[]);
        if (!selectedSeasonId) {
          const active = localSeasons.find((s: any) => s.status === "active");
          if (active) setSelectedSeasonId(active.id);
          else setSelectedSeasonId(localSeasons[0].id);
        }
      }
    } catch {}
    setLoading(false);
  }, [user, selectedSeasonId]);

  const refreshFarmerSeasons = useCallback(async () => {
    if (!user || !selectedSeasonId) return;
    try {
      const { data, error } = await supabase
        .from("farmer_seasons")
        .select("*, farmers(name, phone, address, photo_url)")
        .eq("season_id", selectedSeasonId)
        .order("created_at", { ascending: false });
      if (!error && data && data.length > 0) {
        setFarmerSeasons(data as unknown as FarmerSeason[]);
        return;
      }
    } catch {}

    // Fallback to offline store
    try {
      const { offlineRepo } = await import("@/lib/offline");
      const localFS = await offlineRepo.listLocal("farmer_seasons", (fs) => fs.season_id === selectedSeasonId);
      if (localFS && localFS.length > 0) {
        setFarmerSeasons(localFS as unknown as FarmerSeason[]);
      }
    } catch {}
  }, [user, selectedSeasonId]);

  useEffect(() => {
    if (user) refreshSeasons();
  }, [user]);

  useEffect(() => {
    if (selectedSeasonId) refreshFarmerSeasons();
    else setFarmerSeasons([]);
  }, [selectedSeasonId]);

  const activeSeason = seasons.find((s) => s.status === "active") || null;
  const selectedSeason = seasons.find((s) => s.id === selectedSeasonId) || null;
  const isSeasonClosed = selectedSeason?.status === "closed";

  return (
    <SeasonContext.Provider value={{
      seasons,
      activeSeason,
      selectedSeason,
      setSelectedSeasonId,
      farmerSeasons,
      loading,
      refreshSeasons,
      refreshFarmerSeasons,
      isSeasonClosed,
    }}>
      {children}
    </SeasonContext.Provider>
  );
};
