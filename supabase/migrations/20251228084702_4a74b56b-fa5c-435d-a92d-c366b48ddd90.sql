-- Fix: phone_codes_insert_any - Restrict INSERT to authenticated users only
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can insert phone codes" ON public.phone_verification_codes;

-- Create a new policy that requires authentication
CREATE POLICY "Authenticated users can insert phone codes" 
ON public.phone_verification_codes 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);