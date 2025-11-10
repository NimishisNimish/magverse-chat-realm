import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Brain, TrendingUp, Star, Zap } from "lucide-react";

interface ModelStats {
  modelId: string;
  modelName: string;
  totalVotes: number;
  winRate: number;
  avgRating: number;
  usageCount: number;
  queryTypes: { type: string; count: number }[];
}

interface Recommendation {
  modelId: string;
  modelName: string;
  reason: string;
  confidence: number;
  icon: any;
}

export const AIModelRecommendations = () => {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadRecommendations();
    }
  }, [user]);

  const loadRecommendations = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get user's voting history
      const { data: votes } = await supabase
        .from('model_comparison_votes')
        .select('winner, prompt')
        .eq('user_id', user.id);

      // Get user's feedback
      const { data: feedback } = await supabase
        .from('ai_response_feedback')
        .select('model, rating')
        .eq('user_id', user.id);

      // Get user's usage stats
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('model')
        .eq('user_id', user.id)
        .eq('role', 'assistant');

      // Calculate model stats
      const modelStats: Record<string, ModelStats> = {};
      
      // Model mapping
      const modelMap: Record<string, string> = {
        'gpt-5-mini': 'GPT-5 Mini',
        'gemini-flash': 'Gemini Flash',
        'gemini-pro': 'Gemini Pro',
        'claude': 'Claude',
        'perplexity': 'Perplexity',
      };

      // Process votes
      votes?.forEach(vote => {
        if (vote.winner) {
          if (!modelStats[vote.winner]) {
            modelStats[vote.winner] = {
              modelId: vote.winner,
              modelName: modelMap[vote.winner] || vote.winner,
              totalVotes: 0,
              winRate: 0,
              avgRating: 0,
              usageCount: 0,
              queryTypes: []
            };
          }
          modelStats[vote.winner].totalVotes++;
        }
      });

      // Process feedback
      feedback?.forEach(fb => {
        if (fb.model) {
          if (!modelStats[fb.model]) {
            modelStats[fb.model] = {
              modelId: fb.model,
              modelName: modelMap[fb.model] || fb.model,
              totalVotes: 0,
              winRate: 0,
              avgRating: 0,
              usageCount: 0,
              queryTypes: []
            };
          }
          if (fb.rating === 'positive') {
            modelStats[fb.model].avgRating += 1;
          }
        }
      });

      // Process usage
      messages?.forEach(msg => {
        if (msg.model) {
          if (!modelStats[msg.model]) {
            modelStats[msg.model] = {
              modelId: msg.model,
              modelName: modelMap[msg.model] || msg.model,
              totalVotes: 0,
              winRate: 0,
              avgRating: 0,
              usageCount: 0,
              queryTypes: []
            };
          }
          modelStats[msg.model].usageCount++;
        }
      });

      // Calculate win rates and average ratings
      Object.keys(modelStats).forEach(modelId => {
        const stats = modelStats[modelId];
        stats.winRate = (stats.totalVotes / (votes?.length || 1)) * 100;
        stats.avgRating = stats.avgRating / (feedback?.filter(f => f.model === modelId).length || 1);
      });

      // Generate recommendations
      const recs: Recommendation[] = [];

      // Top performer based on win rate
      const topWinner = Object.values(modelStats)
        .sort((a, b) => b.winRate - a.winRate)[0];
      if (topWinner && topWinner.totalVotes > 0) {
        recs.push({
          modelId: topWinner.modelId,
          modelName: topWinner.modelName,
          reason: `Wins ${topWinner.winRate.toFixed(0)}% of your comparison votes`,
          confidence: Math.min(topWinner.totalVotes * 10, 100),
          icon: Star
        });
      }

      // Most used model
      const mostUsed = Object.values(modelStats)
        .sort((a, b) => b.usageCount - a.usageCount)[0];
      if (mostUsed && mostUsed.usageCount > 5 && mostUsed.modelId !== topWinner?.modelId) {
        recs.push({
          modelId: mostUsed.modelId,
          modelName: mostUsed.modelName,
          reason: `Your most used model (${mostUsed.usageCount} messages)`,
          confidence: Math.min(mostUsed.usageCount * 2, 100),
          icon: TrendingUp
        });
      }

      // Best rated
      const bestRated = Object.values(modelStats)
        .sort((a, b) => b.avgRating - a.avgRating)[0];
      if (bestRated && bestRated.avgRating > 0.5 && 
          bestRated.modelId !== topWinner?.modelId && 
          bestRated.modelId !== mostUsed?.modelId) {
        recs.push({
          modelId: bestRated.modelId,
          modelName: bestRated.modelName,
          reason: `Highest positive feedback rating`,
          confidence: Math.min(bestRated.avgRating * 100, 100),
          icon: Brain
        });
      }

      // Fast model recommendation (for quick tasks)
      if (!recs.find(r => r.modelId === 'gemini-flash')) {
        recs.push({
          modelId: 'gemini-flash',
          modelName: 'Gemini Flash',
          reason: 'Fastest response times for quick queries',
          confidence: 85,
          icon: Zap
        });
      }

      setRecommendations(recs.slice(0, 4)); // Top 4 recommendations
    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Model Recommendations
          </CardTitle>
          <CardDescription>Loading personalized recommendations...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Model Recommendations
          </CardTitle>
          <CardDescription>
            Start voting and rating AI responses to get personalized model recommendations!
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Recommended Models for You
        </CardTitle>
        <CardDescription>
          Based on your usage patterns and feedback
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {recommendations.map((rec, index) => {
          const Icon = rec.icon;
          return (
            <div
              key={rec.modelId}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{rec.modelName}</p>
                    {index === 0 && (
                      <Badge variant="secondary" className="text-xs">
                        Top Choice
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{rec.reason}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant="outline" className="text-xs">
                  {rec.confidence}% match
                </Badge>
              </div>
            </div>
          );
        })}
        <Button 
          variant="outline" 
          className="w-full mt-2"
          onClick={loadRecommendations}
        >
          Refresh Recommendations
        </Button>
      </CardContent>
    </Card>
  );
};
