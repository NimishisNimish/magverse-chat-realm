-- Make all existing users Pro with unlimited access
UPDATE profiles 
SET 
  is_pro = true,
  subscription_type = 'lifetime',
  credits_remaining = 999999,
  monthly_credits = 999999
WHERE is_pro = false OR subscription_type != 'lifetime';

-- Update the handle_new_user function to auto-assign Pro status
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (
    id, 
    created_at, 
    is_pro, 
    subscription_type,
    credits_remaining,
    monthly_credits
  )
  VALUES (
    NEW.id, 
    NOW(), 
    true,  -- Auto Pro
    'lifetime',  -- Auto lifetime subscription
    999999,  -- Unlimited credits
    999999   -- Unlimited monthly credits
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$function$;