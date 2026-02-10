import { useState, useEffect, useMemo } from 'react';
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

export const useModelRecommendation = (
  message: string,
  currentModelIds: string[]
) => {
  const [recommendation, setRecommendation] = useState<ModelRecommendation | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Reset dismissed when message changes significantly
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
      const bestModelId = optimalModels[0];
      
      if (!bestModelId || currentModelIds.includes(bestModelId)) {
        setRecommendation(null);
        return;
      }

      const config = getModelConfig(bestModelId);
      const info = getQueryTypeInfo(queryType);

      setRecommendation({
        queryType,
        recommendedModelId: bestModelId,
        recommendedModelName: config?.name || bestModelId,
        reason: `Best for ${info.label.toLowerCase()} queries`,
        icon: info.icon,
        color: info.color,
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [message, currentModelIds, dismissed]);

  const dismiss = () => {
    setDismissed(true);
    setRecommendation(null);
  };

  return { recommendation, dismiss };
};
