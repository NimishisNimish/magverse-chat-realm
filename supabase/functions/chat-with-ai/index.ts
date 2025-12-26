import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// API Keys
const SUDO_API_KEY = Deno.env.get('SUDO_API_KEY'); // ChatGPT Sudo API
const NVIDIA_NIM_API_KEY = Deno.env.get('NVIDIA_NIM_API_KEY');
const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');
const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

const STORAGE_BUCKET_URL = 'https://pqdgpxetysqcdcjwormb.supabase.co/storage/';
const MAX_FILE_SIZE = 10_000_000; // 10MB
const MAX_MESSAGE_LENGTH = 10000;
const MAX_MODELS_PER_REQUEST = 5;

// Removed 'gemini' (Gemini Direct) as it's deprecated - use lovable-gemini-flash instead
// Added perplexity-pro and perplexity-reasoning for user-selectable Perplexity models
// Added uncensored-chat for uncensored.chat API
const VALID_MODELS = ['chatgpt', 'claude', 'perplexity', 'perplexity-pro', 'perplexity-reasoning', 'grok', 'gemini-flash-image', 'uncensored-chat'] as const;

const UNCENSORED_CHAT_API_KEY = Deno.env.get('UNCENSORED_CHAT_API_KEY');

const MODEL_CONFIG: Record<string, { 
  provider: 'openai' | 'nvidia' | 'google' | 'openrouter' | 'perplexity' | 'groq' | 'lovable' | 'uncensored', 
  model: string,
  supportsReasoning: boolean,
  maxTokens?: number,
  supportsStreaming?: boolean,
  perplexityModel?: string
}> = {
  // Map to Lovable AI Gateway for reliability
  'chatgpt': { provider: 'lovable', model: 'google/gemini-2.5-flash', supportsReasoning: true, maxTokens: 4096, supportsStreaming: true },
  'claude': { provider: 'lovable', model: 'google/gemini-2.5-pro', supportsReasoning: true, supportsStreaming: true },
  'grok': { provider: 'lovable', model: 'google/gemini-2.5-flash', supportsReasoning: true, supportsStreaming: true },
  // Perplexity - uses sonar by default, but supports user-selectable models
  'perplexity': { provider: 'perplexity', model: 'sonar', supportsReasoning: true, supportsStreaming: true },
  'perplexity-pro': { provider: 'perplexity', model: 'sonar-pro', supportsReasoning: true, supportsStreaming: true },
  'perplexity-reasoning': { provider: 'perplexity', model: 'sonar-deep-research', supportsReasoning: true, supportsStreaming: false },
  // Image generation - Only Lovable AI
  'gemini-flash-image': { provider: 'lovable', model: 'google/gemini-2.5-flash-image-preview', supportsReasoning: false, supportsStreaming: false },
  // Uncensored.chat - unfiltered AI
  'uncensored-chat': { provider: 'uncensored', model: 'dolphin-mixtral-8x22b', supportsReasoning: true, maxTokens: 4096, supportsStreaming: true },
};

// Validation schema
const chatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.union([
      z.string().max(MAX_MESSAGE_LENGTH, 'Message too long'),
      z.array(z.any())
    ])
  })).min(1).max(100).nullish(),
  
  selectedModels: z.array(
    z.enum(VALID_MODELS)
  ).min(1).max(MAX_MODELS_PER_REQUEST).nullish(),
  
  model: z.enum(VALID_MODELS).nullish(),
  message: z.string().max(MAX_MESSAGE_LENGTH).nullish(),
  chatHistory: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string()
  })).nullish(),
  
  chatId: z.string().uuid().nullish(),
  attachmentUrl: z.string().url().nullish(),
  attachmentExtension: z.string().nullish(),
  webSearchEnabled: z.boolean().nullish(),
  searchMode: z.enum(['general', 'finance', 'academic']).nullish(),
  deepResearchMode: z.boolean().nullish(),
  deepResearch: z.boolean().nullish(),
  stream: z.boolean().nullish(),
  generateImage: z.boolean().nullish(),
  enableMultiStepReasoning: z.boolean().nullish(),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('🚀 chat-with-ai function called at', new Date().toISOString());

  try {
    // Parse and validate request
    const requestBody = await req.json();
    console.log('📥 Request received:', { 
      hasMessages: !!requestBody.messages,
      hasSelectedModels: !!requestBody.selectedModels,
      stream: requestBody.stream 
    });
    
    const validationResult = chatRequestSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      console.error('❌ Validation error:', validationResult.error.errors);
      return new Response(
        JSON.stringify({ error: 'Invalid request format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rawData = validationResult.data;
    
    // Convert old format to new format if needed
    let messages: Array<{role: string, content: any}>;
    let selectedModels: string[];
    
    if (rawData.messages && rawData.selectedModels) {
      messages = rawData.messages;
      selectedModels = rawData.selectedModels;
    } else if (rawData.model) {
      selectedModels = [rawData.model];
      if (rawData.chatHistory && rawData.chatHistory.length > 0) {
        messages = rawData.chatHistory;
        if (rawData.message) {
          messages.push({ role: 'user', content: rawData.message });
        }
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
    const deepResearchMode = rawData.deepResearchMode || rawData.deepResearch || false;
    const isImageGeneration = rawData.generateImage === true;
    const enableMultiStepReasoning = rawData.enableMultiStepReasoning || false;
    const streamResponse = rawData.stream === true;

    // Authenticate user
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

    // Fetch custom instructions
    let customInstructions: string | null = null;
    try {
      const { data: instructionsData } = await supabase
        .from('ai_custom_instructions')
        .select('instructions')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();
      
      if (instructionsData) {
        customInstructions = instructionsData.instructions;
        console.log(`📝 Custom instructions loaded for user ${user.id}`);
      }
    } catch (error) {
      console.log('📝 No custom instructions found');
    }

    // Credit deduction
    const creditCost = deepResearchMode ? 2 : 1;
    console.log(`💳 Deducting ${creditCost} credit(s) for user ${user.id}`);

    const { data: creditResult, error: creditError } = await supabase
      .rpc('check_and_deduct_credits', {
        p_user_id: user.id,
        p_credits_to_deduct: creditCost
      });

    if (creditError || !creditResult?.success) {
      const errorMsg = creditResult?.subscription_type === 'monthly'
        ? 'Daily limit reached! Upgrade to Lifetime Pro for unlimited messages.'
        : `Insufficient credits. This request requires ${creditCost} credit(s).`;
      
      return new Response(
        JSON.stringify({ 
          error: errorMsg,
          creditsRequired: creditCost,
          creditsRemaining: creditResult?.credits_remaining || 0,
          upgradeUrl: '/payment'
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Credits deducted successfully`);

    // Process attachments
    let processedMessages = [...messages];
    if (attachmentUrl) {
      const urlWithoutQuery = attachmentUrl.split('?')[0];
      const fileExtension = attachmentExtension || urlWithoutQuery.split('.').pop()?.toLowerCase();
      
      console.log('📎 Processing attachment:', fileExtension);

      // Validate file size
      try {
        const headResponse = await fetch(attachmentUrl, { method: 'HEAD' });
        const fileSize = parseInt(headResponse.headers.get('content-length') || '0');
        
        if (fileSize > MAX_FILE_SIZE) {
          return new Response(
            JSON.stringify({ error: 'File too large - maximum 10MB' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (error) {
        return new Response(
          JSON.stringify({ error: 'Could not validate file' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const lastMessage = processedMessages[processedMessages.length - 1];

      if (fileExtension === 'pdf') {
        console.log('📄 Extracting PDF text...');
        try {
          const { data: extractResult, error: extractError } = await userSupabase.functions.invoke('extract-pdf-text', {
            body: { url: attachmentUrl }
          });
          
          if (extractError || !extractResult?.success) {
            return new Response(
              JSON.stringify({ error: 'Could not extract text from PDF' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          processedMessages[processedMessages.length - 1] = {
            ...lastMessage,
            content: `${lastMessage.content}\n\n--- PDF Document ---\n${extractResult.text}\n--- End PDF ---`
          };
          console.log('✅ PDF text extracted');
        } catch (error) {
          return new Response(
            JSON.stringify({ error: 'PDF processing failed' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else if (['txt', 'md', 'json', 'csv'].includes(fileExtension || '')) {
        try {
          const fileResponse = await fetch(attachmentUrl);
          const fileContent = await fileResponse.text();
          processedMessages[processedMessages.length - 1] = {
            ...lastMessage,
            content: `${lastMessage.content}\n\nFile content:\n\`\`\`\n${fileContent.slice(0, 5000)}\n\`\`\``
          };
          console.log('✅ Text file content added');
        } catch (error) {
          console.error('Error reading file:', error);
        }
      }
    }

    // Add optimized system prompt to reduce "thinking out loud" behavior
    const directAnswerPrompt = `You are a helpful AI assistant. IMPORTANT: Provide direct, concise answers immediately. Do not start with phrases like "Let me think...", "I'll help you...", "Sure!", or similar preambles. Get straight to the point with the answer or solution. If context is needed, provide it briefly after the main answer.`;
    
    processedMessages.unshift({
      role: 'system',
      content: directAnswerPrompt
    });

    // Add custom instructions if present
    if (customInstructions) {
      processedMessages.unshift({
        role: 'system',
        content: customInstructions
      });
    }

    // Create or get chat
    let currentChatId = chatId;
    if (!currentChatId) {
      const firstContent = messages[0]?.content;
      const title = typeof firstContent === 'string' 
        ? firstContent.substring(0, 50) 
        : 'New Chat';
      
      const { data: newChat } = await supabase
        .from('chat_history')
        .insert({ user_id: user.id, title })
        .select()
        .single();
      currentChatId = newChat?.id;
    }

    // Save user message
    const lastMessage = messages[messages.length - 1];
    const messageContent = typeof lastMessage.content === 'string' 
      ? lastMessage.content 
      : JSON.stringify(lastMessage.content);
    
    await supabase.from('chat_messages').insert({
      chat_id: currentChatId,
      user_id: user.id,
      role: 'user',
      content: messageContent,
      attachment_url: attachmentUrl || null,
    });

    // Handle image generation requests
    if (isImageGeneration) {
      console.log('🎨 Processing image generation request...');
      
      try {
        // Use OpenAI's image generation API (DALL-E)
        const userPrompt = processedMessages[processedMessages.length - 1]?.content || 'Generate an image';
        const imagePrompt = typeof userPrompt === 'string' ? userPrompt : JSON.stringify(userPrompt);
        
        const response = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUDO_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-image-1', // Latest OpenAI image generation model
            prompt: imagePrompt,
            n: 1,
            size: '1024x1024',
            quality: 'standard',
            response_format: 'b64_json', // Get base64 directly
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Image generation error (${response.status}):`, errorText);
          
          // Check if it's API key issue
          if (response.status === 401 || response.status === 429) {
            return new Response(
              JSON.stringify({ 
                error: 'Image generation unavailable. OpenAI API quota exceeded. Please try text chat instead.',
                details: 'The image generation service is temporarily unavailable.'
              }),
              { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          return new Response(
            JSON.stringify({ error: 'Image generation failed', details: errorText.substring(0, 200) }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

        console.log('✅ Image generated successfully');
        
        // Save image message to chat
        const imageMessage = await supabase
          .from('chat_messages')
          .insert({
            chat_id: currentChatId,
            user_id: user.id,
            role: 'assistant',
            content: 'Here is your generated image:',
            model: 'gpt-image-1',
            attachment_url: `data:image/png;base64,${imageBase64}`,
          })
          .select()
          .single();
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            image: `data:image/png;base64,${imageBase64}`,
            messageId: imageMessage.data?.id 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error: any) {
        console.error('❌ Image generation error:', error.message);
        return new Response(
          JSON.stringify({ error: 'Image generation failed', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log(`🚀 Processing ${selectedModels.length} model(s) ${streamResponse ? 'with streaming' : 'directly'}...`);

    // If streaming is enabled and only one model is selected, use SSE
    if (streamResponse && selectedModels.length === 1) {
      const modelId = selectedModels[0];
      const config = MODEL_CONFIG[modelId];
      
      if (!config || !config.supportsStreaming) {
        console.log(`⚠️ Model ${modelId} does not support streaming, falling back to regular mode`);
      } else {
      console.log(`📡 Starting SSE stream for ${modelId}...`);

      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          
          const sendEvent = (event: string, data: any) => {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
          };

          try {
            let streamResponse;
            
            // API key validation with detailed logging
            console.log(`🔑 Checking API key for provider: ${config.provider}, model: ${modelId}`);
            if (config.provider === 'nvidia' && !NVIDIA_NIM_API_KEY) {
              console.error('❌ NVIDIA_NIM_API_KEY not configured');
              throw new Error('NVIDIA API key not configured');
            } else if (config.provider === 'google' && !GOOGLE_AI_API_KEY) {
              console.error('❌ GOOGLE_AI_API_KEY not configured for model:', config.model);
              throw new Error('Google AI API key not configured. Please add GOOGLE_AI_API_KEY to Supabase secrets.');
            } else if (config.provider === 'openrouter' && !OPENROUTER_API_KEY) {
              console.error('❌ OPENROUTER_API_KEY not configured');
              throw new Error('OpenRouter API key not configured');
            } else if (config.provider === 'perplexity' && !PERPLEXITY_API_KEY) {
              console.error('❌ PERPLEXITY_API_KEY not configured');
              throw new Error('Perplexity API key not configured');
            } else if (config.provider === 'groq' && !GROQ_API_KEY) {
              console.error('❌ GROQ_API_KEY not configured');
              throw new Error('Groq API key not configured');
            } else if (config.provider === 'openai' && !SUDO_API_KEY) {
              console.error('❌ SUDO_API_KEY not configured');
              throw new Error('Sudo API key not configured');
            }
            console.log(`✅ API key validated for ${config.provider}`);
            
            if (config.provider === 'nvidia') {
              streamResponse = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${NVIDIA_NIM_API_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  model: config.model,
                  messages: processedMessages,
                  max_tokens: config.maxTokens || 8192,
                  temperature: 0.7,
                  stream: true,
                }),
              });
            } else if (config.provider === 'google') {
              streamResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${config.model}:streamGenerateContent?alt=sse&key=${GOOGLE_AI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: processedMessages.map(msg => ({
                    role: msg.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content) }]
                  })),
                  generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
                }),
              });
            } else if (config.provider === 'openrouter') {
              streamResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                  'Content-Type': 'application/json',
                  'HTTP-Referer': 'https://magverse.app',
                },
                body: JSON.stringify({
                  model: config.model,
                  messages: processedMessages,
                  max_tokens: 4096,
                  temperature: 0.7,
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
            } else if (config.provider === 'groq') {
              streamResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${GROQ_API_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  model: config.model,
                  messages: processedMessages,
                  max_tokens: 4096,
                  temperature: 0.7,
                  stream: true,
                }),
              });
            } else if (config.provider === 'openai') {
              if (!SUDO_API_KEY) {
                throw new Error('Sudo API key not configured');
              }
              streamResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${SUDO_API_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  model: config.model,
                  messages: processedMessages,
                  max_tokens: config.maxTokens || 4096,
                  temperature: 0.7,
                  stream: true,
                }),
              });
            }

            if (!streamResponse || !streamResponse.ok) {
              const errorText = await streamResponse?.text();
              console.error(`❌ ${modelId} stream failed:`, streamResponse?.status, errorText);
              throw new Error(`Stream failed: ${streamResponse?.status}`);
            }

            const reader = streamResponse.body?.getReader();
            if (!reader) {
              throw new Error('No reader available from stream');
            }
            
            const decoder = new TextDecoder();
            let fullContent = '';
            console.log(`📡 Starting stream for ${modelId}...`);

            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                console.log(`✅ ${modelId} stream complete`);
                break;
              }

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split('\n');

              for (const line of lines) {
                if (!line.trim() || line.startsWith(':')) continue;
                
                if (line.startsWith('data: ')) {
                  const data = line.slice(6).trim();
                  if (data === '[DONE]') continue;

                  try {
                    const parsed = JSON.parse(data);
                    let token = '';

                    if (config.provider === 'google') {
                      token = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    } else {
                      token = parsed.choices?.[0]?.delta?.content || '';
                    }

                    if (token) {
                      fullContent += token;
                      sendEvent('token', { model: modelId, token, fullContent });
                    }
                  } catch (e) {
                    console.error(`❌ ${modelId} parse error:`, e, 'Data:', data.substring(0, 100));
                  }
                }
              }
            }

            // Save message to database
            const { data: newMessage } = await supabase.from('chat_messages').insert({
              chat_id: currentChatId,
              user_id: user.id,
              role: 'assistant',
              content: fullContent,
              model: modelId,
            }).select().single();

            sendEvent('done', { model: modelId, messageId: newMessage?.id });
            controller.close();

          } catch (error: any) {
            console.error('SSE stream error:', error);
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

    // Add timeout wrapper for each model request (60 seconds per model)
    const timeoutPromise = (promise: Promise<any>, timeout: number, modelId: string) => {
      return Promise.race([
        promise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`${modelId} request timeout after ${timeout}ms`)), timeout)
        )
      ]);
    };

    // Process all models in parallel with direct API calls
    const modelPromises = selectedModels.map(async (modelId) => {
      const config = MODEL_CONFIG[modelId];
      if (!config) {
        return {
          success: false,
          model: modelId,
          response: 'Model not supported',
          error: true
        };
      }

      const modelStartTime = Date.now();
      console.log(`📤 Calling ${modelId} (${config.model}) with ${config.supportsReasoning ? 'reasoning' : 'standard'} mode...`);

      const modelRequestPromise = (async () => {
        try {
        let response;
        let content = '';
        let usage;
        let thinkingProcess = '';
        let reasoningSteps: Array<{ step: number; thought: string; conclusion: string }> | undefined;

        // API key validation
        if (config.provider === 'nvidia' && !NVIDIA_NIM_API_KEY) {
          console.error('❌ NVIDIA API key not configured');
          return {
            success: false,
            model: modelId,
            response: 'NVIDIA API key not configured',
            error: true
          };
        } else if (config.provider === 'google' && !GOOGLE_AI_API_KEY) {
          console.error('❌ Google AI API key not configured');
          return {
            success: false,
            model: modelId,
            response: 'Google AI API key not configured',
            error: true
          };
        } else if (config.provider === 'openrouter' && !OPENROUTER_API_KEY) {
          console.error('❌ OpenRouter API key not configured');
          return {
            success: false,
            model: modelId,
            response: 'OpenRouter API key not configured',
            error: true
          };
        } else if (config.provider === 'perplexity' && !PERPLEXITY_API_KEY) {
          console.error('❌ Perplexity API key not configured');
          return {
            success: false,
            model: modelId,
            response: 'Perplexity API key not configured',
            error: true
          };
        } else if (config.provider === 'groq' && !GROQ_API_KEY) {
          console.error('❌ Groq API key not configured');
          return {
            success: false,
            model: modelId,
            response: 'Groq API key not configured',
            error: true
          };
        } else if (config.provider === 'lovable' && !LOVABLE_API_KEY) {
          console.error('❌ Lovable API key not configured');
          return {
            success: false,
            model: modelId,
            response: 'Lovable API key not configured',
            error: true
          };
        } else if (config.provider === 'uncensored' && !UNCENSORED_CHAT_API_KEY) {
          console.error('❌ UNCENSORED_CHAT_API_KEY not configured');
          return {
            success: false,
            model: modelId,
            response: 'Uncensored.chat API key not configured',
            error: true
          };
        }

        // Lovable AI Gateway - maps chatgpt, claude, grok to Gemini models
        if (config.provider === 'lovable') {
          console.log(`📤 Calling Lovable AI Gateway for ${modelId} using ${config.model}...`);
          
          let messagesToSend = processedMessages;
          if (enableMultiStepReasoning && config.supportsReasoning) {
            messagesToSend = [
              { 
                role: 'system', 
                content: 'Think step by step and explain your reasoning process before providing the final answer.' 
              },
              ...processedMessages
            ];
          }
          
          const requestBody: any = {
            model: config.model,
            messages: messagesToSend,
          };
          
          // Add image modalities for image generation
          if (modelId === 'gemini-flash-image' || config.model.includes('image')) {
            requestBody.modalities = ["image", "text"];
          }
          
          response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ ${modelId} Lovable AI error (${response.status}):`, errorText);
            
            let errorMessage = 'AI gateway error';
            if (response.status === 429) {
              errorMessage = 'Rate limit exceeded. Please try again in a moment.';
            } else if (response.status === 402) {
              errorMessage = 'Credits exhausted. Please add credits to continue.';
            } else if (response.status === 401) {
              errorMessage = 'API key invalid. Please contact support.';
            }
            
            return {
              success: false,
              model: modelId,
              response: errorMessage,
              error: true,
              providerStatus: response.status,
              rawError: errorText.substring(0, 200)
            };
          }

          const data = await response.json();
          
          // Handle image generation response
          if (data.choices?.[0]?.message?.images) {
            const imageUrl = data.choices[0].message.images[0]?.image_url?.url;
            if (imageUrl) {
              content = `![Generated Image](${imageUrl})`;
            } else {
              content = data.choices[0].message.content || 'Image generated successfully';
            }
          } else {
            content = data.choices?.[0]?.message?.content || 'No response';
          }
          
          usage = data.usage;
          
          // Parse reasoning steps
          if (enableMultiStepReasoning && config.supportsReasoning) {
            const stepMatches = content.matchAll(/(?:Step |)(\d+)[:\.\s]+([^\n]+)/gi);
            const steps = Array.from(stepMatches);
            if (steps.length > 0) {
              reasoningSteps = steps.map(match => ({
                step: parseInt(match[1]),
                thought: match[2].trim(),
                conclusion: ''
              }));
            }
          }
        } else if (config.provider === 'nvidia') {
          // NVIDIA NIM API call for ChatGPT replacement
          let messagesToSend = processedMessages;
          if (enableMultiStepReasoning && config.supportsReasoning) {
            messagesToSend = [
              { 
                role: 'system', 
                content: 'Break down your reasoning into clear steps. For each step, explain your thought process and conclusions before moving to the next step.' 
              },
              ...processedMessages
            ];
          }
          
          response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${NVIDIA_NIM_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: config.model,
              messages: messagesToSend,
              max_tokens: config.maxTokens || 8192,
              temperature: 0.7,
              stream: false,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ ${modelId} NVIDIA NIM API error (${response.status}):`, errorText);
            return {
              success: false,
              model: modelId,
              response: response.status === 429 ? 'Rate limit exceeded' : `API error: ${errorText.substring(0, 100)}`,
              error: true
            };
          }

          const data = await response.json();
          content = data.choices?.[0]?.message?.content || 'No response';
          usage = data.usage;
          
          // Parse multi-step reasoning if enabled
          if (enableMultiStepReasoning && config.supportsReasoning) {
            const stepMatches = content.matchAll(/Step (\d+)[:\s]+([^\n]+)\n?(?:→\s*([^\n]+))?/gi);
            const steps = Array.from(stepMatches);
            if (steps.length > 0) {
              reasoningSteps = steps.map(match => ({
                step: parseInt(match[1]),
                thought: match[2].trim(),
                conclusion: match[3]?.trim() || ''
              }));
              content = content.replace(/Step \d+[:\s]+[^\n]+\n?(?:→\s*[^\n]+\n?)?/gi, '').trim();
            }
          }

        } else if (config.provider === 'google') {
          // Google AI API call
          let messagesToSend = processedMessages;
          if (enableMultiStepReasoning && config.supportsReasoning) {
            messagesToSend = [
              { 
                role: 'system', 
                content: 'Think through this problem step by step. Number each reasoning step and explain your thought process clearly before giving the final answer.' 
              },
              ...processedMessages
            ];
          }
          
          const geminiMessages = messagesToSend.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content) }]
          }));

          response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': GOOGLE_AI_API_KEY!,
            },
            body: JSON.stringify({
              contents: geminiMessages,
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 4096
                // thinkingConfig removed - not supported by Gemini API
              }
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ ${modelId} API error (${response.status}):`, errorText);
            return {
              success: false,
              model: modelId,
              response: response.status === 429 ? 'Rate limit exceeded' : 'API error occurred',
              error: true
            };
          }

          const data = await response.json();
          const candidate = data.candidates?.[0];
          content = candidate?.content?.parts?.[0]?.text || 'No response';
          
          // Include thinking process if available
          if (config.supportsReasoning && candidate?.content?.thinkingSteps) {
            const thinkingSteps = candidate.content.thinkingSteps.map((step: any, i: number) => 
              `${i + 1}. ${step.thought}`
            ).join('\n');
            thinkingProcess = thinkingSteps;
          }
          
          // Parse multi-step reasoning
          if (enableMultiStepReasoning && config.supportsReasoning) {
            const stepMatches = content.matchAll(/(?:Step |)(\d+)[:\.\s]+([^\n]+)\n?(?:→\s*([^\n]+))?/gi);
            const steps = Array.from(stepMatches);
            if (steps.length > 0) {
              reasoningSteps = steps.map(match => ({
                step: parseInt(match[1]),
                thought: match[2].trim(),
                conclusion: match[3]?.trim() || ''
              }));
            }
          }

          usage = {
            prompt_tokens: data.usageMetadata?.promptTokenCount || 0,
            completion_tokens: data.usageMetadata?.candidatesTokenCount || 0,
            total_tokens: data.usageMetadata?.totalTokenCount || 0
          };
        } else if (config.provider === 'openrouter') {
          // OpenRouter (Claude) API call
          let messagesToSend = processedMessages;
          if (enableMultiStepReasoning && config.supportsReasoning) {
            messagesToSend = [
              { 
                role: 'system', 
                content: 'Break down complex problems into clear reasoning steps. Show your thought process before providing the final answer.' 
              },
              ...processedMessages
            ];
          }
          
          response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://magverse.app',
              'X-Title': 'MagVerse AI'
            },
            body: JSON.stringify({
              model: config.model,
              messages: messagesToSend,
              max_tokens: 4096,
              temperature: 0.7,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ ${modelId} API error (${response.status}):`, errorText);
            return {
              success: false,
              model: modelId,
              response: response.status === 429 ? 'Rate limit exceeded' : 'API error occurred',
              error: true
            };
          }

          const data = await response.json();
          content = data.choices?.[0]?.message?.content || 'No response';
          usage = data.usage;
          
          // Parse reasoning steps if available
          if (enableMultiStepReasoning && config.supportsReasoning) {
            const stepMatches = content.matchAll(/(?:Step |)(\d+)[:\.\s]+([^\n]+)/gi);
            const steps = Array.from(stepMatches);
            if (steps.length > 0) {
              reasoningSteps = steps.map(match => ({
                step: parseInt(match[1]),
                thought: match[2].trim(),
                conclusion: ''
              }));
            }
          }
        } else if (config.provider === 'groq') {
          // Groq API call
          let messagesToSend = processedMessages;
          if (enableMultiStepReasoning && config.supportsReasoning) {
            messagesToSend = [
              { 
                role: 'system', 
                content: 'Think step by step and explain your reasoning process before providing the final answer.' 
              },
              ...processedMessages
            ];
          }
          
          response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${GROQ_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: config.model,
              messages: messagesToSend,
              max_tokens: 4096,
              temperature: 0.7,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ ${modelId} API error (${response.status}):`, errorText);
            return {
              success: false,
              model: modelId,
              response: response.status === 429 ? 'Rate limit exceeded' : 'API error occurred',
              error: true
            };
          }

          const data = await response.json();
          content = data.choices?.[0]?.message?.content || 'No response';
          usage = data.usage;
          
          // Parse reasoning steps if available
          if (enableMultiStepReasoning && config.supportsReasoning) {
            const stepMatches = content.matchAll(/(?:Step |)(\d+)[:\.\s]+([^\n]+)/gi);
            const steps = Array.from(stepMatches);
            if (steps.length > 0) {
              reasoningSteps = steps.map(match => ({
                step: parseInt(match[1]),
                thought: match[2].trim(),
                conclusion: ''
              }));
            }
          }
        } else if (config.provider === 'openai') {
          // OpenAI API call (Sudo API)
          if (!SUDO_API_KEY) {
            console.error('❌ Sudo API key not configured');
            return {
              success: false,
              model: modelId,
              response: 'Sudo API key not configured',
              error: true
            };
          }
          
          let messagesToSend = processedMessages;
          if (enableMultiStepReasoning && config.supportsReasoning) {
            messagesToSend = [
              { 
                role: 'system', 
                content: 'Think step by step and explain your reasoning process before providing the final answer.' 
              },
              ...processedMessages
            ];
          }
          
          response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SUDO_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: config.model,
              messages: messagesToSend,
              max_tokens: config.maxTokens || 4096,
              temperature: 0.7,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ ${modelId} OpenAI API error (${response.status}):`, errorText);
            
            // User-friendly error messages
            let errorMessage = 'API error occurred';
            if (response.status === 429) {
              errorMessage = 'ChatGPT quota exceeded. Try Gemini or Claude instead.';
            } else if (response.status === 401) {
              errorMessage = 'ChatGPT API key invalid. Try Gemini or Claude instead.';
            }
            
            return {
              success: false,
              model: modelId,
              response: errorMessage,
              error: true
            };
          }

          const data = await response.json();
          content = data.choices?.[0]?.message?.content || 'No response';
          usage = data.usage;
          
          // Parse reasoning steps if available
          if (enableMultiStepReasoning && config.supportsReasoning) {
            const stepMatches = content.matchAll(/(?:Step |)(\d+)[:\.\s]+([^\n]+)/gi);
            const steps = Array.from(stepMatches);
            if (steps.length > 0) {
              reasoningSteps = steps.map(match => ({
                step: parseInt(match[1]),
                thought: match[2].trim(),
                conclusion: ''
              }));
            }
          }
        } else if (config.provider === 'perplexity') {
          // Perplexity API call with web search
          // Perplexity enforces strict role alternation (user/assistant) after optional system messages.
          // Our UI can sometimes send consecutive user messages; normalize by merging consecutive roles.
          let messagesToSend: Array<{ role: string; content: string }> = processedMessages.map((m) => ({
            role: m.role,
            content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
          }));

          if (enableMultiStepReasoning && config.supportsReasoning) {
            messagesToSend = [
              {
                role: 'system',
                content:
                  'You have access to real-time web search. Break down your research process step by step, cite sources, and provide up-to-date information.',
              },
              ...messagesToSend,
            ];
          }

          const systemMessages = messagesToSend.filter((m) => m.role === 'system');
          const convoMessages = messagesToSend.filter((m) => m.role !== 'system');

          const normalizedMessages: Array<{ role: string; content: string }> = [...systemMessages];
          for (const msg of convoMessages) {
            const content = msg.content?.trim();
            if (!content) continue;

            const last = normalizedMessages[normalizedMessages.length - 1];
            if (last && last.role === msg.role) {
              last.content = `${last.content}\n\n${content}`;
            } else {
              normalizedMessages.push({ role: msg.role, content });
            }
          }

          messagesToSend = normalizedMessages;

          response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: config.model,
              messages: messagesToSend,
              temperature: 0.2,
              top_p: 0.9,
              max_tokens: 4096,
              return_images: false,
              return_related_questions: false,
              search_recency_filter: 'month',
              frequency_penalty: 1,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ ${modelId} API error (${response.status}):`, errorText);
            
            // User-friendly error messages
            let errorMessage = 'API error occurred';
            if (response.status === 429) {
              errorMessage = 'Rate limit exceeded. Try again in a moment.';
            } else if (response.status === 401) {
              errorMessage = 'Perplexity API key expired. Try Grok for research instead.';
            }
            
            return {
              success: false,
              model: modelId,
              response: errorMessage,
              error: true
            };
          }

          const data = await response.json();
          content = data.choices?.[0]?.message?.content || 'No response';
          usage = data.usage;
          
          // Include citations if available
          if (data.citations && data.citations.length > 0) {
            const citations = data.citations.map((c: string, i: number) => `[${i + 1}] ${c}`).join('\n');
            thinkingProcess = `Sources:\n${citations}`;
          }
          
          // Parse reasoning steps if available
          if (enableMultiStepReasoning && config.supportsReasoning) {
            const stepMatches = content.matchAll(/(?:Step |)(\d+)[:\.\s]+([^\n]+)/gi);
            const steps = Array.from(stepMatches);
            if (steps.length > 0) {
              reasoningSteps = steps.map(match => ({
                step: parseInt(match[1]),
                thought: match[2].trim(),
                conclusion: ''
              }));
            }
          }
        } else if (config.provider === 'uncensored') {
          // Uncensored.chat API call
          console.log(`📤 Calling uncensored.chat for ${modelId}...`);
          
          if (!UNCENSORED_CHAT_API_KEY) {
            console.error('❌ UNCENSORED_CHAT_API_KEY not configured');
            return {
              success: false,
              model: modelId,
              response: 'Uncensored.chat API key not configured',
              error: true
            };
          }
          
          let messagesToSend = processedMessages.map((m) => ({
            role: m.role,
            content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
          }));
          
          response = await fetch('https://api.uncensored.chat/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${UNCENSORED_CHAT_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: config.model,
              messages: messagesToSend,
              max_tokens: config.maxTokens || 4096,
              temperature: 0.7,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ ${modelId} uncensored.chat API error (${response.status}):`, errorText);
            
            let errorMessage = 'API error occurred';
            if (response.status === 429) {
              errorMessage = 'Rate limit exceeded. Try again in a moment.';
            } else if (response.status === 401) {
              errorMessage = 'Uncensored.chat API key invalid.';
            }
            
            return {
              success: false,
              model: modelId,
              response: errorMessage,
              error: true
            };
          }

          const data = await response.json();
          content = data.choices?.[0]?.message?.content || 'No response';
          usage = data.usage;
        }

        const responseTime = Date.now() - modelStartTime;
        console.log(`✅ ${modelId} responded in ${responseTime}ms`);

        // Save assistant response
        const { data: savedMessage } = await supabase
          .from('chat_messages')
          .insert({
            chat_id: currentChatId,
            user_id: user.id,
            role: 'assistant',
            content: content,
            model: modelId,
            credits_consumed: creditCost,
          })
          .select()
          .single();

        // Record metrics
        if (savedMessage) {
          await supabase
            .from('ai_model_metrics')
            .insert({
              user_id: user.id,
              model_name: modelId,
              response_time_ms: responseTime,
              tokens_input: usage?.prompt_tokens,
              tokens_output: usage?.completion_tokens,
              tokens_total: usage?.total_tokens,
              message_id: savedMessage.id,
            });
        }

        return {
          success: true,
          model: modelId,
          response: content,
          messageId: savedMessage?.id,
          thinkingProcess: thinkingProcess || undefined,
          reasoningSteps: reasoningSteps
        };
      } catch (error: any) {
        console.error(`❌ ${modelId} error:`, error.message);
        return {
          success: false,
          model: modelId,
          response: error.message || 'Request failed',
          error: true
        };
      }
      })();

      // Wrap with timeout (120 seconds per model - increased for better reliability)
      try {
        return await timeoutPromise(modelRequestPromise, 120000, modelId);
      } catch (timeoutError: any) {
        console.error(`⏱️ ${modelId} timeout:`, timeoutError.message);
        return {
          success: false,
          model: modelId,
          response: 'Request timeout - please try again or use a faster model like Gemini Flash',
          error: true
        };
      }
    });

    const results = await Promise.all(modelPromises);
    const successfulResults = results.filter(r => r.success);
    const failedResults = results.filter(r => !r.success);

    if (successfulResults.length === 0) {
      console.error('⚠️ All models failed');
      // Enhanced error reporting with provider status and sanitized error body
      const enhancedErrors = failedResults.map(r => ({
        model: r.model,
        provider: MODEL_CONFIG[r.model]?.provider || 'unknown',
        error: r.response ? r.response.substring(0, 200) : 'Unknown error',
        status: 'failed'
      }));
      
      return new Response(
        JSON.stringify({ 
          error: 'All AI models failed to respond. Please try again.',
          responses: results,
          failedModels: failedResults.map(r => r.model),
          providerStatus: enhancedErrors,
          debugInfo: {
            timestamp: new Date().toISOString(),
            modelsAttempted: selectedModels,
            suggestion: 'Try using a Lovable AI model (Gemini Flash) for better reliability'
          }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const totalTime = Date.now() - startTime;
    console.log(`✅ Request completed in ${totalTime}ms (${successfulResults.length}/${results.length} models succeeded)`);

    return new Response(
      JSON.stringify({
        success: true,
        responses: results,
        chatId: currentChatId,
        processingTimeMs: totalTime,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    console.error('❌ CRITICAL ERROR in chat-with-ai:');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    console.error('Name:', error.name);
    console.error('Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    console.error(`Elapsed time: ${elapsed}ms`);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        type: error.name,
        elapsed: `${elapsed}ms`,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
