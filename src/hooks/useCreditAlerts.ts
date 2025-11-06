import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useCreditAlerts = () => {
  const { user, profile } = useAuth();

  useEffect(() => {
    if (!user || !profile) return;

    const checkAndSendAlerts = async () => {
      try {
        // Check for low credits (free users)
        if (profile.subscription_type === 'free' && profile.credits_remaining !== undefined) {
          if (profile.credits_remaining <= 2 && profile.credits_remaining > 0) {
            await supabase.functions.invoke('send-credit-alert', {
              body: { userId: user.id, alertType: 'low_credits' }
            });
          }
        }

        // Check for low credits (monthly users)
        if (profile.subscription_type === 'monthly') {
          const remaining = (profile.monthly_credits || 0) - (profile.monthly_credits_used || 0);
          if (remaining <= 5 && remaining > 0) {
            await supabase.functions.invoke('send-credit-alert', {
              body: { userId: user.id, alertType: 'low_credits' }
            });
          }
        }

        // Check for expiring subscription
        if (profile.subscription_type === 'monthly' && profile.subscription_expires_at) {
          const daysUntilExpiry = Math.floor(
            (new Date(profile.subscription_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
          
          if (daysUntilExpiry <= 3 && daysUntilExpiry > 0) {
            await supabase.functions.invoke('send-credit-alert', {
              body: { userId: user.id, alertType: 'subscription_expiring' }
            });
          }
        }
      } catch (error) {
        console.error('Error checking credit alerts:', error);
      }
    };

    // Check on mount and every hour
    checkAndSendAlerts();
    const interval = setInterval(checkAndSendAlerts, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user, profile]);
};
