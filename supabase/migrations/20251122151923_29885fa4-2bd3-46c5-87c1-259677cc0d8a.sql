-- Create credit_usage_logs table for detailed cost tracking
CREATE TABLE IF NOT EXISTS public.credit_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id UUID REFERENCES public.chat_history(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  credits_used INTEGER NOT NULL DEFAULT 1,
  request_type TEXT NOT NULL DEFAULT 'chat',
  tokens_used INTEGER,
  response_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add credits_consumed column to chat_messages
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS credits_consumed INTEGER DEFAULT 1;

-- Create model_presets table
CREATE TABLE IF NOT EXISTS public.model_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL DEFAULT 'general',
  models JSONB NOT NULL DEFAULT '[]'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,
  is_system_preset BOOLEAN DEFAULT FALSE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create preset_performance table
CREATE TABLE IF NOT EXISTS public.preset_performance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  preset_id UUID NOT NULL REFERENCES public.model_presets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  avg_rating DECIMAL(3,2),
  success_rate DECIMAL(5,2),
  avg_response_time INTEGER,
  total_uses INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(preset_id, user_id)
);

-- Create chat_comparisons table
CREATE TABLE IF NOT EXISTS public.chat_comparisons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  chat_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create comparison_ratings table
CREATE TABLE IF NOT EXISTS public.comparison_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comparison_id UUID NOT NULL REFERENCES public.chat_comparisons(id) ON DELETE CASCADE,
  chat_id UUID NOT NULL REFERENCES public.chat_history(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  category TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.credit_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preset_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comparison_ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for credit_usage_logs
CREATE POLICY "Users can view own credit logs" ON public.credit_usage_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credit logs" ON public.credit_usage_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all credit logs" ON public.credit_usage_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for model_presets
CREATE POLICY "Users can view own and system presets" ON public.model_presets
  FOR SELECT USING (user_id = auth.uid() OR is_system_preset = TRUE OR user_id IS NULL);

CREATE POLICY "Users can insert own presets" ON public.model_presets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own presets" ON public.model_presets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own presets" ON public.model_presets
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for preset_performance
CREATE POLICY "Users can view own preset performance" ON public.preset_performance
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preset performance" ON public.preset_performance
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preset performance" ON public.preset_performance
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for chat_comparisons
CREATE POLICY "Users can view own comparisons" ON public.chat_comparisons
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own comparisons" ON public.chat_comparisons
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comparisons" ON public.chat_comparisons
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comparisons" ON public.chat_comparisons
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for comparison_ratings
CREATE POLICY "Users can view ratings for own comparisons" ON public.comparison_ratings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chat_comparisons
      WHERE id = comparison_ratings.comparison_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert ratings for own comparisons" ON public.comparison_ratings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_comparisons
      WHERE id = comparison_ratings.comparison_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update ratings for own comparisons" ON public.comparison_ratings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.chat_comparisons
      WHERE id = comparison_ratings.comparison_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete ratings for own comparisons" ON public.comparison_ratings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.chat_comparisons
      WHERE id = comparison_ratings.comparison_id AND user_id = auth.uid()
    )
  );

-- Insert system presets
INSERT INTO public.model_presets (name, description, task_type, models, settings, is_system_preset) VALUES
  ('🖥️ Coding Assistant', 'Optimized for code generation, debugging, and technical questions', 'coding', '["gpt-5", "claude"]'::jsonb, '{"webSearch": false, "deepResearch": false}'::jsonb, TRUE),
  ('✍️ Creative Writing', 'Best for creative writing, storytelling, and content creation', 'creative', '["claude", "gemini-pro"]'::jsonb, '{"webSearch": false, "deepResearch": false}'::jsonb, TRUE),
  ('🔍 Research Mode', 'Web-enabled search for current information and research', 'research', '["perplexity", "grok"]'::jsonb, '{"webSearch": true, "searchMode": "general", "deepResearch": false}'::jsonb, TRUE),
  ('⚡ Fast Response', 'Lightning-fast responses for quick questions', 'fast', '["gemini-flash", "gpt-5-mini"]'::jsonb, '{"webSearch": false, "deepResearch": false}'::jsonb, TRUE),
  ('💰 Budget Mode', 'Most cost-effective option for simple queries', 'budget', '["gpt-5-mini"]'::jsonb, '{"webSearch": false, "deepResearch": false}'::jsonb, TRUE),
  ('📊 Data Analysis', 'Best for analytical tasks and data interpretation', 'analysis', '["gpt-5", "gemini-pro"]'::jsonb, '{"webSearch": false, "deepResearch": false}'::jsonb, TRUE),
  ('🌐 Multilingual', 'Optimized for multi-language support', 'multilingual', '["gpt-5", "claude"]'::jsonb, '{"webSearch": false, "deepResearch": false}'::jsonb, TRUE);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_credit_usage_logs_user_id ON public.credit_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_usage_logs_created_at ON public.credit_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_model_presets_user_id ON public.model_presets(user_id);
CREATE INDEX IF NOT EXISTS idx_model_presets_task_type ON public.model_presets(task_type);
CREATE INDEX IF NOT EXISTS idx_chat_comparisons_user_id ON public.chat_comparisons(user_id);