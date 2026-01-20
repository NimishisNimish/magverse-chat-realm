-- Fix phone_verification_codes INSERT policy to restrict OTP insertions
DROP POLICY IF EXISTS "Users can insert phone codes" ON public.phone_verification_codes;

CREATE POLICY "Users can insert their own phone codes"
ON public.phone_verification_codes
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
);

-- Also fix the SELECT policy to remove unauthenticated access
DROP POLICY IF EXISTS "Users can view phone codes" ON public.phone_verification_codes;

CREATE POLICY "Users can view their own phone codes"
ON public.phone_verification_codes
FOR SELECT
USING (auth.uid() = user_id);

-- Add policy for admins to manage all codes
DROP POLICY IF EXISTS "Admins can manage phone codes" ON public.phone_verification_codes;

CREATE POLICY "Admins can manage phone codes"
ON public.phone_verification_codes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'::app_role
  )
);