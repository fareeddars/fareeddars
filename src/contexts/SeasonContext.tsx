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
    const { data } = await supabase
      .from("seasons")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) {
      setSeasons(data as unknown as Season[]);
      // Auto-select active season if none selected
      if (!selectedSeasonId) {
        const active = data.find((s: any) => s.status === "active");
        if (active) setSelectedSeasonId(active.id);
        else if (data.length > 0) setSelectedSeasonId(data[0].id);
      }
    }
    setLoading(false);
  }, [user, selectedSeasonId]);

  const refreshFarmerSeasons = useCallback(async () => {
    if (!user || !selectedSeasonId) return;
    const { data } = await supabase
      .from("farmer_seasons")
      .select("*, farmers(name, phone, address, photo_url)")
      .eq("season_id", selectedSeasonId)
      .order("created_at", { ascending: false });
    if (data) setFarmerSeasons(data as unknown as FarmerSeason[]);
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
