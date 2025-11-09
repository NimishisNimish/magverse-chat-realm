import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Upload, Sparkles, User, Clock } from "lucide-react";

interface ActivityEvent {
  id: string;
  type: 'message' | 'file_upload' | 'model_selection';
  user_id: string;
  user_name: string;
  details: string;
  timestamp: Date;
  model?: string;
}

export default function AdminActivityFeed() {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentActivity();

    // Real-time subscription for new messages
    const channel = supabase
      .channel('admin-activity-feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        async (payload) => {
          const newMessage = payload.new as any;
          
          // Fetch user profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, username')
            .eq('id', newMessage.user_id)
            .single();

          const userName = profile?.display_name || profile?.username || 'Unknown User';
          
          const newActivity: ActivityEvent = {
            id: newMessage.id,
            type: newMessage.role === 'user' ? 'message' : newMessage.role === 'assistant' && newMessage.attachment_url ? 'file_upload' : 'message',
            user_id: newMessage.user_id,
            user_name: userName,
            details: newMessage.role === 'user' 
              ? newMessage.content.substring(0, 50) + (newMessage.content.length > 50 ? '...' : '')
              : 'AI response received',
            timestamp: new Date(newMessage.created_at),
            model: newMessage.model
          };

          setActivities(prev => [newActivity, ...prev].slice(0, 50)); // Keep last 50
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadRecentActivity = async () => {
    try {
      // Get last 50 messages
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('id, user_id, role, content, model, created_at, attachment_url')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!messages) {
        setLoading(false);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(messages.map(m => m.user_id))];
      
      // Fetch user profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, username')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const activitiesData: ActivityEvent[] = messages.map(msg => {
        const profile = profileMap.get(msg.user_id);
        const userName = profile?.display_name || profile?.username || 'Unknown User';

        return {
          id: msg.id,
          type: msg.role === 'user' && msg.attachment_url ? 'file_upload' : 'message',
          user_id: msg.user_id,
          user_name: userName,
          details: msg.role === 'user' 
            ? msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : '')
            : 'AI response',
          timestamp: new Date(msg.created_at),
          model: msg.model
        };
      });

      setActivities(activitiesData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading activity:', error);
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="h-4 w-4" />;
      case 'file_upload':
        return <Upload className="h-4 w-4" />;
      case 'model_selection':
        return <Sparkles className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'message':
        return 'bg-blue-500/10 text-blue-500';
      case 'file_upload':
        return 'bg-green-500/10 text-green-500';
      case 'model_selection':
        return 'bg-purple-500/10 text-purple-500';
      default:
        return 'bg-muted';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Live Activity Feed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Live Activity Feed
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-3">
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
            ) : (
              activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className={`p-2 rounded-lg ${getActivityColor(activity.type)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm font-medium">{activity.user_name}</span>
                      {activity.model && (
                        <Badge variant="outline" className="text-xs">
                          {activity.model.split('/').pop()}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {activity.details}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
