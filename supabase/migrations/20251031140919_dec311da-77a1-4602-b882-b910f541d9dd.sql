-- Add new columns to transactions table for UPI payment system
ALTER TABLE public.transactions
ADD COLUMN payment_reference TEXT,
ADD COLUMN verification_status TEXT DEFAULT 'pending_verification',
ADD COLUMN verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN verified_by UUID,
ADD COLUMN payment_method TEXT DEFAULT 'upi';

-- Add index for faster queries on verification status
CREATE INDEX idx_transactions_verification_status ON public.transactions(verification_status);

-- Add comment for documentation
COMMENT ON COLUMN public.transactions.payment_reference IS 'UTR number or payment reference from UPI transaction';
COMMENT ON COLUMN public.transactions.verification_status IS 'Status: pending_verification, verified, rejected';
COMMENT ON COLUMN public.transactions.verified_at IS 'Timestamp when payment was verified by admin';
COMMENT ON COLUMN public.transactions.verified_by IS 'Admin user ID who verified the payment';
COMMENT ON COLUMN public.transactions.payment_method IS 'Payment method: razorpay or upi';