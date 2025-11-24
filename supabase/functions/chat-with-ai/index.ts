import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// API Keys
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

const VALID_MODELS = ['gpt-5', 'gpt-5-mini', 'gpt-5-nano', 'o3', 'o4-mini', 
  'gemini-3-pro', 'gemini-3-flash', 'gemini-3-thinking', 'gemini-flash-image'] as const;

const STORAGE_BUCKET_URL = 'https://pqdgpxetysqcdcjwormb.supabase.co/storage/';
const MAX_FILE_SIZE = 10_000_000; // 10MB
const MAX_MESSAGE_LENGTH = 10000;
const MAX_MODELS_PER_REQUEST = 3;

// Model configuration with reasoning capabilities
const MODEL_CONFIG: Record<string, { 
  provider: 'openai' | 'google', 
  model: string,
  supportsReasoning: boolean 
}> = {
  'gpt-5': { provider: 'openai', model: 'gpt-5-2025-08-07', supportsReasoning: true },
  'gpt-5-mini': { provider: 'openai', model: 'gpt-5-mini-2025-08-07', supportsReasoning: true },
  'gpt-5-nano': { provider: 'openai', model: 'gpt-5-nano-2025-08-07', supportsReasoning: false },
  'o3': { provider: 'openai', model: 'o3-2025-04-16', supportsReasoning: true },
  'o4-mini': { provider: 'openai', model: 'o4-mini-2025-04-16', supportsReasoning: true },
  'gemini-3-pro': { provider: 'google', model: 'gemini-3-pro-preview', supportsReasoning: true },
  'gemini-3-flash': { provider: 'google', model: 'gemini-2.5-flash', supportsReasoning: false },
  'gemini-3-thinking': { provider: 'google', model: 'gemini-3-pro-preview', supportsReasoning: true },
  'gemini-flash-image': { provider: 'google', model: 'gemini-2.5-flash-image', supportsReasoning: false },
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
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Parse and validate request
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
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': GOOGLE_AI_API_KEY!,
          },
          body: JSON.stringify({
            contents: processedMessages.map(msg => ({
              role: msg.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content) }]
            })),
            generationConfig: {
              temperature: 0.9,
              maxOutputTokens: 2048,
            }
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Image generation error (${response.status}):`, errorText);
          return new Response(
            JSON.stringify({ error: 'Image generation failed' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const data = await response.json();
        const imageUrl = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        
        if (!imageUrl) {
          return new Response(
            JSON.stringify({ error: 'No image generated' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('✅ Image generated successfully');
        
        return new Response(
          JSON.stringify({ success: true, image: `data:image/png;base64,${imageUrl}` }),
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

    console.log(`🚀 Processing ${selectedModels.length} model(s) directly...`);

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

      try {
        let response;
        let content = '';
        let usage;

        if (config.provider === 'openai') {
          // OpenAI API call
          const isReasoningModel = modelId === 'o3' || modelId === 'o4-mini';
          
          response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: config.model,
              messages: processedMessages,
              max_completion_tokens: 4096,
              // Note: reasoning models don't support temperature parameter
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

          // For reasoning models, include thinking process if available
          if (isReasoningModel && data.choices?.[0]?.message?.reasoning_content) {
            content = `**Thinking Process:**\n\n${data.choices[0].message.reasoning_content}\n\n**Response:**\n\n${content}`;
          }

        } else if (config.provider === 'google') {
          // Google AI API call
          const geminiMessages = processedMessages.map(msg => ({
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
                maxOutputTokens: 4096,
                ...(config.supportsReasoning && { thinkingConfig: { enabled: true } })
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
            content = `**Thinking Process:**\n\n${thinkingSteps}\n\n**Response:**\n\n${content}`;
          }

          usage = {
            prompt_tokens: data.usageMetadata?.promptTokenCount || 0,
            completion_tokens: data.usageMetadata?.candidatesTokenCount || 0,
            total_tokens: data.usageMetadata?.totalTokenCount || 0
          };
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
          messageId: savedMessage?.id
        };
      } catch (error: any) {
        console.error(`❌ ${modelId} error:`, error.message);
        return {
          success: false,
          model: modelId,
          response: 'Request failed',
          error: true
        };
      }
    });

    const results = await Promise.all(modelPromises);
    const successfulResults = results.filter(r => r.success);
    const failedResults = results.filter(r => !r.success);

    if (successfulResults.length === 0) {
      console.error('⚠️ All models failed');
      return new Response(
        JSON.stringify({ 
          error: 'All AI models failed to respond. Please try again.',
          responses: results,
          failedModels: failedResults.map(r => r.model)
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
    console.error('❌ Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
