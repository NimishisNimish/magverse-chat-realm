import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  timestamp: Date;
  isError?: boolean;
  ttft?: number;
  responseTime?: number;
}

interface StreamingState {
  isStreaming: boolean;
  streamingMessageId: string | null;
  ttft: number | null;
  startTime: number | null;
  currentStatus: string;
}

// Model-specific timeout configurations (matching backend)
const MODEL_TIMEOUTS: Record<string, { firstToken: number; total: number }> = {
  'chatgpt': { firstToken: 30000, total: 90000 },
  'claude': { firstToken: 45000, total: 120000 },
  'perplexity': { firstToken: 30000, total: 90000 },
  'perplexity-pro': { firstToken: 60000, total: 150000 },
  'perplexity-reasoning': { firstToken: 120000, total: 240000 },
  'grok': { firstToken: 30000, total: 90000 },
  'uncensored-chat': { firstToken: 30000, total: 90000 },
  'lovable-gemini-flash': { firstToken: 25000, total: 90000 },
  'lovable-gemini-pro': { firstToken: 40000, total: 120000 },
  'lovable-gpt5': { firstToken: 35000, total: 100000 },
  'lovable-gpt5-mini': { firstToken: 25000, total: 80000 },
};

const DEFAULT_TIMEOUTS = { firstToken: 30000, total: 120000 };

export const useStreamingChat = () => {
  const [streamingState, setStreamingState] = useState<StreamingState>({
    isStreaming: false,
    streamingMessageId: null,
    ttft: null,
    startTime: null,
    currentStatus: '',
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const tokenBufferRef = useRef<string>('');
  const lastUpdateRef = useRef<number>(0);
  const UPDATE_INTERVAL_MS = 50; // Batch UI updates every 50ms

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStreamingState({
      isStreaming: false,
      streamingMessageId: null,
      ttft: null,
      startTime: null,
      currentStatus: '',
    });
  }, []);

  const startStream = useCallback(async (
    messages: Array<{ role: string; content: string }>,
    model: string,
    chatId: string | null,
    onToken: (content: string, fullContent: string, ttft: number | null) => void,
    onComplete: (messageId: string, responseTime: number, ttft: number) => void,
    onError: (error: string, suggestFallback?: boolean, errorType?: string) => void,
  ) => {
    abort(); // Cancel any existing stream

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    const startTime = Date.now();
    let firstTokenTime: number | null = null;
    let fullContent = '';
    
    // Get model-specific timeouts
    const timeouts = MODEL_TIMEOUTS[model] || DEFAULT_TIMEOUTS;
    
    setStreamingState({
      isStreaming: true,
      streamingMessageId: `streaming-${startTime}`,
      ttft: null,
      startTime,
      currentStatus: 'Connecting...',
    });

    // First token timeout (model-specific)
    const firstTokenTimeoutId = setTimeout(() => {
      if (!firstTokenTime) {
        abortController.abort();
        onError(
          `⏱️ ${model} is not responding. Try a different model.`,
          true,
          'timeout'
        );
      }
    }, timeouts.firstToken);

    // Overall timeout (model-specific)
    const overallTimeoutId = setTimeout(() => {
      abortController.abort();
      onError(
        '⏱️ Request timed out. The model may be overloaded.',
        true,
        'timeout'
      );
    }, timeouts.total);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      setStreamingState(prev => ({ ...prev, currentStatus: 'Sending request...' }));

      const modelMapping: Record<string, string> = {
        'lovable-gemini-flash': 'google/gemini-2.5-flash',
        'lovable-gemini-pro': 'google/gemini-2.5-pro',
        'lovable-gpt5': 'openai/gpt-5',
        'lovable-gpt5-mini': 'openai/gpt-5-mini',
        'lovable-gemini-flash-image': 'google/gemini-2.5-flash-image-preview',
      };

      const response = await fetch(
        `https://pqdgpxetysqcdcjwormb.supabase.co/functions/v1/lovable-ai-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            messages,
            model: modelMapping[model] || 'google/gemini-2.5-flash',
            stream: true,
          }),
          signal: abortController.signal,
        }
      );

      if (!response.ok) {
        clearTimeout(firstTokenTimeoutId);
        const errorText = await response.text();
        
        if (response.status === 429) {
          throw { message: '⚠️ Rate limit exceeded. Please wait and try again.', type: 'rate_limit' };
        } else if (response.status === 402) {
          throw { message: '💳 Credits exhausted. Please add credits to continue.', type: 'credits' };
        } else if (response.status === 503) {
          throw { message: '⏳ Service temporarily unavailable. Please try again.', type: 'unavailable' };
        }
        throw { message: `Request failed: ${response.status}`, type: 'unknown' };
      }

      setStreamingState(prev => ({ ...prev, currentStatus: 'Receiving response...' }));

      const reader = response.body?.getReader();
      if (!reader) throw { message: 'No reader available', type: 'unknown' };

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE lines
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.trim() || line.startsWith(':')) continue;
          if (!line.startsWith('data:')) continue;

          const dataStr = line.slice(5).trim();
          if (!dataStr || dataStr === '[DONE]') continue;

          try {
            const data = JSON.parse(dataStr);
            const token = data.choices?.[0]?.delta?.content;

            if (token) {
              if (!firstTokenTime) {
                firstTokenTime = Date.now();
                const ttft = firstTokenTime - startTime;
                setStreamingState(prev => ({ 
                  ...prev, 
                  ttft,
                  currentStatus: 'Generating response...'
                }));
                clearTimeout(firstTokenTimeoutId);
                console.log(`⚡ TTFT: ${ttft}ms`);
              }

              fullContent += token;
              tokenBufferRef.current = fullContent;

              // Batch UI updates to reduce re-renders
              const now = Date.now();
              if (now - lastUpdateRef.current >= UPDATE_INTERVAL_MS) {
                lastUpdateRef.current = now;
                onToken(token, fullContent, firstTokenTime ? firstTokenTime - startTime : null);
              }
            }
          } catch {
            // JSON parse error - may be split across chunks
          }
        }
      }

      // Final flush
      if (tokenBufferRef.current !== fullContent) {
        onToken('', fullContent, firstTokenTime ? firstTokenTime - startTime : null);
      }

      clearTimeout(overallTimeoutId);
      clearTimeout(firstTokenTimeoutId);
      
      const responseTime = Date.now() - startTime;
      const ttft = firstTokenTime ? firstTokenTime - startTime : responseTime;
      
      onComplete('', responseTime, ttft);
      
      setStreamingState({
        isStreaming: false,
        streamingMessageId: null,
        ttft: null,
        startTime: null,
        currentStatus: '',
      });

    } catch (error: any) {
      clearTimeout(firstTokenTimeoutId);
      clearTimeout(overallTimeoutId);

      const errorMessage = error?.message || 'Unknown error occurred';
      const errorType = error?.type || 'unknown';
      const suggestFallback = errorType === 'timeout' || errorType === 'unavailable';

      if (error.name === 'AbortError') {
        onError('⏹️ Request cancelled or timed out.', true, 'timeout');
      } else {
        onError(errorMessage, suggestFallback, errorType);
      }

      setStreamingState({
        isStreaming: false,
        streamingMessageId: null,
        ttft: null,
        startTime: null,
        currentStatus: '',
      });
    }
  }, [abort]);

  return {
    streamingState,
    startStream,
    abort,
  };
};