import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

// Model-specific timeout configurations (matching backend) - INCREASED for reliability
const MODEL_TIMEOUTS: Record<string, { firstToken: number; total: number }> = {
  'chatgpt': { firstToken: 60000, total: 180000 }, // 60s first token, 3 min total
  'claude': { firstToken: 90000, total: 240000 }, // 90s first token, 4 min total
  'perplexity': { firstToken: 45000, total: 120000 },
  'perplexity-pro': { firstToken: 120000, total: 300000 }, // 2 min first, 5 min total
  'perplexity-reasoning': { firstToken: 180000, total: 480000 }, // 3 min first, 8 min total
  'grok': { firstToken: 60000, total: 180000 },
  'uncensored-chat': { firstToken: 60000, total: 180000 },
  'mistral': { firstToken: 60000, total: 180000 },
  'lovable-gemini-flash': { firstToken: 45000, total: 120000 },
  'lovable-gemini-pro': { firstToken: 60000, total: 180000 },
  'lovable-gpt5': { firstToken: 60000, total: 180000 },
  'lovable-gpt5-mini': { firstToken: 45000, total: 120000 },
};

const DEFAULT_TIMEOUTS = { firstToken: 60000, total: 180000 }; // 60s first token, 3 min total

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
          toast.error('⚠️ Rate limit exceeded', {
            description: 'Please wait a moment and try again.',
            duration: 6000,
          });
          throw { message: '⚠️ Rate limit exceeded. Please wait and try again.', type: 'rate_limit' };
        } else if (response.status === 402) {
          toast.error('💳 Credits exhausted', {
            description: 'Please add credits to continue using the AI.',
            action: {
              label: 'Add Credits',
              onClick: () => window.location.href = '/payment',
            },
            duration: 8000,
          });
          throw { message: '💳 Credits exhausted. Please add credits to continue.', type: 'credits' };
        } else if (response.status === 503) {
          toast.error('⏳ Service unavailable', {
            description: 'The AI service is temporarily unavailable. Please try again.',
            duration: 5000,
          });
          throw { message: '⏳ Service temporarily unavailable. Please try again.', type: 'unavailable' };
        } else if (response.status === 504) {
          toast.error('⏱️ Gateway timeout', {
            description: 'The server is taking too long. Try a faster model.',
            duration: 5000,
          });
          throw { message: '⏱️ Gateway timeout. Try a faster model.', type: 'timeout' };
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