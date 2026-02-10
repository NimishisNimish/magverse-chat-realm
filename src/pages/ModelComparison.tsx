import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { AIModelLogo } from '@/components/AIModelLogo';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  Clock, 
  TrendingUp, 
  BarChart3, 
  ArrowLeft,
  Trophy,
  Activity,
  MessageSquare,
  Sparkles,
  Download
} from 'lucide-react';
import { exportModelComparisonPDF } from '@/utils/modelComparisonPdfExport';

interface ModelMetrics {
  model_name: string;
  response_time_ms: number;
  tokens_total: number | null;
  created_at: string;
}

interface AggregatedMetrics {
  model: string;
  avgResponseTime: number;
  avgTtft: number;
  totalRequests: number;
  avgTokens: number;
  wordsPerSecond: number;
}

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  model: string | null;
  created_at: string;
}

interface ChatHistory {
  id: string;
  title: string;
  messages: ChatMessage[];
}

export default function ModelComparison() {
  const [searchParams] = useSearchParams();
  const chatIds = searchParams.get('chats')?.split(',') || [];
  const { user } = useAuth();
  const [selectedMetric, setSelectedMetric] = useState<'responseTime' | 'ttft' | 'speed'>('responseTime');

  // Fetch chat data for comparison
  const { data: chats, isLoading: chatsLoading } = useQuery({
    queryKey: ['comparison-chats', chatIds],
    queryFn: async () => {
      const promises = chatIds.map(async (chatId) => {
        const { data: history } = await supabase
          .from('chat_history')
          .select('*')
          .eq('id', chatId)
          .single();

        const { data: messages } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('chat_id', chatId)
          .order('created_at', { ascending: true });

        return {
          ...history,
          messages: messages || [],
        } as ChatHistory;
      });

      return Promise.all(promises);
    },
    enabled: chatIds.length > 0 && !!user,
  });

  // Fetch model metrics for performance comparison
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['model-metrics-comparison', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_model_metrics')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      return data as ModelMetrics[];
    },
    enabled: !!user,
  });

  // Aggregate metrics by model
  const aggregatedMetrics = useMemo(() => {
    if (!metrics) return [];

    const modelMap = new Map<string, { 
      responseTimes: number[]; 
      tokens: number[];
      count: number;
    }>();

    metrics.forEach(m => {
      const existing = modelMap.get(m.model_name) || { 
        responseTimes: [], 
        tokens: [],
        count: 0 
      };
      existing.responseTimes.push(m.response_time_ms);
      if (m.tokens_total) existing.tokens.push(m.tokens_total);
      existing.count++;
      modelMap.set(m.model_name, existing);
    });

    const result: AggregatedMetrics[] = [];
    modelMap.forEach((data, model) => {
      const avgResponseTime = data.responseTimes.reduce((a, b) => a + b, 0) / data.responseTimes.length;
      const avgTokens = data.tokens.length > 0 
        ? data.tokens.reduce((a, b) => a + b, 0) / data.tokens.length 
        : 0;
      // Estimate TTFT as ~20% of response time (rough approximation)
      const avgTtft = avgResponseTime * 0.2;
      // Calculate words per second (estimate ~0.75 words per token, convert ms to seconds)
      const wordsPerSecond = avgTokens > 0 && avgResponseTime > 0
        ? (avgTokens * 0.75) / (avgResponseTime / 1000)
        : 0;

      result.push({
        model,
        avgResponseTime: Math.round(avgResponseTime),
        avgTtft: Math.round(avgTtft),
        totalRequests: data.count,
        avgTokens: Math.round(avgTokens),
        wordsPerSecond: parseFloat(wordsPerSecond.toFixed(1)),
      });
    });

    // Sort by selected metric
    return result.sort((a, b) => {
      if (selectedMetric === 'responseTime') return a.avgResponseTime - b.avgResponseTime;
      if (selectedMetric === 'ttft') return a.avgTtft - b.avgTtft;
      return b.wordsPerSecond - a.wordsPerSecond; // Higher is better for speed
    });
  }, [metrics, selectedMetric]);

  const isLoading = chatsLoading || metricsLoading;

  // Get best model for each metric
  const bestModels = useMemo(() => {
    if (aggregatedMetrics.length === 0) return null;
    
    const sorted = [...aggregatedMetrics];
    return {
      fastest: sorted.sort((a, b) => a.avgResponseTime - b.avgResponseTime)[0],
      lowestTtft: sorted.sort((a, b) => a.avgTtft - b.avgTtft)[0],
      highestSpeed: sorted.sort((a, b) => b.wordsPerSecond - a.wordsPerSecond)[0],
    };
  }, [aggregatedMetrics]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 pt-24">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Activity className="h-5 w-5 text-primary" />
            </motion.div>
            <p className="text-muted-foreground">Loading comparison data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-4">
            <Link to="/history">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
          </div>
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-bold mb-2">Model Comparison</h1>
            {aggregatedMetrics.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportModelComparisonPDF(aggregatedMetrics, bestModels)}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export PDF
              </Button>
            )}
          </div>
          <p className="text-muted-foreground">
            Compare AI model performance with TTFT, response time, and generation speed
          </p>
        </motion.div>

        {/* Performance Overview Cards */}
        {bestModels && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
          >
            {/* Fastest Response */}
            <Card className="relative overflow-hidden border-primary/20">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
              <CardHeader className="relative pb-2">
                <div className="flex items-center gap-2 text-primary">
                  <Trophy className="h-4 w-4" />
                  <CardTitle className="text-sm font-medium">Fastest Response</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="flex items-center gap-3">
                  <AIModelLogo modelId={bestModels.fastest.model} size="md" />
                  <div>
                    <p className="font-semibold">{bestModels.fastest.model}</p>
                    <p className="text-2xl font-bold text-primary">
                      {bestModels.fastest.avgResponseTime}ms
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lowest TTFT */}
            <Card className="relative overflow-hidden border-accent/20">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent" />
              <CardHeader className="relative pb-2">
                <div className="flex items-center gap-2 text-accent-foreground">
                  <Zap className="h-4 w-4" />
                  <CardTitle className="text-sm font-medium">Lowest TTFT</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="flex items-center gap-3">
                  <AIModelLogo modelId={bestModels.lowestTtft.model} size="md" />
                  <div>
                    <p className="font-semibold">{bestModels.lowestTtft.model}</p>
                    <p className="text-2xl font-bold text-accent-foreground">
                      {bestModels.lowestTtft.avgTtft}ms
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Highest Speed */}
            <Card className="relative overflow-hidden border-secondary/20">
              <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 to-transparent" />
              <CardHeader className="relative pb-2">
                <div className="flex items-center gap-2 text-foreground">
                  <TrendingUp className="h-4 w-4" />
                  <CardTitle className="text-sm font-medium">Fastest Generation</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="flex items-center gap-3">
                  <AIModelLogo modelId={bestModels.highestSpeed.model} size="md" />
                  <div>
                    <p className="font-semibold">{bestModels.highestSpeed.model}</p>
                    <p className="text-2xl font-bold">
                      {bestModels.highestSpeed.wordsPerSecond} w/s
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Metric Toggle */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex gap-2 mb-6"
        >
          <Button
            variant={selectedMetric === 'responseTime' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedMetric('responseTime')}
            className="gap-2"
          >
            <Clock className="h-4 w-4" />
            Response Time
          </Button>
          <Button
            variant={selectedMetric === 'ttft' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedMetric('ttft')}
            className="gap-2"
          >
            <Zap className="h-4 w-4" />
            TTFT
          </Button>
          <Button
            variant={selectedMetric === 'speed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedMetric('speed')}
            className="gap-2"
          >
            <TrendingUp className="h-4 w-4" />
            Generation Speed
          </Button>
        </motion.div>

        {/* Model Metrics Table */}
        {aggregatedMetrics.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Performance Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {aggregatedMetrics.map((model, index) => {
                      const maxValue = selectedMetric === 'speed'
                        ? Math.max(...aggregatedMetrics.map(m => m.wordsPerSecond))
                        : selectedMetric === 'ttft'
                        ? Math.max(...aggregatedMetrics.map(m => m.avgTtft))
                        : Math.max(...aggregatedMetrics.map(m => m.avgResponseTime));
                      
                      const currentValue = selectedMetric === 'speed'
                        ? model.wordsPerSecond
                        : selectedMetric === 'ttft'
                        ? model.avgTtft
                        : model.avgResponseTime;

                      // For speed, higher is better. For time metrics, lower is better
                      const percentage = selectedMetric === 'speed'
                        ? (currentValue / maxValue) * 100
                        : ((maxValue - currentValue) / maxValue) * 100 + 20;

                      return (
                        <motion.div
                          key={model.model}
                          layout
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: index * 0.05 }}
                          className="relative"
                        >
                          <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                            {/* Rank */}
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                              {index + 1}
                            </div>

                            {/* Model Logo & Name */}
                            <div className="flex items-center gap-3 min-w-[180px]">
                              <AIModelLogo modelId={model.model} size="sm" />
                              <span className="font-medium truncate">{model.model}</span>
                            </div>

                            {/* Progress Bar */}
                            <div className="flex-1 relative h-6 bg-muted rounded-full overflow-hidden">
                              <motion.div
                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/60 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.max(percentage, 10)}%` }}
                                transition={{ duration: 0.5, ease: 'easeOut' }}
                              />
                              <div className="absolute inset-0 flex items-center justify-end pr-3">
                                <span className="text-xs font-medium text-foreground/80 drop-shadow-sm">
                                  {selectedMetric === 'speed' 
                                    ? `${model.wordsPerSecond} w/s`
                                    : selectedMetric === 'ttft'
                                    ? `${model.avgTtft}ms`
                                    : `${model.avgResponseTime}ms`
                                  }
                                </span>
                              </div>
                            </div>

                            {/* Stats */}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground min-w-[120px]">
                              <div className="flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                <span>{model.totalRequests} reqs</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Sparkles className="h-3 w-3" />
                                <span>{model.avgTokens} avg</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Chat Comparison (if chats are selected) */}
        {chats && chats.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Chat Comparison
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {chats.map((chat, chatIndex) => (
                <motion.div
                  key={chat.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + chatIndex * 0.1 }}
                >
                  <Card className="flex flex-col h-full">
                    <CardHeader>
                      <CardTitle className="text-lg line-clamp-1">{chat.title}</CardTitle>
                      <div className="flex flex-wrap items-center gap-2">
                        {chat.messages
                          .filter((m) => m.role === 'assistant' && m.model)
                          .map((m) => m.model)
                          .filter((v, i, a) => a.indexOf(v) === i)
                          .map((model) => (
                            <div key={model} className="flex items-center gap-1">
                              <AIModelLogo modelId={model!} size="sm" />
                              <Badge variant="secondary" className="text-xs">
                                {model}
                              </Badge>
                            </div>
                          ))}
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <ScrollArea className="h-[400px] pr-4">
                        <div className="space-y-4">
                          {chat.messages.map((message) => (
                            <div
                              key={message.id}
                              className={`p-3 rounded-lg ${
                                message.role === 'user'
                                  ? 'bg-primary/10'
                                  : 'bg-secondary/50'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <Badge variant="outline" className="text-xs">
                                  {message.role === 'user' ? 'You' : message.model || 'AI'}
                                </Badge>
                              </div>
                              <p className="text-sm whitespace-pre-wrap line-clamp-6">
                                {message.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {aggregatedMetrics.length === 0 && (!chats || chats.length === 0) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <BarChart3 className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No comparison data yet</h3>
            <p className="text-muted-foreground mb-4">
              Start chatting with different AI models to see performance comparisons
            </p>
            <Link to="/chat">
              <Button>Start Chatting</Button>
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}
