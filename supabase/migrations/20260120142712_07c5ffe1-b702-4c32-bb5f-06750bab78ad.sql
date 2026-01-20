-- Drop the trigger
DROP TRIGGER IF EXISTS encrypt_profile_fields_trigger ON public.profiles;

-- Drop the trigger function
DROP FUNCTION IF EXISTS public.encrypt_profile_sensitive_fields() CASCADE;

-- Now drop the plain text columns
ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone_number CASCADE;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS recovery_email CASCADE;

-- Recreate profiles_safe view (in case it was affected by CASCADE)
DROP VIEW IF EXISTS public.profiles_safe;

CREATE VIEW public.profiles_safe
WITH (security_invoker = true)
AS SELECT
  id,
  created_at,
  is_pro,
  credits_remaining,
  monthly_credits,
  monthly_credits_used,
  last_credit_reset,
  phone_verified,
  phone_verified_at,
  subscription_type,
  subscription_expires_at,
  username,
  display_name,
  avatar_url,
  bio,
  email_digest_enabled,
  email_welcome_enabled,
  email_invoices_enabled,
  email_marketing_enabled,
  email_system_enabled,
  email_credit_alerts_enabled,
  theme_preferences,
  animation_preferences
FROM public.profiles;

-- Revoke direct access to profiles_safe from anon
REVOKE ALL ON public.profiles_safe FROM anon;

-- Grant select to authenticated users
GRANT SELECT ON public.profiles_safe TO authenticated;