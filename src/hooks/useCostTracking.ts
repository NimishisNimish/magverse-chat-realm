import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CreditLog {
  id: string;
  model: string;
  credits_used: number;
  request_type: string;
  created_at: string;
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

  const modelStats: ModelCostStats[] = creditLogs
    ? Object.entries(
        creditLogs.reduce((acc, log) => {
          if (!acc[log.model]) {
            acc[log.model] = { requests: 0, credits: 0 };
          }
          acc[log.model].requests++;
          acc[log.model].credits += log.credits_used;
          return acc;
        }, {} as Record<string, { requests: number; credits: number }>)
      ).map(([model, stats]) => ({
        model,
        total_requests: stats.requests,
        total_credits: stats.credits,
        avg_credits: Math.round((stats.credits / stats.requests) * 10) / 10,
      }))
    : [];

  return {
    creditLogs,
    totalCredits,
    modelStats,
    isLoading,
  };
};

export const logCreditUsage = async (
  userId: string,
  model: string,
  creditsUsed: number,
  chatId?: string,
  messageId?: string,
  requestType: string = 'chat'
) => {
  const { error } = await supabase.from('credit_usage_logs').insert({
    user_id: userId,
    chat_id: chatId,
    message_id: messageId,
    model,
    credits_used: creditsUsed,
    request_type: requestType,
  });

  if (error) console.error('Error logging credit usage:', error);
};
