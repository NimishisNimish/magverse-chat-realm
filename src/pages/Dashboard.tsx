import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { StatCardSkeleton } from "@/components/ui/skeleton";
import ScrollProgressIndicator from "@/components/ScrollProgressIndicator";
import { 
  Zap, 
  MessageSquare, 
  History, 
  TrendingUp,
  Crown,
  RefreshCw,
  Coins,
  Activity,
  BarChart3,
  PieChart as PieChartIcon
} from "lucide-react";
import { format, differenceInDays, startOfMonth, startOfWeek, startOfDay } from "date-fns";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CreditStats {
  creditsRemaining: number;
  totalCreditsSpent: number;
  creditsByModel: Array<{ model: string; credits: number; count: number }>;
  mostUsedModels: Array<{ model: string; count: number }>;
  creditsToday: number;
  creditsThisWeek: number;
  creditsThisMonth: number;
}

const CHART_COLORS = [
  'hsl(262, 83%, 58%)', // Primary purple
  'hsl(217, 91%, 60%)', // Blue
  'hsl(172, 66%, 50%)', // Teal
  'hsl(43, 96%, 56%)',  // Yellow
  'hsl(339, 90%, 51%)', // Pink
  'hsl(142, 71%, 45%)', // Green
  'hsl(25, 95%, 53%)',  // Orange
];

const Dashboard = () => {
  const [stats, setStats] = useState<CreditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    loadStats();
  }, [user]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
    toast({
      title: "Refreshed",
      description: "Dashboard data updated",
    });
  };

  const loadStats = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      const todayStart = startOfDay(now).toISOString();
      const weekStart = startOfWeek(now).toISOString();
      const monthStart = startOfMonth(now).toISOString();

      // Fetch credit usage logs for analytics
      const { data: creditLogs, error: creditError } = await supabase
        .from('credit_usage_logs')
        .select('model, credits_used, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (creditError) throw creditError;

      // Aggregate stats
      const creditsByModel: Record<string, { credits: number; count: number }> = {};
      let totalSpent = 0;
      let creditsToday = 0;
      let creditsThisWeek = 0;
      let creditsThisMonth = 0;

      (creditLogs || []).forEach(log => {
        const model = log.model?.split('/').pop() || log.model || 'unknown';
        const credits = log.credits_used || 1;
        
        if (!creditsByModel[model]) {
          creditsByModel[model] = { credits: 0, count: 0 };
        }
        creditsByModel[model].credits += credits;
        creditsByModel[model].count += 1;
        totalSpent += credits;

        // Time-based aggregation
        const logDate = new Date(log.created_at);
        if (logDate >= new Date(todayStart)) creditsToday += credits;
        if (logDate >= new Date(weekStart)) creditsThisWeek += credits;
        if (logDate >= new Date(monthStart)) creditsThisMonth += credits;
      });

      const creditsByModelArray = Object.entries(creditsByModel)
        .map(([model, data]) => ({ model, ...data }))
        .sort((a, b) => b.credits - a.credits);

      const mostUsedModels = Object.entries(creditsByModel)
        .map(([model, data]) => ({ model, count: data.count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setStats({
        creditsRemaining: profile?.credits_remaining || 0,
        totalCreditsSpent: totalSpent,
        creditsByModel: creditsByModelArray,
        mostUsedModels,
        creditsToday,
        creditsThisWeek,
        creditsThisMonth,
      });

    } catch (error: any) {
      console.error('Dashboard error:', error);
      setError(error.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getPlanBadge = () => {
    if (profile?.subscription_type === 'lifetime') {
      return <Badge className="bg-gradient-to-r from-amber-500 to-amber-600"><Crown className="w-3 h-3 mr-1" />Lifetime Pro</Badge>;
    } else if (profile?.subscription_type === 'monthly') {
      return <Badge className="bg-purple-600 text-white"><Zap className="w-3 h-3 mr-1" />Yearly Pro</Badge>;
    }
    return <Badge variant="outline">Free Plan</Badge>;
  };

  const getCreditsDisplay = () => {
    if (profile?.subscription_type === 'lifetime') return "Unlimited";
    if (profile?.subscription_type === 'monthly') {
      const used = profile?.monthly_credits_used || 0;
      return `${500 - used} / 500 daily`;
    }
    return `${profile?.credits_remaining || 0} / 5 daily`;
  };

  const getCreditsProgress = () => {
    if (profile?.subscription_type === 'lifetime') return 100;
    if (profile?.subscription_type === 'monthly') {
      const used = profile?.monthly_credits_used || 0;
      return ((500 - used) / 500) * 100;
    }
    return ((profile?.credits_remaining || 0) / 5) * 100;
  };

  const isFreeUser = profile?.subscription_type === 'free';
  const isYearlyUser = profile?.subscription_type === 'monthly';
  
  const daysUntilRenewal = isYearlyUser && profile?.subscription_expires_at
    ? differenceInDays(new Date(profile.subscription_expires_at), new Date())
    : null;

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg">
        <Navbar />
        <ScrollProgressIndicator />
        <div className="container mx-auto px-4 pt-24">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen gradient-bg">
        <Navbar />
        <div className="container mx-auto px-4 pt-24">
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={handleManualRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg">
      <Navbar />
      <ScrollProgressIndicator />
      <div className="container mx-auto px-4 pt-24 pb-12">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold gradient-text mb-2">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {profile?.display_name || 'User'}!</p>
          </div>
          <Button onClick={handleManualRefresh} disabled={refreshing} variant="outline" size="sm" className="gap-2">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Subscription Renewal Alert */}
        {isYearlyUser && daysUntilRenewal !== null && daysUntilRenewal <= 7 && (
          <Alert className={`mb-6 ${daysUntilRenewal <= 3 ? 'border-destructive' : 'border-yellow-500'}`}>
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {daysUntilRenewal <= 0 
                    ? 'Your subscription has expired!' 
                    : `Subscription expires in ${daysUntilRenewal} days`}
                </span>
                <Link to="/payment">
                  <Button size="sm" variant={daysUntilRenewal <= 3 ? "destructive" : "outline"}>
                    Renew Now
                  </Button>
                </Link>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Credits Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Credits Remaining */}
          <Card className="glass-card border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Credits Remaining</CardTitle>
              <Coins className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{getCreditsDisplay()}</div>
              <Progress value={getCreditsProgress()} className="mt-3 h-2" />
              <div className="flex items-center justify-between mt-2">
                {getPlanBadge()}
                {isFreeUser && (
                  <Link to="/payment">
                    <Button size="sm" variant="ghost" className="text-xs">Upgrade</Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Total Credits Spent */}
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Credits Used</CardTitle>
              <Activity className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.totalCreditsSpent || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">All time usage</p>
            </CardContent>
          </Card>

          {/* Credits This Month */}
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.creditsThisMonth || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Today: {stats?.creditsToday || 0} • Week: {stats?.creditsThisWeek || 0}
              </p>
            </CardContent>
          </Card>

          {/* Models Used */}
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Models Used</CardTitle>
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.creditsByModel?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Different AI models</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Credits by Model - Donut Chart */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5" />
                Credits by Model
              </CardTitle>
              <CardDescription>Distribution of credit usage across AI models</CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.creditsByModel && stats.creditsByModel.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={stats.creditsByModel.slice(0, 7)}
                      dataKey="credits"
                      nameKey="model"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      label={({ model, percent }) => 
                        percent > 0.05 ? `${model} (${(percent * 100).toFixed(0)}%)` : ''
                      }
                      labelLine={false}
                    >
                      {stats.creditsByModel.slice(0, 7).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [`${value} credits`, 'Usage']}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                  <p>No usage data yet. Start chatting to see analytics!</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Most Used Models - Bar Chart */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Most Used Models
              </CardTitle>
              <CardDescription>Number of requests per AI model</CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.mostUsedModels && stats.mostUsedModels.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={stats.mostUsedModels} layout="vertical" margin={{ left: 80 }}>
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                    <YAxis 
                      type="category" 
                      dataKey="model" 
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fontSize: 12 }}
                      width={80}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [`${value} requests`, 'Count']}
                    />
                    <Bar 
                      dataKey="count" 
                      fill="hsl(var(--primary))" 
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                  <p>No usage data yet. Start chatting to see analytics!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detailed Usage Table */}
        {stats?.creditsByModel && stats.creditsByModel.length > 0 && (
          <Card className="glass-card mb-8">
            <CardHeader>
              <CardTitle>Detailed Usage Breakdown</CardTitle>
              <CardDescription>Credits and requests per model</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-medium">Model</th>
                      <th className="text-right py-3 px-4 font-medium">Credits Used</th>
                      <th className="text-right py-3 px-4 font-medium">Requests</th>
                      <th className="text-right py-3 px-4 font-medium">Avg Credits/Request</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.creditsByModel.map((item, idx) => (
                      <tr key={item.model} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                            />
                            {item.model}
                          </div>
                        </td>
                        <td className="text-right py-3 px-4 font-medium">{item.credits}</td>
                        <td className="text-right py-3 px-4 text-muted-foreground">{item.count}</td>
                        <td className="text-right py-3 px-4 text-muted-foreground">
                          {(item.credits / item.count).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upgrade CTA for Free Users */}
        {isFreeUser && (
          <Card className="glass-card mb-8 border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                Upgrade to Pro
              </CardTitle>
              <CardDescription>Unlock unlimited access to all AI models</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-primary" />
                  <span>Unlimited messages</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <span>All AI models access</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Activity className="h-4 w-4 text-primary" />
                  <span>Priority support</span>
                </div>
              </div>
              <Link to="/payment">
                <Button className="w-full neon-glow">
                  <Zap className="w-4 h-4 mr-2" />
                  Upgrade Now
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link to="/chat">
            <Card className="glass-card hover:border-primary/50 transition-all cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Start Chatting
                </CardTitle>
                <CardDescription>Continue your AI conversations</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link to="/history">
            <Card className="glass-card hover:border-primary/50 transition-all cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  View History
                </CardTitle>
                <CardDescription>Browse your past chat sessions</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link to="/profile">
            <Card className="glass-card hover:border-primary/50 transition-all cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5" />
                  Profile Settings
                </CardTitle>
                <CardDescription>Manage your account</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
