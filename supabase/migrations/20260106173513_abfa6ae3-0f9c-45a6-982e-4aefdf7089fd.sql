-- Fix overly permissive INSERT policy on model_health_history
-- Only admins should be able to insert model health records (monitoring data)

DROP POLICY IF EXISTS "Authenticated users can insert model health history" ON public.model_health_history;

-- Create admin-only INSERT policy
CREATE POLICY "Admins can insert model health history"
ON public.model_health_history
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'::public.app_role
  )
);