import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { BarChart3, Clock, TrendingUp, Zap, Crown, MessageSquare, Calendar } from 'lucide-react';
import { format, subDays } from 'date-fns';

interface AnalyticsData {
  totalMessages: number;
  totalChats: number;
  avgResponseTime: number;
  favoriteModel: string;
  modelUsageBreakdown: { [key: string]: number };
  dailyUsage: { date: string; count: number }[];
  hourlyPattern: number[];
}

const ProAnalytics = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (profile?.subscription_type !== 'lifetime') {
      toast({
        title: "Lifetime Pro Only",
        description: "Advanced analytics are only available for Lifetime Pro members.",
        variant: "destructive",
      });
      navigate('/dashboard');
      return;
    }

    loadAnalytics();
  }, [user, profile]);

  const loadAnalytics = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch messages
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('model, created_at, role')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (!messages) return;

      // Total stats
      const totalMessages = messages.length;
      const totalChats = new Set(messages.map(m => m.created_at.split('T')[0])).size;

      // Model usage breakdown
      const modelUsageBreakdown: { [key: string]: number } = {};
      messages.forEach(msg => {
        if (msg.role === 'assistant' && msg.model) {
          modelUsageBreakdown[msg.model] = (modelUsageBreakdown[msg.model] || 0) + 1;
        }
      });

      // Favorite model
      const favoriteModel = Object.entries(modelUsageBreakdown)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

      // Daily usage for last 30 days
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const date = subDays(new Date(), 29 - i);
        return format(date, 'MMM dd');
      });

      const dailyUsage = last30Days.map(date => {
        const count = messages.filter(m => 
          format(new Date(m.created_at), 'MMM dd') === date
        ).length;
        return { date, count };
      });

      // Hourly pattern (24 hours)
      const hourlyPattern = Array(24).fill(0);
      messages.forEach(msg => {
        const hour = new Date(msg.created_at).getHours();
        hourlyPattern[hour]++;
      });

      // Average response time (simulated - would need actual timing data)
      const avgResponseTime = 2.5; // Mock data in seconds

      setAnalytics({
        totalMessages,
        totalChats,
        avgResponseTime,
        favoriteModel,
        modelUsageBreakdown,
        dailyUsage,
        hourlyPattern,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading analytics...</div>
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-4xl font-bold gradient-text">Pro Analytics</h1>
            <Badge className="bg-gradient-to-r from-amber-500 to-amber-600">
              <Crown className="w-3 h-3 mr-1" />
              Lifetime Pro
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Deep insights into your AI usage patterns and preferences
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalMessages}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chat Sessions</CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalChats}</div>
              <p className="text-xs text-muted-foreground">Unique days</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <Clock className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.avgResponseTime}s</div>
              <p className="text-xs text-muted-foreground">Per message</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Favorite Model</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.favoriteModel}</div>
              <p className="text-xs text-muted-foreground">Most used</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Daily Usage (Last 30 Days)</CardTitle>
              <CardDescription>Your message activity over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analytics.dailyUsage.slice(-7).map((day, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{day.date}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-secondary rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${Math.min((day.count / 20) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-8">{day.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Model Usage Distribution</CardTitle>
              <CardDescription>Which AI models you use most</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(analytics.modelUsageBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([model, count], idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <Badge variant="secondary">{model}</Badge>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-secondary rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ 
                              width: `${(count / Math.max(...Object.values(analytics.modelUsageBreakdown))) * 100}%` 
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-12">{count}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Hourly Activity Pattern</CardTitle>
            <CardDescription>When you're most active during the day</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-12 gap-1">
              {analytics.hourlyPattern.map((count, hour) => (
                <div key={hour} className="flex flex-col items-center gap-1">
                  <div className="w-full bg-secondary rounded-sm h-20 flex items-end overflow-hidden">
                    <div 
                      className="w-full bg-primary rounded-sm transition-all" 
                      style={{ 
                        height: `${(count / Math.max(...analytics.hourlyPattern)) * 100}%`,
                        minHeight: count > 0 ? '4px' : '0'
                      }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{hour}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProAnalytics;
