import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from "recharts";
import { Users, TrendingUp, DollarSign, Zap, Activity } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import AdminActivityFeed from "@/components/AdminActivityFeed";
import UserEngagementScoring from "@/components/UserEngagementScoring";
import AdminChatHistory from "@/components/AdminChatHistory";

interface UserData {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  subscription_type: string;
  credits_remaining: number;
  monthly_credits_used: number;
  created_at: string;
  message_count: number;
  favorite_model: string;
  last_activity: string;
  messages_today: number;
}

interface Stats {
  totalUsers: number;
  activeToday: number;
  totalRevenue: number;
  mostPopularModel: string;
  averageMessages: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeToday: 0,
    totalRevenue: 0,
    mostPopularModel: "",
    averageMessages: 0
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    loadAllUsersData();
    
    // Set up real-time subscriptions
    const messagesChannel = supabase
      .channel('admin-dashboard-messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => {
        loadAllUsersData();
      })
      .subscribe();

    const profilesChannel = supabase
      .channel('admin-dashboard-profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        loadAllUsersData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, []);

  const loadAllUsersData = async () => {
    try {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all messages grouped by user
      const { data: messageCounts, error: messagesError } = await supabase
        .from('chat_messages')
        .select('user_id, created_at, model');

      if (messagesError) throw messagesError;

      // Process user data
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const userData: UserData[] = [];
      let activeToday = 0;
      const modelUsage: { [key: string]: number } = {};

      for (const profile of profiles || []) {
        const userMessages = messageCounts?.filter(m => m.user_id === profile.id) || [];
        const messagesToday = userMessages.filter(m => new Date(m.created_at) >= today).length;
        
        if (messagesToday > 0) activeToday++;

        // Find favorite model
        const modelCounts: { [key: string]: number } = {};
        userMessages.forEach(msg => {
          if (msg.model) {
            modelCounts[msg.model] = (modelCounts[msg.model] || 0) + 1;
            modelUsage[msg.model] = (modelUsage[msg.model] || 0) + 1;
          }
        });

        const favoriteModel = Object.keys(modelCounts).length > 0
          ? Object.entries(modelCounts).sort(([,a], [,b]) => b - a)[0][0]
          : 'None';

        const lastMessage = userMessages.length > 0
          ? userMessages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
          : null;

        userData.push({
          id: profile.id,
          username: profile.username || 'Unknown',
          display_name: profile.display_name || 'User',
          avatar_url: profile.avatar_url || '',
          subscription_type: profile.subscription_type || 'free',
          credits_remaining: profile.credits_remaining || 0,
          monthly_credits_used: profile.monthly_credits_used || 0,
          created_at: profile.created_at,
          message_count: userMessages.length,
          favorite_model: favoriteModel,
          last_activity: lastMessage?.created_at || profile.created_at,
          messages_today: messagesToday
        });
      }

      // Calculate stats
      const mostPopularModel = Object.keys(modelUsage).length > 0
        ? Object.entries(modelUsage).sort(([,a], [,b]) => b - a)[0][0]
        : 'None';

      const totalMessages = messageCounts?.length || 0;
      const averageMessages = profiles?.length ? Math.round(totalMessages / profiles.length) : 0;

      // Calculate revenue (assuming ₹699 for lifetime, ₹199 for yearly)
      const lifetimeCount = profiles?.filter(p => p.subscription_type === 'lifetime').length || 0;
      const yearlyCount = profiles?.filter(p => p.subscription_type === 'monthly').length || 0;
      const totalRevenue = (lifetimeCount * 699) + (yearlyCount * 199);

      setStats({
        totalUsers: profiles?.length || 0,
        activeToday,
        totalRevenue,
        mostPopularModel,
        averageMessages
      });

      setUsers(userData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading admin data:', error);
      toast.error('Failed to load admin dashboard data');
      setLoading(false);
    }
  };

  const getSubscriptionBadge = (type: string) => {
    const variants: { [key: string]: "default" | "secondary" | "destructive" } = {
      lifetime: "default",
      monthly: "secondary",
      free: "destructive"
    };
    return <Badge variant={variants[type] || "default"}>{type.toUpperCase()}</Badge>;
  };

  const filteredUsers = users.filter(u => {
    if (filter === "all") return true;
    if (filter === "active") return u.messages_today > 0;
    return u.subscription_type === filter;
  });

  // Chart data
  const subscriptionData = [
    { name: 'Lifetime', value: users.filter(u => u.subscription_type === 'lifetime').length },
    { name: 'Yearly', value: users.filter(u => u.subscription_type === 'monthly').length },
    { name: 'Free', value: users.filter(u => u.subscription_type === 'free').length }
  ];

  const topUsers = [...users]
    .sort((a, b) => b.message_count - a.message_count)
    .slice(0, 10)
    .map(u => ({ name: u.username, messages: u.message_count }));

  const modelUsageData = Object.entries(
    users.reduce((acc, user) => {
      if (user.favorite_model !== 'None') {
        acc[user.favorite_model] = (acc[user.favorite_model] || 0) + 1;
      }
      return acc;
    }, {} as { [key: string]: number })
  ).map(([name, value]) => ({ name, value }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg ${filter === "all" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("active")}
            className={`px-4 py-2 rounded-lg ${filter === "active" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
          >
            Active Today
          </button>
          <button
            onClick={() => setFilter("lifetime")}
            className={`px-4 py-2 rounded-lg ${filter === "lifetime" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
          >
            Lifetime
          </button>
          <button
            onClick={() => setFilter("monthly")}
            className={`px-4 py-2 rounded-lg ${filter === "monthly" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
          >
            Yearly
          </button>
          <button
            onClick={() => setFilter("free")}
            className={`px-4 py-2 rounded-lg ${filter === "free" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
          >
            Free
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Today</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeToday}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.totalRevenue}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Popular Model</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold truncate">{stats.mostPopularModel}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Messages</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageMessages}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Subscription Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={subscriptionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                  {subscriptionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 10 Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topUsers}>
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="messages" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Favorite Models</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={modelUsageData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                  {modelUsageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Activity Feed */}
      <AdminActivityFeed />

          {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredUsers.map((user) => (
          <Card key={user.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback>{user.display_name[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{user.display_name}</h3>
                  <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Plan</span>
                {getSubscriptionBadge(user.subscription_type)}
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Messages</span>
                <span className="font-semibold">{user.message_count}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Today</span>
                <span className="font-semibold">{user.messages_today}</span>
              </div>

              {user.subscription_type !== 'lifetime' && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Credits</span>
                  <span className="font-semibold">
                    {user.subscription_type === 'monthly' 
                      ? `${500 - user.monthly_credits_used}/500`
                      : `${user.credits_remaining}/5`}
                  </span>
                </div>
              )}

              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-1">Favorite Model</p>
                <Badge variant="outline" className="text-xs">{user.favorite_model}</Badge>
              </div>

              <div className="pt-2">
                <p className="text-xs text-muted-foreground">
                  Last active: {formatDistanceToNow(new Date(user.last_activity), { addSuffix: true })}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* New Admin Components */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <AdminActivityFeed />
        <UserEngagementScoring />
      </div>

      <div className="mt-6">
        <AdminChatHistory />
      </div>
    </div>
  );
}
