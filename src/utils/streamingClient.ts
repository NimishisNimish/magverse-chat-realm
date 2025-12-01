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
    const MAX_TIMEOUT = 300000; // 300 seconds (5 minutes) - prioritize getting responses over speed
    this.abortController = new AbortController();
    
    // Set timeout
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

      // Determine which function to call based on model
      const isLovableModel = selectedModel.startsWith('lovable-');
      const functionName = isLovableModel ? 'lovable-ai-chat' : 'chat-with-ai';
      
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`;
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

      // Prepare request body based on function
      const requestBody = isLovableModel ? {
        messages,
        model: getLovableModelName(selectedModel),
        stream: true,
      } : {
        messages,
        selectedModels: [selectedModel],
        chatId,
        stream: true,
      };

      const response = await fetch(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(requestBody),
          signal: this.abortController.signal,
        }
      );

      console.log('📥 Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Stream failed:', response.status, errorText);
        
        // Better error messages for common failures
        if (response.status === 429) {
          throw new Error('⚠️ Rate limit exceeded. Too many requests - please wait a moment and try again.');
        } else if (response.status === 402) {
          throw new Error('💳 Payment required. Please add credits to your Lovable AI workspace to continue.');
        } else if (response.status === 503) {
          throw new Error('⏳ Service temporarily unavailable. AI models are overloaded - please try again in a few moments.');
        } else if (response.status === 500) {
          throw new Error('⚠️ Server error. The AI model encountered an error - please try a different model or retry.');
        } else if (response.status === 401 || response.status === 403) {
          throw new Error('🔒 Authentication error. Please refresh the page and try again.');
        }
        
        throw new Error(`❌ Stream failed: ${response.status} - ${errorText}`);
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
        
        // Track API error for quota notifications
        if (typeof window !== 'undefined' && (window as any).__trackApiError) {
          const status = error.message.includes('429') ? 429 :
                       error.message.includes('402') ? 402 :
                       error.message.includes('503') ? 503 :
                       error.message.includes('401') || error.message.includes('403') ? 401 : 500;
          (window as any).__trackApiError(status, selectedModel, error.message);
        }
        
        if (error.name === 'AbortError') {
          onError(selectedModel, '⏹️ Request cancelled or timed out. Please try again with a different model.');
        } else {
          // Don't throw, just pass the error to onError to show it in the UI
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
