import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  MessageSquare,
  BarChart3,
  Activity,
  Download
} from "lucide-react";
import { generateChatPDF } from "@/utils/pdfGenerator";
import { AnalyticsChartSkeleton, StatCardSkeleton } from "@/components/ui/skeleton";
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
      
      // Set up real-time subscriptions for automatic updates
      const transactionsChannel = supabase
        .channel('admin-transactions-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
          console.log('Transaction updated, reloading analytics...');
          loadAnalytics();
        })
        .subscribe();

      const messagesChannel = supabase
        .channel('admin-messages-updates')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, () => {
          console.log('New message, reloading analytics...');
          loadAnalytics();
        })
        .subscribe();

      const profilesChannel = supabase
        .channel('admin-profiles-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
          console.log('Profile updated, reloading analytics...');
          loadAnalytics();
        })
        .subscribe();

      // Auto-refresh every 30 seconds as backup
      const interval = setInterval(() => {
        loadAnalytics();
      }, 30000);

      return () => {
        supabase.removeChannel(transactionsChannel);
        supabase.removeChannel(messagesChannel);
        supabase.removeChannel(profilesChannel);
        clearInterval(interval);
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
    setLoading(true);
    try {
      // Counts (fast, avoids downloading full tables)
      const [
        totalUsersRes,
        freeUsersRes,
        proUsersRes,
        lifetimeUsersRes,
        totalMessagesRes,
        totalChatsRes,
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('subscription_type', 'free'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('subscription_type', 'monthly'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('subscription_type', 'lifetime'),
        supabase.from('chat_messages').select('*', { count: 'exact', head: true }),
        supabase.from('chat_history').select('*', { count: 'exact', head: true }),
      ]);

      const totalUsers = totalUsersRes.count || 0;
      const freeUsers = freeUsersRes.count || 0;
      const proUsers = proUsersRes.count || 0;
      const lifetimeUsers = lifetimeUsersRes.count || 0;
      const totalMessages = totalMessagesRes.count || 0;
      const totalChats = totalChatsRes.count || 0;

      // Transactions (lightweight fields only)
      const { data: allTransactions, error: txErr } = await supabase
        .from('transactions')
        .select('amount,status,verification_status,created_at')
        .order('created_at', { ascending: false })
        .limit(2000);
      if (txErr) throw txErr;

      const completedPayments = allTransactions?.filter(t => t.status === 'completed' || t.status === 'verified').length || 0;
      const pendingPayments = allTransactions?.filter(t => t.status === 'pending' && t.verification_status === 'pending_verification').length || 0;
      const rejectedPayments = allTransactions?.filter(t => t.status === 'failed' || t.status === 'rejected').length || 0;
      const totalRevenue = allTransactions
        ?.filter(t => t.status === 'completed' || t.status === 'verified')
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      // Model usage from a recent window (keeps the page snappy)
      const { data: recentMessages } = await supabase
        .from('chat_messages')
        .select('model, created_at')
        .order('created_at', { ascending: false })
        .limit(3000);

      const modelCounts: { [key: string]: number } = {};
      recentMessages?.forEach(msg => {
        if (msg.model) modelCounts[msg.model] = (modelCounts[msg.model] || 0) + 1;
      });

      const modelUsage = Object.entries(modelCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      // Trends
      const paymentTrends = calculatePaymentTrends(allTransactions || []);
      const { data: recentProfiles } = await supabase
        .from('profiles')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(5000);
      const userGrowth = calculateUserGrowth(recentProfiles || []);

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
        t.created_at?.startsWith(date) && (t.status === 'completed' || t.status === 'verified')
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

  const exportToCSV = () => {
    if (!analytics) return;

    const csvData = [
      ['Metric', 'Value'],
      ['Total Users', analytics.totalUsers],
      ['Free Users', analytics.freeUsers],
      ['Pro Users', analytics.proUsers],
      ['Lifetime Users', analytics.lifetimeUsers],
      ['Total Revenue', `₹${analytics.totalRevenue}`],
      ['Completed Payments', analytics.completedPayments],
      ['Pending Payments', analytics.pendingPayments],
      ['Rejected Payments', analytics.rejectedPayments],
      ['Total Messages', analytics.totalMessages],
      ['Total Chats', analytics.totalChats],
      [''],
      ['Model Usage'],
      ['Model', 'Count'],
      ...analytics.modelUsage.map(m => [m.name, m.value]),
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "CSV Exported",
      description: "Analytics data has been exported to CSV",
    });
  };

  const exportToPDF = () => {
    if (!analytics) return;

    const reportData = {
      title: 'MagVerse AI - Analytics Report',
      date: new Date().toISOString().split('T')[0],
      stats: [
        { label: 'Total Users', value: analytics.totalUsers.toString() },
        { label: 'Free Users', value: analytics.freeUsers.toString() },
        { label: 'Pro Users', value: analytics.proUsers.toString() },
        { label: 'Lifetime Users', value: analytics.lifetimeUsers.toString() },
        { label: 'Total Revenue', value: `₹${analytics.totalRevenue}` },
        { label: 'Completed Payments', value: analytics.completedPayments.toString() },
        { label: 'Pending Payments', value: analytics.pendingPayments.toString() },
        { label: 'Total Messages', value: analytics.totalMessages.toString() },
        { label: 'Total Chats', value: analytics.totalChats.toString() },
      ],
      models: analytics.modelUsage.slice(0, 5).map(m => `${m.name}: ${m.value} messages`),
    };

    // Simple text-based PDF generation
    const content = `
Analytics Report - ${reportData.date}

=== OVERVIEW ===
${reportData.stats.map(s => `${s.label}: ${s.value}`).join('\n')}

=== TOP AI MODELS ===
${reportData.models.join('\n')}
    `;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-report-${reportData.date}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Report Exported",
      description: "Analytics report has been exported",
    });
  };

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

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 pb-12">
          <div className="mb-8">
            <h1 className="text-4xl font-bold gradient-text mb-2">Admin Analytics</h1>
            <p className="text-muted-foreground">Loading analytics data...</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <AnalyticsChartSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold gradient-text mb-2 flex items-center gap-2">
              Admin Analytics 
              <Badge variant="outline" className="text-xs">
                Live
              </Badge>
            </h1>
            <p className="text-muted-foreground">Real-time platform performance and user engagement tracking</p>
          </div>
          <div className="flex gap-2 relative z-10">
            <Button onClick={exportToCSV} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={exportToPDF} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
            <Button onClick={loadAnalytics} variant="outline" disabled={loading}>
              <Activity className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
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
