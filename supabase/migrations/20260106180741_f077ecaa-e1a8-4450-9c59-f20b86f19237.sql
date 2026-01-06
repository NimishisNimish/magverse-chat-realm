-- Fix the overly permissive RLS policy for newsletter_subscribers INSERT
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON public.newsletter_subscribers;

-- Create a more restrictive policy that validates email format
CREATE POLICY "Anyone can subscribe to newsletter secure"
ON public.newsletter_subscribers
FOR INSERT
TO anon, authenticated
WITH CHECK (
  email IS NOT NULL 
  AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
);