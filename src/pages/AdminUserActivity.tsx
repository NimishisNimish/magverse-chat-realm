import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  RefreshCw, 
  MessageSquare,
  Clock,
  Eye
} from "lucide-react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface UserActivity {
  user_id: string;
  display_name: string;
  email_preview: string;
  subscription_type: string;
  recent_searches: string[];
  last_activity: string;
  total_messages_today: number;
  active_models: string[];
}

const AdminUserActivity = () => {
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      loadUserActivities();
      
      // Set up real-time subscription for live updates
      const channel = supabase
        .channel('admin-activity-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chat_messages'
          },
          () => {
            loadUserActivities();
          }
        )
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
      toast({
        title: "Access Denied",
        description: "You do not have permission to access this page.",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    setIsAdmin(true);
  };

  const loadUserActivities = async () => {
    setLoading(true);
    try {
      // Get all profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!profiles) return;

      // Get today's date for filtering
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // For each user, get their recent activity
      const activitiesData = await Promise.all(
        profiles.map(async (profile) => {
          // Get recent messages from today
          const { data: todayMessages } = await supabase
            .from('chat_messages')
            .select('content, model, created_at, role')
            .eq('user_id', profile.id)
            .eq('role', 'user')
            .gte('created_at', today.toISOString())
            .order('created_at', { ascending: false })
            .limit(5);

          // Get last activity time
          const { data: lastMessage } = await supabase
            .from('chat_messages')
            .select('created_at')
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Get active models (models used today)
          const { data: modelMessages } = await supabase
            .from('chat_messages')
            .select('model')
            .eq('user_id', profile.id)
            .eq('role', 'assistant')
            .gte('created_at', today.toISOString());

          const activeModels = [...new Set(modelMessages?.map(m => m.model).filter(Boolean) || [])];
          const recentSearches = todayMessages?.map(m => m.content.substring(0, 50) + '...') || [];

          return {
            user_id: profile.id,
            display_name: profile.display_name || profile.username || 'Unknown',
            email_preview: profile.id.substring(0, 8) + '...',
            subscription_type: profile.subscription_type || 'free',
            recent_searches: recentSearches,
            last_activity: lastMessage?.created_at || profile.created_at,
            total_messages_today: todayMessages?.length || 0,
            active_models: activeModels,
          };
        })
      );

      // Sort by most recent activity
      activitiesData.sort((a, b) => 
        new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime()
      );

      setActivities(activitiesData);
    } catch (error: any) {
      console.error('Error loading user activities:', error);
      toast({
        title: "Error",
        description: "Failed to load user activities",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredActivities = activities.filter(activity => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      activity.display_name.toLowerCase().includes(query) ||
      activity.email_preview.toLowerCase().includes(query) ||
      activity.recent_searches.some(search => search.toLowerCase().includes(query))
    );
  });

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Live User Activity</h1>
            <p className="text-muted-foreground">Monitor user searches and AI model usage in real-time</p>
          </div>
          <Button onClick={loadUserActivities} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by user name or recent searches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <div className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="py-8 text-center">
                Loading activities...
              </CardContent>
            </Card>
          ) : filteredActivities.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                No user activities found
              </CardContent>
            </Card>
          ) : (
            filteredActivities.map(activity => (
              <Card key={activity.user_id} className="glass-card hover:border-primary/30 transition-all">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <CardTitle className="text-lg">{activity.display_name}</CardTitle>
                        <CardDescription className="text-xs">
                          {activity.email_preview} • Last active: {format(new Date(activity.last_activity), 'MMM dd, HH:mm')}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={activity.subscription_type === 'lifetime' ? 'default' : activity.subscription_type === 'monthly' ? 'secondary' : 'outline'}>
                        {activity.subscription_type}
                      </Badge>
                      <Badge variant="outline">
                        <MessageSquare className="w-3 h-3 mr-1" />
                        {activity.total_messages_today} today
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Active Models */}
                    {activity.active_models.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Active Models:</p>
                        <div className="flex flex-wrap gap-2">
                          {activity.active_models.map(model => (
                            <Badge key={model} variant="secondary" className="text-xs">
                              {model}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recent Searches */}
                    {activity.recent_searches.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Recent Searches:</p>
                        <div className="space-y-1">
                          {activity.recent_searches.map((search, idx) => (
                            <div key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                              <Eye className="w-3 h-3 mt-1 shrink-0" />
                              <span>{search}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminUserActivity;
