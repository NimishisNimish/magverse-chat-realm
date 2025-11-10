-- ============================================
-- AI RESPONSE FEEDBACK SYSTEM
-- ============================================

-- Create feedback table for AI responses
CREATE TABLE IF NOT EXISTS public.ai_response_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id UUID REFERENCES public.chat_history(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  rating VARCHAR(10) CHECK (rating IN ('positive', 'negative')),
  comment TEXT,
  model VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ai_response_feedback ENABLE ROW LEVEL SECURITY;

-- Users can create feedback for their own messages
CREATE POLICY "Users can create their own feedback"
ON public.ai_response_feedback
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own feedback
CREATE POLICY "Users can view their own feedback"
ON public.ai_response_feedback
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own feedback
CREATE POLICY "Users can update their own feedback"
ON public.ai_response_feedback
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view all feedback
CREATE POLICY "Admins can view all feedback"
ON public.ai_response_feedback
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create index for faster queries
CREATE INDEX idx_feedback_user_id ON public.ai_response_feedback(user_id);
CREATE INDEX idx_feedback_rating ON public.ai_response_feedback(rating);
CREATE INDEX idx_feedback_created_at ON public.ai_response_feedback(created_at DESC);

-- ============================================
-- EMAIL CAMPAIGNS TRACKING
-- ============================================

-- Create email campaigns table
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_type VARCHAR(50) NOT NULL CHECK (campaign_type IN ('welcome', 're_engagement', 'upsell', 'reminder')),
  email_type VARCHAR(50) NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'opened', 'clicked', 'failed')),
  metadata JSONB
);

-- Enable RLS
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

-- Only admins can view email campaigns
CREATE POLICY "Admins can view email campaigns"
ON public.email_campaigns
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create indexes
CREATE INDEX idx_campaigns_user_id ON public.email_campaigns(user_id);
CREATE INDEX idx_campaigns_type ON public.email_campaigns(campaign_type);
CREATE INDEX idx_campaigns_sent_at ON public.email_campaigns(sent_at DESC);

-- ============================================
-- AI CUSTOM INSTRUCTIONS
-- ============================================

-- Create custom instructions table
CREATE TABLE IF NOT EXISTS public.ai_custom_instructions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instructions TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT one_active_per_user UNIQUE (user_id, is_active)
);

-- Enable RLS
ALTER TABLE public.ai_custom_instructions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own instructions
CREATE POLICY "Users can view their own instructions"
ON public.ai_custom_instructions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own instructions"
ON public.ai_custom_instructions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own instructions"
ON public.ai_custom_instructions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own instructions"
ON public.ai_custom_instructions
FOR DELETE
USING (auth.uid() = user_id);

-- Create index
CREATE INDEX idx_custom_instructions_user_id ON public.ai_custom_instructions(user_id);
CREATE INDEX idx_custom_instructions_active ON public.ai_custom_instructions(is_active) WHERE is_active = TRUE;

-- ============================================
-- ADMIN NOTIFICATIONS
-- ============================================

-- Create admin notifications table
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('new_signup', 'payment', 'high_activity', 'system')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Only admins can view notifications
CREATE POLICY "Admins can view notifications"
ON public.admin_notifications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Admins can update notifications (mark as read)
CREATE POLICY "Admins can update notifications"
ON public.admin_notifications
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create indexes
CREATE INDEX idx_notifications_type ON public.admin_notifications(notification_type);
CREATE INDEX idx_notifications_read ON public.admin_notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.admin_notifications(created_at DESC);

-- ============================================
-- TRIGGERS FOR REAL-TIME NOTIFICATIONS
-- ============================================

-- Function to create admin notification on new signup
CREATE OR REPLACE FUNCTION public.notify_admin_new_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.admin_notifications (
    notification_type,
    title,
    message,
    user_id,
    metadata
  ) VALUES (
    'new_signup',
    'New User Signup',
    'A new user has signed up: ' || COALESCE(NEW.display_name, NEW.username, 'Unknown'),
    NEW.id,
    jsonb_build_object('subscription_type', NEW.subscription_type)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger on new profile creation
CREATE TRIGGER trigger_notify_admin_new_signup
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.notify_admin_new_signup();

-- Function to create admin notification on payment
CREATE OR REPLACE FUNCTION public.notify_admin_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_display_name TEXT;
BEGIN
  -- Only notify for verified/completed payments
  IF NEW.status IN ('verified', 'completed') THEN
    SELECT display_name INTO v_display_name
    FROM public.profiles
    WHERE id = NEW.user_id;
    
    INSERT INTO public.admin_notifications (
      notification_type,
      title,
      message,
      user_id,
      metadata
    ) VALUES (
      'payment',
      'Payment Received',
      'Payment of ₹' || NEW.amount || ' received from ' || COALESCE(v_display_name, 'Unknown'),
      NEW.user_id,
      jsonb_build_object('amount', NEW.amount, 'plan_type', NEW.plan_type, 'transaction_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger on transaction updates
CREATE TRIGGER trigger_notify_admin_payment
AFTER UPDATE ON public.transactions
FOR EACH ROW
WHEN (NEW.status IN ('verified', 'completed') AND OLD.status != NEW.status)
EXECUTE FUNCTION public.notify_admin_payment();

-- Function to notify admin of high-value activity (100+ messages in a day)
CREATE OR REPLACE FUNCTION public.check_high_activity()
RETURNS void AS $$
DECLARE
  v_record RECORD;
BEGIN
  FOR v_record IN
    SELECT 
      cm.user_id,
      p.display_name,
      COUNT(*) as message_count
    FROM public.chat_messages cm
    JOIN public.profiles p ON p.id = cm.user_id
    WHERE cm.created_at >= NOW() - INTERVAL '24 hours'
    GROUP BY cm.user_id, p.display_name
    HAVING COUNT(*) >= 100
  LOOP
    INSERT INTO public.admin_notifications (
      notification_type,
      title,
      message,
      user_id,
      metadata
    ) VALUES (
      'high_activity',
      'High Activity Detected',
      COALESCE(v_record.display_name, 'User') || ' sent ' || v_record.message_count || ' messages in the last 24 hours',
      v_record.user_id,
      jsonb_build_object('message_count', v_record.message_count)
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================
-- ENABLE REALTIME FOR ADMIN DASHBOARD
-- ============================================

-- Enable realtime for admin notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;

-- Enable realtime for feedback
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_response_feedback;