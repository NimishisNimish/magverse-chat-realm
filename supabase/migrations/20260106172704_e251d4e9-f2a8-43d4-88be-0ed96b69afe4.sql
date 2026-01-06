-- Drop the existing blanket denial policy
DROP POLICY IF EXISTS "No direct user access to reset attempts" ON public.password_reset_attempts;

-- Create admin-only SELECT policy for viewing reset attempts
CREATE POLICY "Admins can view password reset attempts"
ON public.password_reset_attempts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'::app_role
  )
);

-- Block all other operations (INSERT handled by SECURITY DEFINER functions)
CREATE POLICY "Block direct insert for regular users"
ON public.password_reset_attempts
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "Block update for all users"
ON public.password_reset_attempts
FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "Block delete for all users"
ON public.password_reset_attempts
FOR DELETE
TO authenticated
USING (false);