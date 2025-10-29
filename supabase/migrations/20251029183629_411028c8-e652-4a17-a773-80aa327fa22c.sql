-- Upgrade nimishkalsi1@gmail.com to Pro with lifetime unlimited credits
UPDATE public.profiles 
SET 
  is_pro = true,
  credits_remaining = -1
WHERE email = 'nimishkalsi1@gmail.com';

-- Mark the most recent pending transaction as completed
WITH latest_transaction AS (
  SELECT id 
  FROM public.transactions 
  WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'nimishkalsi1@gmail.com')
    AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1
)
UPDATE public.transactions 
SET 
  status = 'completed',
  payment_id = 'manual_upgrade_lifetime'
WHERE id IN (SELECT id FROM latest_transaction);