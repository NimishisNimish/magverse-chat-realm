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
const API_TIMEOUT_MS = 150000; // 150 seconds (2.5 minutes) for regular queries
const DEEP_RESEARCH_TIMEOUT_MS = 300000; // 300 seconds (5 minutes) for deep research mode

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
    endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${googleApiKey}`,
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
      })),
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      }
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
          temperature: 0.5,
          max_tokens: 2000,
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
      max_tokens: 4000,
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

/**
 * Helper function to perform web search and format results for all models
 */
async function performWebSearch(query: string, searchMode: string = 'general'): Promise<{ content: string, sources: Array<{url: string, title: string, snippet?: string}> }> {
  if (!perplexityApiKey) {
    console.error('⚠️ Perplexity API key not configured for web search');
    return { content: '', sources: [] };
  }

  try {
    console.log('🔍 Performing web search:', query);
    
    const domains = getSearchDomains(searchMode);
    const searchPayload: any = {
      model: 'sonar', // Use sonar for search (faster than sonar-pro)
      messages: [
        {
          role: 'system',
          content: 'You are a web search assistant. Provide concise, factual information from recent web sources. Use numbered citations like [1], [2] for each source you reference.'
        },
        {
          role: 'user',
          content: query
        }
      ],
      temperature: 0.2,
      max_tokens: 1000,
      search_recency_filter: 'month',
      return_citations: true, // Request citations from Perplexity
    };

    if (domains.length > 0) {
      searchPayload.search_domain_filter = domains;
    }

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(searchPayload),
    });

    if (!response.ok) {
      console.error('❌ Web search failed:', response.status);
      return { content: '', sources: [] };
    }

    const data = await response.json();
    const searchResults = data.choices[0]?.message?.content || '';
    
    // Extract citations from Perplexity response
    const citations = data.citations || [];
    const sources = citations.map((citation: string, index: number) => ({
      url: citation,
      title: `Source ${index + 1}`,
      snippet: '' // Perplexity doesn't provide snippets in citations
    }));
    
    console.log('✅ Web search completed with', sources.length, 'sources:', searchResults.substring(0, 200) + '...');
    return { content: searchResults, sources };
  } catch (error) {
    console.error('❌ Web search error:', error);
    return { content: '', sources: [] };
  }
}

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
  
  attachmentExtension: z.string().optional(),
  
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

    const { messages, selectedModels, chatId, attachmentUrl, attachmentExtension, webSearchEnabled = false, searchMode = 'general', deepResearchMode = false } = validationResult.data;
    
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
      const urlWithoutQuery = attachmentUrl.split('?')[0];
      const detectedExtension = urlWithoutQuery.split('.').pop()?.toLowerCase();
      
      console.log('📎 Attachment details:', {
        url: attachmentUrl.substring(0, 100) + '...',
        urlWithoutQuery: urlWithoutQuery.substring(0, 100),
        detectedExtension,
        explicitExtension: attachmentExtension,
        selectedModels,
        timestamp: new Date().toISOString()
      });
      
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

      // Use explicit extension if provided, otherwise detect from URL (without query params)
      const fileExtension = attachmentExtension || urlWithoutQuery.split('.').pop()?.toLowerCase();
      const lastMessage = processedMessages[processedMessages.length - 1];
      
      console.log('📎 File extension:', fileExtension, '(explicit:', !!attachmentExtension, ')');
      
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
              content: `${lastMessage.content}\n\n[❌ PDF Processing Failed: This PDF appears to be a scanned document or image-based PDF with no extractable text. To analyze this file:\n• Convert to text using OCR software (like Adobe Acrobat or online OCR tools)\n• Upload as individual images instead\n• Or describe the content manually in your message]`
            };
          } else {
            console.warn('⚠️ PDF extraction returned no text');
            processedMessages[processedMessages.length - 1] = {
              ...lastMessage,
              content: `${lastMessage.content}\n\n[❌ PDF Processing Failed: Could not extract text from this PDF. Possible reasons:\n• Scanned/image-based PDF (needs OCR)\n• Password-protected file\n• Corrupted PDF file\n• File format incompatibility\n\nPlease try a different file or upload as images.]`
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
        console.log('🖼️ Image attachment detected for multiple models');
        
        // Don't modify processedMessages here - we'll handle it per model
        // Just log that image was detected
        console.log(`📸 Image will be processed individually for each model: ${selectedModels.join(', ')}`);
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
      
      console.log('✅ Attachment processing complete:', {
        processed: true,
        messageContentLength: processedMessages[processedMessages.length - 1].content.length || processedMessages[processedMessages.length - 1].content[0]?.text?.length,
        contentType: typeof processedMessages[processedMessages.length - 1].content
      });
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
      
      // Handle image attachments per model
      let finalMessages = processedMessages;
      
      // Perform web search if enabled (for ALL models except Perplexity, which does its own native search)
      let webSearchSources: Array<{url: string, title: string, snippet?: string}> = [];
      let webSearchApplied = false;
      if (effectiveWebSearchEnabled && modelId !== 'perplexity') {
        const lastMsg = processedMessages[processedMessages.length - 1];
        const userQuery = typeof lastMsg.content === 'string' 
          ? lastMsg.content 
          : (Array.isArray(lastMsg.content) && lastMsg.content[0]?.text) || '';

        if (userQuery) {
          console.log(`🌐 Web search enabled for ${modelId}, searching...`);
          const searchResults = await performWebSearch(userQuery, searchMode);
          
          if (searchResults.content) {
            webSearchSources = searchResults.sources;
            webSearchApplied = true;
            
            // Inject search results into the prompt with numbered citations
            const sourcesText = searchResults.sources.length > 0 
              ? `\n\n**Sources:**\n${searchResults.sources.map((s, i) => `[${i+1}] ${s.url}`).join('\n')}`
              : '';
            
            const enhancedPrompt = `${userQuery}

---
📊 **Recent Web Information:**
${searchResults.content}${sourcesText}
---

Please synthesize the above web information with your knowledge to provide a comprehensive answer. When referencing web data, use numbered citations like [1], [2] corresponding to the sources above.`;

            finalMessages = [
              ...processedMessages.slice(0, -1),
              {
                role: 'user',
                content: enhancedPrompt
              }
            ];
            
            console.log(`✅ Web search results with ${webSearchSources.length} sources injected into ${modelId} prompt`);
          }
        }
      }
      
      // Handle image attachments (this needs to merge with web search if both are present)
      if (attachmentUrl?.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        // Get the base content (either from web search enhanced prompt or original message)
        const lastMsg = webSearchApplied 
          ? finalMessages[finalMessages.length - 1]
          : messages[messages.length - 1];
        const baseContent = webSearchApplied 
          ? (finalMessages[finalMessages.length - 1].content as string)
          : lastMsg.content;
        
        // Use explicit extension if provided, otherwise detect from URL (without query params)
        const urlWithoutQuery = attachmentUrl.split('?')[0];
        const fileExtension = attachmentExtension || urlWithoutQuery.split('.').pop()?.toLowerCase();
        
        if (supportsVision) {
          if (modelId === 'gemini') {
            // Gemini needs base64 inline_data format
            try {
              console.log(`📥 Fetching image for Gemini (${modelId}) base64 conversion`);
              const imageResponse = await fetch(attachmentUrl);
              const imageBuffer = await imageResponse.arrayBuffer();
              const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
              const mimeType = `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`;
              
              finalMessages = [
                ...(webSearchApplied ? finalMessages.slice(0, -1) : processedMessages.slice(0, -1)),
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: baseContent },
                    { 
                      type: 'inline_data',
                      inline_data: { mime_type: mimeType, data: base64Image }
                    }
                  ]
                }
              ];
              console.log(`✅ Image converted to base64 for ${modelId}${webSearchApplied ? ' (with web search)' : ''}`);
            } catch (error) {
              console.error(`❌ Failed to convert image for ${modelId}:`, error);
              finalMessages = [
                ...(webSearchApplied ? finalMessages.slice(0, -1) : processedMessages.slice(0, -1)),
                {
                  role: 'user',
                  content: `${baseContent}\n\n[Note: Image was attached but conversion failed for ${modelId}]`
                }
              ];
            }
          } else if (['chatgpt', 'claude'].includes(modelId)) {
            // OpenAI/Claude use image_url format
            console.log(`✅ Image formatted for ${modelId} (image_url)${webSearchApplied ? ' with web search' : ''}`);
            finalMessages = [
              ...(webSearchApplied ? finalMessages.slice(0, -1) : processedMessages.slice(0, -1)),
              {
                role: 'user',
                content: [
                  { type: 'text', text: baseContent },
                  { type: 'image_url', image_url: { url: attachmentUrl } }
                ]
              }
            ];
          }
        } else {
          // Non-vision model - add helpful note
          console.log(`⚠️ ${modelId} doesn't support vision`);
          finalMessages = [
            ...(webSearchApplied ? finalMessages.slice(0, -1) : processedMessages.slice(0, -1)),
            {
              role: 'user',
              content: `${baseContent}\n\n[Note: An image was attached but ${modelId} doesn't support image analysis. Please describe the image or select a vision-capable model (ChatGPT, Claude, or Gemini).]`
            }
          ];
        }
      }
      
      // Add Deep Research system prompt if enabled
      if (deepResearchMode && finalMessages.length > 0) {
        const deepResearchPrompt = {
          role: 'system' as const,
          content: effectiveWebSearchEnabled
            ? `You are in Deep Research mode with real-time web search enabled. Web search results have been injected into the user's query. Provide comprehensive, detailed explanations combining:
- Current web information (provided in the query)
- Your extensive training knowledge
- Multiple perspectives and expert opinions
- Real-world examples and case studies
- Step-by-step reasoning with clear explanations
- Practical applications and actionable insights
- Citations from web sources when referencing them

Make complex topics accessible and engaging.`
            : `You are in Deep Research mode. Provide comprehensive, detailed explanations using your extensive training data. Include:
- Multiple perspectives and approaches
- Real-world examples and case studies
- Step-by-step reasoning with clear explanations
- Practical applications and actionable insights

Make complex topics accessible and engaging.`
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
            sources: webSearchSources, // Add sources from web search
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

    // Run all models in parallel for maximum speed
    console.log(`🚀 Processing ${selectedModels.length} model(s) in parallel...`);
    const results = await Promise.allSettled(modelPromises);
    
    // Extract successful responses
    const responses = results
      .filter(r => r.status === 'fulfilled' && r.value.success)
      .map(r => ({
        model: (r as PromiseFulfilledResult<any>).value.model,
        content: (r as PromiseFulfilledResult<any>).value.content,
        sources: (r as PromiseFulfilledResult<any>).value.sources || [], // Include sources
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
