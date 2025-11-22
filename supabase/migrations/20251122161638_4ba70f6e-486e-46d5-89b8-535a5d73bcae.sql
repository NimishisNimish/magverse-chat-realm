-- Create admin_settings table for storing webhook URLs and other admin configurations
CREATE TABLE IF NOT EXISTS public.admin_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can read/write
CREATE POLICY "Admins can manage settings"
  ON public.admin_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Function to retrieve webhook URLs for edge function
CREATE OR REPLACE FUNCTION get_webhook_urls()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  webhook_config jsonb;
BEGIN
  SELECT value INTO webhook_config
  FROM admin_settings
  WHERE key = 'webhooks';
  
  RETURN COALESCE(webhook_config, '{}'::jsonb);
END;
$$;