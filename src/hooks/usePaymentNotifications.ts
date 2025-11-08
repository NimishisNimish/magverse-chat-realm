import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

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
              // Trigger confetti animation
              const duration = 3000;
              const animationEnd = Date.now() + duration;
              const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

              const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

              const interval = setInterval(() => {
                const timeLeft = animationEnd - Date.now();
                if (timeLeft <= 0) {
                  return clearInterval(interval);
                }
                const particleCount = 50 * (timeLeft / duration);
                confetti({
                  ...defaults,
                  particleCount,
                  origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
                });
                confetti({
                  ...defaults,
                  particleCount,
                  origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
                });
              }, 250);

              // Payment approved
              toast({
                title: "🎉 Congratulations! 🎉",
                description: `Yay! You just became a Pro member! Your ${newTransaction.plan_type} plan (₹${newTransaction.amount}) has been activated. Welcome to Pro!`,
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
