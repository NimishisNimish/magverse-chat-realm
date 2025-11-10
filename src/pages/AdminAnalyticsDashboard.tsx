import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Download, TrendingUp, Users, MessageSquare, DollarSign, Activity, BarChart3 } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import UserEngagementScoring from "@/components/UserEngagementScoring";
import { ModelComparisonAnalytics } from "@/components/ModelABTesting";
import EmailCampaignAnalytics from "@/components/EmailCampaignAnalytics";
import UserSegmentationDashboard from "@/components/UserSegmentationDashboard";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

interface DashboardStats {
  dailyActiveUsers: number;
  monthlyActiveUsers: number;
  totalMessages: number;
  totalRevenue: number;
  avgSessionDuration: number;
  userGrowthRate: number;
}

interface ModelPerformance {
  model: string;
  successRate: number;
  avgResponseTime: number;
  totalRequests: number;
  errorRate: number;
}

interface ConversionMetric {
  segment: string;
  conversions: number;
  revenue: number;
}

export default function AdminAnalyticsDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    dailyActiveUsers: 0,
    monthlyActiveUsers: 0,
    totalMessages: 0,
    totalRevenue: 0,
    avgSessionDuration: 0,
    userGrowthRate: 0,
  });
  const [modelPerformance, setModelPerformance] = useState<ModelPerformance[]>([]);
  const [conversionData, setConversionData] = useState<ConversionMetric[]>([]);
  const [userTrends, setUserTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);

      // Load user engagement stats
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      const oneDayAgo = new Date(today.getTime() - 24 * 60 * 60 * 1000);

      // Daily Active Users
      const { data: dauData } = await supabase
        .from('chat_messages')
        .select('user_id')
        .gte('created_at', oneDayAgo.toISOString())
        .then(result => ({
          ...result,
          data: result.data ? [...new Set(result.data.map(m => m.user_id))]: []
        }));

      // Monthly Active Users
      const { data: mauData } = await supabase
        .from('chat_messages')
        .select('user_id')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .then(result => ({
          ...result,
          data: result.data ? [...new Set(result.data.map(m => m.user_id))] : []
        }));

      // Total Messages
      const { count: messageCount } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true });

      // Total Revenue
      const { data: revenueData } = await supabase
        .from('transactions')
        .select('amount')
        .in('status', ['completed', 'verified']);

      const totalRevenue = revenueData?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      // User Growth Rate (comparing last 7 days to previous 7 days)
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fourteenDaysAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);

      const { count: recentUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString());

      const { count: previousUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', fourteenDaysAgo.toISOString())
        .lt('created_at', sevenDaysAgo.toISOString());

      const growthRate = previousUsers ? ((recentUsers || 0) - previousUsers) / previousUsers * 100 : 0;

      setStats({
        dailyActiveUsers: dauData?.length || 0,
        monthlyActiveUsers: mauData?.length || 0,
        totalMessages: messageCount || 0,
        totalRevenue,
        avgSessionDuration: 0, // Calculate if needed
        userGrowthRate: growthRate,
      });

      // Load Model Performance
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('model, created_at, content')
        .eq('role', 'assistant')
        .gte('created_at', thirtyDaysAgo.toISOString());

      const modelStats: Record<string, { total: number; errors: number; totalTime: number }> = {};
      
      messages?.forEach(msg => {
        if (!modelStats[msg.model]) {
          modelStats[msg.model] = { total: 0, errors: 0, totalTime: 0 };
        }
        modelStats[msg.model].total++;
        if (msg.content?.includes('Error:') || msg.content?.includes('error')) {
          modelStats[msg.model].errors++;
        }
      });

      const performanceData = Object.entries(modelStats).map(([model, stats]) => ({
        model,
        successRate: ((stats.total - stats.errors) / stats.total) * 100,
        avgResponseTime: 0, // Calculate if needed
        totalRequests: stats.total,
        errorRate: (stats.errors / stats.total) * 100,
      }));

      setModelPerformance(performanceData);

      // Load Conversion Data by Segment
      const { data: segments } = await supabase
        .from('user_segments')
        .select('segment_type, segment_value, user_id');

      const { data: transactions } = await supabase
        .from('transactions')
        .select('user_id, amount')
        .in('status', ['completed', 'verified']);

      const conversionMetrics: Record<string, { conversions: number; revenue: number }> = {};
      
      segments?.forEach(seg => {
        const userTransactions = transactions?.filter(t => t.user_id === seg.user_id);
        if (userTransactions && userTransactions.length > 0) {
          const key = `${seg.segment_type}: ${seg.segment_value}`;
          if (!conversionMetrics[key]) {
            conversionMetrics[key] = { conversions: 0, revenue: 0 };
          }
          conversionMetrics[key].conversions++;
          conversionMetrics[key].revenue += userTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
        }
      });

      const conversionArray = Object.entries(conversionMetrics).map(([segment, data]) => ({
        segment,
        ...data,
      }));

      setConversionData(conversionArray);

      // Load User Trends (last 30 days)
      const trendData: any[] = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
        const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
        
        const { data: dayMessages } = await supabase
          .from('chat_messages')
          .select('user_id')
          .gte('created_at', date.toISOString())
          .lt('created_at', nextDate.toISOString());

        const uniqueUsers = dayMessages ? [...new Set(dayMessages.map(m => m.user_id))].length : 0;
        
        trendData.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          users: uniqueUsers,
          messages: dayMessages?.length || 0,
        });
      }

      setUserTrends(trendData);

    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(',')).join('\n');
    const csv = `${headers}\n${rows}`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success(`${filename} exported successfully`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground">Comprehensive insights into user engagement and performance</p>
          </div>
          <Button onClick={() => exportToCSV(modelPerformance, 'model-performance')} className="gap-2">
            <Download className="w-4 h-4" />
            Export Data
          </Button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Daily Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.dailyActiveUsers}</div>
              <p className="text-xs text-muted-foreground">Last 24 hours</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Active Users</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.monthlyActiveUsers}</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMessages.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats.totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">User Growth Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.userGrowthRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">vs. previous week</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Messages/User</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.monthlyActiveUsers > 0 ? (stats.totalMessages / stats.monthlyActiveUsers).toFixed(1) : 0}
              </div>
              <p className="text-xs text-muted-foreground">Per active user</p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analytics Tabs */}
        <Tabs defaultValue="engagement" className="space-y-4">
          <TabsList>
            <TabsTrigger value="engagement">User Engagement</TabsTrigger>
            <TabsTrigger value="models">Model Performance</TabsTrigger>
            <TabsTrigger value="conversions">Conversions</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="segments">Segments</TabsTrigger>
          </TabsList>

          <TabsContent value="engagement" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Activity Trends</CardTitle>
                <CardDescription>Daily active users and messages over the last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={userTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="users" stroke="hsl(var(--primary))" name="Active Users" />
                    <Line type="monotone" dataKey="messages" stroke="hsl(var(--accent))" name="Messages" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <UserEngagementScoring />
          </TabsContent>

          <TabsContent value="models" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Model Performance Metrics</CardTitle>
                  <CardDescription>Success rates and error rates by model</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={() => exportToCSV(modelPerformance, 'model-performance')}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {modelPerformance.map((model) => (
                      <div key={model.model} className="p-4 rounded-lg border border-border">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{model.model}</h4>
                          <Badge variant={model.successRate > 90 ? "default" : model.successRate > 70 ? "secondary" : "destructive"}>
                            {model.successRate.toFixed(1)}% Success
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Total Requests</p>
                            <p className="font-medium">{model.totalRequests}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Error Rate</p>
                            <p className="font-medium">{model.errorRate.toFixed(1)}%</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Avg Response</p>
                            <p className="font-medium">{model.avgResponseTime}ms</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <ModelComparisonAnalytics />
          </TabsContent>

          <TabsContent value="conversions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Conversion by Segment</CardTitle>
                <CardDescription>Revenue and conversion metrics across user segments</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={conversionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="segment" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="conversions" fill="hsl(var(--primary))" name="Conversions" />
                    <Bar dataKey="revenue" fill="hsl(var(--accent))" name="Revenue (₹)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Conversion Details</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {conversionData.map((item) => (
                      <div key={item.segment} className="flex items-center justify-between p-3 rounded-lg border border-border">
                        <span className="font-medium">{item.segment}</span>
                        <div className="flex gap-4">
                          <span className="text-sm text-muted-foreground">
                            {item.conversions} conversions
                          </span>
                          <span className="text-sm font-medium">
                            ₹{item.revenue.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="campaigns">
            <EmailCampaignAnalytics />
          </TabsContent>

          <TabsContent value="segments">
            <UserSegmentationDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
