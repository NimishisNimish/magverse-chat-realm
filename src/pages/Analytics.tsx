import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  AreaChart
} from "recharts";
import { 
  TrendingUp, 
  Users, 
  Activity, 
  DollarSign, 
  Calendar,
  BarChart3,
  Download,
  RefreshCw
} from "lucide-react";
import { format, subDays, startOfDay, differenceInDays } from "date-fns";
import { toast } from "sonner";

// CSV Export utility function
const exportToCSV = (data: any[], filename: string) => {
  if (data.length === 0) {
    toast.error("No data to export");
    return;
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes in values
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  toast.success(`CSV exported successfully: ${filename}`);
};

interface RetentionData {
  date: string;
  activeUsers: number;
  newUsers: number;
  returningUsers: number;
  retentionRate: number;
}

interface ActiveUsersData {
  date: string;
  daily: number;
  weekly: number;
  monthly: number;
}

interface ModelPopularityData {
  date: string;
  [model: string]: number | string;
}

interface RevenueData {
  date: string;
  revenue: number;
  transactions: number;
  lifetimeSales: number;
  yearlySales: number;
}

interface Stats {
  totalUsers: number;
  activeToday: number;
  activeThisWeek: number;
  activeThisMonth: number;
  totalRevenue: number;
  monthlyGrowth: number;
  avgSessionTime: string;
  topModel: string;
}

const COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'];

export default function Analytics() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [retentionData, setRetentionData] = useState<RetentionData[]>([]);
  const [activeUsersData, setActiveUsersData] = useState<ActiveUsersData[]>([]);
  const [modelPopularityData, setModelPopularityData] = useState<ModelPopularityData[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      loadAnalyticsData();

      // Set up real-time subscriptions
      const channel = supabase
        .channel('analytics-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => {
          loadAnalyticsData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
          loadAnalyticsData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
          loadAnalyticsData();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAdmin]);

  const checkAdminAccess = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (error || !data) {
      toast.error("Access Denied", {
        description: "You do not have permission to access this page.",
      });
      navigate("/");
      return;
    }

    setIsAdmin(true);
  };

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      // Fetch all data
      const { data: profiles } = await supabase.from('profiles').select('*');
      const { data: messages } = await supabase.from('chat_messages').select('*');
      const { data: transactions } = await supabase.from('transactions').select('*');

      if (!profiles || !messages) return;

      // Calculate stats
      const today = startOfDay(new Date());
      const weekAgo = subDays(today, 7);
      const monthAgo = subDays(today, 30);

      const activeToday = new Set(
        messages.filter(m => new Date(m.created_at) >= today).map(m => m.user_id)
      ).size;

      const activeThisWeek = new Set(
        messages.filter(m => new Date(m.created_at) >= weekAgo).map(m => m.user_id)
      ).size;

      const activeThisMonth = new Set(
        messages.filter(m => new Date(m.created_at) >= monthAgo).map(m => m.user_id)
      ).size;

      // Calculate revenue
      const lifetimeRevenue = (transactions?.filter(t => 
        t.status === 'completed' && t.plan_type === 'lifetime'
      ).length || 0) * 699;

      const yearlyRevenue = (transactions?.filter(t => 
        t.status === 'completed' && t.plan_type === 'yearly'
      ).length || 0) * 199;

      const totalRevenue = lifetimeRevenue + yearlyRevenue;

      // Calculate monthly growth
      const twoMonthsAgo = subDays(today, 60);
      const lastMonthUsers = new Set(
        messages.filter(m => {
          const date = new Date(m.created_at);
          return date >= twoMonthsAgo && date < monthAgo;
        }).map(m => m.user_id)
      ).size;

      const monthlyGrowth = lastMonthUsers > 0 
        ? ((activeThisMonth - lastMonthUsers) / lastMonthUsers) * 100 
        : 0;

      // Calculate top model
      const modelCounts: Record<string, number> = {};
      messages.forEach(m => {
        if (m.model && m.role === 'assistant') {
          modelCounts[m.model] = (modelCounts[m.model] || 0) + 1;
        }
      });
      const topModel = Object.entries(modelCounts).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';

      setStats({
        totalUsers: profiles.length,
        activeToday,
        activeThisWeek,
        activeThisMonth,
        totalRevenue,
        monthlyGrowth,
        avgSessionTime: '12.5 min', // Placeholder - would need session tracking
        topModel,
      });

      // Generate retention data (last 30 days)
      const retentionData: RetentionData[] = [];
      for (let i = 29; i >= 0; i--) {
        const date = subDays(today, i);
        const nextDay = subDays(today, i - 1);

        const activeOnDay = new Set(
          messages.filter(m => {
            const msgDate = startOfDay(new Date(m.created_at));
            return msgDate.getTime() === date.getTime();
          }).map(m => m.user_id)
        );

        const newUsersOnDay = profiles.filter(p => {
          const createdDate = startOfDay(new Date(p.created_at));
          return createdDate.getTime() === date.getTime();
        }).length;

        const returningUsers = messages.filter(m => {
          const msgDate = startOfDay(new Date(m.created_at));
          const userCreated = startOfDay(new Date(
            profiles.find(p => p.id === m.user_id)?.created_at || new Date()
          ));
          return msgDate.getTime() === date.getTime() && 
                 differenceInDays(msgDate, userCreated) > 0;
        }).length;

        retentionData.push({
          date: format(date, 'MMM dd'),
          activeUsers: activeOnDay.size,
          newUsers: newUsersOnDay,
          returningUsers,
          retentionRate: activeOnDay.size > 0 ? (returningUsers / activeOnDay.size) * 100 : 0,
        });
      }
      setRetentionData(retentionData);

      // Generate active users data (last 30 days)
      const activeUsersData: ActiveUsersData[] = [];
      for (let i = 29; i >= 0; i--) {
        const date = subDays(today, i);
        const weekBefore = subDays(date, 7);
        const monthBefore = subDays(date, 30);

        const dailyActive = new Set(
          messages.filter(m => {
            const msgDate = startOfDay(new Date(m.created_at));
            return msgDate.getTime() === date.getTime();
          }).map(m => m.user_id)
        ).size;

        const weeklyActive = new Set(
          messages.filter(m => {
            const msgDate = new Date(m.created_at);
            return msgDate >= weekBefore && msgDate <= date;
          }).map(m => m.user_id)
        ).size;

        const monthlyActive = new Set(
          messages.filter(m => {
            const msgDate = new Date(m.created_at);
            return msgDate >= monthBefore && msgDate <= date;
          }).map(m => m.user_id)
        ).size;

        activeUsersData.push({
          date: format(date, 'MMM dd'),
          daily: dailyActive,
          weekly: weeklyActive,
          monthly: monthlyActive,
        });
      }
      setActiveUsersData(activeUsersData);

      // Generate model popularity data (last 30 days)
      const modelPopularityData: ModelPopularityData[] = [];
      const uniqueModels = new Set(messages.map(m => m.model).filter(Boolean));
      
      for (let i = 29; i >= 0; i--) {
        const date = subDays(today, i);
        const dayData: ModelPopularityData = {
          date: format(date, 'MMM dd'),
        };

        uniqueModels.forEach(model => {
          const count = messages.filter(m => {
            const msgDate = startOfDay(new Date(m.created_at));
            return msgDate.getTime() === date.getTime() && m.model === model && m.role === 'assistant';
          }).length;
          dayData[model] = count;
        });

        modelPopularityData.push(dayData);
      }
      setModelPopularityData(modelPopularityData);

      // Generate revenue data (last 30 days)
      const revenueData: RevenueData[] = [];
      for (let i = 29; i >= 0; i--) {
        const date = subDays(today, i);
        
        const dayTransactions = transactions?.filter(t => {
          const txDate = startOfDay(new Date(t.created_at));
          return txDate.getTime() === date.getTime() && t.status === 'completed';
        }) || [];

        const lifetimeSales = dayTransactions.filter(t => t.plan_type === 'lifetime').length;
        const yearlySales = dayTransactions.filter(t => t.plan_type === 'yearly').length;
        const revenue = (lifetimeSales * 699) + (yearlySales * 199);

        revenueData.push({
          date: format(date, 'MMM dd'),
          revenue,
          transactions: dayTransactions.length,
          lifetimeSales,
          yearlySales,
        });
      }
      setRevenueData(revenueData);

    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    toast.success("Export feature coming soon!");
  };

  if (!isAdmin) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-96">
            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">📊 Analytics Dashboard</h1>
            <p className="text-muted-foreground">
              Comprehensive insights into user behavior, retention, and revenue
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={loadAnalyticsData} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={exportData} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Total Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.totalUsers}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.activeToday} active today
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="w-4 h-4 text-green-500" />
                  Monthly Active
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.activeThisMonth}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  <Badge variant={stats.monthlyGrowth >= 0 ? "default" : "destructive"}>
                    {stats.monthlyGrowth >= 0 ? '+' : ''}{stats.monthlyGrowth.toFixed(1)}% growth
                  </Badge>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-yellow-500" />
                  Total Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">₹{stats.totalRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  All-time earnings
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-purple-500" />
                  Top Model
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.topModel}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Most popular AI model
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Charts */}
        <Tabs defaultValue="retention" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="retention">Retention</TabsTrigger>
            <TabsTrigger value="active">Active Users</TabsTrigger>
            <TabsTrigger value="models">Model Popularity</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
          </TabsList>

          {/* Retention Tab */}
          <TabsContent value="retention" className="space-y-4">
            <div className="flex justify-end mb-4">
              <Button
                onClick={() => exportToCSV(retentionData, 'retention_data')}
                variant="outline"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>User Retention Metrics</CardTitle>
                <CardDescription>
                  Track new, returning, and retention rates over the last 30 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={retentionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="activeUsers" 
                      stackId="1"
                      stroke="#8b5cf6" 
                      fill="#8b5cf6" 
                      fillOpacity={0.6}
                      name="Active Users"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="newUsers" 
                      stackId="2"
                      stroke="#10b981" 
                      fill="#10b981" 
                      fillOpacity={0.6}
                      name="New Users"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="returningUsers" 
                      stackId="3"
                      stroke="#f59e0b" 
                      fill="#f59e0b" 
                      fillOpacity={0.6}
                      name="Returning Users"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Retention Rate Trend</CardTitle>
                <CardDescription>
                  Percentage of returning users over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={retentionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="retentionRate" 
                      stroke="#8b5cf6" 
                      strokeWidth={3}
                      name="Retention Rate (%)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Active Users Tab */}
          <TabsContent value="active" className="space-y-4">
            <div className="flex justify-end mb-4">
              <Button
                onClick={() => exportToCSV(activeUsersData, 'active_users_data')}
                variant="outline"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Daily, Weekly & Monthly Active Users</CardTitle>
                <CardDescription>
                  Track user engagement across different time periods
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={activeUsersData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="daily" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name="Daily Active Users"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="weekly" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="Weekly Active Users"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="monthly" 
                      stroke="#8b5cf6" 
                      strokeWidth={2}
                      name="Monthly Active Users"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Model Popularity Tab */}
          <TabsContent value="models" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>AI Model Usage Over Time</CardTitle>
                <CardDescription>
                  See which AI models are most popular with users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={modelPopularityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {Object.keys(modelPopularityData[0] || {})
                      .filter(key => key !== 'date')
                      .map((model, index) => (
                        <Bar 
                          key={model}
                          dataKey={model} 
                          fill={COLORS[index % COLORS.length]} 
                          name={model}
                        />
                      ))}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Revenue Tab */}
          <TabsContent value="revenue" className="space-y-4">
            <div className="flex justify-end mb-4">
              <Button
                onClick={() => exportToCSV(revenueData, 'revenue_data')}
                variant="outline"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Revenue Growth</CardTitle>
                <CardDescription>
                  Daily revenue breakdown from subscriptions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `₹${value}`} />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#10b981" 
                      fill="#10b981" 
                      fillOpacity={0.6}
                      name="Total Revenue (₹)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue by Plan Type</CardTitle>
                  <CardDescription>Last 30 days breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="lifetimeSales" fill="#8b5cf6" name="Lifetime" />
                      <Bar dataKey="yearlySales" fill="#10b981" name="Yearly" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Transaction Volume</CardTitle>
                  <CardDescription>Number of transactions per day</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="transactions" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        name="Transactions"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
