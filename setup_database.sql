DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP TABLE IF EXISTS public.farmer_seasons CASCADE;
DROP TABLE IF EXISTS public.seasons CASCADE;
DROP TABLE IF EXISTS public.expense_categories CASCADE;
DROP TABLE IF EXISTS public.inventory CASCADE;
DROP TABLE IF EXISTS public.ledger_entries CASCADE;
DROP TABLE IF EXISTS public.farmers CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TYPE IF EXISTS public.farmer_season_status CASCADE;
DROP TYPE IF EXISTS public.season_status CASCADE;
DROP TYPE IF EXISTS public.app_role CASCADE;

-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'staff');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles table (separate from profiles per security requirements)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  role app_role NOT NULL DEFAULT 'staff',
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Farmers table
CREATE TABLE public.farmers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  farm_details TEXT,
  initial_balance NUMERIC NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.farmers ENABLE ROW LEVEL SECURITY;

-- Ledger entries table
CREATE TABLE public.ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID REFERENCES public.farmers(id) ON DELETE CASCADE NOT NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('expense', 'sale', 'payment')),
  description TEXT NOT NULL DEFAULT '',
  amount NUMERIC NOT NULL DEFAULT 0,
  quantity NUMERIC,
  rate NUMERIC,
  net_weight NUMERIC,
  is_shared BOOLEAN NOT NULL DEFAULT false,
  shared_amount NUMERIC,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

-- Inventory table
CREATE TABLE public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name TEXT NOT NULL,
  current_stock NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'bags',
  price_per_unit NUMERIC NOT NULL DEFAULT 0,
  low_stock_threshold NUMERIC NOT NULL DEFAULT 5,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- Expense categories for profit/loss
CREATE TABLE public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  month DATE NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

-- Security definer helper functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role AND is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

CREATE OR REPLACE FUNCTION public.is_manager_or_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'manager') AND is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.can_user_create(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND can_create = true AND is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.can_user_delete(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND can_delete = true AND is_active = true
  )
$$;

-- Auto-create profile and role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));

  INSERT INTO public.user_roles (user_id, role, can_create, can_edit, can_delete, is_active)
  VALUES (NEW.id, 'admin', true, true, true, true);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_farmers_updated_at BEFORE UPDATE ON public.farmers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ledger_entries_updated_at BEFORE UPDATE ON public.ledger_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies

-- Profiles: all authenticated can read, own can update
CREATE POLICY "Authenticated users can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- User roles: all authenticated can read, only admin can modify
CREATE POLICY "Authenticated users can view roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- Farmers: all authenticated can read, managers+ can create/update, admins can delete
CREATE POLICY "Authenticated can view farmers" ON public.farmers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can create farmers" ON public.farmers FOR INSERT TO authenticated WITH CHECK (public.is_manager_or_admin(auth.uid()));
CREATE POLICY "Managers can update farmers" ON public.farmers FOR UPDATE TO authenticated USING (public.is_manager_or_admin(auth.uid()));
CREATE POLICY "Admins can delete farmers" ON public.farmers FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- Ledger entries: same pattern
CREATE POLICY "Authenticated can view ledger" ON public.ledger_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Creators can insert ledger" ON public.ledger_entries FOR INSERT TO authenticated WITH CHECK (public.can_user_create(auth.uid()));
CREATE POLICY "Managers can update ledger" ON public.ledger_entries FOR UPDATE TO authenticated USING (public.is_manager_or_admin(auth.uid()));
CREATE POLICY "Admins can delete ledger" ON public.ledger_entries FOR DELETE TO authenticated USING (public.can_user_delete(auth.uid()));

-- Inventory
CREATE POLICY "Authenticated can view inventory" ON public.inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can create inventory" ON public.inventory FOR INSERT TO authenticated WITH CHECK (public.is_manager_or_admin(auth.uid()));
CREATE POLICY "Managers can update inventory" ON public.inventory FOR UPDATE TO authenticated USING (public.is_manager_or_admin(auth.uid()));
CREATE POLICY "Admins can delete inventory" ON public.inventory FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- Expense categories
CREATE POLICY "Authenticated can view expenses" ON public.expense_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can create expenses" ON public.expense_categories FOR INSERT TO authenticated WITH CHECK (public.is_manager_or_admin(auth.uid()));
CREATE POLICY "Admins can delete expenses" ON public.expense_categories FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
 ALTER TABLE public.ledger_entries 
  ADD COLUMN category text,
  ADD COLUMN entry_date date DEFAULT CURRENT_DATE,
  ADD COLUMN inventory_item_id uuid REFERENCES public.inventory(id),
  ADD COLUMN gross_weight numeric,
  ADD COLUMN deductions numeric,
  ADD COLUMN payment_method text,
  ADD COLUMN crop_type text,
  ADD COLUMN crop_weight numeric; ALTER TABLE public.ledger_entries DROP CONSTRAINT IF EXISTS ledger_entries_entry_type_check;
ALTER TABLE public.ledger_entries ADD CONSTRAINT ledger_entries_entry_type_check 
CHECK (entry_type = ANY (ARRAY['expense','sale','payment','loan'])); UPDATE public.user_roles SET role = 'admin', can_create = true, can_edit = true, can_delete = true WHERE user_id = '5a5371c4-9b32-46e5-8abc-e547a47dc47c'; 
-- 1. Update handle_new_user to give admin role with full permissions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));

  INSERT INTO public.user_roles (user_id, role, can_create, can_edit, can_delete, is_active)
  VALUES (NEW.id, 'admin', true, true, true, true);

  RETURN NEW;
END;
$$;

-- 2. Update SELECT policies to isolate data by created_by

-- farmers
DROP POLICY IF EXISTS "Authenticated can view farmers" ON public.farmers;
CREATE POLICY "Users view own farmers" ON public.farmers
FOR SELECT TO authenticated
USING (created_by = auth.uid());

-- ledger_entries
DROP POLICY IF EXISTS "Authenticated can view ledger" ON public.ledger_entries;
CREATE POLICY "Users view own ledger" ON public.ledger_entries
FOR SELECT TO authenticated
USING (created_by = auth.uid());

-- inventory
DROP POLICY IF EXISTS "Authenticated can view inventory" ON public.inventory;
CREATE POLICY "Users view own inventory" ON public.inventory
FOR SELECT TO authenticated
USING (created_by = auth.uid());

-- expense_categories
DROP POLICY IF EXISTS "Authenticated can view expenses" ON public.expense_categories;
CREATE POLICY "Users view own expenses" ON public.expense_categories
FOR SELECT TO authenticated
USING (created_by = auth.uid());

-- 3. Update INSERT policies to allow all authenticated users (since everyone is admin)
DROP POLICY IF EXISTS "Managers can create farmers" ON public.farmers;
CREATE POLICY "Auth users can create farmers" ON public.farmers
FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Creators can insert ledger" ON public.ledger_entries;
CREATE POLICY "Auth users can insert ledger" ON public.ledger_entries
FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Managers can create inventory" ON public.inventory;
CREATE POLICY "Auth users can create inventory" ON public.inventory
FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Managers can create expenses" ON public.expense_categories;
CREATE POLICY "Auth users can create expenses" ON public.expense_categories
FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

-- 4. Update UPDATE policies
DROP POLICY IF EXISTS "Managers can update farmers" ON public.farmers;
CREATE POLICY "Users can update own farmers" ON public.farmers
FOR UPDATE TO authenticated
USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Managers can update ledger" ON public.ledger_entries;
CREATE POLICY "Users can update own ledger" ON public.ledger_entries
FOR UPDATE TO authenticated
USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Managers can update inventory" ON public.inventory;
CREATE POLICY "Users can update own inventory" ON public.inventory
FOR UPDATE TO authenticated
USING (created_by = auth.uid());

-- 5. Update DELETE policies
DROP POLICY IF EXISTS "Admins can delete farmers" ON public.farmers;
CREATE POLICY "Users can delete own farmers" ON public.farmers
FOR DELETE TO authenticated
USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Admins can delete ledger" ON public.ledger_entries;
CREATE POLICY "Users can delete own ledger" ON public.ledger_entries
FOR DELETE TO authenticated
USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Admins can delete inventory" ON public.inventory;
CREATE POLICY "Users can delete own inventory" ON public.inventory
FOR DELETE TO authenticated
USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Admins can delete expenses" ON public.expense_categories;
CREATE POLICY "Users can delete own expenses" ON public.expense_categories
FOR DELETE TO authenticated
USING (created_by = auth.uid());
 
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
 ALTER TABLE public.farmers ADD COLUMN IF NOT EXISTS cnic text DEFAULT NULL;
ALTER TABLE public.farmers ADD COLUMN IF NOT EXISTS landlord text DEFAULT NULL;
ALTER TABLE public.farmers ADD COLUMN IF NOT EXISTS notes text DEFAULT NULL; CREATE POLICY "Users can update own expenses"
ON public.expense_categories
FOR UPDATE
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());
