import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ModelHealth {
  id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  consecutiveFailures: number;
  lastFailure: Date | null;
  lastSuccess: Date | null;
  totalRequests: number;
  successfulRequests: number;
  isDisabled: boolean;
}

const FAILURE_THRESHOLD = 3; // Disable after 3 consecutive failures
const RECOVERY_CHECK_INTERVAL = 5 * 60 * 1000; // Check for recovery every 5 minutes

export const useModelHealth = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [modelHealthMap, setModelHealthMap] = useState<Map<string, ModelHealth>>(new Map());

  // Initialize from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('modelHealth');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const healthMap = new Map(
          Object.entries(parsed).map(([key, value]: [string, any]) => [
            key,
            {
              ...value,
              lastFailure: value.lastFailure ? new Date(value.lastFailure) : null,
              lastSuccess: value.lastSuccess ? new Date(value.lastSuccess) : null,
            }
          ])
        );
        setModelHealthMap(healthMap);
      } catch (error) {
        console.error('Failed to parse model health:', error);
      }
    }
  }, []);

  // Save to localStorage whenever health changes
  useEffect(() => {
    const healthObj = Object.fromEntries(modelHealthMap);
    localStorage.setItem('modelHealth', JSON.stringify(healthObj));
  }, [modelHealthMap]);

  // Initialize model if not exists
  const initModel = useCallback((modelId: string, modelName: string) => {
    setModelHealthMap(prev => {
      if (!prev.has(modelId)) {
        const newMap = new Map(prev);
        newMap.set(modelId, {
          id: modelId,
          name: modelName,
          status: 'healthy',
          consecutiveFailures: 0,
          lastFailure: null,
          lastSuccess: null,
          totalRequests: 0,
          successfulRequests: 0,
          isDisabled: false,
        });
        return newMap;
      }
      return prev;
    });
  }, []);

  // Record success
  const recordSuccess = useCallback((modelId: string, modelName: string) => {
    setModelHealthMap(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(modelId) || {
        id: modelId,
        name: modelName,
        status: 'healthy' as const,
        consecutiveFailures: 0,
        lastFailure: null,
        lastSuccess: null,
        totalRequests: 0,
        successfulRequests: 0,
        isDisabled: false,
      };

      const wasDown = current.status === 'down';
      
      newMap.set(modelId, {
        ...current,
        status: 'healthy',
        consecutiveFailures: 0,
        lastSuccess: new Date(),
        totalRequests: current.totalRequests + 1,
        successfulRequests: current.successfulRequests + 1,
        isDisabled: false,
      });

      // Notify if model recovered
      if (wasDown) {
        toast({
          title: `${modelName} Recovered`,
          description: `${modelName} is now operational again.`,
          className: 'bg-green-500/10 border-green-500',
        });
        
        // Log recovery to database if user is logged in
        if (user) {
          supabase.from('admin_notifications').insert({
            title: 'Model Recovered',
            message: `${modelName} has recovered and is operational`,
            notification_type: 'model_health',
            metadata: { modelId, modelName, status: 'recovered' }
          }).then(({ error }) => {
            if (error) console.error('Failed to log recovery:', error);
          });
        }
      }

      return newMap;
    });
  }, [toast, user]);

  // Record failure
  const recordFailure = useCallback((modelId: string, modelName: string, error?: string) => {
    setModelHealthMap(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(modelId) || {
        id: modelId,
        name: modelName,
        status: 'healthy' as const,
        consecutiveFailures: 0,
        lastFailure: null,
        lastSuccess: null,
        totalRequests: 0,
        successfulRequests: 0,
        isDisabled: false,
      };

      const newFailures = current.consecutiveFailures + 1;
      const shouldDisable = newFailures >= FAILURE_THRESHOLD;
      
      let newStatus: 'healthy' | 'degraded' | 'down' = 'healthy';
      if (shouldDisable) {
        newStatus = 'down';
      } else if (newFailures >= 2) {
        newStatus = 'degraded';
      }

      newMap.set(modelId, {
        ...current,
        status: newStatus,
        consecutiveFailures: newFailures,
        lastFailure: new Date(),
        totalRequests: current.totalRequests + 1,
        isDisabled: shouldDisable,
      });

      // Notify user of status change
      if (shouldDisable && !current.isDisabled) {
        toast({
          title: `${modelName} Disabled`,
          description: `${modelName} has been temporarily disabled due to repeated failures. It will be automatically re-enabled when it recovers.`,
          variant: 'destructive',
        });

        // Log to database if user is logged in
        if (user) {
          supabase.from('admin_notifications').insert({
            title: 'Model Disabled',
            message: `${modelName} disabled after ${FAILURE_THRESHOLD} consecutive failures: ${error || 'Unknown error'}`,
            notification_type: 'model_health',
            metadata: { modelId, modelName, status: 'down', error }
          }).then(({ error: dbError }) => {
            if (dbError) console.error('Failed to log failure:', dbError);
          });
        }
      } else if (newStatus === 'degraded' && current.status === 'healthy') {
        toast({
          title: `${modelName} Degraded`,
          description: `${modelName} is experiencing issues. Consider using an alternative model.`,
          className: 'bg-yellow-500/10 border-yellow-500',
        });
      }

      return newMap;
    });
  }, [toast, user]);

  // Get model health status
  const getModelHealth = useCallback((modelId: string): ModelHealth | undefined => {
    return modelHealthMap.get(modelId);
  }, [modelHealthMap]);

  // Check if model is available
  const isModelAvailable = useCallback((modelId: string): boolean => {
    const health = modelHealthMap.get(modelId);
    return !health || !health.isDisabled;
  }, [modelHealthMap]);

  // Get all model health statuses
  const getAllModelHealth = useCallback((): ModelHealth[] => {
    return Array.from(modelHealthMap.values());
  }, [modelHealthMap]);

  // Attempt to recover disabled models (call this periodically)
  const attemptRecovery = useCallback(async (modelId: string) => {
    const health = modelHealthMap.get(modelId);
    if (!health || !health.isDisabled) return;

    // Check if enough time has passed since last failure
    const timeSinceFailure = health.lastFailure 
      ? Date.now() - health.lastFailure.getTime() 
      : Infinity;

    if (timeSinceFailure > RECOVERY_CHECK_INTERVAL) {
      // Re-enable for testing
      setModelHealthMap(prev => {
        const newMap = new Map(prev);
        newMap.set(modelId, {
          ...health,
          isDisabled: false,
          consecutiveFailures: 0,
        });
        return newMap;
      });
    }
  }, [modelHealthMap]);

  return {
    initModel,
    recordSuccess,
    recordFailure,
    getModelHealth,
    isModelAvailable,
    getAllModelHealth,
    attemptRecovery,
  };
};
