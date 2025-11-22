-- Add email credit alerts preference to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email_credit_alerts_enabled boolean DEFAULT true;

-- Update existing users to have credit alerts enabled by default
UPDATE public.profiles
SET email_credit_alerts_enabled = true
WHERE email_credit_alerts_enabled IS NULL;