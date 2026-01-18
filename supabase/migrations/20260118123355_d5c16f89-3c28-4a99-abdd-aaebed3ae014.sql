-- Fix the SECURITY DEFINER view issue by making it SECURITY INVOKER
-- Drop and recreate the view with explicit SECURITY INVOKER

DROP VIEW IF EXISTS public.profiles_safe;

-- Recreate the profiles_safe view with SECURITY INVOKER (queries run as the calling user)
CREATE VIEW public.profiles_safe 
WITH (security_invoker = true)
AS
SELECT 
  id,
  created_at,
  is_pro,
  subscription_type,
  subscription_expires_at,
  credits_remaining,
  monthly_credits,
  monthly_credits_used,
  last_credit_reset,
  phone_verified,
  phone_verified_at,
  email_credit_alerts_enabled,
  email_digest_enabled,
  email_invoices_enabled,
  email_marketing_enabled,
  email_system_enabled,
  email_welcome_enabled,
  theme_preferences,
  animation_preferences,
  username,
  display_name,
  avatar_url,
  bio
FROM public.profiles;

-- Add comment explaining security
COMMENT ON VIEW public.profiles_safe IS 'Safe view of profiles excluding encrypted sensitive data. Uses SECURITY INVOKER so RLS from profiles table is enforced for each querying user.';

-- Grant access to authenticated users only (not anon)
REVOKE ALL ON public.profiles_safe FROM anon;
GRANT SELECT ON public.profiles_safe TO authenticated;