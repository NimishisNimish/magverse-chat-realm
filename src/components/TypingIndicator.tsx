import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface TypingUser {
  user_id: string;
  username: string;
  typing_at: string;
}

interface TypingIndicatorProps {
  conversationId: string;
}

export const TypingIndicator = ({ conversationId }: TypingIndicatorProps) => {
  const { user, profile } = useAuth();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase.channel(`typing:${conversationId}`);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: TypingUser[] = [];
        
        Object.values(state).forEach((presences) => {
          presences.forEach((presence: any) => {
            // Only show others typing, not yourself
            if (presence.user_id !== user?.id && presence.typing) {
              users.push({
                user_id: presence.user_id,
                username: presence.username,
                typing_at: presence.typing_at
              });
            }
          });
        });
        
        setTypingUsers(users);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user?.id]);

  // Broadcast typing status
  const broadcastTyping = async (isTyping: boolean) => {
    if (!user || !conversationId) return;

    const channel = supabase.channel(`typing:${conversationId}`);
    
    await channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          user_id: user.id,
          username: profile?.username || user.email || 'User',
          typing: isTyping,
          typing_at: new Date().toISOString()
        });
      }
    });
  };

  // Expose method for parent component to call
  useEffect(() => {
    (window as any).broadcastTyping = broadcastTyping;
    return () => {
      delete (window as any).broadcastTyping;
    };
  }, [user, conversationId, profile]);

  if (typingUsers.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
      <Loader2 className="w-3 h-3 animate-spin" />
      <span>
        {typingUsers.length === 1
          ? `${typingUsers[0].username} is typing...`
          : typingUsers.length === 2
          ? `${typingUsers[0].username} and ${typingUsers[1].username} are typing...`
          : `${typingUsers.length} users are typing...`}
      </span>
    </div>
  );
};
