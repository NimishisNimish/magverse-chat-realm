import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, MessageSquare, Calendar, Star, TrendingUp } from "lucide-react";
import { format } from "date-fns";

interface UserDetail {
  id: string;
  username: string;
  display_name: string | null;
  subscription_type: string;
  credits_remaining: number;
  created_at: string;
  total_messages: number;
  total_chats: number;
  favorite_model: string | null;
  model_usage: Record<string, number>;
  messages_today: number;
  last_active: string | null;
}

const AdminUserDetail = () => {
  const { userId } = useParams<{ userId: string }>();
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  useEffect(() => {
    if (isAdmin && userId) {
      loadUserDetail();
      
      // Real-time updates
      const channel = supabase
        .channel(`user-detail-${userId}`)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'chat_messages', filter: `user_id=eq.${userId}` },
          () => loadUserDetail()
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [isAdmin, userId]);

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

  const loadUserDetail = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      
      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      // Get message stats
      const { count: totalMessages } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Get chat count
      const { count: totalChats } = await supabase
        .from('chat_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Get today's messages
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const { count: messagesToday } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', todayStart.toISOString());

      // Get all messages for model usage analysis
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('model, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Calculate model usage
      const modelUsage: Record<string, number> = {};
      let favoriteModel = null;
      let maxCount = 0;

      if (messages) {
        messages.forEach(msg => {
          if (msg.model) {
            modelUsage[msg.model] = (modelUsage[msg.model] || 0) + 1;
            if (modelUsage[msg.model] > maxCount) {
              maxCount = modelUsage[msg.model];
              favoriteModel = msg.model;
            }
          }
        });
      }

      const lastActive = messages && messages.length > 0 
        ? messages[0].created_at 
        : profile.created_at;

      setUserDetail({
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        subscription_type: profile.subscription_type || 'free',
        credits_remaining: profile.credits_remaining || 0,
        created_at: profile.created_at,
        total_messages: totalMessages || 0,
        total_chats: totalChats || 0,
        favorite_model: favoriteModel,
        model_usage: modelUsage,
        messages_today: messagesToday || 0,
        last_active: lastActive,
      });

    } catch (error: any) {
      console.error('Error loading user detail:', error);
      toast({
        title: "Error",
        description: "Failed to load user details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getSubscriptionBadge = (type: string) => {
    const badges = {
      lifetime: { label: "Lifetime Pro", variant: "default" as const, color: "bg-amber-500" },
      monthly: { label: "Pro Yearly", variant: "secondary" as const, color: "bg-blue-500" },
      free: { label: "Free Plan", variant: "outline" as const, color: "bg-muted" },
    };
    return badges[type as keyof typeof badges] || badges.free;
  };

  if (!isAdmin) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Loading user details...</p>
        </div>
      </div>
    );
  }

  if (!userDetail) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">User not found</p>
        </div>
      </div>
    );
  }

  const badge = getSubscriptionBadge(userDetail.subscription_type);
  const accountAge = Math.floor((new Date().getTime() - new Date(userDetail.created_at).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Button onClick={() => navigate('/admin/activity')} variant="ghost" className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to User Activity
        </Button>

        <div className="max-w-6xl mx-auto space-y-6">
          {/* User Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-3xl mb-2">
                    {userDetail.display_name || userDetail.username}
                  </CardTitle>
                  <p className="text-muted-foreground">@{userDetail.username}</p>
                </div>
                <Badge variant={badge.variant} className={badge.color}>
                  {badge.label}
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Total Messages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{userDetail.total_messages}</div>
                <p className="text-xs text-muted-foreground mt-1">All time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Today
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{userDetail.messages_today}</div>
                <p className="text-xs text-muted-foreground mt-1">Messages today</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Chat Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{userDetail.total_chats}</div>
                <p className="text-xs text-muted-foreground mt-1">Conversations</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  Credits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {userDetail.subscription_type === 'lifetime' ? '∞' : userDetail.credits_remaining}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {userDetail.subscription_type === 'lifetime' ? 'Unlimited' : 'Remaining'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Model Usage */}
          <Card>
            <CardHeader>
              <CardTitle>AI Model Usage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {userDetail.favorite_model && (
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-2">Favorite Model</p>
                  <Badge variant="default">{userDetail.favorite_model}</Badge>
                </div>
              )}
              
              <div className="space-y-2">
                {Object.entries(userDetail.model_usage).map(([model, count]) => {
                  const percentage = (count / userDetail.total_messages) * 100;
                  return (
                    <div key={model} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{model}</span>
                        <span className="text-muted-foreground">{count} ({percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Account Info */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Account Age</p>
                  <p className="text-lg font-semibold">{accountAge} days</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Active</p>
                  <p className="text-lg font-semibold">
                    {userDetail.last_active ? format(new Date(userDetail.last_active), 'PPp') : 'Never'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Joined On</p>
                  <p className="text-lg font-semibold">{format(new Date(userDetail.created_at), 'PPP')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">User ID</p>
                  <p className="text-xs font-mono">{userDetail.id}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminUserDetail;