import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Trash2, Edit2, Calendar, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ChatHistorySkeleton } from "@/components/ui/skeleton";
import ScrollProgressIndicator from "@/components/ScrollProgressIndicator";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";

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

  const fetchChats = useCallback(async (page: number, pageSize: number) => {
    if (!user) return [];

    const start = page * pageSize;
    const end = start + pageSize - 1;

    const { data: chatData, error } = await supabase
      .from('chat_history')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .range(start, end);

    if (error) {
      console.error('Error loading chat history:', error);
      toast({ title: "Error loading chat history", description: error.message, variant: "destructive" });
      return [];
    }

    if (chatData && chatData.length > 0) {
      const chatsWithCounts = await Promise.all(
        chatData.map(async (chat) => {
          const { count } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('chat_id', chat.id);
          
          return {
            ...chat,
            message_count: count || 0
          };
        })
      );
      return chatsWithCounts;
    }

    return [];
  }, [user, toast]);

  const { data: chats, loading, hasMore, loadMoreRef, reset } = useInfiniteScroll<ChatHistory>({
    fetchData: fetchChats,
    pageSize: 20,
  });

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('chat-history-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'chat_history', filter: `user_id=eq.${user.id}` },
        () => reset() // Reset and reload when data changes
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, reset]);

  const deleteChat = async (chatId: string) => {
    const { error: messagesError } = await supabase
      .from('chat_messages')
      .delete()
      .eq('chat_id', chatId);

    if (messagesError) {
      toast({ title: "Error deleting chat messages", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from('chat_history')
      .delete()
      .eq('id', chatId);

    if (!error) {
      toast({ title: "Chat deleted successfully" });
      reset(); // Reset and reload data
    } else {
      toast({ title: "Error deleting chat", variant: "destructive" });
    }
  };

  const renameChat = async (chatId: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    
    const { error } = await supabase
      .from('chat_history')
      .update({ title: newTitle })
      .eq('id', chatId);

    if (!error) {
      toast({ title: "Chat renamed successfully" });
      setEditingId(null);
      reset(); // Reset and reload data
    } else {
      toast({ title: "Error renaming chat", variant: "destructive" });
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
        
        {loading && chats.length === 0 ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <ChatHistorySkeleton key={i} />
            ))}
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
            
              {chats.length === 0 && !loading && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No chat history yet. Start a conversation!</p>
                </div>
              )}
            </div>

            {/* Loading more indicator */}
            <div ref={loadMoreRef} className="h-20 flex items-center justify-center mt-4">
              {loading && hasMore && (
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              )}
              {!hasMore && chats.length > 0 && (
                <p className="text-sm text-muted-foreground">No more chats to load</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
