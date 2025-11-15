import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface NotificationState {
  creditsAdded: number;
  subscriptionUpdate: boolean;
  achievements: number;
}

export const useNotificationBadge = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationState>({
    creditsAdded: 0,
    subscriptionUpdate: false,
    achievements: 0
  });

  useEffect(() => {
    if (!user) return;

    // Listen for credit updates
    const channel = supabase
      .channel('notification-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          const oldProfile = payload.old as any;
          const newProfile = payload.new as any;

          // Check for credit increase
          if (newProfile.credits_remaining > oldProfile.credits_remaining) {
            const diff = newProfile.credits_remaining - oldProfile.credits_remaining;
            setNotifications(prev => ({ ...prev, creditsAdded: diff }));
            
            // Clear after 5 seconds
            setTimeout(() => {
              setNotifications(prev => ({ ...prev, creditsAdded: 0 }));
            }, 5000);
          }

          // Check for subscription update
          if (newProfile.subscription_type !== oldProfile.subscription_type) {
            setNotifications(prev => ({ ...prev, subscriptionUpdate: true }));
            setTimeout(() => {
              setNotifications(prev => ({ ...prev, subscriptionUpdate: false }));
            }, 5000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return notifications;
};
