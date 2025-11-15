import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useActivityTracking = () => {
  const { user } = useAuth();

  const trackActivity = async (
    activity_type: string,
    activity_title: string,
    activity_description?: string,
    metadata?: any
  ) => {
    if (!user) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await supabase.functions.invoke('track-activity', {
        body: {
          activity_type,
          activity_title,
          activity_description,
          metadata
        }
      });
    } catch (error) {
      console.error('Error tracking activity:', error);
    }
  };

  return { trackActivity };
};
