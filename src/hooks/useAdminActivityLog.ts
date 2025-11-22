import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface LogActivityOptions {
  activityType: string;
  pagePath: string;
  metadata?: Record<string, any>;
}

export const useAdminActivityLog = (options: LogActivityOptions) => {
  const { user } = useAuth();

  useEffect(() => {
    const logActivity = async () => {
      if (!user) return;

      try {
        await supabase.from('admin_activity_logs').insert({
          admin_id: user.id,
          activity_type: options.activityType,
          page_path: options.pagePath,
          metadata: options.metadata || {},
          ip_address: null, // Client-side doesn't have access to IP
          user_agent: navigator.userAgent,
        });
      } catch (error) {
        console.error('Error logging admin activity:', error);
      }
    };

    logActivity();
  }, [user, options.activityType, options.pagePath]);
};

export const logAdminActivity = async (
  userId: string,
  activityType: string,
  pagePath: string,
  metadata?: Record<string, any>
) => {
  try {
    await supabase.from('admin_activity_logs').insert({
      admin_id: userId,
      activity_type: activityType,
      page_path: pagePath,
      metadata: metadata || {},
      user_agent: navigator.userAgent,
    });
  } catch (error) {
    console.error('Error logging admin activity:', error);
  }
};
