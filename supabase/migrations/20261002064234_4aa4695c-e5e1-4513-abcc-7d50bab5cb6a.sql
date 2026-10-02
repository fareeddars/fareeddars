CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'My Organization',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_roles ADD COLUMN organization_id uuid REFERENCES public.organizations(id);

-- backfill: one org per existing role row
DO $$
DECLARE r record; new_org uuid;
BEGIN
  FOR r IN SELECT id FROM public.user_roles WHERE organization_id IS NULL LOOP
    INSERT INTO public.organizations DEFAULT VALUES RETURNING id INTO new_org;
    UPDATE public.user_roles SET organization_id = new_org WHERE id = r.id;
  END LOOP;
END $$;
-- users without any role row get a staff membership with no permissions in their own org
DO $$
DECLARE u record; new_org uuid;
BEGIN
  FOR u IN SELECT id FROM auth.users WHERE id NOT IN (SELECT user_id FROM public.user_roles) LOOP
    INSERT INTO public.organizations DEFAULT VALUES RETURNING id INTO new_org;
    INSERT INTO public.user_roles (user_id, role, can_create, can_edit, can_delete, is_active, organization_id)
    VALUES (u.id, 'admin', true, true, true, true, new_org);
  END LOOP;
END $$;
ALTER TABLE public.user_roles ALTER COLUMN organization_id SET NOT NULL;

CREATE OR REPLACE FUNCTION public.current_org_id(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT organization_id FROM public.user_roles WHERE user_id = _user_id AND is_active = true LIMIT 1
$$;
CREATE OR REPLACE FUNCTION public.can_user_edit(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND can_edit = true AND is_active = true)
$$;

CREATE POLICY "Members view own organization" ON public.organizations FOR SELECT TO authenticated
  USING (id = public.current_org_id(auth.uid()));

-- enforce organization on data rows
CREATE OR REPLACE FUNCTION public.set_organization_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NOT NULL THEN
      NEW.organization_id := public.current_org_id(auth.uid());
    ELSIF NEW.organization_id IS NULL THEN
      NEW.organization_id := public.current_org_id(NEW.created_by);
    END IF;
  ELSE
    NEW.organization_id := OLD.organization_id;
  END IF;
  RETURN NEW;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['farmers','ledger_entries','expense_categories','inventory','seasons','farmer_seasons'] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN organization_id uuid REFERENCES public.organizations(id)', t);
    EXECUTE format('UPDATE public.%I x SET organization_id = r.organization_id FROM public.user_roles r WHERE r.user_id = x.created_by', t);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN organization_id SET NOT NULL', t);
    EXECUTE format('CREATE INDEX ON public.%I (organization_id)', t);
    EXECUTE format('CREATE TRIGGER set_%I_org BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_organization_id()', t, t);
  END LOOP;
END $$;

-- replace owner-only policies with organization policies
DROP POLICY "Auth users can create farmers" ON public.farmers;
DROP POLICY "Users can delete own farmers" ON public.farmers;
DROP POLICY "Users can update own farmers" ON public.farmers;
DROP POLICY "Users view own farmers" ON public.farmers;
DROP POLICY "Auth users can insert ledger" ON public.ledger_entries;
DROP POLICY "Users can delete own ledger" ON public.ledger_entries;
DROP POLICY "Users can update own ledger" ON public.ledger_entries;
DROP POLICY "Users view own ledger" ON public.ledger_entries;
DROP POLICY "Auth users can create expenses" ON public.expense_categories;
DROP POLICY "Users can delete own expenses" ON public.expense_categories;
DROP POLICY "Users can update own expenses" ON public.expense_categories;
DROP POLICY "Users view own expenses" ON public.expense_categories;
DROP POLICY "Auth users can create inventory" ON public.inventory;
DROP POLICY "Users can delete own inventory" ON public.inventory;
DROP POLICY "Users can update own inventory" ON public.inventory;
DROP POLICY "Users view own inventory" ON public.inventory;
DROP POLICY "Users can create seasons" ON public.seasons;
DROP POLICY "Users can delete own seasons" ON public.seasons;
DROP POLICY "Users can update own seasons" ON public.seasons;
DROP POLICY "Users view own seasons" ON public.seasons;
DROP POLICY "Users can create farmer_seasons" ON public.farmer_seasons;
DROP POLICY "Users can delete own farmer_seasons" ON public.farmer_seasons;
DROP POLICY "Users can update own farmer_seasons" ON public.farmer_seasons;
DROP POLICY "Users view own farmer_seasons" ON public.farmer_seasons;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['farmers','ledger_entries','expense_categories','inventory','seasons','farmer_seasons'] LOOP
    EXECUTE format('CREATE POLICY "Org members view" ON public.%I FOR SELECT TO authenticated USING (organization_id = public.current_org_id(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "Org members create" ON public.%I FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND organization_id = public.current_org_id(auth.uid()) AND public.can_user_create(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "Org members edit" ON public.%I FOR UPDATE TO authenticated USING (organization_id = public.current_org_id(auth.uid()) AND public.can_user_edit(auth.uid())) WITH CHECK (organization_id = public.current_org_id(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "Org members delete" ON public.%I FOR DELETE TO authenticated USING (organization_id = public.current_org_id(auth.uid()) AND public.can_user_delete(auth.uid()))', t);
  END LOOP;
END $$;

-- admins limited to their own organization
DROP POLICY "Admins can delete roles" ON public.user_roles;
DROP POLICY "Admins can insert roles" ON public.user_roles;
DROP POLICY "Admins can update roles" ON public.user_roles;
DROP POLICY "Users view own role or admin views all" ON public.user_roles;
CREATE POLICY "View own role or org admin" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR (public.is_admin(auth.uid()) AND organization_id = public.current_org_id(auth.uid())));
CREATE POLICY "Org admin inserts roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) AND organization_id = public.current_org_id(auth.uid()));
CREATE POLICY "Org admin updates roles" ON public.user_roles FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) AND organization_id = public.current_org_id(auth.uid()))
  WITH CHECK (organization_id = public.current_org_id(auth.uid()));
CREATE POLICY "Org admin deletes roles" ON public.user_roles FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()) AND organization_id = public.current_org_id(auth.uid()));

DROP POLICY "Users view own profile or admin views all" ON public.profiles;
CREATE POLICY "View own profile or org admin" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR (public.is_admin(auth.uid()) AND public.current_org_id(user_id) = public.current_org_id(auth.uid())));

-- new self sign-ups get their own organization
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_org uuid;
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  INSERT INTO public.organizations DEFAULT VALUES RETURNING id INTO new_org;
  INSERT INTO public.user_roles (user_id, role, can_create, can_edit, can_delete, is_active, organization_id)
  VALUES (NEW.id, 'admin', true, true, true, true, new_org);
  RETURN NEW;
END $$;