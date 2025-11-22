import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  model: string | null;
  created_at: string;
}

interface ChatHistory {
  id: string;
  title: string;
  messages: ChatMessage[];
}

export default function ModelComparison() {
  const [searchParams] = useSearchParams();
  const chatIds = searchParams.get('chats')?.split(',') || [];
  const { user } = useAuth();

  const { data: chats, isLoading } = useQuery({
    queryKey: ['comparison-chats', chatIds],
    queryFn: async () => {
      const promises = chatIds.map(async (chatId) => {
        const { data: history } = await supabase
          .from('chat_history')
          .select('*')
          .eq('id', chatId)
          .single();

        const { data: messages } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('chat_id', chatId)
          .order('created_at', { ascending: true });

        return {
          ...history,
          messages: messages || [],
        } as ChatHistory;
      });

      return Promise.all(promises);
    },
    enabled: chatIds.length > 0 && !!user,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 pt-24">
          <p>Loading comparison...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Model Comparison</h1>
          <p className="text-muted-foreground">
            Compare AI responses side-by-side
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {chats?.map((chat) => (
            <Card key={chat.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg">{chat.title}</CardTitle>
                <div className="flex items-center gap-2">
                  {chat.messages
                    .filter((m) => m.role === 'assistant' && m.model)
                    .map((m) => m.model)
                    .filter((v, i, a) => a.indexOf(v) === i)
                    .map((model) => (
                      <Badge key={model} variant="secondary">
                        {model}
                      </Badge>
                    ))}
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-4">
                    {chat.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`p-3 rounded-lg ${
                          message.role === 'user'
                            ? 'bg-primary/10'
                            : 'bg-secondary/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline">
                            {message.role === 'user' ? 'You' : message.model || 'AI'}
                          </Badge>
                          {message.role === 'assistant' && (
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className="h-3 w-3 text-muted-foreground cursor-pointer hover:text-yellow-500"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
