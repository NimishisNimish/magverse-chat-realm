-- Strengthen profiles table security
-- The plaintext columns contain masked values (from encrypt_profile_fields_trigger)
-- Ensure encrypted columns are protected and only accessible to the owner

-- Drop existing anon policies to completely block anonymous access
DROP POLICY IF EXISTS "Anon cannot read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anon cannot insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anon cannot update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anon cannot delete profiles" ON public.profiles;

-- Recreate anon policies with explicit denial
CREATE POLICY "Anon cannot access profiles"
ON public.profiles
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Ensure the user profile view doesn't leak encrypted bytea data
-- Create a secure function that only returns profile data for the authenticated user
CREATE OR REPLACE FUNCTION public.get_my_secure_profile()
RETURNS TABLE (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  bio text,
  is_pro boolean,
  credits_remaining integer,
  monthly_credits integer,
  monthly_credits_used integer,
  subscription_type text,
  subscription_expires_at timestamptz,
  phone_verified boolean,
  phone_verified_at timestamptz,
  phone_number_masked text,
  recovery_email_masked text,
  phone_number_decrypted text,
  recovery_email_decrypted text,
  theme_preferences jsonb,
  animation_preferences jsonb,
  email_digest_enabled boolean,
  email_welcome_enabled boolean,
  email_invoices_enabled boolean,
  email_marketing_enabled boolean,
  email_system_enabled boolean,
  email_credit_alerts_enabled boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.bio,
    p.is_pro,
    p.credits_remaining,
    p.monthly_credits,
    p.monthly_credits_used,
    p.subscription_type,
    p.subscription_expires_at,
    p.phone_verified,
    p.phone_verified_at,
    p.phone_number as phone_number_masked,
    p.recovery_email as recovery_email_masked,
    public.decrypt_sensitive_data(p.phone_number_encrypted::text, p.id::text) as phone_number_decrypted,
    public.decrypt_sensitive_data(p.recovery_email_encrypted::text, p.id::text) as recovery_email_decrypted,
    p.theme_preferences,
    p.animation_preferences,
    p.email_digest_enabled,
    p.email_welcome_enabled,
    p.email_invoices_enabled,
    p.email_marketing_enabled,
    p.email_system_enabled,
    p.email_credit_alerts_enabled,
    p.created_at
  FROM public.profiles p
  WHERE p.id = auth.uid();
END;
$$;

-- Add comments to clarify the security model
COMMENT ON TABLE public.profiles IS 'User profiles with encrypted sensitive data. phone_number and recovery_email columns contain masked values only. Actual data is in _encrypted columns and accessed via get_my_secure_profile() function.';
COMMENT ON COLUMN public.profiles.phone_number IS 'Masked phone number (last 4 digits only) - actual value is encrypted in phone_number_encrypted';
COMMENT ON COLUMN public.profiles.recovery_email IS 'Masked recovery email - actual value is encrypted in recovery_email_encrypted';
COMMENT ON COLUMN public.profiles.phone_number_encrypted IS 'PGP encrypted phone number - use get_my_secure_profile() to access decrypted value';
COMMENT ON COLUMN public.profiles.recovery_email_encrypted IS 'PGP encrypted recovery email - use get_my_secure_profile() to access decrypted value';