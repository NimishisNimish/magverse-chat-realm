import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ERROR_MESSAGES = {
  AUTH_REQUIRED: 'Authentication required',
  INVALID_REQUEST: 'Invalid request',
  SERVER_ERROR: 'An error occurred processing your request',
};

const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY'); // Single key for all OpenRouter models
const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
const googleApiKey = Deno.env.get('GOOGLE_AI_API_KEY');
const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
const qwenApiKey = Deno.env.get('QWEN_API_KEY');
const chutesApiKey = Deno.env.get('CHUTES_AI_API_KEY');
const nvidiaApiKey = Deno.env.get('NVIDIA_NIM_API_KEY');
const deepseekNvidiaApiKey = Deno.env.get('DEEPSEEK_NVIDIA_NIM_API_KEY');
const llamaNvidiaApiKey = Deno.env.get('LLAMA_NVIDIA_NIM_API_KEY');

// Debug: Log API key availability (not the actual keys)
console.log('🔑 API Keys loaded:', {
  openrouter: !!openRouterApiKey, // Single key for Claude, Grok
  deepseek: !!deepseekApiKey,
  google: !!googleApiKey,
  perplexity: !!perplexityApiKey,
  qwen: !!qwenApiKey, // Qwen AI for ChatGPT
  chutes: !!chutesApiKey, // Chutes AI
  nvidiaNim: !!nvidiaApiKey,
  deepseekNvidia: !!deepseekNvidiaApiKey, // NVIDIA NIM for Deepseek
  llamaNvidia: !!llamaNvidiaApiKey // NVIDIA NIM for Llama
});
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

const VALID_MODELS = ['chatgpt', 'gemini', 'perplexity', 'deepseek', 'claude', 'llama', 'grok'] as const;
const STORAGE_BUCKET_URL = 'https://pqdgpxetysqcdcjwormb.supabase.co/storage/';
const MAX_FILE_SIZE = 10_000_000; // 10MB
const MAX_MESSAGE_LENGTH = 10000;
const MAX_MODELS_PER_REQUEST = 3;
const RATE_LIMIT_REQUESTS = 10;
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const API_TIMEOUT_MS = 660000; // 11 minutes for regular queries (longer than frontend 10min timeout)
const DEEP_RESEARCH_TIMEOUT_MS = 780000; // 13 minutes for deep research mode (longer than frontend 11min timeout)

// Provider configuration with direct API endpoints
const providerConfig: Record<string, any> = {
  chatgpt: {
    provider: 'nvidia-nim',
    apiKey: nvidiaApiKey,
    endpoint: 'https://integrate.api.nvidia.com/v1/chat/completions',
    model: 'meta/llama-3.1-8b-instruct',
    headers: () => ({
      'Authorization': `Bearer ${nvidiaApiKey}`,
      'Content-Type': 'application/json',
    }),
    bodyTemplate: (messages: any[], _webSearchEnabled?: boolean, _searchMode?: string) => ({
      model: 'meta/llama-3.1-8b-instruct',
      messages,
      temperature: 0.7,
      max_tokens: 2000,
      stream: false, // Streaming disabled for stability
    }),
    responseTransform: (data: any) => {
      return data.choices[0]?.message?.content || 'No response';
    },
  },
  gemini: {
    provider: 'google',
    apiKey: googleApiKey,
    endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:streamGenerateContent?key=${googleApiKey}&alt=sse`,
    model: 'gemini-2.0-flash-exp',
    headers: () => ({
      'Content-Type': 'application/json',
    }),
    bodyTemplate: (messages: any[], _webSearchEnabled?: boolean, _searchMode?: string) => ({
      contents: messages.map((msg: any) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: typeof msg.content === 'string' 
          ? [{ text: msg.content }]
          : Array.isArray(msg.content)
            ? msg.content.map((part: any) => {
                if (part.type === 'text') {
                  return { text: part.text };
                } else if (part.type === 'image_url') {
                  return { text: `[Image: ${part.image_url.url}]` };
                }
                return { text: JSON.stringify(part) };
              })
            : [{ text: JSON.stringify(msg.content) }]
      }))
    }),
    responseTransform: (data: any) => data.candidates[0]?.content?.parts[0]?.text || 'No response',
  },
  perplexity: {
    provider: 'perplexity',
    apiKey: perplexityApiKey,
    endpoint: 'https://api.perplexity.ai/chat/completions',
    model: 'sonar-pro',
    headers: () => ({
      'Authorization': `Bearer ${perplexityApiKey}`,
      'Content-Type': 'application/json',
    }),
    bodyTemplate: (messages: any[], webSearchEnabled?: boolean, searchMode?: string) => {
      const baseConfig: any = {
        model: 'sonar-pro',
        messages,
        stream: false,
      };
      
      // Add web search parameters if enabled
      if (webSearchEnabled) {
        const domains = getSearchDomains(searchMode);
        if (domains.length > 0) {
          baseConfig.search_domain_filter = domains;
        }
        baseConfig.search_recency_filter = 'month';
        baseConfig.return_images = false;
        baseConfig.return_related_questions = false;
        
        // Add search mode specific parameters
        if (searchMode === 'finance') {
          baseConfig.temperature = 0.2; // More precise for financial data
        } else if (searchMode === 'academic') {
          baseConfig.temperature = 0.3; // Slightly more precise for academic content
        }
      }
      
      return baseConfig;
    },
  },
  claude: {
    provider: 'openrouter',
    apiKey: openRouterApiKey,
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'anthropic/claude-3.5-sonnet',
    headers: () => ({
      'Authorization': `Bearer ${openRouterApiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://pqdgpxetysqcdcjwormb.supabase.co',
      'X-Title': 'MagVerse AI Chat',
    }),
    bodyTemplate: (messages: any[], _webSearchEnabled?: boolean, _searchMode?: string) => ({
      model: 'anthropic/claude-3.5-sonnet',
      messages,
      temperature: 0.7,
      max_tokens: 2000,
    }),
  },
  llama: {
    provider: 'nvidia-nim',
    apiKey: llamaNvidiaApiKey,
    endpoint: 'https://integrate.api.nvidia.com/v1/chat/completions',
    model: 'meta/llama-3.3-70b-instruct',
    headers: () => ({
      'Authorization': `Bearer ${llamaNvidiaApiKey}`,
      'Content-Type': 'application/json',
    }),
    bodyTemplate: (messages: any[], _webSearchEnabled?: boolean, _searchMode?: string) => ({
      model: 'meta/llama-3.3-70b-instruct',
      messages,
      temperature: 0.7,
      max_tokens: 2000,
      stream: false, // Streaming disabled for stability
    }),
    responseTransform: (data: any) => {
      return data.choices[0]?.message?.content || 'No response';
    },
  },
  grok: {
    provider: 'openrouter',
    apiKey: openRouterApiKey,
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'x-ai/grok-4',
    headers: () => ({
      'Authorization': `Bearer ${openRouterApiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://pqdgpxetysqcdcjwormb.supabase.co',
      'X-Title': 'MagVerse AI Chat',
    }),
    bodyTemplate: (messages: any[], _webSearchEnabled?: boolean, _searchMode?: string) => ({
      model: 'x-ai/grok-4',
      messages,
      temperature: 0.7,
      max_tokens: 2000,
    }),
  },
  deepseek: {
    provider: 'nvidia-nim',
    apiKey: deepseekNvidiaApiKey,
    endpoint: 'https://integrate.api.nvidia.com/v1/chat/completions',
    model: 'deepseek-ai/deepseek-r1',
    headers: () => ({
      'Authorization': `Bearer ${deepseekNvidiaApiKey}`,
      'Content-Type': 'application/json',
    }),
    bodyTemplate: (messages: any[], _webSearchEnabled?: boolean, _searchMode?: string) => ({
      model: 'deepseek-ai/deepseek-r1',
      messages,
      temperature: 0.7,
      max_tokens: 2000,
      stream: false, // Streaming disabled for stability
    }),
    responseTransform: (data: any) => {
      return data.choices[0]?.message?.content || 'No response';
    },
  },
};

// Validation schema
const chatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.union([
      z.string().max(MAX_MESSAGE_LENGTH, 'Message too long (max 10,000 characters)'),
      z.array(z.any()) // Allow array for vision models with image content
    ])
  })).min(1, 'At least one message required').max(100, 'Too many messages'),
  
  selectedModels: z.array(
    z.enum(VALID_MODELS)
  ).min(1, 'Select at least one model')
   .max(MAX_MODELS_PER_REQUEST, `Maximum ${MAX_MODELS_PER_REQUEST} models per request`),
  
  chatId: z.string().uuid().nullish(),
  
  attachmentUrl: z.string().url().nullish().refine(
    (url) => !url || url.startsWith(STORAGE_BUCKET_URL),
    'Attachment must be from your storage bucket'
  ),
  
  webSearchEnabled: z.boolean().optional(),
  searchMode: z.enum(['general', 'finance', 'academic']).optional(),
  deepResearchMode: z.boolean().optional(),
});

/**
 * Get domain filters based on search mode
 */
function getSearchDomains(searchMode?: string): string[] {
  switch (searchMode) {
    case 'finance':
      return [
        'bloomberg.com',
        'reuters.com',
        'wsj.com',
        'marketwatch.com',
        'investing.com',
        'goldprice.org',
        'kitco.com',
        'cnbc.com',
        'ft.com',
        'forbes.com'
      ];
    case 'academic':
      return [
        'scholar.google.com',
        'arxiv.org',
        'pubmed.ncbi.nlm.nih.gov',
        'jstor.org',
        'researchgate.net',
        'sciencedirect.com',
        'nature.com',
        'springer.com',
        'ieee.org',
        'acm.org'
      ];
    case 'general':
    default:
      return []; // No domain filter for general search (searches all web)
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse and validate request body
    const requestBody = await req.json();
    const validationResult = chatRequestSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      console.error('Validation error details:', JSON.stringify(validationResult.error.errors, null, 2));
      console.error('Request body received:', JSON.stringify(requestBody, null, 2));
      return new Response(
        JSON.stringify({ error: ERROR_MESSAGES.INVALID_REQUEST }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { messages, selectedModels, chatId, attachmentUrl, webSearchEnabled = false, searchMode = 'general', deepResearchMode = false } = validationResult.data;
    
    // Auto-enable web search for Deep Research mode
    const effectiveWebSearchEnabled = deepResearchMode ? true : webSearchEnabled;
    
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: ERROR_MESSAGES.AUTH_REQUIRED }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token for auth
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const { data: { user }, error: userError } = await userSupabase.auth.getUser();

    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: ERROR_MESSAGES.AUTH_REQUIRED }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use authenticated client with user's JWT token to enforce RLS policies
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Process attachment if present with size validation
    let processedMessages = [...messages];
    if (attachmentUrl) {
      try {
        console.log('📎 Processing attachment:', attachmentUrl);
        console.log('📎 Current message count:', processedMessages.length);
        
        // Validate file size before processing
        const headResponse = await fetch(attachmentUrl, { method: 'HEAD' });
        const fileSize = parseInt(headResponse.headers.get('content-length') || '0');
        
        if (fileSize > MAX_FILE_SIZE) {
          console.error('❌ File too large:', fileSize, 'bytes');
          return new Response(
            JSON.stringify({ error: 'File too large - maximum size is 10MB' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        console.log('✅ File size validated:', fileSize, 'bytes');
      } catch (error) {
        console.error('❌ Error validating file:', error);
        return new Response(
          JSON.stringify({ error: 'Could not validate file - it may be inaccessible or expired' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const fileExtension = attachmentUrl.split('.').pop()?.toLowerCase();
      const lastMessage = processedMessages[processedMessages.length - 1];
      
      if (fileExtension === 'pdf') {
        // Extract PDF text content using the extract-pdf-text function
        console.log('📄 PDF attachment detected, extracting text...');
        
        try {
          // Add timeout for PDF extraction
          const extractTimeout = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('PDF extraction timeout')), 45000); // 45 seconds
          });
          
          // Use Supabase client to call the function
          const extractPromise = userSupabase.functions.invoke('extract-pdf-text', {
            body: { url: attachmentUrl }
          });
          
          const { data: extractResult, error: extractError } = await Promise.race([
            extractPromise,
            extractTimeout
          ]) as any;
          
          if (extractError) {
            console.error('❌ PDF extraction error:', extractError);
            throw extractError;
          }
          
          if (extractResult?.success && extractResult?.text) {
            const charCount = extractResult.charCount || 0;
            const wordCount = extractResult.wordCount || 0;
            console.log(`✅ PDF text extracted: ${charCount} chars, ${wordCount} words${extractResult.wasTruncated ? ' (truncated)' : ''}`);
            
            processedMessages[processedMessages.length - 1] = {
              ...lastMessage,
              content: `${lastMessage.content}\n\n--- PDF Document Analysis ---\nExtracted ${wordCount} words (${charCount} characters)${extractResult.wasTruncated ? ' - document was truncated for length' : ''}\n\n${extractResult.text}\n\n--- End of PDF Content ---`
            };
          } else if (extractResult?.isEmpty) {
            console.warn('⚠️ PDF is empty or contains only images');
            processedMessages[processedMessages.length - 1] = {
              ...lastMessage,
              content: `${lastMessage.content}\n\n[Note: A PDF was attached but appears to be a scanned document or image-based PDF with no extractable text. Please describe what you see in the PDF or ask specific questions about it.]`
            };
          } else {
            console.warn('⚠️ PDF extraction returned no text');
            processedMessages[processedMessages.length - 1] = {
              ...lastMessage,
              content: `${lastMessage.content}\n\n[Note: A PDF was attached but text extraction failed. This might be a scanned document, image-based PDF, or password-protected file.]`
            };
          }
        } catch (error: any) {
          console.error('❌ Error extracting PDF:', error);
          
          let errorNote = '[Note: A PDF was attached but could not be processed.';
          if (error.message?.includes('timeout')) {
            errorNote += ' Extraction timed out - the PDF may be too large or complex.';
          } else if (error.message?.includes('expired')) {
            errorNote += ' File access expired - please re-upload the PDF.';
          }
          errorNote += ']';
          
          processedMessages[processedMessages.length - 1] = {
            ...lastMessage,
            content: `${lastMessage.content}\n\n${errorNote}`
          };
        }
      } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension || '')) {
        // For images with vision models, use proper format
          console.log('🖼️ Image attachment detected, formatting for vision models');
          processedMessages[processedMessages.length - 1] = {
            role: 'user',
            content: [
              { type: 'text', text: lastMessage.content },
              { type: 'image_url', image_url: { url: attachmentUrl } }
            ]
          };
          console.log('✅ Image formatted successfully');
      } else if (['txt', 'md', 'json', 'csv'].includes(fileExtension || '')) {
        // For text files, try to fetch content
        try {
          console.log('📄 Text file attachment detected, fetching content');
          const fileResponse = await fetch(attachmentUrl);
          const fileContent = await fileResponse.text();
          processedMessages[processedMessages.length - 1] = {
            ...lastMessage,
            content: `${lastMessage.content}\n\nFile content:\n\`\`\`\n${fileContent.slice(0, 5000)}\n\`\`\``
          };
          console.log('✅ Text file content fetched successfully');
        } catch (error) {
          console.error('Error fetching file content:', error);
          const lastMessage = processedMessages[processedMessages.length - 1];
          processedMessages[processedMessages.length - 1] = {
            ...lastMessage,
            content: `${lastMessage.content}\n\n[File attached: ${attachmentUrl}]`
          };
        }
      } else {
        // For other file types
        console.warn('⚠️ Unsupported file type:', fileExtension);
        const lastMessage = processedMessages[processedMessages.length - 1];
        processedMessages[processedMessages.length - 1] = {
          ...lastMessage,
          content: `${lastMessage.content}\n\n[Note: A file of type .${fileExtension} was attached but this format is not supported for processing.]`
        };
      }
    }
    
    console.log('📨 Final processed messages count:', processedMessages.length);
    console.log('📨 Last message has attachment processing:', processedMessages[processedMessages.length - 1]?.content?.includes('attached') || processedMessages[processedMessages.length - 1]?.content?.includes('File content'));

    // Get profile for analytics (no credit enforcement)
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_pro, credits_remaining')
      .eq('id', user.id)
      .single();

    // Log usage for analytics but don't block
    console.log(`User ${user.id} chat request. Pro: ${profile?.is_pro}, Credits: ${profile?.credits_remaining || 0}`);

    // Create or get chat
    let currentChatId = chatId;
    if (!currentChatId) {
      const firstContent = messages[0]?.content;
      const title = typeof firstContent === 'string' 
        ? firstContent.substring(0, 50) 
        : 'New Chat';
      
      const { data: newChat } = await supabase
        .from('chat_history')
        .insert({ 
          user_id: user.id,
          title: title || 'New Chat' 
        })
        .select()
        .single();
      currentChatId = newChat?.id;
    }

    // Save user message with attachment
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

    // Process all models in parallel for better performance
    const modelPromises = selectedModels.map(async (modelId) => {
      const config = providerConfig[modelId];
      
      if (!config) {
        console.error(`❌ No configuration found for model: ${modelId}`);
        return { success: false, model: modelId, error: 'No configuration found' };
      }

      if (!config.apiKey) {
        console.error(`❌ Missing API key for ${modelId} (provider: ${config.provider})`);
        console.error(`   Required secret: ${
          modelId === 'chatgpt' ? 'QWEN_API_KEY' :
          modelId === 'deepseek' ? 'DEEPSEEK_NVIDIA_NIM_API_KEY' :
          modelId === 'llama' ? 'LLAMA_NVIDIA_NIM_API_KEY' :
          modelId === 'gemini' ? 'GOOGLE_AI_API_KEY' :
          modelId === 'perplexity' ? 'PERPLEXITY_API_KEY' :
          'OPENROUTER_API_KEY'
        }`);
        return { success: false, model: modelId, error: 'Missing API key' };
      }

      // Check if model supports vision
      const visionModels = ['chatgpt', 'claude', 'gemini'];
      const supportsVision = visionModels.includes(modelId);
      
      // Use appropriate messages based on vision support
      let finalMessages = processedMessages;
      if (!supportsVision && attachmentUrl?.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        const lastMsg = messages[messages.length - 1];
        finalMessages = [
          ...messages.slice(0, -1),
          {
            role: 'user',
            content: `${lastMsg.content}\n\n[Image attached: ${attachmentUrl}]\nNote: Please ask me to describe the image as this model cannot view it directly.`
          }
        ];
      }
      
      // Add Deep Research system prompt if enabled
      if (deepResearchMode && finalMessages.length > 0) {
        const deepResearchPrompt = {
          role: 'system' as const,
          content: `You are in Deep Research mode with web search enabled. Provide comprehensive, detailed explanations using current information from the web. Search for and cite recent data, statistics, and sources when available. Present information in natural, humanized language - avoid robotic tone. Include:
- Multiple perspectives and expert opinions
- Real-world examples and case studies  
- Step-by-step reasoning with clear explanations
- Practical applications and actionable insights
- Citations to web sources when referencing data

Make complex topics accessible and engaging. Break down concepts clearly for better understanding.`
        };
        
        // Insert system message at the beginning
        finalMessages = [deepResearchPrompt, ...finalMessages];
      }

      // Use longer timeout for Deep Research mode (8 minutes vs 4 minutes)
      const timeoutDuration = deepResearchMode ? DEEP_RESEARCH_TIMEOUT_MS : API_TIMEOUT_MS;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

      // Retry logic for transient failures
      const maxRetries = 2;
      let lastError;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const requestBody = config.bodyTemplate(finalMessages, effectiveWebSearchEnabled, searchMode);
          
          console.log(`📤 Calling ${modelId} (${config.provider}), attempt ${attempt + 1}/${maxRetries + 1}:`, {
            model: config.model,
            endpoint: config.endpoint,
            messageCount: finalMessages.length,
            hasApiKey: !!config.apiKey,
            webSearchEnabled: effectiveWebSearchEnabled,
            searchMode,
            deepResearchMode,
          });
          
          const response = await fetch(config.endpoint, {
            method: 'POST',
            headers: {
              ...config.headers(),
              'Connection': 'keep-alive',
              'Keep-Alive': 'timeout=600, max=100' // Increase keep-alive to 10 minutes
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorText = await response.text();
            let errorDetails;
            try {
              errorDetails = JSON.parse(errorText);
            } catch {
              errorDetails = errorText;
            }
            
            // Handle rate limiting with retry
            if (response.status === 429 && attempt < maxRetries) {
              const retryAfter = response.headers.get('Retry-After');
              const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : (attempt + 1) * 2000;
              console.log(`⚠️ Rate limited for ${modelId}, retrying after ${waitTime}ms`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
              continue; // Retry
            }
            
            // Handle other errors
            console.error(`❌ Error from ${modelId} (${config.provider}):`, {
              status: response.status,
              statusText: response.statusText,
              error: errorDetails,
              endpoint: config.endpoint,
              model: config.model,
            });
            
            if (response.status === 429) {
              console.error(`   ⚠️ Rate limit/quota exceeded for ${modelId}`);
            } else if (response.status === 402) {
              console.error(`   ⚠️ Payment required - credits exhausted for ${modelId}`);
            } else if (response.status === 401) {
              console.error(`   ⚠️ Invalid API key for ${modelId}`);
            } else if (response.status === 404) {
              console.error(`   ⚠️ Model not found: ${config.model}`);
            }
            
            lastError = new Error(`API error: ${response.status}`);
            break; // Don't retry non-rate-limit errors
          }

          const data = await response.json();
          
          // Transform response based on provider
          let content: string;
          if (config.responseTransform) {
            content = config.responseTransform(data);
          } else {
            content = data.choices[0]?.message?.content || 'No response';
          }

          console.log(`✅ Success: ${modelId} responded in time`);
          
          return {
            success: true,
            model: modelId,
            content: content,
          };
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          if (fetchError.name === 'AbortError') {
            const timeoutDuration = deepResearchMode ? DEEP_RESEARCH_TIMEOUT_MS : API_TIMEOUT_MS;
            console.error(`⏱️ Timeout: ${modelId} exceeded ${timeoutDuration}ms (${deepResearchMode ? 'Deep Research' : 'Regular'} mode)`);
            lastError = fetchError;
            break; // Don't retry timeout errors
          } else if (attempt < maxRetries) {
            console.log(`⚠️ Network error for ${modelId}, retrying...`, fetchError.message);
            await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 1000));
            lastError = fetchError;
            continue; // Retry network errors
          } else {
            console.error(`❌ Error: ${modelId} failed after ${maxRetries + 1} attempts:`, fetchError.message);
            lastError = fetchError;
            break;
          }
        }
      }

      // All retries exhausted
      return { 
        success: false, 
        model: modelId, 
        error: lastError?.message || 'Unknown error' 
      };
    });

    // Process models in batches of 2 to reduce concurrent load and avoid rate limiting
    console.log(`🚀 Processing ${selectedModels.length} model(s)...`);
    let results: PromiseSettledResult<any>[] = [];
    
    // Process first 2 models in parallel
    if (selectedModels.length > 0) {
      const batch1Models = selectedModels.slice(0, 2);
      const batch1Promises = batch1Models.map(modelId => modelPromises.find((_, idx) => selectedModels[idx] === modelId));
      const batch1Results = await Promise.allSettled(batch1Promises.filter(Boolean) as Promise<any>[]);
      results.push(...batch1Results);
      
      // Process remaining models if any
      if (selectedModels.length > 2) {
        const batch2Models = selectedModels.slice(2);
        const batch2Promises = batch2Models.map(modelId => {
          const idx = selectedModels.indexOf(modelId);
          return modelPromises[idx];
        });
        const batch2Results = await Promise.allSettled(batch2Promises.filter(Boolean) as Promise<any>[]);
        results.push(...batch2Results);
      }
    }
    
    // Extract successful responses
    const responses = results
      .filter(r => r.status === 'fulfilled' && r.value.success)
      .map(r => ({
        model: (r as PromiseFulfilledResult<any>).value.model,
        content: (r as PromiseFulfilledResult<any>).value.content,
      }));

    // Check if we got any responses
    if (responses.length === 0) {
      console.error('⚠️ All models failed to respond');
      
      // Provide specific guidance based on failure type
      const timeoutFailures = results.filter(r => 
        r.status === 'fulfilled' && r.value.error?.includes('Timeout')
      );
      
      if (timeoutFailures.length > 0) {
        return new Response(
          JSON.stringify({ 
            error: deepResearchMode 
              ? 'Deep Research timed out after 8 minutes. Try breaking your query into smaller parts or disabling web search.'
              : 'Request timed out after 4 minutes. For complex queries, enable Deep Research mode.',
            failedModels: selectedModels,
            suggestion: 'Try selecting fewer AI models or simplifying your question.'
          }),
          { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'All AI models failed to respond. This may be due to rate limits or API issues. Please try again in a few moments.',
          failedModels: selectedModels 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return response immediately to user
    const responseToSend = {
      responses,
      chatId: currentChatId,
      partialSuccess: responses.length < selectedModels.length
    };

    // Save AI responses to database in background (non-blocking)
    (async () => {
      try {
        await Promise.all(
          responses.map(r => 
            supabase.from('chat_messages').insert({
              chat_id: currentChatId,
              user_id: user.id,
              model: r.model,
              role: 'assistant',
              content: r.content,
            })
          )
        );
      } catch (err) {
        console.error('Background DB save error:', err);
      }
    })();


    return new Response(
      JSON.stringify(responseToSend),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in chat-with-ai function:', error);
    return new Response(
      JSON.stringify({ error: ERROR_MESSAGES.SERVER_ERROR }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
