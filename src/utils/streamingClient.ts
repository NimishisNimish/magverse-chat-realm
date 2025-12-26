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

// Model mapping for Lovable AI Gateway
const getLovableModelName = (modelId: string): string => {
  const mapping: Record<string, string> = {
    'lovable-gemini-flash': 'google/gemini-2.5-flash',
    'lovable-gemini-pro': 'google/gemini-2.5-pro',
    'lovable-gpt5': 'openai/gpt-5',
    'lovable-gpt5-mini': 'openai/gpt-5-mini',
    'lovable-gemini-flash-image': 'google/gemini-2.5-flash-image-preview',
    'lovable-gpt5-image': 'google/gemini-2.5-flash-image-preview',
  };
  return mapping[modelId] || 'google/gemini-2.5-flash';
};

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
    const MAX_TIMEOUT = 300000; // 5 minutes
    this.abortController = new AbortController();
    
    const timeoutId = setTimeout(() => {
      console.warn(`⏰ [StreamingClient] Request timeout after ${MAX_TIMEOUT}ms`);
      this.abortController?.abort();
      onError(selectedModel, '⏱️ Response timed out. Try again or use a different model.');
    }, MAX_TIMEOUT);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        clearTimeout(timeoutId);
        throw new Error('Not authenticated');
      }

      const url = `https://pqdgpxetysqcdcjwormb.supabase.co/functions/v1/lovable-ai-chat`;
      console.log('🔌 Connecting to:', url);
      console.log('📤 Streaming request for model:', selectedModel);

      const requestBody = {
        messages,
        model: getLovableModelName(selectedModel),
        stream: true,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestBody),
        signal: this.abortController.signal,
      });

      console.log('📥 Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Stream failed:', response.status, errorText);
        
        if (response.status === 429) {
          throw new Error('⚠️ Rate limit exceeded. Please wait a moment and try again.');
        } else if (response.status === 402) {
          throw new Error('💳 Payment required. Please add credits to continue.');
        } else if (response.status === 503) {
          throw new Error('⏳ Service temporarily unavailable. Please try again.');
        } else if (response.status === 500) {
          throw new Error('⚠️ Server error. Please try a different model.');
        } else if (response.status === 401 || response.status === 403) {
          throw new Error('🔒 Authentication error. Please refresh the page.');
        }
        
        throw new Error(`❌ Stream failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No reader available');

      let buffer = '';
      let fullContent = '';

      const processLine = (line: string) => {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith(':')) return;
        if (!trimmedLine.startsWith('data:')) return;

        const dataStr = trimmedLine.substring(5).trim();
        if (!dataStr || dataStr === '[DONE]') return;

        try {
          const data = JSON.parse(dataStr);
          const content = data.choices?.[0]?.delta?.content;
          if (content) {
            fullContent += content;
            onToken(selectedModel, content, fullContent);
          }
        } catch {
          // JSON may be split across chunks; re-buffer and wait for more data
          buffer = `${line}\n${buffer}`;
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          processLine(line);

          // If processLine re-buffered due to partial JSON, break to await more bytes
          if (buffer.startsWith('data:') && buffer.includes('{') && !buffer.includes('\n')) break;
        }
      }

      // Final flush
      if (buffer.trim()) {
        for (const raw of buffer.split('\n')) {
          if (!raw) continue;
          processLine(raw);
        }
      }
      
      clearTimeout(timeoutId);
      
      // Signal completion
      onDone(selectedModel, '');
      
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      // Track API error for quota notifications
      if (typeof window !== 'undefined' && (window as any).__trackApiError) {
        const status = error.message.includes('429') ? 429 :
                     error.message.includes('402') ? 402 :
                     error.message.includes('503') ? 503 :
                     error.message.includes('401') || error.message.includes('403') ? 401 : 500;
        (window as any).__trackApiError(status, selectedModel, error.message);
      }
      
      if (error.name === 'AbortError') {
        onError(selectedModel, '⏹️ Request cancelled or timed out.');
      } else {
        const errorMessage = error.message || 'Unknown error occurred';
        console.error('❌ Streaming error:', errorMessage);
        onError(selectedModel, errorMessage);
      }
    }
  }

  abort() {
    this.abortController?.abort();
  }
}