import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PaymentStatusResult {
  status: 'pending' | 'completed' | 'error';
  message?: string;
  planType?: string;
  isPolling: boolean;
  error?: string;
}

export const usePaymentStatus = (orderId: string | null, onSuccess?: () => void) => {
  const [result, setResult] = useState<PaymentStatusResult>({
    status: 'pending',
    isPolling: false,
  });

  const checkStatus = useCallback(async () => {
    if (!orderId) return;

    try {
      const { data, error } = await supabase.functions.invoke('verify-upi-payment', {
        body: { orderId },
      });

      if (error) {
        console.error('Error checking payment status:', error);
        setResult({
          status: 'error',
          error: error.message,
          isPolling: false,
        });
        return;
      }

      if (data.status === 'completed') {
        setResult({
          status: 'completed',
          message: data.message,
          planType: data.planType,
          isPolling: false,
        });
        onSuccess?.();
      } else if (data.status === 'pending') {
        setResult((prev) => ({
          ...prev,
          status: 'pending',
          isPolling: true,
        }));
      }
    } catch (err: any) {
      console.error('Error in payment status check:', err);
      setResult({
        status: 'error',
        error: err.message,
        isPolling: false,
      });
    }
  }, [orderId, onSuccess]);

  useEffect(() => {
    if (!orderId) {
      setResult({ status: 'pending', isPolling: false });
      return;
    }

    // Initial check
    checkStatus();

    // Set up polling - check every 3 seconds
    const pollInterval = setInterval(checkStatus, 3000);

    // Stop polling after 5 minutes (timeout)
    const timeout = setTimeout(() => {
      clearInterval(pollInterval);
      setResult((prev) => ({
        ...prev,
        status: 'error',
        error: 'Payment verification timed out. Please contact support.',
        isPolling: false,
      }));
    }, 5 * 60 * 1000); // 5 minutes

    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [orderId, checkStatus]);

  return result;
};
