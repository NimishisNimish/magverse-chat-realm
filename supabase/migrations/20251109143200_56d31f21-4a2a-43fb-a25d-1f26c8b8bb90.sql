-- Create function to check and deduct credits based on action type
CREATE OR REPLACE FUNCTION public.check_and_deduct_credits(
  p_user_id uuid,
  p_credits_to_deduct integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_subscription_type TEXT;
  v_monthly_credits_used INTEGER;
  v_credits_remaining INTEGER;
  v_monthly_credits INTEGER;
  v_subscription_expires_at TIMESTAMP WITH TIME ZONE;
  v_last_credit_reset TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get user profile
  SELECT 
    subscription_type, 
    monthly_credits_used, 
    credits_remaining, 
    monthly_credits,
    subscription_expires_at,
    last_credit_reset
  INTO 
    v_subscription_type, 
    v_monthly_credits_used, 
    v_credits_remaining, 
    v_monthly_credits,
    v_subscription_expires_at,
    v_last_credit_reset
  FROM profiles
  WHERE id = p_user_id;
  
  -- Check if user exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found',
      'credits_remaining', 0
    );
  END IF;
  
  -- Lifetime users have unlimited credits
  IF v_subscription_type = 'lifetime' THEN
    RETURN jsonb_build_object(
      'success', true,
      'credits_remaining', -1,
      'subscription_type', 'lifetime',
      'unlimited', true
    );
  END IF;
  
  -- Yearly/Monthly Pro users (500 messages per day)
  IF v_subscription_type = 'monthly' THEN
    -- Check if subscription expired
    IF v_subscription_expires_at IS NOT NULL AND v_subscription_expires_at < NOW() THEN
      -- Revert to free plan
      UPDATE profiles
      SET subscription_type = 'free',
          monthly_credits = 0,
          monthly_credits_used = 0
      WHERE id = p_user_id;
      
      v_subscription_type := 'free';
      v_credits_remaining := 5; -- Reset to free tier credits
    ELSE
      -- Check if we need to reset daily credits
      IF v_last_credit_reset IS NULL OR DATE(v_last_credit_reset) < CURRENT_DATE THEN
        UPDATE profiles
        SET monthly_credits_used = 0,
            last_credit_reset = NOW()
        WHERE id = p_user_id;
        
        v_monthly_credits_used := 0;
      END IF;
      
      -- Check if user has enough daily credits (500 per day)
      IF (v_monthly_credits_used + p_credits_to_deduct) <= 500 THEN
        UPDATE profiles
        SET monthly_credits_used = monthly_credits_used + p_credits_to_deduct
        WHERE id = p_user_id;
        
        RETURN jsonb_build_object(
          'success', true,
          'credits_remaining', 500 - (v_monthly_credits_used + p_credits_to_deduct),
          'subscription_type', 'monthly',
          'daily_limit', 500,
          'credits_used_today', v_monthly_credits_used + p_credits_to_deduct
        );
      ELSE
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Daily limit reached',
          'credits_remaining', 0,
          'subscription_type', 'monthly',
          'daily_limit', 500,
          'credits_used_today', v_monthly_credits_used
        );
      END IF;
    END IF;
  END IF;
  
  -- Free users (5 credits per day)
  IF v_subscription_type = 'free' THEN
    -- Check if we need to reset daily credits
    IF v_last_credit_reset IS NULL OR DATE(v_last_credit_reset) < CURRENT_DATE THEN
      UPDATE profiles
      SET credits_remaining = 5,
          last_credit_reset = NOW()
      WHERE id = p_user_id;
      
      v_credits_remaining := 5;
    END IF;
    
    IF v_credits_remaining >= p_credits_to_deduct THEN
      UPDATE profiles
      SET credits_remaining = credits_remaining - p_credits_to_deduct
      WHERE id = p_user_id;
      
      RETURN jsonb_build_object(
        'success', true,
        'credits_remaining', v_credits_remaining - p_credits_to_deduct,
        'subscription_type', 'free',
        'daily_limit', 5
      );
    ELSE
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Insufficient credits',
        'credits_remaining', v_credits_remaining,
        'subscription_type', 'free',
        'daily_limit', 5,
        'credits_required', p_credits_to_deduct
      );
    END IF;
  END IF;
  
  -- Fallback
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Unknown subscription type',
    'credits_remaining', 0
  );
END;
$$;