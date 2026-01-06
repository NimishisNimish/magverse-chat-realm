-- Create a separate admin-only table for sensitive payment gateway data
CREATE TABLE IF NOT EXISTS public.transaction_gateway_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  raw_gateway_response jsonb,
  gateway_payment_id_full text,
  gateway_order_id_full text,
  logged_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transaction_gateway_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can access this sensitive data
CREATE POLICY "Admins can view gateway logs"
ON public.transaction_gateway_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'::public.app_role
  )
);

CREATE POLICY "Admins can insert gateway logs"
ON public.transaction_gateway_logs
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'::public.app_role
  )
);

-- Block all access for anon users
CREATE POLICY "Anon cannot access gateway logs"
ON public.transaction_gateway_logs
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Create a function to sanitize transaction data before returning to users
-- This removes sensitive fields from gateway_response
CREATE OR REPLACE FUNCTION public.sanitize_gateway_response(raw_response jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF raw_response IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Return only non-sensitive status information
  RETURN jsonb_build_object(
    'status', raw_response->>'status',
    'success', COALESCE((raw_response->>'success')::boolean, false),
    'payment_captured', COALESCE((raw_response->>'captured')::boolean, false),
    'payment_method_type', raw_response->>'method'
  );
END;
$$;

-- Create a trigger to automatically archive sensitive data and sanitize transactions
CREATE OR REPLACE FUNCTION public.archive_sensitive_payment_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Archive the full gateway response to admin-only table
  IF NEW.gateway_response IS NOT NULL AND NEW.gateway_response != '{}'::jsonb THEN
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
    
    -- Replace with sanitized version
    NEW.gateway_response := public.sanitize_gateway_response(NEW.gateway_response);
  END IF;
  
  -- Mask sensitive gateway IDs (keep last 4 chars only)
  IF NEW.gateway_payment_id IS NOT NULL AND length(NEW.gateway_payment_id) > 4 THEN
    NEW.gateway_payment_id := '****' || right(NEW.gateway_payment_id, 4);
  END IF;
  
  IF NEW.gateway_order_id IS NOT NULL AND length(NEW.gateway_order_id) > 4 THEN
    NEW.gateway_order_id := '****' || right(NEW.gateway_order_id, 4);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on transactions table
DROP TRIGGER IF EXISTS archive_payment_data_trigger ON public.transactions;
CREATE TRIGGER archive_payment_data_trigger
  BEFORE INSERT OR UPDATE OF gateway_response, gateway_payment_id, gateway_order_id
  ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.archive_sensitive_payment_data();

-- Create secure function for admins to view full gateway data
CREATE OR REPLACE FUNCTION public.get_full_transaction_gateway_data(p_transaction_id uuid)
RETURNS TABLE(
  raw_gateway_response jsonb,
  gateway_payment_id_full text,
  gateway_order_id_full text,
  logged_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admins
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::public.app_role
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  RETURN QUERY
  SELECT 
    tgl.raw_gateway_response,
    tgl.gateway_payment_id_full,
    tgl.gateway_order_id_full,
    tgl.logged_at
  FROM public.transaction_gateway_logs tgl
  WHERE tgl.transaction_id = p_transaction_id
  ORDER BY tgl.logged_at DESC
  LIMIT 1;
END;
$$;

-- Grant execute to authenticated users (function does its own admin check)
GRANT EXECUTE ON FUNCTION public.get_full_transaction_gateway_data(uuid) TO authenticated;