REVOKE EXECUTE ON FUNCTION public.current_org_id(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_user_edit(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_organization_id() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_org_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_user_edit(uuid) TO authenticated;