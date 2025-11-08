-- Convert vanu.09@rediffmail.com to yearly pro member
UPDATE profiles
SET 
  subscription_type = 'monthly',
  monthly_credits = 50,
  monthly_credits_used = 0,
  subscription_expires_at = NOW() + INTERVAL '1 year',
  last_credit_reset = NOW()
WHERE id = 'bd1179f3-10b2-40ef-840d-3767447dc8f5';

-- Add recovery_email column to profiles table for 2FA
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS recovery_email TEXT;

-- Add invoices table for transaction history
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  amount NUMERIC NOT NULL,
  plan_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'paid',
  issue_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- RLS policies for invoices
CREATE POLICY "Users can view own invoices"
  ON public.invoices
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert invoices"
  ON public.invoices
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index on invoice_number for quick lookups
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_transaction_id ON public.invoices(transaction_id);

-- Function to generate invoice on successful payment
CREATE OR REPLACE FUNCTION public.generate_invoice_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_number TEXT;
BEGIN
  -- Only generate invoice for completed/verified transactions
  IF NEW.status IN ('completed', 'verified') AND 
     (OLD.status IS NULL OR OLD.status NOT IN ('completed', 'verified')) THEN
    
    -- Generate invoice number: INV-YYYYMMDD-XXXXX
    v_invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                        LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');
    
    -- Insert invoice
    INSERT INTO public.invoices (
      user_id,
      transaction_id,
      invoice_number,
      amount,
      plan_type,
      status
    ) VALUES (
      NEW.user_id,
      NEW.id,
      v_invoice_number,
      NEW.amount,
      NEW.plan_type,
      'paid'
    );
    
    RAISE LOG 'Generated invoice % for transaction %', v_invoice_number, NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic invoice generation
DROP TRIGGER IF EXISTS trigger_generate_invoice ON public.transactions;
CREATE TRIGGER trigger_generate_invoice
  AFTER UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_invoice_on_payment();