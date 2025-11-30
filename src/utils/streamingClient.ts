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
    const MAX_TIMEOUT = 60000; // 60 seconds max for faster feedback
    this.abortController = new AbortController();
    
    // Set timeout
    const timeoutId = setTimeout(() => {
      console.warn(`⏰ [StreamingClient] Request timeout after ${MAX_TIMEOUT}ms`);
      this.abortController?.abort();
      onError(selectedModel, 'Request timeout - AI model took too long to respond. Try a different model.');
    }, MAX_TIMEOUT);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        clearTimeout(timeoutId);
        throw new Error('Not authenticated');
      }

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-with-ai`;
      console.log('🔌 Connecting to:', url);
      console.log('📤 Streaming request for model:', selectedModel);

      const response = await fetch(
        url,
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

      console.log('📥 Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Stream failed:', response.status, errorText);
        
        // Better error messages for common failures
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Too many requests - please wait a moment and try again.');
        } else if (response.status === 402) {
          throw new Error('Payment required. Please add credits to continue using AI models.');
        } else if (response.status === 503) {
          throw new Error('Service temporarily unavailable. AI models are overloaded - please try again.');
        } else if (response.status === 500) {
          throw new Error('Server error. The AI model encountered an error - please try a different model.');
        }
        
        throw new Error(`Stream failed: ${response.status} - ${errorText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No reader available');

      let buffer = '';
      let currentEvent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last incomplete line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          
          // Skip empty lines and comments
          if (!trimmedLine || trimmedLine.startsWith(':')) continue;

          // Parse SSE - event and data are on separate lines
          if (trimmedLine.startsWith('event:')) {
            currentEvent = trimmedLine.substring(6).trim();
          } else if (trimmedLine.startsWith('data:')) {
            const dataStr = trimmedLine.substring(5).trim();
            
            if (dataStr === '[DONE]') {
              continue;
            }

            try {
              const data = JSON.parse(dataStr);

              if (currentEvent === 'token' && data.token) {
                onToken(data.model, data.token, data.fullContent);
              } else if (currentEvent === 'done') {
                onDone(data.model, data.messageId);
              } else if (currentEvent === 'error') {
                onError(data.model, data.error);
              }
            } catch (e) {
              console.error('❌ SSE parse error:', e, 'Data:', dataStr);
            }

            currentEvent = '';
          }
        }
      }
      
      clearTimeout(timeoutId);
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        onError(selectedModel, 'Request cancelled or timed out. Please try again.');
      } else if (error.name !== 'AbortError') {
        throw error;
      }
    }
  }

  abort() {
    this.abortController?.abort();
  }
}
