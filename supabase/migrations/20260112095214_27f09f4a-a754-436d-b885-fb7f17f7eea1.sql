-- Create a public-facing view that excludes sensitive encrypted fields
-- This is what the app should use for most profile queries
CREATE OR REPLACE VIEW public.profiles_safe AS
SELECT 
  id,
  username,
  display_name,
  avatar_url,
  bio,
  is_pro,
  subscription_type,
  subscription_expires_at,
  credits_remaining,
  monthly_credits,
  monthly_credits_used,
  last_credit_reset,
  phone_verified,
  phone_verified_at,
  -- Email preferences (non-sensitive)
  email_credit_alerts_enabled,
  email_digest_enabled,
  email_invoices_enabled,
  email_marketing_enabled,
  email_system_enabled,
  email_welcome_enabled,
  -- Preferences
  theme_preferences,
  animation_preferences,
  created_at
  -- EXCLUDED: phone_number, phone_number_encrypted, recovery_email, recovery_email_encrypted
  -- EXCLUDED: last_email_change, last_password_change, last_phone_change, last_digest_sent
FROM public.profiles;

-- Set security invoker to use caller's permissions
ALTER VIEW public.profiles_safe SET (security_invoker = on);

-- Grant access to the safe view
GRANT SELECT ON public.profiles_safe TO authenticated;

-- Create RLS-style policy simulation via the view
-- The view inherits RLS from the base profiles table

-- Update existing function or create new one for sensitive data access
-- This function allows users to get ONLY their own sensitive data
CREATE OR REPLACE FUNCTION public.get_my_sensitive_profile_data()
RETURNS TABLE (
  phone_number_decrypted text,
  recovery_email_decrypted text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only return data for the authenticated user
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  RETURN QUERY
  SELECT 
    CASE 
      WHEN p.phone_number_encrypted IS NOT NULL THEN 
        public.decrypt_sensitive_data(p.phone_number_encrypted, auth.uid()::text)
      ELSE p.phone_number
    END as phone_number_decrypted,
    CASE 
      WHEN p.recovery_email_encrypted IS NOT NULL THEN 
        public.decrypt_sensitive_data(p.recovery_email_encrypted, auth.uid()::text)
      ELSE p.recovery_email
    END as recovery_email_decrypted
  FROM public.profiles p
  WHERE p.id = auth.uid();
END;
$$;

-- Revoke direct execute from anon, only authenticated users can call this
REVOKE EXECUTE ON FUNCTION public.get_my_sensitive_profile_data() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_sensitive_profile_data() TO authenticated;

-- Add comments for documentation
COMMENT ON VIEW public.profiles_safe IS 'Safe public view of profiles excluding encrypted PII fields (phone_number_encrypted, recovery_email_encrypted)';
COMMENT ON FUNCTION public.get_my_sensitive_profile_data() IS 'Securely retrieve own sensitive profile data (phone, recovery email) - requires authentication';