import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Smile } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Reaction {
  id: string;
  user_id: string;
  emoji: string;
  username?: string;
}

interface MessageReactionsProps {
  messageId: string;
  conversationId?: string;
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🤔', '👀', '🎉', '🔥', '💯'];

export const MessageReactions = ({ messageId, conversationId }: MessageReactionsProps) => {
  const { user, profile } = useAuth();
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  // Load existing reactions
  useEffect(() => {
    loadReactions();
    
    // Subscribe to real-time reaction updates
    if (conversationId) {
      const channel = supabase
        .channel(`reactions:${messageId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'message_reactions',
            filter: `message_id=eq.${messageId}`
          },
          () => {
            loadReactions();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [messageId, conversationId]);

  const loadReactions = async () => {
    const { data, error } = await supabase
      .from('message_reactions')
      .select(`
        id,
        user_id,
        emoji,
        profiles (username)
      `)
      .eq('message_id', messageId);

    if (!error && data) {
      setReactions(data.map(r => ({
        id: r.id,
        user_id: r.user_id,
        emoji: r.emoji,
        username: (r.profiles as any)?.username
      })));
    }
  };

  const addReaction = async (emoji: string) => {
    if (!user) {
      toast.error('Please log in to add reactions');
      return;
    }

    // Check if user already reacted with this emoji
    const existingReaction = reactions.find(
      r => r.user_id === user.id && r.emoji === emoji
    );

    if (existingReaction) {
      // Remove reaction
      await supabase
        .from('message_reactions')
        .delete()
        .eq('id', existingReaction.id);
    } else {
      // Add reaction
      await supabase
        .from('message_reactions')
        .insert({
          message_id: messageId,
          user_id: user.id,
          emoji
        });
    }

    setShowPicker(false);
  };

  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction);
    return acc;
  }, {} as Record<string, Reaction[]>);

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {/* Display existing reactions */}
      {Object.entries(groupedReactions).map(([emoji, reactionList]) => {
        const userReacted = reactionList.some(r => r.user_id === user?.id);
        return (
          <Button
            key={emoji}
            variant={userReacted ? "default" : "ghost"}
            size="sm"
            className="h-7 px-2 text-sm gap-1"
            onClick={() => addReaction(emoji)}
            title={reactionList.map(r => r.username).join(', ')}
          >
            <span>{emoji}</span>
            <span className="text-xs">{reactionList.length}</span>
          </Button>
        );
      })}

      {/* Add reaction button */}
      <Popover open={showPicker} onOpenChange={setShowPicker}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            <Smile className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2">
          <div className="grid grid-cols-4 gap-1">
            {QUICK_EMOJIS.map(emoji => (
              <Button
                key={emoji}
                variant="ghost"
                className="h-10 text-xl hover:scale-110 transition-transform"
                onClick={() => addReaction(emoji)}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
