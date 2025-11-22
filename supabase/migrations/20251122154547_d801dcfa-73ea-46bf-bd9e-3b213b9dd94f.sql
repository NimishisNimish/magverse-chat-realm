-- Create model_health_history table for historical uptime tracking
CREATE TABLE IF NOT EXISTS public.model_health_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id text NOT NULL,
  model_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('healthy', 'degraded', 'down')),
  consecutive_failures integer DEFAULT 0,
  total_requests integer DEFAULT 0,
  successful_requests integer DEFAULT 0,
  is_disabled boolean DEFAULT false,
  recorded_at timestamp with time zone DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_model_health_history_model_time 
  ON public.model_health_history(model_id, recorded_at DESC);

-- Enable Row Level Security
ALTER TABLE public.model_health_history ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read (for status page)
CREATE POLICY "Anyone can view model health history"
  ON public.model_health_history
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only authenticated users can insert (system snapshots)
CREATE POLICY "Authenticated users can insert model health history"
  ON public.model_health_history
  FOR INSERT
  TO authenticated
  WITH CHECK (true);