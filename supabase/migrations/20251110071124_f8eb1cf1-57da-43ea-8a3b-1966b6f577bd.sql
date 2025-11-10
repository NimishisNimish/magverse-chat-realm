-- ============================================
-- USER SEGMENTATION SYSTEM
-- ============================================

-- Create user segments table
CREATE TABLE IF NOT EXISTS public.user_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  segment_type VARCHAR(50) NOT NULL CHECK (segment_type IN ('usage', 'subscription', 'engagement', 'value')),
  segment_value VARCHAR(50) NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB,
  UNIQUE (user_id, segment_type)
);

-- Enable RLS
ALTER TABLE public.user_segments ENABLE ROW LEVEL SECURITY;

-- Admins can view all segments
CREATE POLICY "Admins can view all segments"
ON public.user_segments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create indexes
CREATE INDEX idx_segments_user_id ON public.user_segments(user_id);
CREATE INDEX idx_segments_type ON public.user_segments(segment_type);
CREATE INDEX idx_segments_value ON public.user_segments(segment_value);

-- ============================================
-- AI MODEL A/B TESTING
-- ============================================

-- Create model comparison votes table
CREATE TABLE IF NOT EXISTS public.model_comparison_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id UUID REFERENCES public.chat_history(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  model_a VARCHAR(50) NOT NULL,
  model_b VARCHAR(50) NOT NULL,
  winner VARCHAR(50),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.model_comparison_votes ENABLE ROW LEVEL SECURITY;

-- Users can create their own votes
CREATE POLICY "Users can create their own votes"
ON public.model_comparison_votes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own votes
CREATE POLICY "Users can view their own votes"
ON public.model_comparison_votes
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all votes
CREATE POLICY "Admins can view all votes"
ON public.model_comparison_votes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create indexes
CREATE INDEX idx_votes_user_id ON public.model_comparison_votes(user_id);
CREATE INDEX idx_votes_models ON public.model_comparison_votes(model_a, model_b);
CREATE INDEX idx_votes_winner ON public.model_comparison_votes(winner);

-- ============================================
-- EMAIL CAMPAIGN TRACKING
-- ============================================

-- Add tracking fields to email_campaigns
ALTER TABLE public.email_campaigns 
ADD COLUMN IF NOT EXISTS click_tracking_id UUID DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS converted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS conversion_value NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS ip_address TEXT;

-- Create email clicks tracking table
CREATE TABLE IF NOT EXISTS public.email_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  link_url TEXT,
  user_agent TEXT,
  ip_address TEXT
);

-- Enable RLS
ALTER TABLE public.email_clicks ENABLE ROW LEVEL SECURITY;

-- Admins can view all clicks
CREATE POLICY "Admins can view all clicks"
ON public.email_clicks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create indexes
CREATE INDEX idx_clicks_campaign_id ON public.email_clicks(campaign_id);
CREATE INDEX idx_clicks_timestamp ON public.email_clicks(clicked_at DESC);

-- ============================================
-- SEGMENTATION FUNCTIONS
-- ============================================

-- Function to calculate and assign user segments
CREATE OR REPLACE FUNCTION public.update_user_segments(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_message_count INTEGER;
  v_last_activity TIMESTAMP WITH TIME ZONE;
  v_subscription_type TEXT;
  v_total_spent NUMERIC;
  v_days_since_signup INTEGER;
  v_usage_segment TEXT;
  v_engagement_segment TEXT;
  v_value_segment TEXT;
BEGIN
  -- Get user data
  SELECT 
    p.subscription_type,
    EXTRACT(DAY FROM NOW() - p.created_at)
  INTO v_subscription_type, v_days_since_signup
  FROM profiles p
  WHERE p.id = p_user_id;

  -- Get message count
  SELECT COUNT(*) INTO v_message_count
  FROM chat_messages
  WHERE user_id = p_user_id;

  -- Get last activity
  SELECT MAX(created_at) INTO v_last_activity
  FROM chat_messages
  WHERE user_id = p_user_id;

  -- Get total spent
  SELECT COALESCE(SUM(amount), 0) INTO v_total_spent
  FROM transactions
  WHERE user_id = p_user_id AND status IN ('completed', 'verified');

  -- Determine usage segment
  IF v_message_count < 10 THEN
    v_usage_segment := 'light';
  ELSIF v_message_count < 100 THEN
    v_usage_segment := 'medium';
  ELSE
    v_usage_segment := 'heavy';
  END IF;

  -- Determine engagement segment
  IF v_last_activity IS NULL OR v_last_activity < NOW() - INTERVAL '30 days' THEN
    v_engagement_segment := 'churned';
  ELSIF v_last_activity < NOW() - INTERVAL '7 days' THEN
    v_engagement_segment := 'at_risk';
  ELSIF v_last_activity < NOW() - INTERVAL '2 days' THEN
    v_engagement_segment := 'moderate';
  ELSE
    v_engagement_segment := 'active';
  END IF;

  -- Determine value segment
  IF v_total_spent = 0 THEN
    v_value_segment := 'free';
  ELSIF v_total_spent < 500 THEN
    v_value_segment := 'low_value';
  ELSIF v_total_spent < 2000 THEN
    v_value_segment := 'medium_value';
  ELSE
    v_value_segment := 'high_value';
  END IF;

  -- Upsert segments
  INSERT INTO user_segments (user_id, segment_type, segment_value, metadata)
  VALUES 
    (p_user_id, 'usage', v_usage_segment, jsonb_build_object('message_count', v_message_count)),
    (p_user_id, 'engagement', v_engagement_segment, jsonb_build_object('last_activity', v_last_activity)),
    (p_user_id, 'subscription', v_subscription_type, jsonb_build_object('days_since_signup', v_days_since_signup)),
    (p_user_id, 'value', v_value_segment, jsonb_build_object('total_spent', v_total_spent))
  ON CONFLICT (user_id, segment_type) 
  DO UPDATE SET 
    segment_value = EXCLUDED.segment_value,
    assigned_at = NOW(),
    metadata = EXCLUDED.metadata;
END;
$$;

-- Function to get campaign analytics
CREATE OR REPLACE FUNCTION public.get_campaign_analytics(
  p_campaign_type TEXT DEFAULT NULL,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
  campaign_type TEXT,
  total_sent INTEGER,
  total_opened INTEGER,
  total_clicked INTEGER,
  total_converted INTEGER,
  open_rate NUMERIC,
  click_rate NUMERIC,
  conversion_rate NUMERIC,
  total_revenue NUMERIC,
  roi NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ec.campaign_type::TEXT,
    COUNT(*)::INTEGER as total_sent,
    COUNT(CASE WHEN ec.opened_at IS NOT NULL THEN 1 END)::INTEGER as total_opened,
    COUNT(CASE WHEN ec.clicked_at IS NOT NULL THEN 1 END)::INTEGER as total_clicked,
    COUNT(CASE WHEN ec.converted = TRUE THEN 1 END)::INTEGER as total_converted,
    ROUND((COUNT(CASE WHEN ec.opened_at IS NOT NULL THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100), 2) as open_rate,
    ROUND((COUNT(CASE WHEN ec.clicked_at IS NOT NULL THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100), 2) as click_rate,
    ROUND((COUNT(CASE WHEN ec.converted = TRUE THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100), 2) as conversion_rate,
    COALESCE(SUM(ec.conversion_value), 0) as total_revenue,
    ROUND((COALESCE(SUM(ec.conversion_value), 0) / NULLIF(COUNT(*), 0)) * 100, 2) as roi
  FROM email_campaigns ec
  WHERE ec.sent_at BETWEEN p_start_date AND p_end_date
    AND (p_campaign_type IS NULL OR ec.campaign_type = p_campaign_type)
  GROUP BY ec.campaign_type;
END;
$$;

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_segments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.model_comparison_votes;