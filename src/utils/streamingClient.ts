import { supabase } from '@/integrations/supabase/client';

export interface StreamEvent {
  event: 'token' | 'done' | 'error';
  data: {
    model: string;
    token?: string;
    fullContent?: string;
    messageId?: string;
    error?: string;
  };
}

export class StreamingClient {
  private abortController: AbortController | null = null;

  async startStream(
    messages: any[],
    selectedModel: string,
    chatId: string | undefined,
    onToken: (model: string, token: string, fullContent: string) => void,
    onDone: (model: string, messageId: string) => void,
    onError: (model: string, error: string) => void
  ): Promise<void> {
    this.abortController = new AbortController();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-with-ai`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            messages,
            selectedModels: [selectedModel],
            chatId,
            stream: true,
          }),
          signal: this.abortController.signal,
        }
      );

      if (!response.ok) {
        throw new Error(`Stream failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No reader available');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n\n').filter(line => line.trim());

        for (const line of lines) {
          if (!line.startsWith('event: ')) continue;

          const eventMatch = line.match(/event: (\w+)\ndata: (.+)/);
          if (!eventMatch) continue;

          const [, event, dataStr] = eventMatch;
          const data = JSON.parse(dataStr);

          if (event === 'token' && data.token) {
            onToken(data.model, data.token, data.fullContent);
          } else if (event === 'done') {
            onDone(data.model, data.messageId);
          } else if (event === 'error') {
            onError(data.model, data.error);
          }
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        throw error;
      }
    }
  }

  abort() {
    this.abortController?.abort();
  }
}
