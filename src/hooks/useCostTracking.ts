import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CreditLog {
  id: string;
  model: string;
  credits_used: number;
  request_type: string;
  created_at: string;
  cost_usd?: number;
  tokens_used?: number;
}

export interface ModelCostStats {
  model: string;
  total_requests: number;
  total_credits: number;
  avg_credits: number;
}

export const useCostTracking = (period: 'day' | 'week' | 'month' = 'day') => {
  const { user } = useAuth();

  const getPeriodDate = () => {
    const now = new Date();
    switch (period) {
      case 'day':
        return new Date(now.setHours(0, 0, 0, 0)).toISOString();
      case 'week':
        return new Date(now.setDate(now.getDate() - 7)).toISOString();
      case 'month':
        return new Date(now.setMonth(now.getMonth() - 1)).toISOString();
    }
  };

  const { data: creditLogs, isLoading } = useQuery({
    queryKey: ['credit-logs', user?.id, period],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('credit_usage_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', getPeriodDate())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CreditLog[];
    },
    enabled: !!user,
  });

  const totalCredits = creditLogs?.reduce((sum, log) => sum + log.credits_used, 0) || 0;
  const totalCostUsd = creditLogs?.reduce((sum, log) => sum + (log.cost_usd || 0), 0) || 0;

  const modelStats: Record<string, ModelCostStats> = {};
  creditLogs?.forEach(log => {
    if (!modelStats[log.model]) {
      modelStats[log.model] = {
        model: log.model,
        total_requests: 0,
        total_credits: 0,
        avg_credits: 0,
      };
    }
    modelStats[log.model].total_requests++;
    modelStats[log.model].total_credits += log.credits_used;
  });

  Object.values(modelStats).forEach(stat => {
    stat.avg_credits = stat.total_credits / stat.total_requests;
  });

  return {
    creditLogs,
    totalCredits,
    totalCostUsd,
    modelStats: Object.values(modelStats),
    isLoading,
  };
};

export const logCreditUsage = async (
  userId: string,
  model: string,
  creditsUsed: number,
  chatId?: string,
  messageId?: string,
  responseTimeMs?: number,
  tokensUsed?: number,
  costUsd?: number,
  pricingTier?: string
) => {
  const { error } = await supabase.from('credit_usage_logs').insert({
    user_id: userId,
    chat_id: chatId,
    message_id: messageId,
    model,
    credits_used: creditsUsed,
    request_type: 'chat',
    response_time_ms: responseTimeMs,
    tokens_used: tokensUsed,
    cost_usd: costUsd || 0,
    model_pricing_tier: pricingTier,
  });

  if (error) console.error('Error logging credit usage:', error);
};
