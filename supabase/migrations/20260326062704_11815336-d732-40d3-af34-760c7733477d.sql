
-- 1. Create season_status enum
CREATE TYPE public.season_status AS ENUM ('active', 'closed');

-- 2. Create farmer_season_status enum
CREATE TYPE public.farmer_season_status AS ENUM ('active', 'left', 'completed');

-- 3. Create seasons table
CREATE TABLE public.seasons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  status season_status NOT NULL DEFAULT 'active',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Create farmer_seasons junction table
CREATE TABLE public.farmer_seasons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  farmer_id UUID NOT NULL REFERENCES public.farmers(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  opening_balance NUMERIC NOT NULL DEFAULT 0,
  status farmer_season_status NOT NULL DEFAULT 'active',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(farmer_id, season_id)
);

-- 5. Add season_id and farmer_season_id to ledger_entries (nullable for backward compat)
ALTER TABLE public.ledger_entries ADD COLUMN season_id UUID REFERENCES public.seasons(id);
ALTER TABLE public.ledger_entries ADD COLUMN farmer_season_id UUID REFERENCES public.farmer_seasons(id);

-- 6. Add season_id to expense_categories (nullable for backward compat)
ALTER TABLE public.expense_categories ADD COLUMN season_id UUID REFERENCES public.seasons(id);

-- 7. Enable RLS on new tables
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmer_seasons ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies for seasons
CREATE POLICY "Users view own seasons" ON public.seasons
FOR SELECT TO authenticated USING (created_by = auth.uid());

CREATE POLICY "Users can create seasons" ON public.seasons
FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own seasons" ON public.seasons
FOR UPDATE TO authenticated USING (created_by = auth.uid());

CREATE POLICY "Users can delete own seasons" ON public.seasons
FOR DELETE TO authenticated USING (created_by = auth.uid());

-- 9. RLS Policies for farmer_seasons
CREATE POLICY "Users view own farmer_seasons" ON public.farmer_seasons
FOR SELECT TO authenticated USING (created_by = auth.uid());

CREATE POLICY "Users can create farmer_seasons" ON public.farmer_seasons
FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own farmer_seasons" ON public.farmer_seasons
FOR UPDATE TO authenticated USING (created_by = auth.uid());

CREATE POLICY "Users can delete own farmer_seasons" ON public.farmer_seasons
FOR DELETE TO authenticated USING (created_by = auth.uid());

-- 10. Updated_at triggers
CREATE TRIGGER update_seasons_updated_at BEFORE UPDATE ON public.seasons
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_farmer_seasons_updated_at BEFORE UPDATE ON public.farmer_seasons
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
