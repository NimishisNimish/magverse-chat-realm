import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Activity, Download, RefreshCw, Users, MessageSquare, TrendingUp } from "lucide-react";
import { format } from "date-fns";

interface TrafficData {
  user_id: string;
  display_name: string;
  username: string;
  subscription_type: string;
  total_messages: number;
  total_chats: number;
  last_active: string;
  messages_today: number;
  active_now: boolean;
}

const AdminTraffic = () => {
  const [trafficData, setTrafficData] = useState<TrafficData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({
    activeNow: 0,
    totalMessages: 0,
    messagesToday: 0,
    totalUsers: 0,
  });

  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      loadTrafficData();
      const interval = setInterval(loadTrafficData, 10000); // Update every 10 seconds
      return () => clearInterval(interval);
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
        description: "You don't have admin privileges",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    setIsAdmin(true);
  };

  const loadTrafficData = async () => {
    try {
      setLoading(true);

      // Limit profiles to keep the page responsive
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, display_name, subscription_type, created_at')
        .order('created_at', { ascending: false })
        .limit(200);

      if (profileError) throw profileError;

      if (!profiles || profiles.length === 0) {
        setTrafficData([]);
        setStats({ activeNow: 0, totalMessages: 0, messagesToday: 0, totalUsers: 0 });
        return;
      }

      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      // Fetch a recent window of messages once (instead of per-user queries)
      const { data: recentMessages, error: msgErr } = await supabase
        .from('chat_messages')
        .select('user_id, created_at')
        .order('created_at', { ascending: false })
        .limit(5000);

      if (msgErr) throw msgErr;

      const lastActiveByUser = new Map<string, string>();
      const messagesTodayByUser = new Map<string, number>();
      const totalMessagesByUser = new Map<string, number>();

      (recentMessages || []).forEach((m) => {
        const userId = m.user_id;
        totalMessagesByUser.set(userId, (totalMessagesByUser.get(userId) || 0) + 1);

        // last active (messages are sorted desc, so first seen is latest)
        if (!lastActiveByUser.has(userId)) lastActiveByUser.set(userId, m.created_at);

        if (new Date(m.created_at) >= todayStart) {
          messagesTodayByUser.set(userId, (messagesTodayByUser.get(userId) || 0) + 1);
        }
      });

      const traffic: TrafficData[] = profiles.map((profile) => {
        const lastActive = lastActiveByUser.get(profile.id) || profile.created_at;
        const messagesToday = messagesTodayByUser.get(profile.id) || 0;
        const activeNow = new Date(lastActive) >= fiveMinutesAgo;

        return {
          user_id: profile.id,
          display_name: profile.display_name || profile.username || 'Unknown',
          username: profile.username || 'user',
          subscription_type: profile.subscription_type || 'free',
          // These are based on the recent message window (keeps UI fast)
          total_messages: totalMessagesByUser.get(profile.id) || 0,
          total_chats: 0,
          last_active: lastActive,
          messages_today: messagesToday,
          active_now: activeNow,
        };
      });

      traffic.sort((a, b) => {
        if (a.active_now && !b.active_now) return -1;
        if (!a.active_now && b.active_now) return 1;
        return new Date(b.last_active).getTime() - new Date(a.last_active).getTime();
      });

      setTrafficData(traffic);

      const activeNowCount = traffic.filter(t => t.active_now).length;
      const totalMessages = traffic.reduce((sum, t) => sum + t.total_messages, 0);
      const messagesToday = traffic.reduce((sum, t) => sum + t.messages_today, 0);

      setStats({
        activeNow: activeNowCount,
        totalMessages,
        messagesToday,
        totalUsers: traffic.length,
      });
    } catch (error: any) {
      console.error('Error loading traffic data:', error);
      toast({
        title: "Error",
        description: "Failed to load traffic data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Username', 'Display Name', 'Subscription', 'Total Messages', 'Total Chats', 'Messages Today', 'Last Active', 'Active Now'];
    const rows = trafficData.map(t => [
      t.username,
      t.display_name,
      t.subscription_type,
      t.total_messages.toString(),
      t.total_chats.toString(),
      t.messages_today.toString(),
      format(new Date(t.last_active), 'PPpp'),
      t.active_now ? 'Yes' : 'No',
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `traffic-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast({
      title: "CSV Exported",
      description: "Traffic data has been exported successfully",
    });
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Real-Time Traffic Monitor</h1>
            <p className="text-muted-foreground">Monitor user activity and system usage in real-time</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportToCSV} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={loadTrafficData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Active Now
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500">{stats.activeNow}</div>
              <p className="text-xs text-muted-foreground mt-1">Online in last 5 min</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4" />
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground mt-1">Registered accounts</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Messages Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{stats.messagesToday}</div>
              <p className="text-xs text-muted-foreground mt-1">Since midnight</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Total Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalMessages}</div>
              <p className="text-xs text-muted-foreground mt-1">All time</p>
            </CardContent>
          </Card>
        </div>

        {/* Traffic List */}
        <Card>
          <CardHeader>
            <CardTitle>User Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {loading ? (
                  <p className="text-center py-8 text-muted-foreground">Loading traffic data...</p>
                ) : trafficData.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No users found</p>
                ) : (
                  trafficData.map((data) => (
                    <Card key={data.user_id} className="glass-card">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                                data.subscription_type === 'lifetime' ? 'bg-amber-500/20 text-amber-500' :
                                data.subscription_type === 'monthly' ? 'bg-blue-500/20 text-blue-500' :
                                'bg-muted/20 text-muted-foreground'
                              }`}>
                                {data.display_name[0]?.toUpperCase()}
                              </div>
                              {data.active_now && (
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background animate-pulse" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold">{data.display_name}</p>
                                {data.active_now && (
                                  <Badge variant="default" className="bg-green-500">Online</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">@{data.username}</p>
                            </div>
                          </div>
                          <div className="text-right space-y-1">
                            <Badge variant={
                              data.subscription_type === 'lifetime' ? 'default' :
                              data.subscription_type === 'monthly' ? 'secondary' :
                              'outline'
                            }>
                              {data.subscription_type === 'lifetime' ? 'Lifetime Pro' :
                               data.subscription_type === 'monthly' ? 'Pro Yearly' :
                               'Free Plan'}
                            </Badge>
                            <p className="text-xs text-muted-foreground">
                              Last active: {format(new Date(data.last_active), 'PPp')}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
                          <div className="text-center">
                            <p className="text-2xl font-bold">{data.total_messages}</p>
                            <p className="text-xs text-muted-foreground">Total Messages</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold">{data.messages_today}</p>
                            <p className="text-xs text-muted-foreground">Today</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold">{data.total_chats}</p>
                            <p className="text-xs text-muted-foreground">Chat Sessions</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminTraffic;
