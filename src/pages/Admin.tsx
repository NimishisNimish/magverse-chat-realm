import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  Shield,
  RefreshCw,
  Activity,
  Users,
  MessageSquare,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { format } from "date-fns";

interface DashboardStats {
  totalUsers: number;
  totalMessages: number;
  messagesToday: number;
  activeUsers: number;
  proUsers: number;
  lifetimeUsers: number;
}

const Admin = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalMessages: 0,
    messagesToday: 0,
    activeUsers: 0,
    proUsers: 0,
    lifetimeUsers: 0,
  });
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
      loadDashboardStats();
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

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      
      // Get user stats
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('subscription_type, created_at');

      if (profileError) throw profileError;

      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Get message count for today
      const { count: messagesToday } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart.toISOString());

      // Get total message count
      const { count: totalMessages } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true });

      const totalUsers = profiles?.length || 0;
      const proUsers = profiles?.filter(p => p.subscription_type === 'monthly').length || 0;
      const lifetimeUsers = profiles?.filter(p => p.subscription_type === 'lifetime').length || 0;
      const activeUsers = profiles?.filter(p => 
        new Date(p.created_at) >= weekAgo
      ).length || 0;

      setStats({
        totalUsers,
        totalMessages: totalMessages || 0,
        messagesToday: messagesToday || 0,
        activeUsers,
        proUsers,
        lifetimeUsers,
      });
    } catch (error: any) {
      console.error('Error loading dashboard stats:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard stats",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-destructive" />
              Access Denied
            </CardTitle>
            <CardDescription>
              You don't have permission to access this page
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold gradient-text mb-2">Admin Dashboard</h1>
              <p className="text-muted-foreground">Monitor your platform at a glance</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => navigate('/admin/analytics')} variant="outline" size="sm">
                <BarChart3 className="w-4 h-4 mr-2" />
                Analytics
              </Button>
              <Button onClick={() => navigate('/token-usage')} variant="outline" size="sm">
                <Activity className="w-4 h-4 mr-2" />
                Token Usage
              </Button>
              <Button onClick={loadDashboardStats} variant="outline" size="sm" disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Total Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.totalUsers}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Total Messages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.totalMessages}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Messages Today
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{stats.messagesToday}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  New Users (7d)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-500">{stats.activeUsers}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pro Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-500">{stats.proUsers}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Lifetime Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-500">{stats.lifetimeUsers}</div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Info */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Admin Panel Overview
              </CardTitle>
              <CardDescription>
                Welcome to the simplified admin dashboard. Use the navigation above to access detailed analytics and token usage.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                  <h3 className="font-semibold mb-2">Analytics</h3>
                  <p className="text-sm text-muted-foreground">
                    View detailed usage analytics, model performance, and user engagement metrics.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                  <h3 className="font-semibold mb-2">Token Usage</h3>
                  <p className="text-sm text-muted-foreground">
                    Monitor API token consumption across all models and users.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Admin;