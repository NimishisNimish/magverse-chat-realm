-- Create AI model metrics table for performance tracking
CREATE TABLE IF NOT EXISTS public.ai_model_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_name TEXT NOT NULL,
  response_time_ms INTEGER NOT NULL,
  tokens_input INTEGER,
  tokens_output INTEGER,
  tokens_total INTEGER,
  message_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_metrics_user_id ON public.ai_model_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_metrics_model ON public.ai_model_metrics(model_name);
CREATE INDEX IF NOT EXISTS idx_metrics_created ON public.ai_model_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_metrics_user_model ON public.ai_model_metrics(user_id, model_name);

-- Enable Row Level Security
ALTER TABLE public.ai_model_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own metrics"
  ON public.ai_model_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own metrics"
  ON public.ai_model_metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all metrics (for analytics)
CREATE POLICY "Admins can view all metrics"
  ON public.ai_model_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );