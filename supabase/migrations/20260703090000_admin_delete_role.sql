-- Roles: only admins may delete documents (quotes, invoices, delivery notes,
-- job cards). Staff keep every other capability. Roles live on public.profiles
-- (role text NOT NULL DEFAULT 'staff'); promote a user with:
--   UPDATE public.profiles SET role = 'admin' WHERE email = 'someone@example.com';

-- SECURITY DEFINER helper avoids RLS recursion when checking the caller's role.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Replace the permissive delete policy with an admin-only one.
DROP POLICY IF EXISTS "Auth delete docs" ON public.documents;
CREATE POLICY "Admins delete docs" ON public.documents
  FOR DELETE TO authenticated
  USING (public.is_admin());
