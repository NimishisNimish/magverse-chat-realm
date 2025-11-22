-- Fix function search path for get_webhook_urls
CREATE OR REPLACE FUNCTION get_webhook_urls()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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