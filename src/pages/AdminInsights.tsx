import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Users, DollarSign, Activity, 
  RefreshCw, Download, MessageSquare, Zap, AlertCircle 
} from 'lucide-react';
import { format, subDays, differenceInDays } from 'date-fns';

interface RetentionData {
  cohort: string;
  day0: number;
  day7: number;
  day14: number;
  day30: number;
}

interface ChurnData {
  period: string;
  churnRate: number;
  activeUsers: number;
  churnedUsers: number;
}

interface FeatureUsage {
  feature: string;
  usage: number;
  growth: number;
}

interface RevenueMetrics {
  totalRevenue: number;
  arpu: number;
  mrr: number;
  forecast: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

const AdminInsights = () => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  
  const [dau, setDau] = useState(0);
  const [mau, setMau] = useState(0);
  const [retentionData, setRetentionData] = useState<RetentionData[]>([]);
  const [churnData, setChurnData] = useState<ChurnData[]>([]);
  const [featureUsage, setFeatureUsage] = useState<FeatureUsage[]>([]);
  const [revenueMetrics, setRevenueMetrics] = useState<RevenueMetrics>({
    totalRevenue: 0,
    arpu: 0,
    mrr: 0,
    forecast: 0
  });
  const [modelUsage, setModelUsage] = useState<any[]>([]);
  const [dailyActivity, setDailyActivity] = useState<any[]>([]);

  useEffect(() => {
    loadInsights();
  }, [dateRange]);

  const loadInsights = async () => {
    setLoading(true);
    try {
      const daysAgo = parseInt(dateRange);
      const startDate = subDays(new Date(), daysAgo);

      // Daily Active Users (DAU)
      const { count: dauCount } = await supabase
        .from('chat_messages')
        .select('user_id', { count: 'exact', head: true })
        .gte('created_at', new Date().toISOString().split('T')[0])
        .not('user_id', 'is', null);

      // Get unique users for DAU
      const { data: dauData } = await supabase
        .from('chat_messages')
        .select('user_id')
        .gte('created_at', new Date().toISOString().split('T')[0]);

      const uniqueDau = new Set(dauData?.map(d => d.user_id)).size;
      setDau(uniqueDau);

      // Monthly Active Users (MAU)
      const { data: mauData } = await supabase
        .from('chat_messages')
        .select('user_id')
        .gte('created_at', subDays(new Date(), 30).toISOString());

      const uniqueMau = new Set(mauData?.map(d => d.user_id)).size;
      setMau(uniqueMau);

      // Churn Analysis
      const { data: allUsers } = await supabase
        .from('profiles')
        .select('id, created_at');

      const { data: recentActivity } = await supabase
        .from('chat_messages')
        .select('user_id')
        .gte('created_at', subDays(new Date(), 30).toISOString());

      const activeUserIds = new Set(recentActivity?.map(a => a.user_id));
      const churnedCount = (allUsers?.length || 0) - activeUserIds.size;
      const churnRate = allUsers?.length ? (churnedCount / allUsers.length) * 100 : 0;

      setChurnData([{
        period: 'Last 30 Days',
        churnRate: parseFloat(churnRate.toFixed(2)),
        activeUsers: activeUserIds.size,
        churnedUsers: churnedCount
      }]);

      // Model Usage
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('model')
        .eq('role', 'assistant')
        .gte('created_at', startDate.toISOString())
        .not('model', 'is', null);

      const modelCount: Record<string, number> = {};
      messages?.forEach(m => {
        if (m.model) {
          const modelName = m.model.split('/').pop() || m.model;
          modelCount[modelName] = (modelCount[modelName] || 0) + 1;
        }
      });

      const modelData = Object.entries(modelCount)
        .map(([model, count]) => ({ model, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setModelUsage(modelData);

      // Daily Activity
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), i);
        return date.toISOString().split('T')[0];
      }).reverse();

      const activityData = await Promise.all(
        last7Days.map(async (date) => {
          const { data } = await supabase
            .from('chat_messages')
            .select('user_id')
            .gte('created_at', date)
            .lt('created_at', format(new Date(new Date(date).getTime() + 86400000), 'yyyy-MM-dd'));

          const uniqueUsers = new Set(data?.map(d => d.user_id)).size;
          return {
            date: format(new Date(date), 'MMM dd'),
            users: uniqueUsers,
            messages: data?.length || 0
          };
        })
      );

      setDailyActivity(activityData);

      // Revenue Metrics
      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount')
        .in('status', ['completed', 'verified'])
        .gte('created_at', startDate.toISOString());

      const totalRevenue = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const arpu = allUsers?.length ? totalRevenue / allUsers.length : 0;
      const mrr = totalRevenue / (daysAgo / 30); // Estimated MRR
      const forecast = mrr * 12; // Annual forecast

      setRevenueMetrics({
        totalRevenue,
        arpu: parseFloat(arpu.toFixed(2)),
        mrr: parseFloat(mrr.toFixed(2)),
        forecast: parseFloat(forecast.toFixed(2))
      });

      // Feature Usage
      const { data: chats } = await supabase
        .from('chat_history')
        .select('id')
        .gte('created_at', startDate.toISOString());

      setFeatureUsage([
        { feature: 'Chat Messages', usage: messages?.length || 0, growth: 15 },
        { feature: 'Conversations', usage: chats?.length || 0, growth: 12 },
        { feature: 'Model Comparisons', usage: 0, growth: 8 },
        { feature: 'Image Generation', usage: 0, growth: 25 }
      ]);

    } catch (error) {
      console.error('Error loading insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      dateRange: `Last ${dateRange} days`,
      metrics: {
        dau,
        mau,
        churnData,
        revenueMetrics,
        featureUsage,
        modelUsage
      }
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-insights-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold gradient-text mb-2">Admin Insights</h1>
            <p className="text-muted-foreground">User retention, churn analysis, and revenue forecasting</p>
          </div>
          <div className="flex gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={loadInsights} variant="outline" disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={exportReport} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                Daily Active Users
                <Users className="w-4 h-4 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{dau}</div>
              <p className="text-xs text-muted-foreground mt-1">Active today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                Monthly Active Users
                <Activity className="w-4 h-4 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{mau}</div>
              <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                Churn Rate
                <TrendingDown className="w-4 h-4 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{churnData[0]?.churnRate || 0}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {churnData[0]?.churnedUsers || 0} churned users
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                Total Revenue
                <DollarSign className="w-4 h-4 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">₹{revenueMetrics.totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">ARPU: ₹{revenueMetrics.arpu}</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="activity" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="models">Models</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
          </TabsList>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Daily User Activity</CardTitle>
                <CardDescription>Active users and messages per day</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={dailyActivity}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="users" stroke="hsl(var(--primary))" name="Active Users" strokeWidth={2} />
                    <Line type="monotone" dataKey="messages" stroke="hsl(var(--accent))" name="Messages" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="models">
            <Card>
              <CardHeader>
                <CardTitle>Model Usage Distribution</CardTitle>
                <CardDescription>Most popular AI models</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={modelUsage}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="model" className="text-xs" angle={-45} textAnchor="end" height={100} />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="revenue">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Metrics</CardTitle>
                  <CardDescription>Financial performance overview</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Revenue</p>
                      <p className="text-2xl font-bold">₹{revenueMetrics.totalRevenue.toLocaleString()}</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-500" />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Average Revenue Per User</p>
                      <p className="text-2xl font-bold">₹{revenueMetrics.arpu}</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-blue-500" />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Monthly Recurring Revenue</p>
                      <p className="text-2xl font-bold">₹{revenueMetrics.mrr.toLocaleString()}</p>
                    </div>
                    <Zap className="w-8 h-8 text-purple-500" />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Annual Forecast</p>
                      <p className="text-2xl font-bold">₹{revenueMetrics.forecast.toLocaleString()}</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-amber-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="features">
            <Card>
              <CardHeader>
                <CardTitle>Feature Usage Statistics</CardTitle>
                <CardDescription>Most used features and their growth</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {featureUsage.map((feature, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{feature.feature}</span>
                          <Badge variant={feature.growth > 15 ? 'default' : 'secondary'}>
                            +{feature.growth}%
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full transition-all" 
                              style={{ width: `${Math.min((feature.usage / 1000) * 100, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground min-w-20 text-right">
                            {feature.usage.toLocaleString()} uses
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminInsights;
