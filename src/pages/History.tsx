import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Trash2, Edit2, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ChatHistorySkeleton } from "@/components/ui/skeleton";
import ScrollProgressIndicator from "@/components/ScrollProgressIndicator";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface ChatHistory {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
}

const History = () => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // React Query for chat history
  const { data: chats = [], isLoading: loading } = useQuery({
    queryKey: ['chat-history', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: chatData, error } = await supabase
        .from('chat_history')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const chatsWithCounts = await Promise.all(
        (chatData || []).map(async (chat) => {
          const { count } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('chat_id', chat.id);

          return { ...chat, message_count: count || 0 };
        })
      );

      return chatsWithCounts;
    },
    enabled: !!user,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: async (chatId: string) => {
      await supabase.from('chat_messages').delete().eq('chat_id', chatId);
      await supabase.from('chat_history').delete().eq('id', chatId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-history'] });
      toast({ title: "Chat deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const renameMutation = useMutation({
    mutationFn: async ({ chatId, newTitle }: { chatId: string; newTitle: string }) => {
      const { error } = await supabase
        .from('chat_history')
        .update({ title: newTitle })
        .eq('id', chatId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-history'] });
      setEditingId(null);
      toast({ title: "Chat renamed successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteChat = (chatId: string) => {
    if (confirm("Are you sure you want to delete this chat?")) {
      deleteMutation.mutate(chatId);
    }
  };

  const renameChat = (chatId: string, newTitle: string) => {
    if (newTitle.trim()) {
      renameMutation.mutate({ chatId, newTitle });
    }
  };

  const openChat = (chatId: string) => {
    navigate(`/chat?id=${chatId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <ScrollProgressIndicator />
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <h1 className="text-4xl font-bold gradient-text mb-8">Chat History</h1>
        
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <ChatHistorySkeleton key={i} />
            ))}
          </div>
        ) : chats.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No chat history yet. Start a conversation!</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4">{chats.map((chat, index) => (
              <div 
                key={chat.id} 
                className="glass-card p-6 rounded-xl hover:shadow-lg transition-all stagger-item card-hover-effect"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-start gap-4">
                  <MessageSquare className="w-6 h-6 text-accent mt-1" />
                  
                  <div className="flex-1 min-w-0">
                    {editingId === chat.id ? (
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={() => renameChat(chat.id, editTitle)}
                        onKeyDown={(e) => e.key === 'Enter' && renameChat(chat.id, editTitle)}
                        className="mb-2"
                        autoFocus
                      />
                    ) : (
                      <h3 
                        className="text-lg font-semibold mb-2 cursor-pointer hover:text-accent"
                        onClick={() => openChat(chat.id)}
                        onDoubleClick={() => {
                          setEditingId(chat.id);
                          setEditTitle(chat.title);
                        }}
                      >
                        {chat.title}
                      </h3>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(chat.updated_at), 'MMM dd, yyyy')}
                      </span>
                      <span>{chat.message_count} messages</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingId(chat.id);
                        setEditTitle(chat.title);
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteChat(chat.id)}
                      className="hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
