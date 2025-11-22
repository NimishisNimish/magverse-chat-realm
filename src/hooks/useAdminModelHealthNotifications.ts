import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useAdminModelHealthNotifications = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Check if user is admin
    const checkAdmin = async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      if (!data) return;

      // Subscribe to model health notifications
      const channel = supabase
        .channel('admin-model-health')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_notifications',
          filter: `notification_type=eq.model_health`
        }, (payload) => {
          const notification = payload.new as any;
          const status = notification.metadata?.status;
          
          if (status === 'down') {
            toast.error(notification.title, {
              description: notification.message,
              duration: 8000,
            });
          } else if (status === 'degraded') {
            toast.warning(notification.title, {
              description: notification.message,
              duration: 6000,
            });
          } else if (status === 'recovered') {
            toast.success(notification.title, {
              description: notification.message,
              duration: 5000,
            });
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    checkAdmin();
  }, [user]);
};
