
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
