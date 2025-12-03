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
    const MAX_TIMEOUT = 300000; // 300 seconds (5 minutes)
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

      // Only Lovable models support streaming
      const isLovableModel = selectedModel.startsWith('lovable-');
      
      if (!isLovableModel) {
        throw new Error('Streaming not supported for direct API models. Use non-streaming mode.');
      }
      
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lovable-ai-chat`;
      console.log('🔌 Connecting to:', url);
      console.log('📤 Streaming request for model:', selectedModel);

      // Map Lovable model IDs to actual API model names
      const getLovableModelName = (modelId: string): string => {
        const mapping: Record<string, string> = {
          'lovable-gemini-flash': 'google/gemini-2.5-flash',
          'lovable-gemini-pro': 'google/gemini-2.5-pro',
          'lovable-gpt5': 'openai/gpt-5',
          'lovable-gpt5-mini': 'openai/gpt-5-mini',
        };
        return mapping[modelId] || modelId;
      };

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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          
          // Skip empty lines and SSE comments
          if (!trimmedLine || trimmedLine.startsWith(':')) continue;

          if (trimmedLine.startsWith('data:')) {
            const dataStr = trimmedLine.substring(5).trim();
            
            if (dataStr === '[DONE]') {
              console.log('✅ Stream complete');
              continue;
            }

            try {
              const data = JSON.parse(dataStr);
              
              // Handle OpenAI-compatible SSE format from Lovable AI Gateway
              const content = data.choices?.[0]?.delta?.content;
              
              if (content) {
                fullContent += content;
                onToken(selectedModel, content, fullContent);
              }
            } catch (e) {
              // Incomplete JSON - put back in buffer
              if (dataStr && !dataStr.startsWith('{')) continue;
              console.warn('⚠️ SSE parse issue, continuing...');
            }
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        const lines = buffer.split('\n');
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const dataStr = line.substring(5).trim();
          if (dataStr === '[DONE]' || !dataStr) continue;
          
          try {
            const data = JSON.parse(dataStr);
            const content = data.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;
              onToken(selectedModel, content, fullContent);
            }
          } catch { /* ignore final parse errors */ }
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