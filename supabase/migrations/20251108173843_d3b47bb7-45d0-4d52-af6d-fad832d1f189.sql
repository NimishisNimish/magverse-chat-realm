-- Add function to handle daily credit reset and deduction for Yearly Pro users
CREATE OR REPLACE FUNCTION public.check_and_deduct_yearly_credit(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription_type TEXT;
  v_monthly_credits INT;
  v_monthly_credits_used INT;
  v_last_credit_reset TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get user profile
  SELECT subscription_type, monthly_credits, monthly_credits_used, last_credit_reset
  INTO v_subscription_type, v_monthly_credits, v_monthly_credits_used, v_last_credit_reset
  FROM profiles
  WHERE id = p_user_id;

  -- Only process for yearly pro users
  IF v_subscription_type != 'monthly' THEN
    RETURN TRUE; -- Allow unlimited for free (handled elsewhere) and lifetime users
  END IF;

  -- Check if we need to reset daily credits (if last reset was before today)
  IF v_last_credit_reset IS NULL OR DATE(v_last_credit_reset) < CURRENT_DATE THEN
    -- Reset credits for new day
    UPDATE profiles
    SET monthly_credits_used = 0,
        last_credit_reset = NOW()
    WHERE id = p_user_id;
    
    v_monthly_credits_used := 0;
  END IF;

  -- Check if user has credits remaining (50 per day for yearly pro)
  IF v_monthly_credits_used >= 50 THEN
    RETURN FALSE; -- No credits remaining
  END IF;

  -- Deduct one credit
  UPDATE profiles
  SET monthly_credits_used = monthly_credits_used + 1
  WHERE id = p_user_id;

  RETURN TRUE;
END;
$$;