-- Add subscription-related columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN subscription_type text DEFAULT 'free' CHECK (subscription_type IN ('free', 'monthly', 'lifetime')),
ADD COLUMN subscription_expires_at timestamp with time zone,
ADD COLUMN monthly_credits integer DEFAULT 0,
ADD COLUMN monthly_credits_used integer DEFAULT 0;

-- Migrate existing users
UPDATE public.profiles
SET subscription_type = CASE 
  WHEN is_pro = true THEN 'lifetime'
  ELSE 'free'
END;

-- Add plan tracking to transactions table
ALTER TABLE public.transactions
ADD COLUMN plan_type text CHECK (plan_type IN ('lifetime', 'monthly')),
ADD COLUMN subscription_period_start timestamp with time zone,
ADD COLUMN subscription_period_end timestamp with time zone;

-- Update the credit checking function to handle monthly subscriptions
CREATE OR REPLACE FUNCTION public.check_and_deduct_credit(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_subscription_type TEXT;
  v_subscription_expires_at TIMESTAMP WITH TIME ZONE;
  v_monthly_credits INTEGER;
  v_monthly_credits_used INTEGER;
  v_credits INTEGER;
BEGIN
  SELECT subscription_type, subscription_expires_at, monthly_credits, monthly_credits_used, credits_remaining
  INTO v_subscription_type, v_subscription_expires_at, v_monthly_credits, v_monthly_credits_used, v_credits
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- Lifetime Pro users have unlimited credits
  IF v_subscription_type = 'lifetime' THEN
    RETURN TRUE;
  END IF;
  
  -- Monthly subscription users
  IF v_subscription_type = 'monthly' THEN
    -- Check if subscription expired
    IF v_subscription_expires_at < NOW() THEN
      -- Revert to free plan
      UPDATE public.profiles
      SET subscription_type = 'free',
          monthly_credits = 0,
          monthly_credits_used = 0
      WHERE id = p_user_id;
      v_subscription_type := 'free';
    ELSIF v_monthly_credits_used < v_monthly_credits THEN
      -- Has monthly credits available
      UPDATE public.profiles
      SET monthly_credits_used = monthly_credits_used + 1
      WHERE id = p_user_id;
      RETURN TRUE;
    ELSE
      -- Monthly limit reached
      RETURN FALSE;
    END IF;
  END IF;
  
  -- Free plan users (including expired monthly)
  IF v_credits > 0 THEN
    UPDATE public.profiles
    SET credits_remaining = credits_remaining - 1
    WHERE id = p_user_id;
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$function$;

-- Create function to check for expiring subscriptions (for cron job)
CREATE OR REPLACE FUNCTION public.expire_monthly_subscriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Expire monthly subscriptions that have passed their expiry date
  UPDATE public.profiles
  SET subscription_type = 'free',
      monthly_credits = 0,
      monthly_credits_used = 0
  WHERE subscription_type = 'monthly'
    AND subscription_expires_at < NOW();
END;
$function$;