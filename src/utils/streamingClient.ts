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

      let textBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        // Process line-by-line
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          // Handle CRLF
          if (line.endsWith('\r')) line = line.slice(0, -1);
          
          // Skip comments and empty lines
          if (line.startsWith(':') || line.trim() === '') continue;
          
          // Parse SSE format
          if (!line.startsWith('event: ')) continue;

          const eventMatch = line.match(/event: (\w+)\ndata: (.+)/);
          if (!eventMatch) continue;

          const [, event, dataStr] = eventMatch;
          
          try {
            const data = JSON.parse(dataStr);

            if (event === 'token' && data.token) {
              onToken(data.model, data.token, data.fullContent);
            } else if (event === 'done') {
              onDone(data.model, data.messageId);
            } else if (event === 'error') {
              onError(data.model, data.error);
            }
          } catch (e) {
            console.error('SSE parse error:', e);
          }
        }
      }

      // Process any remaining buffer
      if (textBuffer.trim()) {
        const lines = textBuffer.split('\n');
        for (const line of lines) {
          if (!line.trim() || line.startsWith(':')) continue;
          if (!line.startsWith('event: ')) continue;

          const eventMatch = line.match(/event: (\w+)\ndata: (.+)/);
          if (!eventMatch) continue;

          const [, event, dataStr] = eventMatch;
          
          try {
            const data = JSON.parse(dataStr);
            if (event === 'token' && data.token) {
              onToken(data.model, data.token, data.fullContent);
            } else if (event === 'done') {
              onDone(data.model, data.messageId);
            } else if (event === 'error') {
              onError(data.model, data.error);
            }
          } catch (e) {
            console.error('SSE parse error:', e);
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
