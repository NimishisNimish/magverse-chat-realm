-- Add phone number columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN phone_number TEXT UNIQUE,
ADD COLUMN phone_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN phone_verified_at TIMESTAMP WITH TIME ZONE;

-- Create index for phone number lookups
CREATE INDEX idx_profiles_phone_number ON public.profiles(phone_number) WHERE phone_number IS NOT NULL;

-- Add phone number to password reset attempts
ALTER TABLE public.password_reset_attempts 
ADD COLUMN phone_number TEXT;

-- Create phone verification codes table
CREATE TABLE public.phone_verification_codes (
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