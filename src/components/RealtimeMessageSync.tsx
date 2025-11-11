import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  id: string;
  model: string;
  content: string;
  timestamp: Date;
  role: 'user' | 'assistant';
  webSearchEnabled?: boolean;
  searchMode?: string;
  sources?: Array<{url: string, title: string, snippet?: string}>;
  images?: Array<{image_url: {url: string}}>;
  videos?: Array<{videoUrl: string, prompt: string}>;
}

interface RealtimeMessageSyncProps {
  conversationId: string | null;
  onNewMessage: (message: Message) => void;
  onMessageUpdate: (messageId: string, updates: Partial<Message>) => void;
  onMessageDelete: (messageId: string) => void;
}

export const RealtimeMessageSync = ({
  conversationId,
  onNewMessage,
  onMessageUpdate,
  onMessageDelete
}: RealtimeMessageSyncProps) => {
  const { user } = useAuth();

  useEffect(() => {
    if (!conversationId) return;

    console.log('🔄 Setting up real-time message sync for conversation:', conversationId);

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('📨 New message received:', payload);
          const newMsg = payload.new as any;
          
          // Don't add messages from current user (they're already in state)
          if (newMsg.user_id === user?.id) return;
          
          onNewMessage({
            id: newMsg.id,
            model: newMsg.model || 'AI',
            content: newMsg.content,
            timestamp: new Date(newMsg.created_at),
            role: newMsg.role,
            sources: newMsg.metadata?.sources,
            images: newMsg.metadata?.images,
            videos: newMsg.metadata?.videos,
            webSearchEnabled: newMsg.metadata?.webSearchEnabled,
            searchMode: newMsg.metadata?.searchMode,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('✏️ Message updated:', payload);
          const updated = payload.new as any;
          onMessageUpdate(updated.id, {
            content: updated.content,
            model: updated.model,
            sources: updated.metadata?.sources,
            images: updated.metadata?.images,
            videos: updated.metadata?.videos,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'conversation_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('🗑️ Message deleted:', payload);
          const deleted = payload.old as any;
          onMessageDelete(deleted.id);
        }
      )
      .subscribe((status) => {
        console.log('Real-time subscription status:', status);
      });

    return () => {
      console.log('🔌 Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [conversationId, user?.id]);

  return null; // This is a logic-only component
};
