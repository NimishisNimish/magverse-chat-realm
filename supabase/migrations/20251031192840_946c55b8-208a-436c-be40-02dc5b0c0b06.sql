-- Add UPI Gateway fields to transactions table
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS gateway_order_id TEXT,
ADD COLUMN IF NOT EXISTS gateway_payment_id TEXT,
ADD COLUMN IF NOT EXISTS gateway_response JSONB,
ADD COLUMN IF NOT EXISTS auto_verified BOOLEAN DEFAULT FALSE;

-- Create index for faster gateway order lookups
CREATE INDEX IF NOT EXISTS idx_transactions_gateway_order_id 
ON public.transactions(gateway_order_id);

-- Add function to cleanup old pending transactions
CREATE OR REPLACE FUNCTION public.cleanup_old_pending_transactions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Delete pending transactions older than 10 minutes
  DELETE FROM public.transactions
  WHERE status = 'pending'
    AND created_at < NOW() - INTERVAL '10 minutes';
END;
$$;