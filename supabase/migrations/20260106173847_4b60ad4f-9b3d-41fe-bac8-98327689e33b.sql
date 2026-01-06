-- Explicitly deny access to profiles for unauthenticated users (defense-in-depth)
-- Note: RLS already denies access when no anon policies exist; this makes it explicit.

DROP POLICY IF EXISTS "Anon cannot read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anon cannot insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anon cannot update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anon cannot delete profiles" ON public.profiles;

CREATE POLICY "Anon cannot read profiles"
ON public.profiles
FOR SELECT
TO anon
USING (false);

CREATE POLICY "Anon cannot insert profiles"
ON public.profiles
FOR INSERT
TO anon
WITH CHECK (false);

CREATE POLICY "Anon cannot update profiles"
ON public.profiles
FOR UPDATE
TO anon
USING (false);

CREATE POLICY "Anon cannot delete profiles"
ON public.profiles
FOR DELETE
TO anon
USING (false);
