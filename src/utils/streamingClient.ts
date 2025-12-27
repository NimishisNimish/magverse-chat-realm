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

// Endpoint routing by model type
const getEndpoint = (modelId: string): { endpoint: string; timeout: number } => {
  // Fast models -> fast-chat endpoint (5s first token deadline)
  if (modelId.includes('flash') || modelId.includes('mini') || modelId.includes('nano')) {
    return { endpoint: 'ai-fast-chat', timeout: 30000 };
  }
  // Reasoning/Pro models -> reasoning endpoint (30s first token deadline)
  if (modelId.includes('pro') || modelId.includes('reasoning') || modelId.includes('gpt5')) {
    return { endpoint: 'ai-reasoning', timeout: 120000 };
  }
  // Default to fast-chat
  return { endpoint: 'ai-fast-chat', timeout: 30000 };
};

// Model mapping for Lovable AI Gateway
const getLovableModelName = (modelId: string): string => {
  const mapping: Record<string, string> = {
    'lovable-gemini-flash': 'gemini-flash',
    'lovable-gemini-pro': 'gemini-pro',
    'lovable-gpt5': 'gpt5',
    'lovable-gpt5-mini': 'gpt5-mini',
    'lovable-gemini-flash-image': 'gemini-flash',
    'lovable-gpt5-image': 'gemini-flash',
  };
  return mapping[modelId] || 'gemini-flash';
};

// Fallback models for when primary model times out
const FALLBACK_MODELS: Record<string, string> = {
  'lovable-gemini-pro': 'lovable-gemini-flash',
  'lovable-gpt5': 'lovable-gpt5-mini',
  'lovable-gpt5-mini': 'lovable-gemini-flash',
};

export interface StreamMetrics {
  requestStart: number;
  ttft: number | null;
  totalTime: number | null;
}

export class StreamingClient {
  private abortController: AbortController | null = null;
  private firstTokenReceived = false;
  private metrics: StreamMetrics = { requestStart: 0, ttft: null, totalTime: null };

  getMetrics(): StreamMetrics {
    return { ...this.metrics };
  }

  async startStream(
    messages: any[],
    selectedModel: string,
    chatId: string | undefined,
    onToken: (model: string, token: string, fullContent: string, ttft: number | null) => void,
    onDone: (model: string, messageId: string, metrics: StreamMetrics) => void,
    onError: (model: string, error: string) => void,
    retryWithFallback = true
  ): Promise<void> {
    const { endpoint, timeout } = getEndpoint(selectedModel);
    const FIRST_TOKEN_TIMEOUT = Math.min(timeout, 30000); // Max 30s for first token
    
    this.abortController = new AbortController();
    this.firstTokenReceived = false;
    this.metrics = { requestStart: Date.now(), ttft: null, totalTime: null };
    
    console.log(`🚀 [StreamingClient] Starting stream via ${endpoint} for ${selectedModel}`);
    
    // First token timeout - critical for detecting stuck requests
    const firstTokenTimeoutId = setTimeout(() => {
      if (!this.firstTokenReceived) {
        console.warn(`⏰ [StreamingClient] No first token after ${FIRST_TOKEN_TIMEOUT}ms for ${selectedModel}`);
        this.abortController?.abort();
        
        // Try fallback model if available
        const fallbackModel = FALLBACK_MODELS[selectedModel];
        if (fallbackModel && retryWithFallback) {
          console.log(`🔄 Retrying with fallback model: ${fallbackModel}`);
          this.startStream(messages, fallbackModel, chatId, onToken, onDone, onError, false);
          return;
        }
        
        onError(selectedModel, '⏱️ Model not responding. Try a faster model like Gemini Flash.');
      }
    }, FIRST_TOKEN_TIMEOUT);
    
    // Overall timeout
    const overallTimeoutId = setTimeout(() => {
      console.warn(`⏰ [StreamingClient] Request timeout after ${timeout}ms`);
      this.abortController?.abort();
      onError(selectedModel, '⏱️ Response timed out. Try again or use a different model.');
    }, timeout);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        clearTimeout(firstTokenTimeoutId);
        clearTimeout(overallTimeoutId);
        throw new Error('Not authenticated');
      }

      const url = `https://pqdgpxetysqcdcjwormb.supabase.co/functions/v1/${endpoint}`;
      console.log('🔌 Connecting to:', url);

      const requestBody = {
        messages,
        model: getLovableModelName(selectedModel),
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
        clearTimeout(firstTokenTimeoutId);
        clearTimeout(overallTimeoutId);
        
        const errorText = await response.text();
        console.error('❌ Stream failed:', response.status, errorText);
        
        // Try to parse error message
        let errorMessage = 'Request failed';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        if (response.status === 429) {
          throw new Error('⚠️ Rate limit exceeded. Please wait and try again.');
        } else if (response.status === 402) {
          throw new Error('💳 Credits exhausted. Please add credits to continue.');
        } else if (response.status === 504) {
          // Gateway timeout - try fallback
          const fallbackModel = FALLBACK_MODELS[selectedModel];
          if (fallbackModel && retryWithFallback) {
            console.log(`🔄 Timeout, retrying with fallback: ${fallbackModel}`);
            return this.startStream(messages, fallbackModel, chatId, onToken, onDone, onError, false);
          }
          throw new Error('⏱️ Request timed out. Try a faster model.');
        } else if (response.status === 500) {
          // Server error - try fallback
          const fallbackModel = FALLBACK_MODELS[selectedModel];
          if (fallbackModel && retryWithFallback) {
            console.log(`🔄 Server error, retrying with fallback: ${fallbackModel}`);
            return this.startStream(messages, fallbackModel, chatId, onToken, onDone, onError, false);
          }
          throw new Error('⚠️ Server error. Please try a different model.');
        }
        
        throw new Error(errorMessage);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        clearTimeout(firstTokenTimeoutId);
        clearTimeout(overallTimeoutId);
        throw new Error('No reader available');
      }

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
            // Mark first token received - clear the first token timeout
            if (!this.firstTokenReceived) {
              this.firstTokenReceived = true;
              this.metrics.ttft = Date.now() - this.metrics.requestStart;
              clearTimeout(firstTokenTimeoutId);
              console.log(`⚡ First token received for ${selectedModel} in ${this.metrics.ttft}ms`);
            }
            
            fullContent += content;
            onToken(selectedModel, content, fullContent, this.metrics.ttft);
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
      
      clearTimeout(firstTokenTimeoutId);
      clearTimeout(overallTimeoutId);
      
      this.metrics.totalTime = Date.now() - this.metrics.requestStart;
      
      // Check if we actually got content
      if (!fullContent.trim()) {
        console.warn('⚠️ Stream completed but no content received');
        
        // Try fallback on empty response
        const fallbackModel = FALLBACK_MODELS[selectedModel];
        if (fallbackModel && retryWithFallback) {
          console.log(`🔄 Empty response, retrying with fallback: ${fallbackModel}`);
          return this.startStream(messages, fallbackModel, chatId, onToken, onDone, onError, false);
        }
        
        onError(selectedModel, '⚠️ No response received. Please try again.');
        return;
      }
      
      console.log(`✅ Stream complete. TTFT: ${this.metrics.ttft}ms, Total: ${this.metrics.totalTime}ms`);
      
      // Signal completion with metrics
      onDone(selectedModel, '', this.metrics);
      
    } catch (error: any) {
      clearTimeout(firstTokenTimeoutId);
      clearTimeout(overallTimeoutId);
      
      if (error.name === 'AbortError') {
        // Only show error if it wasn't a fallback retry
        if (!retryWithFallback || !FALLBACK_MODELS[selectedModel]) {
          onError(selectedModel, '⏹️ Request cancelled or timed out.');
        }
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
