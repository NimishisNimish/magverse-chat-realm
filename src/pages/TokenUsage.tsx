import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Coins, TrendingUp, Clock, Zap, Info, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";

interface UsageStats {
  totalTokens: number;
  totalMessages: number;
  totalCost: number;
  todayTokens: number;
  todayMessages: number;
}

const modelPricing = [
  { name: "Gemini Flash", credits: 1, description: "Fast, efficient responses" },
  { name: "GPT-5 Mini", credits: 1, description: "Quick lightweight model" },
  { name: "Gemini Pro", credits: 2, description: "Advanced reasoning" },
  { name: "GPT-5", credits: 2, description: "Most capable GPT" },
  { name: "Claude Sonnet", credits: 2, description: "Thoughtful analysis" },
  { name: "ChatGPT (GPT-4o)", credits: 2, description: "OpenAI flagship" },
  { name: "Perplexity Sonar", credits: 1, description: "Fast web search" },
  { name: "Perplexity Pro", credits: 2, description: "Multi-query research" },
  { name: "Perplexity Reasoning", credits: 3, description: "Deep research" },
  { name: "Grok", credits: 2, description: "Real-time knowledge" },
  { name: "Image Generation", credits: 5, description: "Create AI images" },
];

const TokenUsage = () => {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<UsageStats>({
    totalTokens: 0,
    totalMessages: 0,
    totalCost: 0,
    todayTokens: 0,
    todayMessages: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadUsageStats();
    }
  }, [user]);

  const loadUsageStats = async () => {
    if (!user) return;
    
    try {
      // Get total usage
      const { data: allUsage } = await supabase
        .from('credit_usage_logs')
        .select('credits_used, tokens_used, cost_usd')
        .eq('user_id', user.id);
      
      // Get today's usage
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: todayUsage } = await supabase
        .from('credit_usage_logs')
        .select('credits_used, tokens_used')
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString());
      
      if (allUsage) {
        setStats({
          totalTokens: allUsage.reduce((sum, u) => sum + (u.tokens_used || 0), 0),
          totalMessages: allUsage.length,
          totalCost: allUsage.reduce((sum, u) => sum + (u.cost_usd || 0), 0),
          todayTokens: todayUsage?.reduce((sum, u) => sum + (u.tokens_used || 0), 0) || 0,
          todayMessages: todayUsage?.length || 0,
        });
      }
    } catch (error) {
      console.error('Error loading usage stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const creditsRemaining = profile?.credits_remaining ?? 0;
  const subscriptionType = profile?.subscription_type || 'free';
  const dailyLimit = subscriptionType === 'monthly' ? 500 : (subscriptionType === 'lifetime' ? Infinity : 5);
  const usedToday = profile?.monthly_credits_used ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-24 pb-16 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Link to="/settings" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to Settings
          </Link>
          
          <h1 className="text-3xl font-bold mb-2">Token Usage & Limits</h1>
          <p className="text-muted-foreground mb-8">
            Understand how tokens work and track your usage across AI models.
          </p>
          
          {/* Current Usage Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card border border-border rounded-xl p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Coins className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Credits Today</p>
                  <p className="text-2xl font-bold">{usedToday} / {dailyLimit === Infinity ? '∞' : dailyLimit}</p>
                </div>
              </div>
              {dailyLimit !== Infinity && (
                <Progress value={(usedToday / dailyLimit) * 100} className="h-2" />
              )}
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card border border-border rounded-xl p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Messages</p>
                  <p className="text-2xl font-bold">{stats.totalMessages.toLocaleString()}</p>
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-card border border-border rounded-xl p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Tokens</p>
                  <p className="text-2xl font-bold">{stats.totalTokens.toLocaleString()}</p>
                </div>
              </div>
            </motion.div>
          </div>
          
          {/* Token Explanation */}
          <div className="bg-card border border-border rounded-xl p-6 mb-8">
            <div className="flex items-start gap-3 mb-4">
              <Info className="w-5 h-5 text-primary mt-1" />
              <div>
                <h2 className="text-lg font-semibold mb-2">What are Tokens?</h2>
                <p className="text-muted-foreground">
                  Tokens are the units AI models use to process text. A token is roughly 4 characters or 3/4 of a word. 
                  Both your input and the AI's response consume tokens. Longer conversations use more tokens.
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-muted/50 rounded-lg p-4">
                <Zap className="w-5 h-5 text-yellow-500 mb-2" />
                <h3 className="font-medium mb-1">100 tokens ≈</h3>
                <p className="text-sm text-muted-foreground">75 words of text</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <Clock className="w-5 h-5 text-blue-500 mb-2" />
                <h3 className="font-medium mb-1">Average message</h3>
                <p className="text-sm text-muted-foreground">200-500 tokens</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <TrendingUp className="w-5 h-5 text-green-500 mb-2" />
                <h3 className="font-medium mb-1">Context window</h3>
                <p className="text-sm text-muted-foreground">128K tokens max</p>
              </div>
            </div>
          </div>
          
          {/* Model Pricing */}
          <h2 className="text-xl font-semibold mb-4">Credit Cost per Model</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
            {modelPricing.map((model, index) => (
              <motion.div
                key={model.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                className="flex items-center justify-between bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
              >
                <div>
                  <h3 className="font-medium">{model.name}</h3>
                  <p className="text-sm text-muted-foreground">{model.description}</p>
                </div>
                <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary/20 text-primary font-semibold">
                  {model.credits} credit{model.credits > 1 ? 's' : ''}
                </div>
              </motion.div>
            ))}
          </div>
          
          {/* Subscription Info */}
          <div className="bg-gradient-to-r from-primary/20 to-purple-500/20 border border-primary/30 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-2">Your Plan: {subscriptionType.charAt(0).toUpperCase() + subscriptionType.slice(1)}</h2>
            <p className="text-muted-foreground mb-4">
              {subscriptionType === 'free' && 'You have 5 credits per day. Upgrade for more!'}
              {subscriptionType === 'monthly' && 'You have 500 credits per day with your Pro subscription.'}
              {subscriptionType === 'lifetime' && 'Enjoy unlimited credits with your Lifetime Pro plan!'}
            </p>
            {subscriptionType === 'free' && (
              <Link to="/pricing">
                <Button>Upgrade to Pro</Button>
              </Link>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TokenUsage;
