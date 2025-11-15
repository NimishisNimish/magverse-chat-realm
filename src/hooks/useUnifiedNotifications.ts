import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { triggerSuccessConfetti } from '@/utils/confetti';

export const useUnifiedNotifications = () => {
  const { user, refreshProfile } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Payment Notifications
    const paymentChannel = supabase
      .channel('user-payment-notifications')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'transactions',
        filter: `user_id=eq.${user.id}`
      }, async (payload) => {
        const newTx = payload.new as any;
        const oldTx = payload.old as any;

        if (newTx.verification_status === 'verified' && 
            newTx.status === 'completed' &&
            oldTx.verification_status !== 'verified') {
          
          triggerSuccessConfetti();

          toast.success('🎉 Payment Verified!', {
            description: `Your ${newTx.plan_type} plan has been activated!`,
            duration: 10000
          });

          await refreshProfile();
        }
      })
      .subscribe();

    // Credit & Subscription Updates
    const profileChannel = supabase
      .channel('user-profile-notifications')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${user.id}`
      }, (payload) => {
        const oldProfile = payload.old as any;
        const newProfile = payload.new as any;

        // Credit increase
        if (newProfile.credits_remaining > oldProfile.credits_remaining) {
          const diff = newProfile.credits_remaining - oldProfile.credits_remaining;
          toast.success(`💎 ${diff} Credits Added!`, {
            description: 'Your credits have been updated',
            duration: 5000
          });
        }

        // Subscription update
        if (newProfile.subscription_type !== oldProfile.subscription_type) {
          toast.success('✨ Subscription Updated!', {
            description: `You are now on the ${newProfile.subscription_type} plan`,
            duration: 5000
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(paymentChannel);
      supabase.removeChannel(profileChannel);
    };
  }, [user, refreshProfile]);
};
