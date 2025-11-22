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
  avgResponseTime: number;
  recentFailureRate: number; // Failure rate in last 10 requests
  failureHistory: Array<{ timestamp: Date; success: boolean }>; // Last 20 requests
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
          avgResponseTime: 0,
          recentFailureRate: 0,
          failureHistory: [],
        });
        return newMap;
      }
      return prev;
    });
  }, []);

  // Record success with response time
  const recordSuccess = useCallback(async (modelId: string, modelName: string, responseTime?: number) => {
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
        avgResponseTime: 0,
        recentFailureRate: 0,
        failureHistory: [],
      };

      const wasDown = current.status === 'down';
      
      // Update failure history
      const updatedHistory = [...current.failureHistory, { timestamp: new Date(), success: true }].slice(-20);
      
      // Calculate recent failure rate (last 10 requests)
      const recentHistory = updatedHistory.slice(-10);
      const recentFailures = recentHistory.filter(h => !h.success).length;
      const recentFailureRate = recentHistory.length > 0 ? (recentFailures / recentHistory.length) * 100 : 0;
      
      // Update average response time
      const newAvgResponseTime = responseTime 
        ? current.totalRequests > 0
          ? (current.avgResponseTime * current.totalRequests + responseTime) / (current.totalRequests + 1)
          : responseTime
        : current.avgResponseTime;
      
      newMap.set(modelId, {
        ...current,
        status: 'healthy',
        consecutiveFailures: 0,
        lastSuccess: new Date(),
        totalRequests: current.totalRequests + 1,
        successfulRequests: current.successfulRequests + 1,
        isDisabled: false,
        avgResponseTime: newAvgResponseTime,
        recentFailureRate,
        failureHistory: updatedHistory,
      });

      // Notify if model recovered
      if (wasDown) {
        toast({
          title: `${modelName} Recovered`,
          description: `${modelName} is now operational again.`,
          className: 'bg-green-500/10 border-green-500',
        });
        
        // Send admin notification
        if (user) {
          supabase.from('admin_notifications').insert({
            title: `Model Recovered: ${modelName}`,
            message: `${modelName} has recovered and is now operational.`,
            notification_type: 'model_health',
            metadata: { modelId, modelName, status: 'recovered', timestamp: new Date().toISOString() }
          }).then(({ error }) => {
            if (error) console.error('Failed to send admin notification:', error);
          });
        }
      }

      return newMap;
    });
  }, [toast, user]);

  // Send alert notifications
  const sendAlertNotification = useCallback(async (
    modelName: string,
    status: 'down' | 'degraded' | 'recovered' | 'predictive_warning',
    details: string,
    metadata?: any
  ) => {
    try {
      // Get admin users with notification preferences
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (!adminRoles || adminRoles.length === 0) return;

      const { data: adminProfiles } = await supabase
        .from('profiles')
        .select('id, recovery_email, phone_number')
        .in('id', adminRoles.map(r => r.user_id));

      const adminEmails = adminProfiles
        ?.map(p => p.recovery_email)
        .filter(Boolean) as string[];
      
      const adminPhones = adminProfiles
        ?.map(p => p.phone_number)
        .filter(Boolean) as string[];

      if (adminEmails.length === 0 && adminPhones.length === 0) return;

      // Send alerts via edge function
      await supabase.functions.invoke('send-model-health-alert', {
        body: {
          adminEmails,
          adminPhones,
          modelName,
          status,
          details,
          metadata,
        }
      });

      console.log(`📧 Alert notifications sent for ${modelName} ${status}`);
    } catch (error) {
      console.error('Failed to send alert notifications:', error);
    }
  }, []);

  // Record failure
  const recordFailure = useCallback(async (modelId: string, modelName: string, error?: string) => {
    // First, update the state synchronously
    let shouldSendDownAlert = false;
    let shouldSendDegradedAlert = false;
    let shouldSendPredictiveAlert = false;
    let alertData: any = {};

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
        avgResponseTime: 0,
        recentFailureRate: 0,
        failureHistory: [],
      };

      const newFailures = current.consecutiveFailures + 1;
      const shouldDisable = newFailures >= FAILURE_THRESHOLD;
      
      // Update failure history
      const updatedHistory = [...current.failureHistory, { timestamp: new Date(), success: false }].slice(-20);
      
      // Calculate recent failure rate (last 10 requests)
      const recentHistory = updatedHistory.slice(-10);
      const recentFailures = recentHistory.filter(h => !h.success).length;
      const recentFailureRate = recentHistory.length > 0 ? (recentFailures / recentHistory.length) * 100 : 0;
      
      // Predictive alert: Check if failure rate is increasing
      const olderHistory = updatedHistory.slice(-20, -10);
      const olderFailures = olderHistory.filter(h => !h.success).length;
      const olderFailureRate = olderHistory.length > 0 ? (olderFailures / olderHistory.length) * 100 : 0;
      
      // If failure rate doubled and is above 30%, send predictive warning
      const isPredictedDegradation = recentFailureRate > 30 && recentFailureRate > olderFailureRate * 1.5;
      
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
        recentFailureRate,
        failureHistory: updatedHistory,
      });

      // Predictive warning before reaching degraded status
      if (isPredictedDegradation && current.status === 'healthy' && !shouldDisable) {
        toast({
          title: `${modelName} Showing Warning Signs`,
          description: `${modelName} failure rate is increasing (${recentFailureRate.toFixed(0)}%). Potential degradation predicted.`,
          className: 'bg-orange-500/10 border-orange-500',
        });
        
        // Send predictive admin notification
        if (user) {
          supabase.from('admin_notifications').insert({
            title: `Predictive Alert: ${modelName}`,
            message: `${modelName} showing concerning failure rate trend (${recentFailureRate.toFixed(1)}% in last 10 requests, up from ${olderFailureRate.toFixed(1)}%). Model may degrade soon without intervention.`,
            notification_type: 'model_health',
            metadata: { 
              modelId, 
              modelName, 
              status: 'predictive_warning',
              recentFailureRate: recentFailureRate.toFixed(1),
              trend: 'increasing',
              timestamp: new Date().toISOString() 
            }
          }).then(({ error: dbError }) => {
            if (dbError) console.error('Failed to send predictive admin notification:', dbError);
          });
        }

        shouldSendPredictiveAlert = true;
        alertData.predictive = { recentFailureRate, olderFailureRate, trend: 'increasing' };
      }

      // Notify user of status change
      if (shouldDisable && !current.isDisabled) {
        toast({
          title: `${modelName} Disabled`,
          description: `${modelName} has been temporarily disabled due to repeated failures. It will be automatically re-enabled when it recovers.`,
          variant: 'destructive',
        });

        // Send admin notification
        if (user) {
          supabase.from('admin_notifications').insert({
            title: `Model Down: ${modelName}`,
            message: `${modelName} has been disabled after ${FAILURE_THRESHOLD} consecutive failures. Error: ${error || 'Unknown'}`,
            notification_type: 'model_health',
            metadata: { modelId, modelName, status: 'down', error: error || null, timestamp: new Date().toISOString() }
          }).then(({ error: dbError }) => {
            if (dbError) console.error('Failed to send admin notification:', dbError);
          });
        }

        shouldSendDownAlert = true;
        alertData.down = { error, consecutiveFailures: FAILURE_THRESHOLD };
      } else if (newStatus === 'degraded' && current.status === 'healthy') {
        toast({
          title: `${modelName} Degraded`,
          description: `${modelName} is experiencing issues. Consider using an alternative model.`,
          className: 'bg-yellow-500/10 border-yellow-500',
        });
        
        // Send admin notification
        if (user) {
          supabase.from('admin_notifications').insert({
            title: `Model Degraded: ${modelName}`,
            message: `${modelName} is experiencing issues (${newFailures} consecutive failures). Consider monitoring closely.`,
            notification_type: 'model_health',
            metadata: { modelId, modelName, status: 'degraded', error: error || null, timestamp: new Date().toISOString() }
          }).then(({ error: dbError }) => {
            if (dbError) console.error('Failed to send admin notification:', dbError);
          });
        }

        shouldSendDegradedAlert = true;
        alertData.degraded = { error, consecutiveFailures: newFailures };
      }

      return newMap;
    });
    
    // Send email/SMS alerts after state update
    if (shouldSendPredictiveAlert) {
      await sendAlertNotification(
        modelName,
        'predictive_warning',
        `${modelName} showing concerning failure rate trend (${alertData.predictive.recentFailureRate.toFixed(1)}% in last 10 requests). Model may degrade soon.`,
        alertData.predictive
      );
    }

    if (shouldSendDownAlert) {
      await sendAlertNotification(
        modelName,
        'down',
        `${modelName} has been disabled after ${FAILURE_THRESHOLD} consecutive failures. Error: ${error || 'Unknown'}`,
        alertData.down
      );
    }

    if (shouldSendDegradedAlert) {
      await sendAlertNotification(
        modelName,
        'degraded',
        `${modelName} is experiencing issues (${alertData.degraded.consecutiveFailures} consecutive failures). Consider monitoring closely.`,
        alertData.degraded
      );
    }
  }, [toast, user, sendAlertNotification]);
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
        avgResponseTime: 0,
        recentFailureRate: 0,
        failureHistory: [],
      };

      const newFailures = current.consecutiveFailures + 1;
      const shouldDisable = newFailures >= FAILURE_THRESHOLD;
      
      // Update failure history
      const updatedHistory = [...current.failureHistory, { timestamp: new Date(), success: false }].slice(-20);
      
      // Calculate recent failure rate (last 10 requests)
      const recentHistory = updatedHistory.slice(-10);
      const recentFailures = recentHistory.filter(h => !h.success).length;
      const recentFailureRate = recentHistory.length > 0 ? (recentFailures / recentHistory.length) * 100 : 0;
      
      // Predictive alert: Check if failure rate is increasing
      const olderHistory = updatedHistory.slice(-20, -10);
      const olderFailures = olderHistory.filter(h => !h.success).length;
      const olderFailureRate = olderHistory.length > 0 ? (olderFailures / olderHistory.length) * 100 : 0;
      
      // If failure rate doubled and is above 30%, send predictive warning
      const isPredictedDegradation = recentFailureRate > 30 && recentFailureRate > olderFailureRate * 1.5;
      
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
        recentFailureRate,
        failureHistory: updatedHistory,
      });

      // Predictive warning before reaching degraded status
      if (isPredictedDegradation && current.status === 'healthy' && !shouldDisable) {
        toast({
          title: `${modelName} Showing Warning Signs`,
          description: `${modelName} failure rate is increasing (${recentFailureRate.toFixed(0)}%). Potential degradation predicted.`,
          className: 'bg-orange-500/10 border-orange-500',
        });
        
        // Send predictive admin notification
        if (user) {
          supabase.from('admin_notifications').insert({
            title: `Predictive Alert: ${modelName}`,
            message: `${modelName} showing concerning failure rate trend (${recentFailureRate.toFixed(1)}% in last 10 requests, up from ${olderFailureRate.toFixed(1)}%). Model may degrade soon without intervention.`,
            notification_type: 'model_health',
            metadata: { 
              modelId, 
              modelName, 
              status: 'predictive_warning',
              recentFailureRate: recentFailureRate.toFixed(1),
              trend: 'increasing',
              timestamp: new Date().toISOString() 
            }
          }).then(({ error: dbError }) => {
            if (dbError) console.error('Failed to send predictive admin notification:', dbError);
          });
        }

        // Send email/SMS alert
        await sendAlertNotification(
          modelName,
          'predictive_warning',
          `${modelName} showing concerning failure rate trend (${recentFailureRate.toFixed(1)}% in last 10 requests). Model may degrade soon.`,
          { recentFailureRate, olderFailureRate, trend: 'increasing' }
        );
      }

      newMap.set(modelId, {
      if (shouldDisable && !current.isDisabled) {
        toast({
          title: `${modelName} Disabled`,
          description: `${modelName} has been temporarily disabled due to repeated failures. It will be automatically re-enabled when it recovers.`,
          variant: 'destructive',
        });

        // Send admin notification
        if (user) {
          supabase.from('admin_notifications').insert({
            title: `Model Down: ${modelName}`,
            message: `${modelName} has been disabled after ${FAILURE_THRESHOLD} consecutive failures. Error: ${error || 'Unknown'}`,
            notification_type: 'model_health',
            metadata: { modelId, modelName, status: 'down', error: error || null, timestamp: new Date().toISOString() }
          }).then(({ error: dbError }) => {
            if (dbError) console.error('Failed to send admin notification:', dbError);
          });
        }

        // Send email/SMS alert
        await sendAlertNotification(
          modelName,
          'down',
          `${modelName} has been disabled after ${FAILURE_THRESHOLD} consecutive failures. Error: ${error || 'Unknown'}`,
          { error, consecutiveFailures: FAILURE_THRESHOLD }
        );
      } else if (newStatus === 'degraded' && current.status === 'healthy') {
        toast({
          title: `${modelName} Degraded`,
          description: `${modelName} is experiencing issues. Consider using an alternative model.`,
          className: 'bg-yellow-500/10 border-yellow-500',
        });
        
        // Send admin notification
        if (user) {
          supabase.from('admin_notifications').insert({
            title: `Model Degraded: ${modelName}`,
            message: `${modelName} is experiencing issues (${newFailures} consecutive failures). Consider monitoring closely.`,
            notification_type: 'model_health',
            metadata: { modelId, modelName, status: 'degraded', error: error || null, timestamp: new Date().toISOString() }
          }).then(({ error: dbError }) => {
            if (dbError) console.error('Failed to send admin notification:', dbError);
          });
        }

        // Send email/SMS alert
        await sendAlertNotification(
          modelName,
          'degraded',
          `${modelName} is experiencing issues (${newFailures} consecutive failures). Consider monitoring closely.`,
          { error, consecutiveFailures: newFailures }
        );
      }

      return newMap;
    });
    
    // Handle async notifications after state update
    const health = modelHealthMap.get(modelId);
    if (!health) return;

    const newFailures = health.consecutiveFailures + 1;
    const shouldDisable = newFailures >= FAILURE_THRESHOLD;
    const newStatus: 'healthy' | 'degraded' | 'down' = shouldDisable ? 'down' : newFailures >= 2 ? 'degraded' : 'healthy';

    // Send alerts after state update
    if (shouldDisable && !health.isDisabled) {
      await sendAlertNotification(
        modelName,
        'down',
        `${modelName} has been disabled after ${FAILURE_THRESHOLD} consecutive failures. Error: ${error || 'Unknown'}`,
        { error, consecutiveFailures: FAILURE_THRESHOLD }
      );
    } else if (newStatus === 'degraded' && health.status === 'healthy') {
      await sendAlertNotification(
        modelName,
        'degraded',
        `${modelName} is experiencing issues (${newFailures} consecutive failures). Consider monitoring closely.`,
        { error, consecutiveFailures: newFailures }
      );
    }
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

  // Save health snapshot to database for historical tracking
  const saveHealthSnapshot = useCallback(async () => {
    if (!user) return;
    
    const healthData = Array.from(modelHealthMap.values());
    
    for (const health of healthData) {
      try {
        await supabase
          .from('model_health_history' as any)
          .insert({
            model_id: health.id,
            model_name: health.name,
            status: health.status,
            consecutive_failures: health.consecutiveFailures,
            total_requests: health.totalRequests,
            successful_requests: health.successfulRequests,
            is_disabled: health.isDisabled,
          });
      } catch (error) {
        console.error(`Failed to save health snapshot for ${health.name}:`, error);
      }
    }
  }, [modelHealthMap, user]);

  // Get models sorted by health score (for load balancing)
  const getModelsByHealthScore = useCallback((): ModelHealth[] => {
    const models = Array.from(modelHealthMap.values());
    
    return models
      .filter(m => !m.isDisabled)
      .sort((a, b) => {
        // Calculate health scores (0-100)
        const scoreA = (a.totalRequests > 0 ? (a.successfulRequests / a.totalRequests) * 100 : 100) 
                       - a.consecutiveFailures * 20 
                       - a.recentFailureRate * 0.5
                       - (a.avgResponseTime / 100); // Penalize slower models
        
        const scoreB = (b.totalRequests > 0 ? (b.successfulRequests / b.totalRequests) * 100 : 100) 
                       - b.consecutiveFailures * 20 
                       - b.recentFailureRate * 0.5
                       - (b.avgResponseTime / 100);
        
        return scoreB - scoreA; // Higher score first
      });
  }, [modelHealthMap]);

  return {
    initModel,
    recordSuccess,
    recordFailure,
    getModelHealth,
    isModelAvailable,
    getAllModelHealth,
    attemptRecovery,
    saveHealthSnapshot,
    getModelsByHealthScore,
  };
};
