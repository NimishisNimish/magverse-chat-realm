-- Update verification_codes table to support password reset
ALTER TABLE verification_codes 
ADD COLUMN IF NOT EXISTS purpose TEXT DEFAULT 'signup';

-- Add index for faster OTP lookups
CREATE INDEX IF NOT EXISTS idx_verification_codes_lookup 
ON verification_codes(user_id, code, purpose, expires_at);

-- Create rate limiting table
CREATE TABLE IF NOT EXISTS password_reset_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  method TEXT NOT NULL
);

-- Create index for rate limit checks
CREATE INDEX IF NOT EXISTS idx_reset_attempts_email 
ON password_reset_attempts(email, created_at DESC);

-- Enable RLS on password_reset_attempts
ALTER TABLE password_reset_attempts ENABLE ROW LEVEL SECURITY;

-- Function to check rate limit
CREATE OR REPLACE FUNCTION check_reset_rate_limit(p_email TEXT)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attempt_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO attempt_count
  FROM password_reset_attempts
  WHERE email = p_email
    AND created_at > NOW() - INTERVAL '1 hour';
  
  RETURN attempt_count < 3;
END;
$$;