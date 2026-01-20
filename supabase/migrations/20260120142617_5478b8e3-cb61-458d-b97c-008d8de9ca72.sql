-- Drop the existing function first to change return type
DROP FUNCTION IF EXISTS public.get_my_secure_profile();

-- Recreate get_my_secure_profile function with updated return type
CREATE FUNCTION public.get_my_secure_profile()
RETURNS TABLE (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz,
  is_pro boolean,
  credits_remaining integer,
  monthly_credits integer,
  monthly_credits_used integer,
  phone_verified boolean,
  phone_verified_at timestamptz,
  subscription_type text,
  subscription_expires_at timestamptz,
  email_digest_enabled boolean,
  email_welcome_enabled boolean,
  email_invoices_enabled boolean,
  email_marketing_enabled boolean,
  email_system_enabled boolean,
  email_credit_alerts_enabled boolean,
  theme_preferences jsonb,
  animation_preferences jsonb,
  phone_number_decrypted text,
  phone_number_masked text,
  recovery_email_decrypted text,
  recovery_email_masked text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_phone_decrypted text;
  v_email_decrypted text;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Decrypt sensitive fields for the authenticated user only
  SELECT 
    CASE 
      WHEN p.phone_number_encrypted IS NOT NULL 
      THEN decrypt_sensitive_data(encode(p.phone_number_encrypted, 'base64'), v_user_id::text)
      ELSE NULL 
    END,
    CASE 
      WHEN p.recovery_email_encrypted IS NOT NULL 
      THEN decrypt_sensitive_data(encode(p.recovery_email_encrypted, 'base64'), v_user_id::text)
      ELSE NULL 
    END
  INTO v_phone_decrypted, v_email_decrypted
  FROM profiles p
  WHERE p.id = v_user_id;
  
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.bio,
    p.created_at,
    p.is_pro,
    p.credits_remaining,
    p.monthly_credits,
    p.monthly_credits_used,
    p.phone_verified,
    p.phone_verified_at,
    p.subscription_type,
    p.subscription_expires_at,
    p.email_digest_enabled,
    p.email_welcome_enabled,
    p.email_invoices_enabled,
    p.email_marketing_enabled,
    p.email_system_enabled,
    p.email_credit_alerts_enabled,
    p.theme_preferences,
    p.animation_preferences,
    v_phone_decrypted,
    CASE 
      WHEN v_phone_decrypted IS NOT NULL AND length(v_phone_decrypted) > 4 
      THEN '****' || right(v_phone_decrypted, 4)
      ELSE NULL 
    END,
    v_email_decrypted,
    CASE 
      WHEN v_email_decrypted IS NOT NULL AND position('@' in v_email_decrypted) > 2
      THEN left(v_email_decrypted, 2) || '***' || substring(v_email_decrypted from position('@' in v_email_decrypted))
      ELSE NULL 
    END
  FROM profiles p
  WHERE p.id = v_user_id;
END;
$$;