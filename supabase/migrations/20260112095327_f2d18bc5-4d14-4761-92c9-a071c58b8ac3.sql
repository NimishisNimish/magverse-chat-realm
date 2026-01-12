-- Create trigger to automatically archive sensitive gateway data and sanitize the transactions table
CREATE OR REPLACE FUNCTION public.archive_and_sanitize_gateway_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if there's gateway data to archive
  IF NEW.gateway_response IS NOT NULL OR NEW.gateway_payment_id IS NOT NULL OR NEW.gateway_order_id IS NOT NULL THEN
    -- Archive the full gateway response to admin-only table
    INSERT INTO public.transaction_gateway_logs (
      transaction_id,
      raw_gateway_response,
      gateway_payment_id_full,
      gateway_order_id_full
    ) VALUES (
      NEW.id,
      NEW.gateway_response,
      NEW.gateway_payment_id,
      NEW.gateway_order_id
    )
    ON CONFLICT DO NOTHING;
    
    -- Sanitize the gateway_response - only keep non-sensitive status info
    NEW.gateway_response := public.sanitize_gateway_response(NEW.gateway_response);
    
    -- Mask sensitive gateway IDs (keep last 4 chars only for reference)
    IF NEW.gateway_payment_id IS NOT NULL AND length(NEW.gateway_payment_id) > 4 THEN
      NEW.gateway_payment_id := '****' || right(NEW.gateway_payment_id, 4);
    END IF;
    
    IF NEW.gateway_order_id IS NOT NULL AND length(NEW.gateway_order_id) > 4 THEN
      NEW.gateway_order_id := '****' || right(NEW.gateway_order_id, 4);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on transactions table
DROP TRIGGER IF EXISTS archive_gateway_data_trigger ON public.transactions;
CREATE TRIGGER archive_gateway_data_trigger
  BEFORE INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.archive_and_sanitize_gateway_data();

-- Ensure transaction_gateway_logs has proper RLS (admin only)
ALTER TABLE public.transaction_gateway_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins can view gateway logs" ON public.transaction_gateway_logs;
DROP POLICY IF EXISTS "Only admins can access gateway logs" ON public.transaction_gateway_logs;

-- Create admin-only access policy
CREATE POLICY "Only admins can access gateway logs"
ON public.transaction_gateway_logs
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Sanitize existing data in transactions table (mask sensitive IDs)
UPDATE public.transactions
SET 
  gateway_response = public.sanitize_gateway_response(gateway_response),
  gateway_payment_id = CASE 
    WHEN gateway_payment_id IS NOT NULL AND length(gateway_payment_id) > 4 
    THEN '****' || right(gateway_payment_id, 4)
    ELSE gateway_payment_id
  END,
  gateway_order_id = CASE 
    WHEN gateway_order_id IS NOT NULL AND length(gateway_order_id) > 4 
    THEN '****' || right(gateway_order_id, 4)
    ELSE gateway_order_id
  END
WHERE gateway_response IS NOT NULL 
   OR gateway_payment_id IS NOT NULL 
   OR gateway_order_id IS NOT NULL;