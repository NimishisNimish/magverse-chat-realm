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
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useCountUp } from "@/hooks/useCountUp";
import ScrollProgressIndicator from "@/components/ScrollProgressIndicator";
import { MilestoneProgress } from "@/components/MilestoneProgress";
import { useMilestoneTracker } from "@/hooks/useMilestoneTracker";
import { downloadDashboardPDF } from "@/utils/dashboardExport";
import { 
  Zap, 
  MessageSquare, 
  History, 
  TrendingUp,
  Crown,
  Calendar,
  BarChart3,
  AlertTriangle,
  RefreshCw,
  FileText
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UsageStats {
  totalMessages: number;
  totalChats: number;
  messagesThisMonth: number;
  chatsThisMonth: number;
  favoriteModel: string | null;
  accountAgeDays: number;
  dailyUsage: Array<{ date: string; messages: number }>;
  modelUsage: Array<{ model: string; count: number }>;
  creditsUsedToday: number;
  creditsUsedThisWeek: number;
  creditsUsedThisMonth: number;
  avgModelUse: number;
  avgResponseTime: string;
}

const Dashboard = () => {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getProgress } = useMilestoneTracker();
  
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { ref: statsRef, isVisible: statsVisible } = useScrollAnimation();
  const { ref: chartsRef, isVisible: chartsVisible } = useScrollAnimation();

  // Count-up animations for key stats
  const totalMessagesCount = useCountUp({ end: stats?.totalMessages || 0, duration: 2000 });
  const totalChatsCount = useCountUp({ end: stats?.totalChats || 0, duration: 2000 });
  const messagesThisMonthCount = useCountUp({ end: stats?.messagesThisMonth || 0, duration: 1500 });
  const accountAgeDaysCount = useCountUp({ end: stats?.accountAgeDays || 0, duration: 1500 });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    loadStats();

    // Manual refresh only - removed auto-refresh to prevent constant reloading
    // Users can manually refresh using browser refresh or a refresh button
  }, [user]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
    toast({
      title: "Refreshed",
      description: "Dashboard data updated successfully",
    });
  };

  const handleExportPDF = () => {
    if (!stats) return;

    const dashboardStats = {
      totalMessages: stats.totalMessages,
      totalChats: stats.totalChats,
      accountAge: stats.accountAgeDays,
      creditsRemaining: profile?.credits_remaining || 0,
      subscriptionType: profile?.subscription_type || 'free',
      milestoneProgress: {
        messages: getProgress('messages'),
        chats: getProgress('chats'),
        images: getProgress('images'),
      }
    };

    downloadDashboardPDF(dashboardStats, profile?.display_name || user?.email || 'User');
    
    toast({
      title: "PDF Exported",
      description: "Your dashboard report has been downloaded",
    });
  };

  const loadStats = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setError('Request timed out. Please try refreshing the page.');
    }, 15000); // 15 second timeout

    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const { data: messages } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const { data: chats } = await supabase
        .from('chat_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());

      const messagesThisMonth = messages?.filter(m => 
        new Date(m.created_at!) >= startOfMonth
      ).length || 0;

      const chatsThisMonth = chats?.filter(c => 
        new Date(c.created_at!) >= startOfMonth
      ).length || 0;

      const modelCount: Record<string, number> = {};
      messages?.forEach(msg => {
        if (msg.role === 'assistant' && msg.model) {
          modelCount[msg.model] = (modelCount[msg.model] || 0) + 1;
        }
      });

      const favoriteModel = Object.keys(modelCount).length > 0
        ? Object.entries(modelCount).sort((a, b) => b[1] - a[1])[0][0]
        : null;

      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      }).reverse();

      const dailyUsage = last7Days.map(date => ({
        date: format(new Date(date), 'MMM dd'),
        messages: messages?.filter(m => 
          m.created_at?.split('T')[0] === date
        ).length || 0
      }));

      const modelUsage = Object.entries(modelCount).map(([model, count]) => ({
        model: model.split('/').pop() || model,
        count
      }));

      const creditsUsedToday = messages?.filter(m => 
        new Date(m.created_at!) >= startOfToday
      ).length || 0;

      const creditsUsedThisWeek = messages?.filter(m => 
        new Date(m.created_at!) >= startOfWeek
      ).length || 0;

      const creditsUsedThisMonth = messagesThisMonth;

      const accountAgeDays = profileData?.created_at 
        ? differenceInDays(new Date(), new Date(profileData.created_at))
        : 0;

      // Calculate average model use (unique models used)
      const uniqueModels = new Set(messages?.filter(m => m.role === 'assistant' && m.model).map(m => m.model)).size;
      const avgModelUse = accountAgeDays > 0 ? uniqueModels / Math.max(1, accountAgeDays) : uniqueModels;

      // Calculate average response time
      const responseTimes: number[] = [];
      messages?.forEach((msg, idx) => {
        if (msg.role === 'assistant' && idx > 0) {
          const prevMsg = messages[idx - 1];
          if (prevMsg.role === 'user') {
            const timeDiff = new Date(msg.created_at!).getTime() - new Date(prevMsg.created_at!).getTime();
            responseTimes.push(timeDiff / 1000); // Convert to seconds
          }
        }
      });
      const avgResponseTime = responseTimes.length > 0 
        ? (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(2) 
        : '0';

      setStats({
        totalMessages: messages?.length || 0,
        totalChats: chats?.length || 0,
        messagesThisMonth,
        chatsThisMonth,
        favoriteModel,
        accountAgeDays,
        dailyUsage,
        modelUsage,
        creditsUsedToday,
        creditsUsedThisWeek,
        creditsUsedThisMonth,
        avgModelUse: parseFloat(avgModelUse.toFixed(2)),
        avgResponseTime: `${avgResponseTime}s`
      });

      clearTimeout(timeoutId);
      setLoading(false);
    } catch (error) {
      console.error("Error loading stats:", error);
      clearTimeout(timeoutId);
      setError('Failed to load dashboard data. Please try again.');
      setLoading(false);
    }
  };

  const getPlanBadge = () => {
    if (profile?.subscription_type === 'lifetime') {
      return <Badge className="bg-gradient-to-r from-amber-500 to-amber-600"><Crown className="w-3 h-3 mr-1" />Lifetime Pro</Badge>;
    } else if (profile?.subscription_type === 'monthly') {
      return <Badge className="bg-purple-600 text-white"><Zap className="w-3 h-3 mr-1" />Yearly Pro</Badge>;
    } else {
      return <Badge variant="outline">Free Plan</Badge>;
    }
  };

  const getCreditsDisplay = () => {
    if (profile?.subscription_type === 'lifetime') {
      return "Unlimited";
    } else if (profile?.subscription_type === 'monthly') {
      const used = profile?.monthly_credits_used || 0;
      const total = 500;
      return `${total - used}/${total} daily messages`;
    } else {
      return `${profile?.credits_remaining || 0} / 5 daily`;
    }
  };

  const getCreditsProgress = () => {
    if (profile?.subscription_type === 'lifetime') {
      return 100;
    } else if (profile?.subscription_type === 'monthly') {
      const used = profile?.monthly_credits_used || 0;
      const total = 500;
      return ((total - used) / total) * 100;
    } else {
      return ((profile?.credits_remaining || 0) / 10) * 100;
    }
  };

  const isFreeUser = profile?.subscription_type === 'free';
  const isYearlyUser = profile?.subscription_type === 'monthly';
  
  // Calculate days until renewal for yearly users
  const daysUntilRenewal = isYearlyUser && profile?.subscription_expires_at
    ? differenceInDays(new Date(profile.subscription_expires_at), new Date())
    : null;

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg">
        <Navbar />
        <ScrollProgressIndicator />
        <div className="container mx-auto px-4 pt-24">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
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
            <AlertTriangle className="h-4 w-4" />
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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold gradient-text mb-2">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {profile?.display_name || profile?.username || 'User'}!</p>
          </div>
          <Button 
            onClick={handleManualRefresh} 
            disabled={refreshing}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Renewal Reminder for Yearly Users */}
        {isYearlyUser && daysUntilRenewal !== null && daysUntilRenewal <= 7 && (
          <Alert className={`mb-6 ${daysUntilRenewal <= 3 ? 'border-destructive' : 'border-yellow-500'}`}>
            <AlertTriangle className={`h-4 w-4 ${daysUntilRenewal <= 3 ? 'text-destructive' : 'text-yellow-500'}`} />
            <AlertDescription>
              {daysUntilRenewal <= 0 ? (
                <div className="flex items-center justify-between">
                  <span className="font-medium">Your subscription has expired!</span>
                  <Link to="/payment">
                    <Button size="sm" variant="destructive">Renew Now</Button>
                  </Link>
                </div>
              ) : daysUntilRenewal <= 3 ? (
                <div className="flex items-center justify-between">
                  <span className="font-medium">Urgent: Your subscription expires in {daysUntilRenewal} {daysUntilRenewal === 1 ? 'day' : 'days'}!</span>
                  <Link to="/payment">
                    <Button size="sm" variant="destructive">Renew Now</Button>
                  </Link>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span>Your subscription renews in {daysUntilRenewal} days</span>
                  <Link to="/payment">
                    <Button size="sm" variant="outline">Renew Early</Button>
                  </Link>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Current Plan */}
        <Card className="glass-card mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Current Plan
                  {getPlanBadge()}
                </CardTitle>
                <CardDescription className="mt-2">
                  {profile?.subscription_type === 'lifetime' && 'You have unlimited access to all features forever!'}
                  {profile?.subscription_type === 'monthly' && `Your subscription renews on ${profile?.subscription_expires_at ? format(new Date(profile.subscription_expires_at), 'MMM dd, yyyy') : 'N/A'}`}
                  {profile?.subscription_type === 'free' && 'Upgrade to Pro for unlimited access to all AI models and features'}
                </CardDescription>
              </div>
              {isFreeUser && (
                <Link to="/payment">
                  <Button className="neon-glow">
                    <Zap className="w-4 h-4 mr-2" />
                    Upgrade to Pro
                  </Button>
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Credits Remaining</span>
                  <span className="text-sm text-muted-foreground">{getCreditsDisplay()}</span>
                </div>
                <Progress value={getCreditsProgress()} className="h-2" />
              </div>
              {profile?.subscription_type === 'free' && (
                <p className="text-xs text-muted-foreground">
                  Free users get 5 messages per day. Credits reset daily at midnight.
                </p>
              )}
              {profile?.subscription_type === 'monthly' && (
                <p className="text-xs text-muted-foreground">
                  Yearly Pro users get 500 messages per day. Credits reset daily at midnight.
                </p>
              )}
              {profile?.subscription_type === 'lifetime' && (
                <p className="text-xs text-muted-foreground">
                  Lifetime Pro members enjoy unlimited messages forever!
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Usage Statistics */}
        <div 
          ref={statsRef} 
          className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 animate-on-scroll fade-in-up ${statsVisible ? 'is-visible' : ''}`}
        >
          <Card className="glass-card stagger-item card-hover-effect" style={{ animationDelay: '0.0s' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div ref={totalMessagesCount.ref} className="text-2xl font-bold glow-effect">
                {statsVisible ? totalMessagesCount.count : 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.messagesThisMonth} this month
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card stagger-item card-hover-effect" style={{ animationDelay: '0.1s' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chat Sessions</CardTitle>
              <History className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div ref={totalChatsCount.ref} className="text-2xl font-bold glow-effect">
                {statsVisible ? totalChatsCount.count : 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.chatsThisMonth} this month
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card stagger-item card-hover-effect" style={{ animationDelay: '0.2s' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Favorite Model</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold glow-effect">{stats?.favoriteModel || 'N/A'}</div>
              <p className="text-xs text-muted-foreground">Most used AI model</p>
            </CardContent>
          </Card>

          <Card className="glass-card stagger-item card-hover-effect" style={{ animationDelay: '0.3s' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Account Age</CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div ref={accountAgeDaysCount.ref} className="text-2xl font-bold glow-effect">
                {statsVisible ? accountAgeDaysCount.count : 0}
              </div>
              <p className="text-xs text-muted-foreground">Days since signup</p>
            </CardContent>
          </Card>

          <Card className="glass-card stagger-item card-hover-effect" style={{ animationDelay: '0.4s' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Model Use</CardTitle>
              <BarChart3 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold glow-effect">
                {stats?.avgModelUse?.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-muted-foreground">Models per day</p>
            </CardContent>
          </Card>

          <Card className="glass-card stagger-item card-hover-effect" style={{ animationDelay: '0.5s' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <Zap className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold glow-effect">
                {stats?.avgResponseTime || '0s'}
              </div>
              <p className="text-xs text-muted-foreground">AI response speed</p>
            </CardContent>
          </Card>
        </div>

        {/* Credit Usage Analytics & Model Usage Charts */}
        <div 
          ref={chartsRef}
          className={`grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 animate-on-scroll scale-in ${chartsVisible ? 'is-visible' : ''}`}
        >
          <Card className="glass-card stagger-item" style={{ animationDelay: '0.4s' }}>
            <CardHeader>
              <CardTitle>Daily Message Activity (Last 30 Days)</CardTitle>
              <CardDescription>Track your messaging patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={stats?.dailyUsage || []}>
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))' 
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="messages" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="glass-card stagger-item" style={{ animationDelay: '0.5s' }}>
            <CardHeader>
              <CardTitle>Model Usage Distribution</CardTitle>
              <CardDescription>Your favorite AI models</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={stats?.modelUsage || []}
                    dataKey="count"
                    nameKey="model"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {(stats?.modelUsage || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))' 
                    }} 
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Milestone Progress */}
        <div className="mb-8">
          <MilestoneProgress />
        </div>

        {/* Credit Usage Stats */}
        {profile?.subscription_type !== 'lifetime' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Credits Used Today</CardTitle>
                <Zap className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.creditsUsedToday || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {isYearlyUser ? 'Out of 500 daily' : 'Out of 5 daily'}
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Credits This Week</CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.creditsUsedThisWeek || 0}</div>
                <p className="text-xs text-muted-foreground">Last 7 days</p>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Credits This Month</CardTitle>
                <Calendar className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.creditsUsedThisMonth || 0}</div>
                <p className="text-xs text-muted-foreground">Current month</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Features Access */}
        {isFreeUser && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Upgrade to Unlock All Features</CardTitle>
              <CardDescription>See what you're missing with a Pro subscription</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-muted-foreground" />
                    <span>Access to all AI models (Gemini Flash, Perplexity, Claude)</span>
                  </div>
                  <Badge variant="outline" className="text-muted-foreground">Pro Only</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-muted-foreground" />
                    <span>Unlimited messages per day</span>
                  </div>
                  <Badge variant="outline" className="text-muted-foreground">Pro Only</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-muted-foreground" />
                    <span>Unlimited deep research queries</span>
                  </div>
                  <Badge variant="outline" className="text-muted-foreground">Pro Only</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-muted-foreground" />
                    <span>Priority support</span>
                  </div>
                  <Badge variant="outline" className="text-muted-foreground">Pro Only</Badge>
                </div>
                <Link to="/payment" className="block">
                  <Button className="w-full neon-glow mt-4">
                    <Zap className="w-4 h-4 mr-2" />
                    Upgrade Now
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <Link to="/chat">
            <Card className="glass-card hover:border-primary/50 transition-all cursor-pointer">
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
            <Card className="glass-card hover:border-primary/50 transition-all cursor-pointer">
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
            <Card className="glass-card hover:border-primary/50 transition-all cursor-pointer">
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
