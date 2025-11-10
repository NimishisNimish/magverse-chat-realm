import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TrendingUp, MessageSquare, Zap, Award } from "lucide-react";

interface UserEngagement {
  user_id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  message_count: number;
  models_used: string[];
  engagement_score: number;
  last_active: Date;
}

export default function UserEngagementScoring() {
  const [users, setUsers] = useState<UserEngagement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEngagementData();
  }, []);

  const loadEngagementData = async () => {
    try {
      // Get all users with their messages
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('user_id, model, created_at')
        .eq('role', 'user')
        .order('created_at', { ascending: false });

      if (!messages) {
        setLoading(false);
        return;
      }

      // Group by user
      const userMap = new Map<string, {
        message_count: number;
        models: Set<string>;
        last_active: Date;
      }>();

      messages.forEach(msg => {
        const existing = userMap.get(msg.user_id) || {
          message_count: 0,
          models: new Set<string>(),
          last_active: new Date(msg.created_at)
        };

        existing.message_count++;
        if (msg.model) existing.models.add(msg.model);
        if (new Date(msg.created_at) > existing.last_active) {
          existing.last_active = new Date(msg.created_at);
        }

        userMap.set(msg.user_id, existing);
      });

      // Get user profiles
      const userIds = Array.from(userMap.keys());
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url')
        .in('id', userIds);

      if (!profiles) {
        setLoading(false);
        return;
      }

      // Calculate engagement scores
      const engagementData: UserEngagement[] = profiles.map(profile => {
        const userData = userMap.get(profile.id);
        if (!userData) return null;

        // Scoring algorithm:
        // - Message count: 1 point per message
        // - Model diversity: 10 points per unique model
        // - Recent activity: up to 50 bonus points based on recency
        const messagePoints = userData.message_count;
        const modelPoints = userData.models.size * 10;
        
        const daysSinceActive = Math.floor(
          (Date.now() - userData.last_active.getTime()) / (1000 * 60 * 60 * 24)
        );
        const recencyPoints = Math.max(0, 50 - (daysSinceActive * 5));

        const engagement_score = messagePoints + modelPoints + recencyPoints;

        return {
          user_id: profile.id,
          display_name: profile.display_name || profile.username || 'User',
          username: profile.username || '',
          avatar_url: profile.avatar_url,
          message_count: userData.message_count,
          models_used: Array.from(userData.models),
          engagement_score,
          last_active: userData.last_active
        };
      }).filter(Boolean) as UserEngagement[];

      // Sort by engagement score
      engagementData.sort((a, b) => b.engagement_score - a.engagement_score);

      setUsers(engagementData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading engagement data:', error);
      setLoading(false);
    }
  };

  const getEngagementTier = (score: number) => {
    if (score >= 500) return { label: 'Elite', color: 'bg-gradient-to-r from-amber-500 to-amber-600' };
    if (score >= 200) return { label: 'High', color: 'bg-gradient-to-r from-blue-500 to-cyan-600' };
    if (score >= 50) return { label: 'Active', color: 'bg-gradient-to-r from-green-500 to-emerald-600' };
    return { label: 'New', color: 'bg-muted' };
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Engagement Scoring</CardTitle>
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
          <Award className="h-5 w-5 text-primary" />
          User Engagement Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-3">
            {users.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No user activity yet</p>
            ) : (
              users.map((user, index) => {
                const tier = getEngagementTier(user.engagement_score);
                return (
                  <div
                    key={user.user_id}
                    className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-2xl font-bold text-muted-foreground w-8 text-center">
                        #{index + 1}
                      </span>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback>
                          {user.display_name[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{user.display_name}</p>
                        {user.username && (
                          <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-sm">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <span>{user.message_count}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Zap className="h-4 w-4 text-muted-foreground" />
                        <span>{user.models_used.length}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <span className="font-bold text-primary">{user.engagement_score}</span>
                      </div>
                      <Badge className={`${tier.color} border-0 text-white`}>
                        {tier.label}
                      </Badge>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
