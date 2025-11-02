-- Add audit columns to profiles table for security tracking
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_email_change timestamp with time zone,
ADD COLUMN IF NOT EXISTS last_password_change timestamp with time zone,
ADD COLUMN IF NOT EXISTS last_phone_change timestamp with time zone;

-- Create email change verification codes table
CREATE TABLE IF NOT EXISTS public.email_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  new_email text NOT NULL,
  verification_code text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  verified boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on email_change_requests
ALTER TABLE public.email_change_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_change_requests
CREATE POLICY "Users can view own email change requests"
  ON public.email_change_requests
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own email change requests"
  ON public.email_change_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own email change requests"
  ON public.email_change_requests
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create function to cleanup old email change requests
CREATE OR REPLACE FUNCTION public.cleanup_expired_email_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.email_change_requests
  WHERE expires_at < NOW();
END;
$$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_change_requests_user_id ON public.email_change_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_email_change_requests_expires_at ON public.email_change_requests(expires_at);