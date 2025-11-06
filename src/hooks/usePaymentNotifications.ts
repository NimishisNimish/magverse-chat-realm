import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle } from 'lucide-react';

export const usePaymentNotifications = () => {
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    // Subscribe to transactions table for real-time updates
    const channel = supabase
      .channel('payment-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          const newTransaction = payload.new as any;
          const oldTransaction = payload.old as any;

          // Check if verification status changed
          if (newTransaction.verification_status !== oldTransaction.verification_status) {
            if (newTransaction.verification_status === 'verified' && newTransaction.status === 'completed') {
              // Payment approved
              toast({
                title: "Payment Approved! 🎉",
                description: `Your ${newTransaction.plan_type} plan has been activated. Welcome to Pro!`,
                variant: "default",
                duration: 10000,
              });
              
              // Refresh profile to update UI
              await refreshProfile();
            } else if (newTransaction.verification_status === 'rejected' && newTransaction.status === 'failed') {
              // Payment rejected
              toast({
                title: "Payment Verification Failed",
                description: "Your payment could not be verified. Please contact support or try again.",
                variant: "destructive",
                duration: 10000,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast, refreshProfile]);
};
