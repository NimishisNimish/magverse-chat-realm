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
const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
const BYTEZ_API_KEY = Deno.env.get('BYTEZ_API_KEY');

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

const VALID_MODELS = ['chatgpt', 'gemini', 'claude', 'perplexity', 'grok', 'bytez-qwen', 'bytez-phi3', 'bytez-mistral', 'gemini-flash-image'] as const;

const STORAGE_BUCKET_URL = 'https://pqdgpxetysqcdcjwormb.supabase.co/storage/';
const MAX_FILE_SIZE = 10_000_000; // 10MB
const MAX_MESSAGE_LENGTH = 10000;
const MAX_MODELS_PER_REQUEST = 5;

// Model configuration - stable, working models
const MODEL_CONFIG: Record<string, { 
  provider: 'openai' | 'google' | 'openrouter' | 'perplexity' | 'groq' | 'bytez', 
  model: string,
  supportsReasoning: boolean,
  maxTokens?: number,
  requiresMaxCompletionTokens?: boolean
}> = {
  'chatgpt': { provider: 'openai', model: 'gpt-4o', supportsReasoning: true, maxTokens: 4096, requiresMaxCompletionTokens: false },
  'gemini': { provider: 'google', model: 'gemini-2.0-flash-exp', supportsReasoning: true },
  'claude': { provider: 'openrouter', model: 'anthropic/claude-3.5-sonnet', supportsReasoning: true },
  'perplexity': { provider: 'perplexity', model: 'llama-3.1-sonar-large-128k-online', supportsReasoning: true },
  'grok': { provider: 'groq', model: 'llama-3.3-70b-versatile', supportsReasoning: true },
  'bytez-qwen': { provider: 'bytez', model: 'Qwen/Qwen2.5-7B-Instruct', supportsReasoning: true },
  'bytez-phi3': { provider: 'bytez', model: 'microsoft/Phi-3-mini-4k-instruct', supportsReasoning: true },
  'bytez-mistral': { provider: 'bytez', model: 'mistralai/Mistral-7B-Instruct-v0.3', supportsReasoning: true },
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
  enableMultiStepReasoning: z.boolean().nullish(),
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
    const enableMultiStepReasoning = rawData.enableMultiStepReasoning || false;

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

        if (config.provider === 'openai') {
          // OpenAI API call with proper parameter handling
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
          
          // Build request body based on model capabilities
          const requestBody: any = {
            model: config.model,
            messages: messagesToSend,
          };
          
          // Use correct token parameter based on model
          if (config.requiresMaxCompletionTokens) {
            requestBody.max_completion_tokens = config.maxTokens || 4096;
          } else {
            requestBody.max_tokens = config.maxTokens || 4096;
            requestBody.temperature = 0.7; // Only for non-reasoning models
          }
          
          response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ ${modelId} API error (${response.status}):`, errorText);
            console.error(`❌ Error details:`, errorText);
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

          // Include thinking process if available
          if (data.choices?.[0]?.message?.reasoning_content) {
            thinkingProcess = data.choices[0].message.reasoning_content;
          }
          
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
              // Remove step markers from final content
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
        } else if (config.provider === 'bytez') {
          // Bytez AI API call (small models)
          let messagesToSend = processedMessages;
          if (enableMultiStepReasoning && config.supportsReasoning) {
            messagesToSend = [
              { 
                role: 'system', 
                content: 'Think step by step and explain your reasoning before providing the final answer.' 
              },
              ...processedMessages
            ];
          }
          
          response = await fetch(`https://api.bytez.com/models/v2/openai-community/${encodeURIComponent(config.model)}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${BYTEZ_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messages: messagesToSend.map(msg => ({
                role: msg.role === 'system' ? 'system' : msg.role === 'assistant' ? 'assistant' : 'user',
                content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
              })),
              stream: false,
              params: {
                max_tokens: 4096,
                temperature: 0.7,
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
          content = data.output || 'No response';
          
          // Bytez doesn't provide token usage in the same format
          usage = {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0
          };
          
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
          let messagesToSend = processedMessages;
          if (enableMultiStepReasoning && config.supportsReasoning) {
            messagesToSend = [
              { 
                role: 'system', 
                content: 'You have access to real-time web search. Break down your research process step by step, cite sources, and provide up-to-date information.' 
              },
              ...processedMessages
            ];
          }
          
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

      // Wrap with timeout (60 seconds per model)
      try {
        return await timeoutPromise(modelRequestPromise, 60000, modelId);
      } catch (timeoutError: any) {
        console.error(`⏱️ ${modelId} timeout:`, timeoutError.message);
        return {
          success: false,
          model: modelId,
          response: 'Request timeout - model took too long to respond',
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
