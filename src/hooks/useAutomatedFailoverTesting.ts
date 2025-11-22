import { useEffect, useCallback } from 'react';
import { useModelHealth } from './useModelHealth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const TEST_INTERVAL = 5 * 60 * 1000; // Test every 5 minutes
const MAX_TEST_ATTEMPTS = 3;

interface RecoveryLog {
  modelId: string;
  modelName: string;
  testedAt: string;
  wasDisabled: boolean;
  testResult: 'success' | 'failed';
  attemptsCount: number;
  recoveryTime?: number;
  error?: string;
}

export const useAutomatedFailoverTesting = (enabled: boolean = true) => {
  const modelHealth = useModelHealth();

  const logRecoveryAttempt = useCallback(async (log: RecoveryLog) => {
    try {
      await supabase.from('admin_notifications').insert({
        notification_type: 'model_recovery_test',
        title: `Recovery Test: ${log.modelName}`,
        message: log.testResult === 'success' 
          ? `${log.modelName} recovery test successful after ${log.attemptsCount} attempts. Model is operational again.`
          : `${log.modelName} recovery test failed. Error: ${log.error || 'Unknown'}`,
        metadata: {
          ...log,
          timestamp: new Date().toISOString(),
        }
      });

      console.log('Recovery test log:', log);
    } catch (error) {
      console.error('Failed to log recovery attempt:', error);
    }
  }, []);

  const testDisabledModel = useCallback(async (modelId: string, modelName: string) => {
    const startTime = Date.now();
    let attempts = 0;
    let recovered = false;

    console.log(`🔄 Starting automated recovery test for ${modelName}...`);

    for (attempts = 1; attempts <= MAX_TEST_ATTEMPTS; attempts++) {
      try {
        // Attempt to re-enable and test the model
        await modelHealth.attemptRecovery(modelId);
        
        // Wait a bit for the model to stabilize
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check if model is now available
        const isAvailable = modelHealth.isModelAvailable(modelId);
        
        if (isAvailable) {
          recovered = true;
          const recoveryTime = Date.now() - startTime;
          
          await logRecoveryAttempt({
            modelId,
            modelName,
            testedAt: new Date().toISOString(),
            wasDisabled: true,
            testResult: 'success',
            attemptsCount: attempts,
            recoveryTime,
          });

          toast.success(`${modelName} Recovered`, {
            description: `Model recovered automatically after ${attempts} test attempt(s).`,
          });

          break;
        }
      } catch (error: any) {
        console.error(`Recovery test attempt ${attempts} failed:`, error);
        
        if (attempts === MAX_TEST_ATTEMPTS) {
          await logRecoveryAttempt({
            modelId,
            modelName,
            testedAt: new Date().toISOString(),
            wasDisabled: true,
            testResult: 'failed',
            attemptsCount: attempts,
            error: error.message || 'Unknown error',
          });
        }
      }

      // Wait before next attempt (exponential backoff)
      if (attempts < MAX_TEST_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, 5000 * attempts));
      }
    }

    return recovered;
  }, [modelHealth, logRecoveryAttempt]);

  useEffect(() => {
    if (!enabled) return;

    const runAutomatedTests = async () => {
      const allHealth = modelHealth.getAllModelHealth();
      const disabledModels = allHealth.filter(h => h.isDisabled);

      if (disabledModels.length === 0) {
        console.log('✅ No disabled models to test');
        return;
      }

      console.log(`🔍 Found ${disabledModels.length} disabled model(s), starting recovery tests...`);

      for (const model of disabledModels) {
        // Check if enough time has passed since last failure
        const timeSinceFailure = model.lastFailure 
          ? Date.now() - model.lastFailure.getTime()
          : Infinity;

        // Only test if at least 5 minutes have passed
        if (timeSinceFailure > TEST_INTERVAL) {
          await testDisabledModel(model.id, model.name);
          
          // Wait between testing different models
          await new Promise(resolve => setTimeout(resolve, 3000));
        } else {
          console.log(`⏳ Skipping ${model.name} - not enough time since last failure`);
        }
      }
    };

    // Run initial test after 1 minute
    const initialTimeout = setTimeout(() => {
      runAutomatedTests();
    }, 60000);

    // Then run periodically
    const interval = setInterval(() => {
      runAutomatedTests();
    }, TEST_INTERVAL);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [enabled, modelHealth, testDisabledModel]);

  return {
    testDisabledModel,
  };
};
