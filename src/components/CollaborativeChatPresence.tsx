import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ActiveUser {
  user_id: string;
  username: string;
  online_at: string;
}

interface CollaborativeChatPresenceProps {
  conversationId: string;
}

export const CollaborativeChatPresence = ({ conversationId }: CollaborativeChatPresenceProps) => {
  const { user, profile } = useAuth();
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);

  useEffect(() => {
    if (!user || !conversationId) return;

    const presenceChannel = supabase.channel(`presence:${conversationId}`);

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const users: ActiveUser[] = [];
        
        Object.values(state).forEach((presences) => {
          presences.forEach((presence: any) => {
            if (presence.user_id && presence.username) {
              users.push({
                user_id: presence.user_id,
                username: presence.username,
                online_at: presence.online_at
              });
            }
          });
        });
        
        setActiveUsers(users);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('User joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('User left:', leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: user.id,
            username: profile?.username || user.email || 'Anonymous',
            online_at: new Date().toISOString()
          });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [conversationId, user, profile]);

  if (activeUsers.length <= 1) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 border-b border-border">
      <Users className="w-4 h-4 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">
        {activeUsers.length} {activeUsers.length === 1 ? 'user' : 'users'} active
      </span>
      <div className="flex -space-x-2 ml-2">
        {activeUsers.slice(0, 5).map((activeUser, idx) => (
          <Avatar key={idx} className="w-6 h-6 border-2 border-background">
            <AvatarFallback className="text-xs">
              {activeUser.username?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
        ))}
        {activeUsers.length > 5 && (
          <Badge variant="secondary" className="ml-2 text-xs">
            +{activeUsers.length - 5}
          </Badge>
        )}
      </div>
    </div>
  );
};
