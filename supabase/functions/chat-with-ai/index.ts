import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// API Keys
const SUDO_API_KEY = Deno.env.get('SUDO_API_KEY');
const NVIDIA_NIM_API_KEY = Deno.env.get('NVIDIA_NIM_API_KEY');
const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');
const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const UNCENSORED_CHAT_API_KEY = Deno.env.get('UNCENSORED_CHAT_API_KEY');

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

const MAX_FILE_SIZE = 10_000_000;
const MAX_MESSAGE_LENGTH = 10000;
const MAX_MODELS_PER_REQUEST = 5;
const MAX_CONTEXT_MESSAGES = 10; // Limit context for faster responses
const STREAM_TIMEOUT_MS = 120000; // 2 minute timeout for streams
const FIRST_TOKEN_TIMEOUT_MS = 30000; // 30 seconds to first token

const VALID_MODELS = ['chatgpt', 'claude', 'perplexity', 'perplexity-pro', 'perplexity-reasoning', 'grok', 'gemini-flash-image', 'uncensored-chat'] as const;

// Model routing: fast models for simple queries, heavy for complex
const FAST_MODELS = ['chatgpt', 'grok'];
const HEAVY_MODELS = ['claude', 'perplexity-pro', 'perplexity-reasoning'];

const MODEL_CONFIG: Record<string, { 
  provider: 'openai' | 'nvidia' | 'google' | 'openrouter' | 'perplexity' | 'groq' | 'lovable' | 'uncensored', 
  model: string,
  supportsReasoning: boolean,
  maxTokens?: number,
  supportsStreaming?: boolean,
}> = {
  'chatgpt': { provider: 'lovable', model: 'google/gemini-2.5-flash', supportsReasoning: true, maxTokens: 4096, supportsStreaming: true },
  'claude': { provider: 'lovable', model: 'google/gemini-2.5-pro', supportsReasoning: true, supportsStreaming: true },
  'grok': { provider: 'lovable', model: 'google/gemini-2.5-flash', supportsReasoning: true, supportsStreaming: true },
  'perplexity': { provider: 'perplexity', model: 'sonar', supportsReasoning: true, supportsStreaming: true },
  'perplexity-pro': { provider: 'perplexity', model: 'sonar-pro', supportsReasoning: true, supportsStreaming: true },
  'perplexity-reasoning': { provider: 'perplexity', model: 'sonar-deep-research', supportsReasoning: true, supportsStreaming: false },
  'gemini-flash-image': { provider: 'lovable', model: 'google/gemini-2.5-flash-image-preview', supportsReasoning: false, supportsStreaming: false },
  'uncensored-chat': { provider: 'uncensored', model: 'uncensored-v2', supportsReasoning: true, maxTokens: 4096, supportsStreaming: true },
};

// Validation schema
const chatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.union([z.string().max(MAX_MESSAGE_LENGTH), z.array(z.any())])
  })).min(1).max(100).nullish(),
  selectedModels: z.array(z.enum(VALID_MODELS)).min(1).max(MAX_MODELS_PER_REQUEST).nullish(),
  model: z.enum(VALID_MODELS).nullish(),
  message: z.string().max(MAX_MESSAGE_LENGTH).nullish(),
  chatHistory: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string()
  })).nullish(),
  chatId: z.string().uuid().nullish(),
  attachmentUrl: z.string().url().nullish(),
  attachmentExtension: z.string().nullish(),
  stream: z.boolean().nullish(),
  generateImage: z.boolean().nullish(),
  enableMultiStepReasoning: z.boolean().nullish(),
});

// Classify query complexity for model routing
function classifyQueryComplexity(message: string): 'simple' | 'medium' | 'complex' {
  const wordCount = message.split(/\s+/).length;
  const hasCodeRequest = /code|function|implement|algorithm|debug|error/i.test(message);
  const hasAnalysis = /analyze|compare|explain in detail|research|comprehensive/i.test(message);
  
  if (wordCount < 20 && !hasCodeRequest && !hasAnalysis) return 'simple';
  if (hasAnalysis || (hasCodeRequest && wordCount > 50)) return 'complex';
  return 'medium';
}

// Optimize context: only send last N messages
function optimizeMessages(messages: Array<{role: string, content: any}>, maxMessages: number): Array<{role: string, content: any}> {
  if (messages.length <= maxMessages) return messages;
  
  // Keep system messages + last N user/assistant messages
  const systemMessages = messages.filter(m => m.role === 'system');
  const otherMessages = messages.filter(m => m.role !== 'system');
  const recentMessages = otherMessages.slice(-maxMessages);
  
  return [...systemMessages, ...recentMessages];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestStartTime = Date.now();
  const metrics = { requestStart: requestStartTime, ttft: 0, streamEnd: 0 };
  
  console.log('🚀 chat-with-ai started at', new Date().toISOString());

  try {
    const requestBody = await req.json();
    const validationResult = chatRequestSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      console.error('❌ Validation error:', validationResult.error.errors);
      return new Response(
        JSON.stringify({ error: 'Invalid request format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rawData = validationResult.data;
    
    // Convert format
    let messages: Array<{role: string, content: any}>;
    let selectedModels: string[];
    
    if (rawData.messages && rawData.selectedModels) {
      messages = rawData.messages;
      selectedModels = rawData.selectedModels;
    } else if (rawData.model) {
      selectedModels = [rawData.model];
      if (rawData.chatHistory && rawData.chatHistory.length > 0) {
        messages = rawData.chatHistory;
        if (rawData.message) messages.push({ role: 'user', content: rawData.message });
      } else if (rawData.message) {
        messages = [{ role: 'user', content: rawData.message }];
      } else {
        return new Response(
          JSON.stringify({ error: 'No message provided' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid request format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { chatId, attachmentUrl, attachmentExtension } = rawData;
    const isImageGeneration = rawData.generateImage === true;
    const streamResponse = rawData.stream === true;

    // Auth check FIRST (before any heavy operations)
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userSupabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Credit check BEFORE AI call
    const creditCost = 1;
    const { data: creditResult, error: creditError } = await supabase
      .rpc('check_and_deduct_credits', { p_user_id: user.id, p_credits_to_deduct: creditCost });

    if (creditError || !creditResult?.success) {
      const errorMsg = creditResult?.subscription_type === 'monthly'
        ? 'Daily limit reached! Upgrade to Lifetime Pro for unlimited messages.'
        : `Insufficient credits.`;
      
      return new Response(
        JSON.stringify({ error: errorMsg, creditsRequired: creditCost, upgradeUrl: '/payment' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Credits deducted in ${Date.now() - requestStartTime}ms`);

    // Optimize messages - limit context for speed
    let processedMessages = optimizeMessages([...messages], MAX_CONTEXT_MESSAGES);

    // Process attachments if present
    if (attachmentUrl) {
      const fileExtension = attachmentExtension || attachmentUrl.split('?')[0].split('.').pop()?.toLowerCase();
      
      if (fileExtension === 'pdf') {
        try {
          const { data: extractResult } = await userSupabase.functions.invoke('extract-pdf-text', {
            body: { url: attachmentUrl }
          });
          
          if (extractResult?.text) {
            const lastMessage = processedMessages[processedMessages.length - 1];
            processedMessages[processedMessages.length - 1] = {
              ...lastMessage,
              content: `${lastMessage.content}\n\n--- PDF Document ---\n${extractResult.text.substring(0, 10000)}\n--- End PDF ---`
            };
          }
        } catch (error) {
          console.error('PDF extraction failed:', error);
        }
      }
    }

    // Add concise system prompt
    processedMessages.unshift({
      role: 'system',
      content: 'Be direct and concise. Answer immediately without preamble.'
    });

    // Create/get chat
    let currentChatId = chatId;
    if (!currentChatId) {
      const firstContent = messages[0]?.content;
      const title = typeof firstContent === 'string' ? firstContent.substring(0, 50) : 'New Chat';
      
      const { data: newChat } = await supabase
        .from('chat_history')
        .insert({ user_id: user.id, title })
        .select()
        .single();
      currentChatId = newChat?.id;
    }

    // Save user message
    const lastMessage = messages[messages.length - 1];
    await supabase.from('chat_messages').insert({
      chat_id: currentChatId,
      user_id: user.id,
      role: 'user',
      content: typeof lastMessage.content === 'string' ? lastMessage.content : JSON.stringify(lastMessage.content),
      attachment_url: attachmentUrl || null,
    });

    // Image generation handling
    if (isImageGeneration) {
      console.log('🎨 Processing image generation...');
      
      try {
        const userPrompt = processedMessages[processedMessages.length - 1]?.content || 'Generate an image';
        
        const response = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUDO_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-image-1',
            prompt: typeof userPrompt === 'string' ? userPrompt : JSON.stringify(userPrompt),
            n: 1,
            size: '1024x1024',
            response_format: 'b64_json',
          }),
        });

        if (!response.ok) {
          return new Response(
            JSON.stringify({ error: 'Image generation unavailable' }),
            { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const data = await response.json();
        const imageBase64 = data.data?.[0]?.b64_json;
        
        if (!imageBase64) {
          return new Response(
            JSON.stringify({ error: 'No image generated' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        await supabase.from('chat_messages').insert({
          chat_id: currentChatId,
          user_id: user.id,
          role: 'assistant',
          content: 'Here is your generated image:',
          model: 'gpt-image-1',
          attachment_url: `data:image/png;base64,${imageBase64}`,
        });
        
        return new Response(
          JSON.stringify({ success: true, image: `data:image/png;base64,${imageBase64}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error: any) {
        return new Response(
          JSON.stringify({ error: 'Image generation failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log(`📤 Processing ${selectedModels.length} model(s) ${streamResponse ? 'streaming' : 'direct'}...`);

    // STREAMING MODE
    if (streamResponse && selectedModels.length === 1) {
      const modelId = selectedModels[0];
      const config = MODEL_CONFIG[modelId];
      
      if (!config?.supportsStreaming) {
        console.log(`⚠️ Model ${modelId} doesn't support streaming`);
      } else {
        console.log(`📡 Starting SSE for ${modelId}...`);
        
        const stream = new ReadableStream({
          async start(controller) {
            const encoder = new TextEncoder();
            let firstTokenSent = false;
            
            const sendEvent = (event: string, data: any) => {
              if (event === 'token' && !firstTokenSent) {
                metrics.ttft = Date.now() - requestStartTime;
                console.log(`⚡ TTFT: ${metrics.ttft}ms`);
                firstTokenSent = true;
                clearTimeout(firstTokenTimeoutId); // Clear first token timeout on success
              }
              controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
            };

            // First token timeout - abort if no tokens received
            const firstTokenTimeoutId = setTimeout(() => {
              if (!firstTokenSent) {
                console.error('⏰ First token timeout - no response from model');
                sendEvent('error', { model: modelId, error: 'Model not responding. Try a different model.' });
                controller.close();
              }
            }, FIRST_TOKEN_TIMEOUT_MS);

            // Overall timeout handler
            const timeoutId = setTimeout(() => {
              console.error('⏰ Stream timeout');
              sendEvent('error', { model: modelId, error: 'Request timeout - please try again' });
              controller.close();
            }, STREAM_TIMEOUT_MS);

            try {
              let streamResponse;
              
              // Validate API key
              if (config.provider === 'lovable' && !LOVABLE_API_KEY) {
                throw new Error('Lovable API key not configured');
              } else if (config.provider === 'perplexity' && !PERPLEXITY_API_KEY) {
                throw new Error('Perplexity API key not configured');
              } else if (config.provider === 'uncensored' && !UNCENSORED_CHAT_API_KEY) {
                throw new Error('Uncensored API key not configured');
              }

              // Make streaming request based on provider
              if (config.provider === 'lovable') {
                streamResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    model: config.model,
                    messages: processedMessages,
                    stream: true,
                  }),
                });
              } else if (config.provider === 'perplexity') {
                streamResponse = await fetch('https://api.perplexity.ai/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    model: config.model,
                    messages: processedMessages,
                    temperature: 0.2,
                    max_tokens: 4096,
                    stream: true,
                  }),
                });
              } else if (config.provider === 'uncensored') {
                streamResponse = await fetch('https://uncensored.chat/api/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${UNCENSORED_CHAT_API_KEY}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    model: config.model,
                    messages: processedMessages,
                    max_tokens: config.maxTokens || 4096,
                    stream: true,
                  }),
                });
              }

              if (!streamResponse || !streamResponse.ok) {
                const errorText = await streamResponse?.text();
                const statusCode = streamResponse?.status || 0;
                console.error(`❌ Stream failed: Status ${statusCode}, Body: ${errorText}`);
                
                // Provide specific error messages based on status and provider
                let errorMessage = 'AI service temporarily unavailable';
                if (statusCode === 429) {
                  errorMessage = 'Rate limit exceeded. Please wait a moment.';
                } else if (statusCode === 402) {
                  errorMessage = 'Credits exhausted.';
                } else if (statusCode === 401 || statusCode === 403) {
                  errorMessage = 'Authentication failed - check API configuration';
                } else if (statusCode === 500) {
                  // For uncensored provider, include more detail
                  if (config.provider === 'uncensored') {
                    errorMessage = `Uncensored AI provider error: ${errorText?.substring(0, 100) || 'Unknown error'}`;
                  } else {
                    errorMessage = 'AI provider internal error. Try a different model.';
                  }
                } else if (statusCode === 502 || statusCode === 503 || statusCode === 504) {
                  errorMessage = 'AI service temporarily unavailable. Try again in a moment.';
                }
                
                throw new Error(errorMessage);
              }
              const streamContentType = streamResponse.headers.get('content-type') || '';
              if (
                config.provider === 'uncensored' &&
                streamContentType &&
                !streamContentType.includes('text/event-stream') &&
                !streamContentType.includes('application/json')
              ) {
                const raw = await streamResponse.text();
                console.error(
                  `❌ Uncensored stream returned unexpected content-type: ${streamContentType}. Body: ${raw.substring(0, 500)}`
                );
                throw new Error('Uncensored AI returned an unexpected response while streaming.');
              }

              const reader = streamResponse.body?.getReader();
              if (!reader) throw new Error('No reader available');
              
              const decoder = new TextDecoder();
              let fullContent = '';
              let buffer = '';

              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep incomplete line in buffer

                for (const line of lines) {
                  if (!line.trim() || line.startsWith(':')) continue;
                  
                  if (line.startsWith('data: ')) {
                    const data = line.slice(6).trim();
                    if (data === '[DONE]') continue;

                    try {
                      const parsed = JSON.parse(data);
                      const token = parsed.choices?.[0]?.delta?.content || '';

                      if (token) {
                        fullContent += token;
                        sendEvent('token', { model: modelId, token, fullContent });
                      }
                    } catch (e) {
                      // Ignore parse errors for partial chunks
                    }
                  }
                }
              }

              clearTimeout(timeoutId);
              clearTimeout(firstTokenTimeoutId);
              metrics.streamEnd = Date.now() - requestStartTime;
              console.log(`✅ Stream complete. TTFT: ${metrics.ttft}ms, Total: ${metrics.streamEnd}ms`);

              // Save to database
              const { data: newMessage } = await supabase.from('chat_messages').insert({
                chat_id: currentChatId,
                user_id: user.id,
                role: 'assistant',
                content: fullContent,
                model: modelId,
              }).select().single();

              // Log metrics
              await supabase.from('ai_model_metrics').insert({
                user_id: user.id,
                model_name: modelId,
                response_time_ms: metrics.streamEnd,
                message_id: newMessage?.id,
              });

              sendEvent('done', { model: modelId, messageId: newMessage?.id, metrics });
              controller.close();

            } catch (error: any) {
              clearTimeout(timeoutId);
              clearTimeout(firstTokenTimeoutId);
              console.error('SSE error:', error.message);
              sendEvent('error', { model: modelId, error: error.message });
              controller.close();
            }
          }
        });

        return new Response(stream, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      }
    }

    // NON-STREAMING MODE
    const modelPromises = selectedModels.map(async (modelId) => {
      const config = MODEL_CONFIG[modelId];
      if (!config) {
        return { success: false, model: modelId, response: 'Model not supported', error: true };
      }

      const modelStartTime = Date.now();

      try {
        let response;
        let content = '';

        if (config.provider === 'lovable') {
          if (!LOVABLE_API_KEY) throw new Error('API key not configured');
          
          response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: config.model,
              messages: processedMessages,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(response.status === 429 ? 'Rate limit exceeded' : `API error: ${errorText.substring(0, 100)}`);
          }

          const data = await response.json();
          content = data.choices?.[0]?.message?.content || 'No response';
          
        } else if (config.provider === 'perplexity') {
          if (!PERPLEXITY_API_KEY) throw new Error('Perplexity API key not configured');
          
          response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: config.model,
              messages: processedMessages,
              temperature: 0.2,
              max_tokens: 4096,
            }),
          });

          if (!response.ok) {
            throw new Error(`Perplexity error: ${response.status}`);
          }

          const data = await response.json();
          content = data.choices?.[0]?.message?.content || 'No response';
          
        } else if (config.provider === 'uncensored') {
          if (!UNCENSORED_CHAT_API_KEY) throw new Error('Uncensored API key not configured');
          
          response = await fetch('https://uncensored.chat/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${UNCENSORED_CHAT_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: config.model,
              messages: processedMessages,
              max_tokens: config.maxTokens || 4096,
            }),
          });

          const contentType = response.headers.get('content-type') || '';
          const rawBody = await response.text();

          if (!response.ok) {
            console.error(`❌ Uncensored API error: Status ${response.status}, Content-Type: ${contentType}, Body: ${rawBody}`);

            let errorMessage = 'Uncensored AI service error';
            if (response.status === 401 || response.status === 403) {
              errorMessage = 'Uncensored AI: Authentication failed - check API key';
            } else if (response.status === 429) {
              errorMessage = 'Uncensored AI: Rate limit exceeded - try again later';
            } else if (response.status === 500) {
              errorMessage = `Uncensored AI: Provider error (500) - ${rawBody.substring(0, 120)}`;
            } else if (response.status === 502 || response.status === 503 || response.status === 504) {
              errorMessage = 'Uncensored AI: Service temporarily unavailable';
            } else {
              errorMessage = `Uncensored AI error: ${response.status} - ${rawBody.substring(0, 120)}`;
            }
            throw new Error(errorMessage);
          }

          // Some proxies/WAFs return HTML with a 200, so guard JSON parsing.
          if (!contentType.includes('application/json')) {
            console.error(`❌ Uncensored API returned non-JSON: Status ${response.status}, Content-Type: ${contentType}, Body: ${rawBody.substring(0, 500)}`);
            throw new Error('Uncensored AI returned an unexpected response (non-JSON). Please check provider availability/API key.');
          }

          let data: any;
          try {
            data = JSON.parse(rawBody);
          } catch (e) {
            console.error(`❌ Uncensored API JSON parse failed: ${String(e)}; Body: ${rawBody.substring(0, 500)}`);
            throw new Error('Uncensored AI returned malformed JSON.');
          }

          content = data.choices?.[0]?.message?.content || 'No response';
        }

        const responseTime = Date.now() - modelStartTime;
        console.log(`✅ ${modelId} responded in ${responseTime}ms`);

        // Save message
        const { data: newMessage } = await supabase.from('chat_messages').insert({
          chat_id: currentChatId,
          user_id: user.id,
          role: 'assistant',
          content,
          model: modelId,
        }).select().single();

        // Log metrics
        await supabase.from('ai_model_metrics').insert({
          user_id: user.id,
          model_name: modelId,
          response_time_ms: responseTime,
          message_id: newMessage?.id,
        });

        return {
          success: true,
          model: modelId,
          response: content,
          messageId: newMessage?.id,
          responseTime,
        };

      } catch (error: any) {
        console.error(`❌ ${modelId} error:`, error.message);
        return {
          success: false,
          model: modelId,
          response: error.message || 'Request failed',
          error: true,
        };
      }
    });

    const results = await Promise.allSettled(modelPromises);
    const responses = results.map((result, idx) => {
      if (result.status === 'fulfilled') return result.value;
      return { success: false, model: selectedModels[idx], response: 'Request failed', error: true };
    });

    const totalTime = Date.now() - requestStartTime;
    console.log(`🏁 Request complete in ${totalTime}ms`);

    return new Response(
      JSON.stringify({ success: true, responses, chatId: currentChatId, totalTime }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
