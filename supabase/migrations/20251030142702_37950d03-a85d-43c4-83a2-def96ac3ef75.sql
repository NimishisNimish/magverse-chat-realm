-- Add phone verification columns to profiles (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'phone_verified') THEN
    ALTER TABLE public.profiles ADD COLUMN phone_verified BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'phone_verified_at') THEN
    ALTER TABLE public.profiles ADD COLUMN phone_verified_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Create index for phone number lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number ON public.profiles(phone_number) WHERE phone_number IS NOT NULL;

-- Add phone number to password reset attempts (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'password_reset_attempts' AND column_name = 'phone_number') THEN
    ALTER TABLE public.password_reset_attempts ADD COLUMN phone_number TEXT;
  END IF;
END $$;

-- Create phone verification codes table
CREATE TABLE IF NOT EXISTS public.phone_verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  code TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'password_reset',
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  attempts INTEGER DEFAULT 0
);

-- Enable RLS on phone verification codes
ALTER TABLE public.phone_verification_codes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own phone codes" ON public.phone_verification_codes;
DROP POLICY IF EXISTS "Users can insert phone codes" ON public.phone_verification_codes;
DROP POLICY IF EXISTS "Users can update own phone codes" ON public.phone_verification_codes;

-- RLS policies for phone verification codes
CREATE POLICY "Users can view own phone codes"
  ON public.phone_verification_codes
  FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "Users can insert phone codes"
  ON public.phone_verification_codes
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own phone codes"
  ON public.phone_verification_codes
  FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() IS NULL);

-- Function to clean up expired phone verification codes
CREATE OR REPLACE FUNCTION public.cleanup_expired_phone_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.phone_verification_codes
  WHERE expires_at < NOW();
END;
$$;

-- Function to check phone reset rate limit
CREATE OR REPLACE FUNCTION public.check_phone_reset_rate_limit(p_phone TEXT)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  attempt_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO attempt_count
  FROM password_reset_attempts
  WHERE phone_number = p_phone
    AND created_at > NOW() - INTERVAL '1 hour';
  
  RETURN attempt_count < 3;
END;
$$;