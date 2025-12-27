import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { MessageSquare, Trash2, Edit2, Calendar, GitCompare, Search, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ChatHistorySkeleton } from "@/components/ui/skeleton";
import ScrollProgressIndicator from "@/components/ScrollProgressIndicator";
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Virtuoso } from 'react-virtuoso';

interface ChatHistory {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
}

const CHATS_PER_PAGE = 20;

const History = () => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [selectedChats, setSelectedChats] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // React Query with infinite scroll - optimized to avoid blocking
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: loading,
    isError,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['chat-history', user?.id],
    queryFn: async ({ pageParam = 0 }) => {
      if (!user) return { data: [], nextPage: null };

      const start = pageParam * CHATS_PER_PAGE;
      const end = start + CHATS_PER_PAGE - 1;

      // Fast query: just get chats without counts first
      const { data: chats, error: chatsError } = await supabase
        .from('chat_history')
        .select('id,title,created_at,updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .range(start, end);

      if (chatsError) throw chatsError;

      const items = chats || [];
      
      // Get message counts in a single optimized query
      if (items.length === 0) {
        return { data: [], nextPage: null };
      }
      
      const chatIds = items.map(c => c.id);
      const { data: countData } = await supabase
        .from('chat_messages')
        .select('chat_id')
        .in('chat_id', chatIds);
      
      // Count messages per chat
      const countMap = new Map<string, number>();
      (countData || []).forEach(msg => {
        countMap.set(msg.chat_id, (countMap.get(msg.chat_id) || 0) + 1);
      });

      const withCounts = items.map((c) => ({
        ...c,
        message_count: countMap.get(c.id) ?? 0,
      }));

      return {
        data: withCounts,
        nextPage: items.length === CHATS_PER_PAGE ? pageParam + 1 : null,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !!user,
    staleTime: 60 * 1000, // Cache for 1 minute
    gcTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    initialPageParam: 0,
  });

  // Flatten all pages into single array
  const allChats = useMemo(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data]
  );

  // Filter chats based on search query
  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return allChats;
    
    const query = searchQuery.toLowerCase();
    return allChats.filter((chat) =>
      chat.title?.toLowerCase().includes(query)
    );
  }, [allChats, searchQuery]);

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
      setEditingId(null);
      setEditTitle('');
      queryClient.invalidateQueries({ queryKey: ['chat-history'] });
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
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
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
          
          {/* Search Input */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search chats by title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <ChatHistorySkeleton key={i} />
            ))}
          </div>
        ) : filteredChats.length === 0 && searchQuery ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No chats found matching "{searchQuery}"</p>
          </div>
        ) : allChats.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No chat history yet. Start a conversation!</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              Showing {filteredChats.length} of {allChats.length} {allChats.length === 1 ? 'conversation' : 'conversations'}
            </p>
            
            {/* Virtual scrolling list with infinite scroll */}
            <Virtuoso
              style={{ height: Math.min(filteredChats.length * 140 + 100, window.innerHeight - 300) }}
              totalCount={filteredChats.length}
              endReached={() => {
                if (hasNextPage && !isFetchingNextPage && !searchQuery) {
                  fetchNextPage();
                }
              }}
              itemContent={(index) => {
                const chat = filteredChats[index];
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
              components={{
                Footer: () => {
                  if (!hasNextPage || searchQuery) return null;
                  return (
                    <div className="flex justify-center py-8">
                      {isFetchingNextPage ? (
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      ) : (
                        <p className="text-sm text-muted-foreground">All chats loaded</p>
                      )}
                    </div>
                  );
                },
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
