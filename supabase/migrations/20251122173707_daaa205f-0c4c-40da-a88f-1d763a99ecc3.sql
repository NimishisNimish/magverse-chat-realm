-- Add share_code column to model_presets for sharing functionality
ALTER TABLE public.model_presets
ADD COLUMN IF NOT EXISTS share_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS shared_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_model_presets_share_code ON public.model_presets(share_code) WHERE share_code IS NOT NULL;

-- Add cost tracking columns to credit_usage_logs
ALTER TABLE public.credit_usage_logs
ADD COLUMN IF NOT EXISTS cost_usd NUMERIC(10, 6) DEFAULT 0,
ADD COLUMN IF NOT EXISTS model_pricing_tier TEXT;

-- Create user budget alerts table
CREATE TABLE IF NOT EXISTS public.user_budget_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  budget_limit_usd NUMERIC(10, 2) NOT NULL,
  alert_threshold_percent INTEGER DEFAULT 80,
  current_spending_usd NUMERIC(10, 2) DEFAULT 0,
  period_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  period_end TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  last_alert_sent TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on user_budget_alerts
ALTER TABLE public.user_budget_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_budget_alerts
CREATE POLICY "Users can view own budget alerts"
  ON public.user_budget_alerts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budget alerts"
  ON public.user_budget_alerts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budget alerts"
  ON public.user_budget_alerts
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own budget alerts"
  ON public.user_budget_alerts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Update RLS policy for model_presets to allow viewing shared presets
DROP POLICY IF EXISTS "Users can view own and system presets" ON public.model_presets;

CREATE POLICY "Users can view own, system, and shared presets"
  ON public.model_presets
  FOR SELECT
  USING (
    user_id = auth.uid() 
    OR is_system_preset = true 
    OR user_id IS NULL
    OR is_shared = true
  );

-- Function to generate unique share code
CREATE OR REPLACE FUNCTION generate_share_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;