import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Search, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ChatSession {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  title: string;
  message_count: number;
  last_message: string;
  created_at: Date;
  updated_at: Date;
}

export default function AdminChatHistory() {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [filteredChats, setFilteredChats] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadChatHistory();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      setFilteredChats(
        chats.filter(chat =>
          chat.user_name.toLowerCase().includes(query) ||
          chat.title.toLowerCase().includes(query) ||
          chat.last_message.toLowerCase().includes(query)
        )
      );
    } else {
      setFilteredChats(chats);
    }
  }, [chats, searchQuery]);

  const loadChatHistory = async () => {
    try {
      // Get all chat sessions with message counts
      const { data: chatHistory } = await supabase
        .from('chat_history')
        .select('id, user_id, title, created_at, updated_at')
        .order('updated_at', { ascending: false })
        .limit(100);

      if (!chatHistory) {
        setLoading(false);
        return;
      }

      // Get message counts and last message for each chat
      const chatSessions: ChatSession[] = await Promise.all(
        chatHistory.map(async (chat) => {
          const { data: messages } = await supabase
            .from('chat_messages')
            .select('content, role')
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: false })
            .limit(1);

          const { count } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('chat_id', chat.id);

          // Get user profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, username, avatar_url')
            .eq('id', chat.user_id)
            .single();

          return {
            id: chat.id,
            user_id: chat.user_id,
            user_name: profile?.display_name || profile?.username || 'Unknown User',
            user_avatar: profile?.avatar_url || null,
            title: chat.title || 'Untitled Chat',
            message_count: count || 0,
            last_message: messages?.[0]?.content?.substring(0, 100) || 'No messages',
            created_at: new Date(chat.created_at),
            updated_at: new Date(chat.updated_at),
          };
        })
      );

      setChats(chatSessions);
      setFilteredChats(chatSessions);
      setLoading(false);
    } catch (error) {
      console.error('Error loading chat history:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Chat History</CardTitle>
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
          <MessageSquare className="h-5 w-5" />
          Chat History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by user, title, or message..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-3">
            {filteredChats.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {searchQuery ? "No matching chats" : "No chat history"}
              </p>
            ) : (
              filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={chat.user_avatar || undefined} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">{chat.user_name}</span>
                      <Badge variant="outline" className="text-xs">
                        {chat.message_count} msgs
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1 truncate">
                      {chat.title}
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {chat.last_message}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Updated {formatDistanceToNow(chat.updated_at, { addSuffix: true })}</span>
                    </div>
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
