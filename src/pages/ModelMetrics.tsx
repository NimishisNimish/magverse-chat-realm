import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2, Zap, Crown, TrendingUp, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ChartErrorBoundary } from '@/components/ChartErrorBoundary';

interface MetricData {
  model_name: string;
  avg_response_time: number;
  total_requests: number;
  total_tokens?: number;
  avg_tokens_per_request?: number;
}

export default function ModelMetrics() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<any[]>([]);
  const isPro = profile?.subscription_type !== 'free';

  useEffect(() => {
    fetchMetrics();
  }, [user]);

  const fetchMetrics = async () => {
    if (!user) return;
    
    try {
      setLoading(true);

      // Fetch average response times grouped by model
      const { data: metricsData, error } = await supabase
        .from('ai_model_metrics')
        .select('model_name, response_time_ms, tokens_total, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process data
      const modelStats: Record<string, { 
        total_time: number; 
        count: number; 
        total_tokens: number;
      }> = {};

      metricsData?.forEach(metric => {
        if (!modelStats[metric.model_name]) {
          modelStats[metric.model_name] = { total_time: 0, count: 0, total_tokens: 0 };
        }
        modelStats[metric.model_name].total_time += metric.response_time_ms;
        modelStats[metric.model_name].count += 1;
        modelStats[metric.model_name].total_tokens += metric.tokens_total || 0;
      });

      const processedMetrics: MetricData[] = Object.entries(modelStats).map(([model, stats]) => ({
        model_name: model,
        avg_response_time: Math.round(stats.total_time / stats.count),
        total_requests: stats.count,
        total_tokens: stats.total_tokens,
        avg_tokens_per_request: stats.count > 0 ? Math.round(stats.total_tokens / stats.count) : 0,
      })).sort((a, b) => a.avg_response_time - b.avg_response_time);

      setMetrics(processedMetrics);

      // Prepare time series data (last 7 days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      }).reverse();

      const timeData = last7Days.map(date => {
        const dayMetrics = metricsData?.filter(m => 
          m.created_at.startsWith(date)
        ) || [];

        const modelTimes: Record<string, number> = {};
        dayMetrics.forEach(m => {
          modelTimes[m.model_name] = (modelTimes[m.model_name] || 0) + m.response_time_ms;
        });

        return {
          date: date.split('-').slice(1).join('/'),
          ...Object.entries(modelTimes).reduce((acc, [model, time]) => ({
            ...acc,
            [model]: Math.round(time / (dayMetrics.filter(m => m.model_name === model).length || 1))
          }), {})
        };
      });

      setTimeSeriesData(timeData);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fastestModel = metrics[0];
  const slowestModel = metrics[metrics.length - 1];

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#8884d8', '#82ca9d', '#ffc658'];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold gradient-text">Model Performance Metrics</h1>
              <p className="text-muted-foreground mt-2">
                Track response times and usage across AI models
              </p>
            </div>
            {isPro && (
              <Badge className="bg-gradient-to-r from-amber-500 to-amber-600">
                <Crown className="w-3 h-3 mr-1" />
                Pro Features Unlocked
              </Badge>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : metrics.length === 0 ? (
            <Card>
              <CardContent className="py-20 text-center">
                <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No metrics yet</h3>
                <p className="text-muted-foreground">
                  Start chatting with AI models to see performance metrics
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Fastest Model</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold">{fastestModel?.model_name || 'N/A'}</p>
                        <p className="text-sm text-muted-foreground">
                          {fastestModel ? `${(fastestModel.avg_response_time / 1000).toFixed(2)}s avg` : 'No data'}
                        </p>
                      </div>
                      <Zap className="w-8 h-8 text-yellow-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Slowest Model</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold">{slowestModel?.model_name || 'N/A'}</p>
                        <p className="text-sm text-muted-foreground">
                          {slowestModel ? `${(slowestModel.avg_response_time / 1000).toFixed(2)}s avg` : 'No data'}
                        </p>
                      </div>
                      <Clock className="w-8 h-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Requests</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold">
                          {metrics.reduce((sum, m) => sum + m.total_requests, 0)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Across {metrics.length} models
                        </p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Response Time Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Average Response Time by Model</CardTitle>
                  <CardDescription>Lower is better (in milliseconds)</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartErrorBoundary>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={metrics}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="model_name" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px'
                          }}
                        />
                        <Bar dataKey="avg_response_time" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartErrorBoundary>
                </CardContent>
              </Card>

              {/* Time Series Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Response Time Trends (Last 7 Days)</CardTitle>
                  <CardDescription>Track performance over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartErrorBoundary>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={timeSeriesData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px'
                          }}
                        />
                        <Legend />
                        {metrics.map((metric, index) => (
                          <Line 
                            key={metric.model_name}
                            type="monotone" 
                            dataKey={metric.model_name}
                            stroke={COLORS[index % COLORS.length]}
                            strokeWidth={2}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartErrorBoundary>
                </CardContent>
              </Card>

              {/* Token Usage (Pro Only) */}
              {isPro && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        Token Usage by Model
                        <Badge variant="secondary" className="text-xs">Pro Only</Badge>
                      </CardTitle>
                      <CardDescription>Total tokens consumed per model</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChartErrorBoundary>
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={metrics.filter(m => m.total_tokens && m.total_tokens > 0)}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={(entry) => `${entry.model_name}: ${entry.total_tokens}`}
                              outerRadius={100}
                              fill="hsl(var(--primary))"
                              dataKey="total_tokens"
                            >
                              {metrics.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </ChartErrorBoundary>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        Token Efficiency
                        <Badge variant="secondary" className="text-xs">Pro Only</Badge>
                      </CardTitle>
                      <CardDescription>Average tokens per request</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChartErrorBoundary>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={metrics.filter(m => m.avg_tokens_per_request && m.avg_tokens_per_request > 0)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="model_name" stroke="hsl(var(--muted-foreground))" />
                            <YAxis stroke="hsl(var(--muted-foreground))" />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '6px'
                              }}
                            />
                            <Bar dataKey="avg_tokens_per_request" fill="hsl(var(--secondary))" radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartErrorBoundary>
                    </CardContent>
                  </Card>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}