import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

interface ApiErrorEvent {
  status: number;
  model: string;
  message: string;
  timestamp: number;
}

export const useApiQuotaNotifications = () => {
  const errorCountRef = useRef<Map<string, ApiErrorEvent[]>>(new Map());
  const lastNotificationRef = useRef<Map<string, number>>(new Map());
  
  const NOTIFICATION_COOLDOWN = 5 * 60 * 1000; // 5 minutes
  const ERROR_WINDOW = 10 * 60 * 1000; // 10 minutes
  const ERROR_THRESHOLD = 3; // Show notification after 3 errors

  const trackError = (status: number, model: string, message: string) => {
    const now = Date.now();
    const key = `${model}-${status}`;
    
    // Clean old errors outside time window
    const errors = errorCountRef.current.get(key) || [];
    const recentErrors = errors.filter(e => now - e.timestamp < ERROR_WINDOW);
    
    // Add new error
    recentErrors.push({ status, model, message, timestamp: now });
    errorCountRef.current.set(key, recentErrors);
    
    // Check if we should notify
    const lastNotification = lastNotificationRef.current.get(key) || 0;
    const shouldNotify = 
      recentErrors.length >= ERROR_THRESHOLD && 
      (now - lastNotification) > NOTIFICATION_COOLDOWN;
    
    if (shouldNotify) {
      lastNotificationRef.current.set(key, now);
      showNotification(status, model, recentErrors.length);
    }
  };

  const showNotification = (status: number, model: string, errorCount: number) => {
    if (status === 429) {
      toast.error(
        `Rate Limit Alert`,
        {
          description: `${model} has hit rate limits (${errorCount} errors). Consider upgrading your API plan or using alternative models.`,
          duration: 10000,
          action: {
            label: "View Settings",
            onClick: () => window.location.href = '/settings'
          }
        }
      );
    } else if (status === 402) {
      toast.error(
        `Payment Required`,
        {
          description: `${model} requires payment or credits. Add credits to your Lovable workspace to continue using this model.`,
          duration: 10000,
          action: {
            label: "Add Credits",
            onClick: () => window.open('https://lovable.dev/settings/usage', '_blank')
          }
        }
      );
    } else if (status === 401 || status === 403) {
      toast.error(
        `API Key Issue`,
        {
          description: `${model} authentication failed (${errorCount} errors). Your API key may need renewal or have insufficient permissions.`,
          duration: 10000,
          action: {
            label: "Check Status",
            onClick: () => window.location.href = '/settings'
          }
        }
      );
    } else if (status >= 500) {
      toast.warning(
        `Service Issue`,
        {
          description: `${model} is experiencing server issues (${errorCount} errors). This is usually temporary.`,
          duration: 8000,
        }
      );
    }
  };

  const clearErrorTracking = () => {
    errorCountRef.current.clear();
    lastNotificationRef.current.clear();
  };

  // Expose tracking function globally
  useEffect(() => {
    (window as any).__trackApiError = trackError;
    (window as any).__clearApiErrorTracking = clearErrorTracking;
    
    return () => {
      delete (window as any).__trackApiError;
      delete (window as any).__clearApiErrorTracking;
    };
  }, []);

  return { trackError, clearErrorTracking };
};
