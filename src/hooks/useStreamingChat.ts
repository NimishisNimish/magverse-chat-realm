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
}

const STREAM_TIMEOUT_MS = 120000; // 2 minutes
const FIRST_TOKEN_TIMEOUT_MS = 30000; // 30 seconds to first token

export const useStreamingChat = () => {
  const [streamingState, setStreamingState] = useState<StreamingState>({
    isStreaming: false,
    streamingMessageId: null,
    ttft: null,
    startTime: null,
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
    });
  }, []);

  const startStream = useCallback(async (
    messages: Array<{ role: string; content: string }>,
    model: string,
    chatId: string | null,
    onToken: (content: string, fullContent: string, ttft: number | null) => void,
    onComplete: (messageId: string, responseTime: number, ttft: number) => void,
    onError: (error: string) => void,
  ) => {
    abort(); // Cancel any existing stream

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    const startTime = Date.now();
    let firstTokenTime: number | null = null;
    let fullContent = '';
    
    setStreamingState({
      isStreaming: true,
      streamingMessageId: `streaming-${startTime}`,
      ttft: null,
      startTime,
    });

    // First token timeout
    const firstTokenTimeoutId = setTimeout(() => {
      if (!firstTokenTime) {
        abortController.abort();
        onError('⏱️ No response received. The model may be overloaded. Try again or use a different model.');
      }
    }, FIRST_TOKEN_TIMEOUT_MS);

    // Overall timeout
    const overallTimeoutId = setTimeout(() => {
      abortController.abort();
      onError('⏱️ Request timed out. Please try again.');
    }, STREAM_TIMEOUT_MS);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

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

      clearTimeout(firstTokenTimeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 429) {
          throw new Error('⚠️ Rate limit exceeded. Please wait and try again.');
        } else if (response.status === 402) {
          throw new Error('💳 Credits exhausted. Please add credits to continue.');
        } else if (response.status === 503) {
          throw new Error('⏳ Service temporarily unavailable. Please try again.');
        }
        throw new Error(`Request failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

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
                setStreamingState(prev => ({ ...prev, ttft }));
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
      
      const responseTime = Date.now() - startTime;
      const ttft = firstTokenTime ? firstTokenTime - startTime : responseTime;
      
      onComplete('', responseTime, ttft);
      
      setStreamingState({
        isStreaming: false,
        streamingMessageId: null,
        ttft: null,
        startTime: null,
      });

    } catch (error: any) {
      clearTimeout(firstTokenTimeoutId);
      clearTimeout(overallTimeoutId);

      if (error.name === 'AbortError') {
        onError('⏹️ Request cancelled or timed out.');
      } else {
        onError(error.message || 'Unknown error occurred');
      }

      setStreamingState({
        isStreaming: false,
        streamingMessageId: null,
        ttft: null,
        startTime: null,
      });
    }
  }, [abort]);

  return {
    streamingState,
    startStream,
    abort,
  };
};
