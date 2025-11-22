import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { MessageSquare, Trash2, Edit2, Calendar, GitCompare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ChatHistorySkeleton } from "@/components/ui/skeleton";
import ScrollProgressIndicator from "@/components/ScrollProgressIndicator";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Virtuoso } from 'react-virtuoso';

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
  const [selectedChats, setSelectedChats] = useState<string[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // React Query for all chat history (virtual scrolling)
  const { data: chats = [], isLoading: loading } = useQuery({
    queryKey: ['chat-history', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .rpc('get_chat_history_with_counts', { p_user_id: user.id });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: async (chatId: string) => {
      await supabase.from('chat_messages').delete().eq('chat_id', chatId);
      await supabase.from('chat_history').delete().eq('id', chatId);
    },
    onMutate: async (chatId) => {
      await queryClient.cancelQueries({ queryKey: ['chat-history'] });
      const previousChats = queryClient.getQueryData(['chat-history', user?.id]);
      
      queryClient.setQueryData(['chat-history', user?.id], (old: any[]) => 
        old?.filter(chat => chat.id !== chatId) || []
      );
      
      return { previousChats };
    },
    onSuccess: () => {
      toast({ title: "Chat deleted successfully" });
    },
    onError: (error: any, _variables, context) => {
      if (context?.previousChats) {
        queryClient.setQueryData(['chat-history', user?.id], context.previousChats);
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-history'] });
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
    onMutate: async ({ chatId, newTitle }) => {
      await queryClient.cancelQueries({ queryKey: ['chat-history'] });
      const previousChats = queryClient.getQueryData(['chat-history', user?.id]);
      
      queryClient.setQueryData(['chat-history', user?.id], (old: any[]) => 
        old?.map(chat => chat.id === chatId ? { ...chat, title: newTitle } : chat) || []
      );
      
      setEditingId(null);
      setEditTitle('');
      
      return { previousChats };
    },
    onSuccess: () => {
      toast({ title: "Chat renamed successfully" });
    },
    onError: (error: any, _variables, context) => {
      if (context?.previousChats) {
        queryClient.setQueryData(['chat-history', user?.id], context.previousChats);
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-history'] });
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

  const handleToggleSelect = (chatId: string) => {
    setSelectedChats((prev) =>
      prev.includes(chatId)
        ? prev.filter((id) => id !== chatId)
        : [...prev, chatId]
    );
  };

  const handleCompareSelected = () => {
    if (selectedChats.length < 2 || selectedChats.length > 3) {
      toast({
        title: "Invalid Selection",
        description: "Please select 2-3 chats to compare",
        variant: "destructive",
      });
      return;
    }
    navigate(`/comparison?chats=${selectedChats.join(',')}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <ScrollProgressIndicator />
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold gradient-text">Chat History</h1>
          {selectedChats.length > 0 && (
            <Button
              onClick={handleCompareSelected}
              disabled={selectedChats.length < 2 || selectedChats.length > 3}
              className="gap-2"
            >
              <GitCompare className="w-4 h-4" />
              Compare Selected ({selectedChats.length})
            </Button>
          )}
        </div>
        
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
            <p className="text-sm text-muted-foreground mb-4">
              Showing {chats.length} {chats.length === 1 ? 'conversation' : 'conversations'}
            </p>
            
            {/* Virtual scrolling list with react-virtuoso */}
            <Virtuoso
              style={{ height: Math.min(chats.length * 140, window.innerHeight - 300) }}
              totalCount={chats.length}
              itemContent={(index) => {
                const chat = chats[index];
                return (
                  <div className="px-4 pb-4">
                    <div className="glass-card p-6 rounded-xl hover:shadow-lg transition-all card-hover-effect">
                      <div className="flex items-start gap-4">
                        <Checkbox
                          checked={selectedChats.includes(chat.id)}
                          onCheckedChange={() => handleToggleSelect(chat.id)}
                          className="mt-1.5"
                        />
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
                  </div>
                );
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
