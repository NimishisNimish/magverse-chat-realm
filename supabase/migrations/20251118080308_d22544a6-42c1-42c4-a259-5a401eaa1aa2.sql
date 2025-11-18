-- Phase 1: Add email preference columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_welcome_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS email_invoices_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS email_marketing_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS email_system_enabled BOOLEAN DEFAULT true;

-- Phase 2: Add database indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_created 
  ON public.chat_messages(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_role_user 
  ON public.chat_messages(role, user_id);

CREATE INDEX IF NOT EXISTS idx_chat_history_user_created 
  ON public.chat_history(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_model_created
  ON public.chat_messages(model, created_at DESC);

-- Phase 3: Create function to get dashboard stats efficiently
CREATE OR REPLACE FUNCTION public.get_user_dashboard_stats(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_total_messages integer;
  v_total_chats integer;
  v_messages_this_month integer;
  v_favorite_model text;
BEGIN
  -- Get total messages
  SELECT COUNT(*) INTO v_total_messages
  FROM chat_messages 
  WHERE user_id = p_user_id;
  
  -- Get total chats
  SELECT COUNT(*) INTO v_total_chats
  FROM chat_history 
  WHERE user_id = p_user_id;
  
  -- Get messages this month
  SELECT COUNT(*) INTO v_messages_this_month
  FROM chat_messages 
  WHERE user_id = p_user_id 
    AND created_at >= date_trunc('month', CURRENT_DATE);
  
  -- Get favorite model
  SELECT model INTO v_favorite_model
  FROM chat_messages 
  WHERE user_id = p_user_id AND model IS NOT NULL
  GROUP BY model 
  ORDER BY COUNT(*) DESC 
  LIMIT 1;
  
  -- Build result
  v_result := jsonb_build_object(
    'total_messages', COALESCE(v_total_messages, 0),
    'total_chats', COALESCE(v_total_chats, 0),
    'messages_this_month', COALESCE(v_messages_this_month, 0),
    'favorite_model', COALESCE(v_favorite_model, 'None')
  );
  
  RETURN v_result;
END;
$$;

-- Phase 4: Create welcome email trigger
CREATE OR REPLACE FUNCTION public.send_welcome_email_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into email campaigns queue
  INSERT INTO public.email_campaigns (
    user_id,
    campaign_type,
    email_type,
    status,
    metadata
  ) VALUES (
    NEW.id,
    'welcome',
    'welcome',
    'pending',
    jsonb_build_object('display_name', NEW.display_name)
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger on profile creation
DROP TRIGGER IF EXISTS on_profile_created_welcome_email ON public.profiles;
CREATE TRIGGER on_profile_created_welcome_email
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.send_welcome_email_trigger();