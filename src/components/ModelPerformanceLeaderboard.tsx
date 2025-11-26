import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, TrendingUp, Zap, ThumbsUp, Award } from 'lucide-react';
import { subDays } from 'date-fns';
import { MODEL_CONFIG } from '@/config/modelConfig';

interface ModelPerformance {
  modelId: string;
  modelName: string;
  uptime: number;
  avgResponseTime: number;
  totalRequests: number;
  successRate: number;
  userSatisfaction: number;
  overallScore: number;
}

const MODEL_CONFIGS = MODEL_CONFIG;

export const ModelPerformanceLeaderboard = () => {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('7d');
  const [performances, setPerformances] = useState<ModelPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPerformanceData();
  }, [period]);

  const loadPerformanceData = async () => {
    setLoading(true);
    try {
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      const startDate = subDays(new Date(), days);

      // Fetch model health history
      const { data: historyData, error: historyError } = await supabase
        .from('model_health_history')
        .select('*')
        .gte('recorded_at', startDate.toISOString());

      if (historyError) throw historyError;

      // Fetch user feedback for satisfaction scores
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('ai_response_feedback')
        .select('model, rating')
        .gte('created_at', startDate.toISOString());

      if (feedbackError) throw feedbackError;

      // Process performance data
      const performanceMap = new Map<string, ModelPerformance>();

      MODEL_CONFIGS.forEach(config => {
        const modelHistory = historyData?.filter(h => h.model_id === config.id) || [];
        const modelFeedback = feedbackData?.filter(f => f.model?.includes(config.id)) || [];

        const totalRecords = modelHistory.length;
        const healthyRecords = modelHistory.filter(h => h.status === 'healthy').length;
        const uptime = totalRecords > 0 ? (healthyRecords / totalRecords) * 100 : 100;

        const totalRequests = modelHistory.reduce((sum, h) => sum + (h.total_requests || 0), 0);
        const successfulRequests = modelHistory.reduce((sum, h) => sum + (h.successful_requests || 0), 0);
        const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;

        // Calculate average response time (simulated for now)
        const avgResponseTime = 1000 + Math.random() * 2000; // TODO: Get from actual data

        // Calculate user satisfaction from feedback
        const positiveReviews = modelFeedback.filter(f => f.rating === 'thumbs_up').length;
        const totalReviews = modelFeedback.length;
        const userSatisfaction = totalReviews > 0 ? (positiveReviews / totalReviews) * 100 : 50;

        // Calculate overall score (weighted average)
        const overallScore = 
          (uptime * 0.35) + 
          (successRate * 0.25) + 
          ((1 - avgResponseTime / 5000) * 100 * 0.20) + 
          (userSatisfaction * 0.20);

        performanceMap.set(config.id, {
          modelId: config.id,
          modelName: config.name,
          uptime,
          avgResponseTime,
          totalRequests,
          successRate,
          userSatisfaction,
          overallScore,
        });
      });

      // Sort by overall score
      const sortedPerformances = Array.from(performanceMap.values())
        .sort((a, b) => b.overallScore - a.overallScore);

      setPerformances(sortedPerformances);
    } catch (error) {
      console.error('Error loading performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMedalIcon = (rank: number) => {
    switch (rank) {
      case 0:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 1:
        return <Award className="h-5 w-5 text-gray-400" />;
      case 2:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return null;
    }
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-500">Excellent</Badge>;
    if (score >= 75) return <Badge className="bg-blue-500">Good</Badge>;
    if (score >= 60) return <Badge className="bg-yellow-500">Fair</Badge>;
    return <Badge variant="destructive">Needs Improvement</Badge>;
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <CardTitle>Model Performance Leaderboard</CardTitle>
          </div>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as '7d' | '30d' | '90d')}>
            <TabsList>
              <TabsTrigger value="7d">7 Days</TabsTrigger>
              <TabsTrigger value="30d">30 Days</TabsTrigger>
              <TabsTrigger value="90d">90 Days</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading performance data...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {performances.map((perf, index) => {
              const modelConfig = MODEL_CONFIGS.find(m => m.id === perf.modelId);
              
              return (
                <div 
                  key={perf.modelId}
                  className={`p-4 rounded-lg border transition-all ${
                    index < 3 
                      ? 'bg-primary/5 border-primary/20 shadow-md' 
                      : 'bg-card border-border/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                        {getMedalIcon(index) || (
                          <span className="text-sm font-bold">{index + 1}</span>
                        )}
                      </div>
                      <div>
                        <div className={`font-semibold ${modelConfig?.color}`}>
                          {perf.modelName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {perf.totalRequests.toLocaleString()} total requests
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">
                        {perf.overallScore.toFixed(1)}
                      </div>
                      <div className="text-xs text-muted-foreground">Overall Score</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    <div className="text-center p-2 rounded bg-muted/50">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <TrendingUp className="h-3 w-3 text-green-500" />
                        <span className="text-xs text-muted-foreground">Uptime</span>
                      </div>
                      <div className="font-semibold text-green-500">
                        {perf.uptime.toFixed(1)}%
                      </div>
                    </div>

                    <div className="text-center p-2 rounded bg-muted/50">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Zap className="h-3 w-3 text-blue-500" />
                        <span className="text-xs text-muted-foreground">Speed</span>
                      </div>
                      <div className="font-semibold text-blue-500">
                        {perf.avgResponseTime.toFixed(0)}ms
                      </div>
                    </div>

                    <div className="text-center p-2 rounded bg-muted/50">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <TrendingUp className="h-3 w-3 text-purple-500" />
                        <span className="text-xs text-muted-foreground">Success</span>
                      </div>
                      <div className="font-semibold text-purple-500">
                        {perf.successRate.toFixed(1)}%
                      </div>
                    </div>

                    <div className="text-center p-2 rounded bg-muted/50">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <ThumbsUp className="h-3 w-3 text-orange-500" />
                        <span className="text-xs text-muted-foreground">Rating</span>
                      </div>
                      <div className="font-semibold text-orange-500">
                        {perf.userSatisfaction.toFixed(0)}%
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex justify-end">
                    {getScoreBadge(perf.overallScore)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
