-- Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create encryption key storage (the actual key should be set via environment variable in edge functions)
-- For database-level encryption, we'll use a simpler approach with column-level obfuscation
-- The sensitive data will be encrypted at rest and only decrypted for the owning user

-- Create a function to encrypt sensitive data using pgp_sym_encrypt
-- The encryption key is derived from a server-side secret + user_id for additional security
CREATE OR REPLACE FUNCTION public.encrypt_sensitive_data(data text, user_id uuid)
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key text;
BEGIN
  -- Use a combination of a fixed secret and user_id for per-user encryption
  -- In production, the base secret should come from an environment variable
  encryption_key := 'magverse_encryption_key_v1_' || user_id::text;
  RETURN pgp_sym_encrypt(data, encryption_key);
END;
$$;

-- Create a function to decrypt sensitive data
CREATE OR REPLACE FUNCTION public.decrypt_sensitive_data(encrypted_data bytea, user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key text;
BEGIN
  IF encrypted_data IS NULL THEN
    RETURN NULL;
  END IF;
  
  encryption_key := 'magverse_encryption_key_v1_' || user_id::text;
  RETURN pgp_sym_decrypt(encrypted_data, encryption_key);
EXCEPTION
  WHEN OTHERS THEN
    -- Return NULL if decryption fails (e.g., wrong key or corrupted data)
    RETURN NULL;
END;
$$;

-- Add encrypted columns for sensitive data
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone_number_encrypted bytea,
ADD COLUMN IF NOT EXISTS recovery_email_encrypted bytea;

-- Create a trigger function to automatically encrypt phone_number and recovery_email on insert/update
CREATE OR REPLACE FUNCTION public.encrypt_profile_sensitive_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Encrypt phone_number if it's being set
  IF NEW.phone_number IS NOT NULL AND NEW.phone_number != '' THEN
    NEW.phone_number_encrypted := public.encrypt_sensitive_data(NEW.phone_number, NEW.id);
    -- Keep a masked version in the original column for display purposes
    NEW.phone_number := CASE 
      WHEN length(NEW.phone_number) > 4 
      THEN '****' || right(NEW.phone_number, 4)
      ELSE '****'
    END;
  END IF;
  
  -- Encrypt recovery_email if it's being set
  IF NEW.recovery_email IS NOT NULL AND NEW.recovery_email != '' THEN
    NEW.recovery_email_encrypted := public.encrypt_sensitive_data(NEW.recovery_email, NEW.id);
    -- Keep a masked version in the original column for display purposes
    NEW.recovery_email := CASE 
      WHEN position('@' in NEW.recovery_email) > 0 
      THEN left(split_part(NEW.recovery_email, '@', 1), 2) || '***@' || split_part(NEW.recovery_email, '@', 2)
      ELSE '***'
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger (drop if exists first to avoid duplicates)
DROP TRIGGER IF EXISTS encrypt_profile_fields_trigger ON public.profiles;
CREATE TRIGGER encrypt_profile_fields_trigger
  BEFORE INSERT OR UPDATE OF phone_number, recovery_email
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_profile_sensitive_fields();

-- Create a secure function for users to get their own decrypted sensitive data
CREATE OR REPLACE FUNCTION public.get_my_sensitive_profile_data()
RETURNS TABLE(
  phone_number_decrypted text,
  recovery_email_decrypted text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only return data for the authenticated user
  RETURN QUERY
  SELECT 
    public.decrypt_sensitive_data(p.phone_number_encrypted, p.id),
    public.decrypt_sensitive_data(p.recovery_email_encrypted, p.id)
  FROM public.profiles p
  WHERE p.id = auth.uid();
END;
$$;

-- Revoke direct access to encryption/decryption functions from public
REVOKE ALL ON FUNCTION public.encrypt_sensitive_data(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decrypt_sensitive_data(bytea, uuid) FROM PUBLIC;

-- Only allow authenticated users to call get_my_sensitive_profile_data
GRANT EXECUTE ON FUNCTION public.get_my_sensitive_profile_data() TO authenticated;