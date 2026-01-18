-- Fix 1: Add RLS policies to profiles_safe view
-- Views inherit RLS from the underlying table when queried, but we need explicit policies
-- Since profiles_safe is a view, we'll recreate it with proper security

-- Drop existing view and recreate with SECURITY INVOKER (default)
DROP VIEW IF EXISTS public.profiles_safe;

-- Recreate the profiles_safe view without sensitive fields
CREATE VIEW public.profiles_safe AS
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
COMMENT ON VIEW public.profiles_safe IS 'Safe view of profiles excluding encrypted sensitive data. Inherits RLS from profiles table.';

-- Grant access to authenticated users only (not anon)
REVOKE ALL ON public.profiles_safe FROM anon;
GRANT SELECT ON public.profiles_safe TO authenticated;