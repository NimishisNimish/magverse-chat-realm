import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Zap, BarChart3 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCost } from '@/utils/modelPricing';

export function AdminCostMetricsWidget() {
  const { data: costMetrics, isLoading } = useQuery({
    queryKey: ['admin-cost-metrics'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Get cost data for last 30 days
      const { data: logs, error } = await supabase
        .from('credit_usage_logs')
        .select('cost_usd, model, created_at, credits_used')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      const totalCost = logs?.reduce((sum, log) => sum + (log.cost_usd || 0), 0) || 0;
      const totalRequests = logs?.length || 0;
      const totalCredits = logs?.reduce((sum, log) => sum + log.credits_used, 0) || 0;

      // Calculate model usage breakdown
      const modelUsage: Record<string, { count: number; cost: number }> = {};
      logs?.forEach((log) => {
        if (!modelUsage[log.model]) {
          modelUsage[log.model] = { count: 0, cost: 0 };
        }
        modelUsage[log.model].count++;
        modelUsage[log.model].cost += log.cost_usd || 0;
      });

      // Get top 3 models by usage
      const topModels = Object.entries(modelUsage)
        .sort(([, a], [, b]) => b.count - a.count)
        .slice(0, 3);

      // Calculate today's cost
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayCost = logs?.filter(log => new Date(log.created_at) >= today)
        .reduce((sum, log) => sum + (log.cost_usd || 0), 0) || 0;

      return {
        totalCost,
        totalRequests,
        totalCredits,
        topModels,
        todayCost,
      };
    },
    refetchInterval: 60000, // Refetch every minute
  });

  if (isLoading) {
    return (
      <Card className="border-primary/20">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" />
          Cost Metrics (Last 30 Days)
        </CardTitle>
        <CardDescription>Real-time cost tracking and model usage statistics</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total Cost */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/10">
          <div>
            <p className="text-sm text-muted-foreground">Total Cost</p>
            <p className="text-2xl font-bold text-primary">{formatCost(costMetrics?.totalCost || 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Today: {formatCost(costMetrics?.todayCost || 0)}
            </p>
          </div>
          <TrendingUp className="w-8 h-8 text-primary/60" />
        </div>

        {/* Requests & Credits */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/20">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-secondary" />
              <p className="text-sm text-muted-foreground">Total Requests</p>
            </div>
            <p className="text-xl font-bold">{costMetrics?.totalRequests.toLocaleString()}</p>
          </div>
          <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-accent" />
              <p className="text-sm text-muted-foreground">Credits Used</p>
            </div>
            <p className="text-xl font-bold">{costMetrics?.totalCredits.toLocaleString()}</p>
          </div>
        </div>

        {/* Top Models */}
        <div>
          <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Top Models by Usage</h4>
          <div className="space-y-2">
            {costMetrics?.topModels.map(([model, data], index) => (
              <div
                key={model}
                className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{model}</p>
                    <p className="text-xs text-muted-foreground">{data.count.toLocaleString()} requests</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-primary">{formatCost(data.cost)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
