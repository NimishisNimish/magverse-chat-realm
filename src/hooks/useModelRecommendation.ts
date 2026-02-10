import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { classifyQuery, getOptimalModels, getQueryTypeInfo, QueryType } from '@/utils/queryClassifier';
import { getModelConfig } from '@/config/modelConfig';

interface ModelRecommendation {
  queryType: QueryType;
  recommendedModelId: string;
  recommendedModelName: string;
  reason: string;
  icon: string;
  color: string;
}

interface ModelPerf {
  model: string;
  avgResponseTime: number;
  count: number;
}

export const useModelRecommendation = (
  message: string,
  currentModelIds: string[]
) => {
  const { user } = useAuth();
  const [recommendation, setRecommendation] = useState<ModelRecommendation | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // Fetch historical performance metrics (cached, refreshed every 5 min)
  const { data: perfData } = useQuery({
    queryKey: ['model-perf-recommendation', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_model_metrics')
        .select('model_name, response_time_ms')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(300);

      if (error || !data) return new Map<string, ModelPerf>();

      const map = new Map<string, { total: number; count: number }>();
      data.forEach((m) => {
        const existing = map.get(m.model_name) || { total: 0, count: 0 };
        existing.total += m.response_time_ms;
        existing.count++;
        map.set(m.model_name, existing);
      });

      const result = new Map<string, ModelPerf>();
      map.forEach((v, model) => {
        result.set(model, {
          model,
          avgResponseTime: Math.round(v.total / v.count),
          count: v.count,
        });
      });
      return result;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    setDismissed(false);
  }, [message.length > 15 ? message.slice(0, 20) : '']);

  useEffect(() => {
    if (message.length < 15 || dismissed) {
      setRecommendation(null);
      return;
    }

    const timer = setTimeout(() => {
      const queryType = classifyQuery(message);
      if (queryType === 'general') {
        setRecommendation(null);
        return;
      }

      const optimalModels = getOptimalModels(queryType);

      // Pick the fastest model from the optimal set using real performance data
      let bestModelId = optimalModels[0];

      if (perfData && perfData.size > 0) {
        let bestTime = Infinity;
        for (const modelId of optimalModels) {
          const perf = perfData.get(modelId);
          if (perf && perf.count >= 3 && perf.avgResponseTime < bestTime) {
            bestTime = perf.avgResponseTime;
            bestModelId = modelId;
          }
        }
      }

      if (!bestModelId || currentModelIds.includes(bestModelId)) {
        setRecommendation(null);
        return;
      }

      const config = getModelConfig(bestModelId);
      const info = getQueryTypeInfo(queryType);
      const perf = perfData?.get(bestModelId);
      const perfSuffix = perf ? ` (avg ${perf.avgResponseTime}ms)` : '';

      setRecommendation({
        queryType,
        recommendedModelId: bestModelId,
        recommendedModelName: config?.name || bestModelId,
        reason: `Best for ${info.label.toLowerCase()} queries${perfSuffix}`,
        icon: info.icon,
        color: info.color,
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [message, currentModelIds, dismissed, perfData]);

  const dismiss = () => {
    setDismissed(true);
    setRecommendation(null);
  };

  return { recommendation, dismiss };
};
