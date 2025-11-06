import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  MessageSquare,
  BarChart3,
  Activity
} from "lucide-react";
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
  ResponsiveContainer 
} from "recharts";

interface AnalyticsData {
  totalUsers: number;
  freeUsers: number;
  proUsers: number;
  lifetimeUsers: number;
  totalRevenue: number;
  completedPayments: number;
  pendingPayments: number;
  rejectedPayments: number;
  totalMessages: number;
  totalChats: number;
  modelUsage: { name: string; value: number }[];
  paymentTrends: { date: string; amount: number; count: number }[];
  userGrowth: { date: string; users: number }[];
}

const AdminAnalytics = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      loadAnalytics();
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
      toast({
        title: "Access Denied",
        description: "You don't have permission to access admin analytics.",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    setIsAdmin(true);
  };

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch user statistics
      const { data: profiles } = await supabase
        .from('profiles')
        .select('subscription_type, created_at');

      const totalUsers = profiles?.length || 0;
      const freeUsers = profiles?.filter(p => p.subscription_type === 'free').length || 0;
      const proUsers = profiles?.filter(p => p.subscription_type === 'monthly').length || 0;
      const lifetimeUsers = profiles?.filter(p => p.subscription_type === 'lifetime').length || 0;

      // Fetch payment statistics
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*');

      const completedPayments = transactions?.filter(t => t.status === 'completed').length || 0;
      const pendingPayments = transactions?.filter(t => t.status === 'pending').length || 0;
      const rejectedPayments = transactions?.filter(t => t.status === 'failed').length || 0;
      const totalRevenue = transactions
        ?.filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      // Fetch message statistics
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('model, created_at');

      const totalMessages = messages?.length || 0;

      // Calculate model usage
      const modelCounts: { [key: string]: number } = {};
      messages?.forEach(msg => {
        if (msg.model) {
          modelCounts[msg.model] = (modelCounts[msg.model] || 0) + 1;
        }
      });
      const modelUsage = Object.entries(modelCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      // Fetch chat statistics
      const { data: chats } = await supabase
        .from('chat_history')
        .select('id');

      const totalChats = chats?.length || 0;

      // Calculate payment trends (last 7 days)
      const paymentTrends = calculatePaymentTrends(transactions || []);
      
      // Calculate user growth (last 7 days)
      const userGrowth = calculateUserGrowth(profiles || []);

      setAnalytics({
        totalUsers,
        freeUsers,
        proUsers,
        lifetimeUsers,
        totalRevenue,
        completedPayments,
        pendingPayments,
        rejectedPayments,
        totalMessages,
        totalChats,
        modelUsage,
        paymentTrends,
        userGrowth,
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

  const calculatePaymentTrends = (transactions: any[]) => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split('T')[0];
    });

    return last7Days.map(date => {
      const dayTransactions = transactions.filter(t => 
        t.created_at?.startsWith(date) && t.status === 'completed'
      );
      return {
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        amount: dayTransactions.reduce((sum, t) => sum + Number(t.amount), 0),
        count: dayTransactions.length,
      };
    });
  };

  const calculateUserGrowth = (profiles: any[]) => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split('T')[0];
    });

    return last7Days.map(date => {
      const usersUpToDate = profiles.filter(p => 
        p.created_at && new Date(p.created_at) <= new Date(date)
      ).length;
      return {
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        users: usersUpToDate,
      };
    });
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

  if (!isAdmin) {
    return (
      <div className="min-h-screen gradient-bg">
        <Navbar />
        <div className="container mx-auto px-4 pt-24">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>You don't have permission to view this page.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg">
        <Navbar />
        <div className="container mx-auto px-4 pt-24">
          <div className="text-center">Loading analytics...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-2">Admin Analytics</h1>
          <p className="text-muted-foreground">Track platform performance and user engagement</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {analytics?.freeUsers} free, {analytics?.proUsers} pro, {analytics?.lifetimeUsers} lifetime
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{analytics?.totalRevenue}</div>
              <p className="text-xs text-muted-foreground">
                {analytics?.completedPayments} completed payments
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.totalMessages}</div>
              <p className="text-xs text-muted-foreground">
                Across {analytics?.totalChats} chat sessions
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.pendingPayments}</div>
              <p className="text-xs text-muted-foreground">
                {analytics?.rejectedPayments} rejected
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="trends" className="space-y-6">
          <TabsList className="glass-card">
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="models">AI Models</TabsTrigger>
            <TabsTrigger value="users">User Distribution</TabsTrigger>
          </TabsList>

          <TabsContent value="trends" className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Revenue Trends (Last 7 Days)</CardTitle>
                <CardDescription>Daily payment amounts and count</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics?.paymentTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--foreground))" />
                    <YAxis stroke="hsl(var(--foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={2} name="Revenue (₹)" />
                    <Line type="monotone" dataKey="count" stroke="hsl(var(--secondary))" strokeWidth={2} name="Payments" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle>User Growth (Last 7 Days)</CardTitle>
                <CardDescription>Total registered users over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics?.userGrowth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--foreground))" />
                    <YAxis stroke="hsl(var(--foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="users" stroke="hsl(var(--primary))" strokeWidth={2} name="Total Users" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="models" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>AI Model Usage</CardTitle>
                  <CardDescription>Most popular AI models</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analytics?.modelUsage.slice(0, 4)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="hsl(var(--primary))"
                        dataKey="value"
                      >
                        {analytics?.modelUsage.slice(0, 4).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Model Usage Count</CardTitle>
                  <CardDescription>Number of messages per model</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics?.modelUsage.slice(0, 5)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--foreground))" />
                      <YAxis stroke="hsl(var(--foreground))" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="value" fill="hsl(var(--primary))" name="Messages" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>User Distribution by Plan</CardTitle>
                <CardDescription>Breakdown of subscription types</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Free', value: analytics?.freeUsers || 0 },
                        { name: 'Pro Monthly', value: analytics?.proUsers || 0 },
                        { name: 'Lifetime Pro', value: analytics?.lifetimeUsers || 0 },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="hsl(var(--primary))"
                      dataKey="value"
                    >
                      {[0, 1, 2].map((index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminAnalytics;
