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

const sudoApiKey = Deno.env.get('SUDO_API_KEY'); // Sudo API for Claude and Grok
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
  sudo: !!sudoApiKey, // Unified key for Claude, Grok
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
    supportsStreaming: true,
    headers: () => {
      if (!perplexityApiKey) {
        throw new Error('Perplexity API key is not configured. Please add your API key in Settings.');
      }
      console.log('🔑 Perplexity headers generated:', {
        hasApiKey: !!perplexityApiKey,
        keyLength: perplexityApiKey?.length,
        keyStart: perplexityApiKey?.substring(0, 8) + '...'
      });
      return {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      };
    },
    bodyTemplate: (messages: any[], webSearchEnabled?: boolean, searchMode?: string, stream?: boolean) => {
      const baseConfig: any = {
        model: 'sonar-pro',
        messages,
        stream: stream || false,
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
    responseTransform: (data: any) => {
      console.log('📊 Perplexity raw response:', JSON.stringify(data, null, 2));
      
      const content = data.choices?.[0]?.message?.content || 
                     data.choices?.[0]?.text ||
                     '';
      
      console.log('✅ Perplexity extracted content length:', content.length);
      console.log('✅ Perplexity content preview:', content.substring(0, 200));
      
      if (!content) {
        console.error('❌ No content in Perplexity response');
        return 'Error: No response content from Perplexity';
      }
      
      return content;
    },
  },
  claude: {
    provider: 'sudo',
    apiKey: sudoApiKey,
    endpoint: 'https://sudoapp.dev/api/v1/chat/completions',
    model: 'claude-sonnet-4-20250514',
    supportsStreaming: false,
    headers: () => {
      if (!sudoApiKey) {
        throw new Error('Sudo API key is not configured. Please add your API key in Settings.');
      }
      console.log('🔑 Sudo (Claude) headers generated');
      return {
        'Authorization': `Bearer ${sudoApiKey}`,
        'Content-Type': 'application/json',
      };
    },
    bodyTemplate: (messages: any[], _webSearchEnabled?: boolean, _searchMode?: string) => ({
      model: 'claude-sonnet-4-20250514',
      messages,
      temperature: 0.7,
      max_tokens: 4096,
      stream: false,
    }),
    responseTransform: (data: any) => {
      console.log('📊 Sudo (Claude) raw response:', JSON.stringify(data, null, 2));
      
      const content = data.choices?.[0]?.message?.content || '';
      
      console.log('✅ Sudo (Claude) extracted content length:', content.length);
      console.log('✅ Sudo (Claude) content preview:', content.substring(0, 200));
      
      if (!content) {
        console.error('❌ No content in Sudo (Claude) response');
        return 'Error: No response content from Claude';
      }
      
      return content;
    },
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
    provider: 'sudo',
    apiKey: sudoApiKey,
    endpoint: 'https://sudoapp.dev/api/v1/chat/completions',
    model: 'grok-2-1212',
    headers: () => {
      if (!sudoApiKey) {
        throw new Error('Sudo API key is not configured. Please add your API key in Settings.');
      }
      return {
        'Authorization': `Bearer ${sudoApiKey}`,
        'Content-Type': 'application/json',
      };
    },
    bodyTemplate: (messages: any[], _webSearchEnabled?: boolean, _searchMode?: string) => ({
      model: 'grok-2-1212',
      messages,
      temperature: 0.7,
      max_tokens: 2000,
      stream: false,
    }),
    responseTransform: (data: any) => {
      const content = data.choices?.[0]?.message?.content || '';
      if (!content) {
        console.error('❌ No content in Sudo (Grok) response');
        return 'Error: No response content from Grok';
      }
      return content;
    },
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
  stream: z.boolean().optional(),
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

    const { messages, selectedModels, chatId, attachmentUrl, attachmentExtension, webSearchEnabled = false, searchMode = 'general', deepResearchMode = false, stream = false } = validationResult.data;
    
    // Auto-enable web search for Deep Research mode
    const effectiveWebSearchEnabled = deepResearchMode ? true : webSearchEnabled;
    
    // Image generation mode is not yet supported in this version
    const imageGenerationMode = false;
    
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

    // ====== FETCH USER CUSTOM INSTRUCTIONS ======
    let customInstructions: string | null = null;
    try {
      const { data: instructionsData, error: instructionsError } = await supabase
        .from('ai_custom_instructions')
        .select('instructions')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();
      
      if (instructionsData && !instructionsError) {
        customInstructions = instructionsData.instructions;
        console.log(`📝 Custom instructions loaded for user ${user.id}: "${customInstructions?.substring(0, 100)}..."`);
      } else {
        console.log('📝 No custom instructions found for user', user.id);
      }
    } catch (error) {
      console.log('📝 No custom instructions found, using defaults');
    }
    // ====== END CUSTOM INSTRUCTIONS ======

    // ====== CREDIT DEDUCTION SYSTEM ======
    // Determine credit cost based on mode
    const creditCost = deepResearchMode ? 2 : 
                       imageGenerationMode ? 3 : 
                       1; // Normal message costs 1 credit

    console.log(`💳 Credit deduction check: Mode=${deepResearchMode ? 'Deep Research (2)' : imageGenerationMode ? 'Image Generation (3)' : 'Normal (1)'}, User=${user.id}`);

    // Call database function to check and deduct credits
    const { data: creditResult, error: creditError } = await supabase
      .rpc('check_and_deduct_credits', {
        p_user_id: user.id,
        p_credits_to_deduct: creditCost
      });

    if (creditError) {
      console.error('❌ Credit deduction error:', creditError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify credits. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!creditResult?.success) {
      const errorMessage = creditResult?.error || 'Insufficient credits';
      const subscriptionType = creditResult?.subscription_type || 'free';
      const creditsRemaining = creditResult?.credits_remaining || 0;
      const dailyLimit = creditResult?.daily_limit || 5;

      console.log(`⚠️ Insufficient credits:`, {
        subscriptionType,
        creditsRemaining,
        requiredCredits: creditCost,
        dailyLimit,
        mode: deepResearchMode ? 'deep_research' : imageGenerationMode ? 'image_generation' : 'normal'
      });

      return new Response(
        JSON.stringify({ 
          error: subscriptionType === 'monthly' 
            ? `Daily limit reached! You've used all 500 daily messages. Upgrade to Lifetime Pro for unlimited messages.`
            : `Insufficient credits! This ${deepResearchMode ? 'deep research query' : imageGenerationMode ? 'image generation' : 'message'} requires ${creditCost} credit${creditCost > 1 ? 's' : ''}, but you only have ${creditsRemaining}. ${subscriptionType === 'free' ? 'Upgrade to Pro for more credits!' : 'Credits reset daily at midnight.'}`,
          creditsRequired: creditCost,
          creditsRemaining,
          subscriptionType,
          dailyLimit,
          upgradeUrl: '/payment'
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Credits deducted successfully:`, {
      creditCost,
      creditsRemaining: creditResult.credits_remaining,
      subscriptionType: creditResult.subscription_type,
      unlimited: creditResult.unlimited || false
    });
    // ====== END CREDIT DEDUCTION ======

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
            // Return error immediately for scanned/image-based PDFs
            console.error('❌ PDF is scanned or image-based - no extractable text');
            return new Response(
              JSON.stringify({ 
                error: 'This PDF appears to be a scanned document or image-based PDF with no extractable text. Please convert it to a text-based PDF using OCR software, or upload the pages as individual images instead.' 
              }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          } else {
            // Return error for other PDF processing failures
            console.error('❌ PDF processing failed - no text extracted');
            return new Response(
              JSON.stringify({ 
                error: 'Could not extract text from this PDF. Possible reasons: scanned/image-based PDF (needs OCR), password-protected file, corrupted PDF, or incompatible format. Please try a different file or upload as images.' 
              }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } catch (error: any) {
          console.error('❌ Error extracting PDF:', error);
          
          // Return error immediately instead of proceeding
          let errorMessage = 'PDF processing failed: ';
          if (error.message?.includes('timeout')) {
            errorMessage += 'Extraction timed out - the PDF may be too large or complex. Try a smaller file.';
          } else if (error.message?.includes('expired')) {
            errorMessage += 'File access expired - please re-upload the PDF.';
          } else {
            errorMessage += error.message || 'Unknown error occurred while processing PDF.';
          }
          
          return new Response(
            JSON.stringify({ error: errorMessage }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
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
          modelId === 'claude' ? 'OPENROUTER_API_KEY (for Claude)' :
          modelId === 'grok' ? 'OPENROUTER_API_KEY (for Grok)' :
          'OPENROUTER_API_KEY'
        }`);
        console.error(`   📋 API Key Status:`, {
          model: modelId,
          provider: config.provider,
          hasKey: false,
          endpoint: config.endpoint,
          actualModel: config.model
        });
        return { success: false, model: modelId, error: `Missing API key. Please configure the required secret in Supabase Edge Function settings.` };
      }

      console.log(`✅ API key validated for ${modelId}:`, {
        provider: config.provider,
        model: config.model,
        endpoint: config.endpoint,
        hasKey: true
      });

      // Retry logic with exponential backoff and improved error handling
      const makeAPICall = async (retries = 3, delay = 2000): Promise<any> => {
        for (let attempt = 0; attempt <= retries; attempt++) {
          try {
            const timeout = deepResearchMode ? DEEP_RESEARCH_TIMEOUT_MS : API_TIMEOUT_MS;
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error(`${modelId} request timed out after ${timeout/1000}s`)), timeout)
            );

            // Validate API key before making request
            if (!config.apiKey) {
              throw new Error(`${modelId} API key is not configured. Please add your API key in Settings.`);
            }

            const requestBody = config.bodyTemplate(finalMessages, effectiveWebSearchEnabled, searchMode);
            console.log(`🔄 Attempt ${attempt + 1}/${retries + 1} for ${modelId} (${config.provider})`);

            // Generate headers (with error handling)
            let headers;
            try {
              headers = config.headers();
            } catch (headerError: any) {
              throw new Error(headerError.message || `Failed to generate headers for ${modelId}`);
            }

            const fetchPromise = fetch(config.endpoint, {
              method: 'POST',
              headers,
              body: JSON.stringify(requestBody),
            });

            const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;

            if (response.ok) {
              const data = await response.json();
              console.log(`✅ ${modelId} responded successfully`);
              return { success: true, data };
            }

            // Handle specific error codes
            const errorText = await response.text();
            console.error(`❌ ${modelId} API error (${response.status}):`, errorText.substring(0, 500));

            // Handle authentication errors (don't retry)
            if (response.status === 401 || response.status === 403) {
              throw new Error(`${modelId} authentication failed. Please check your API key in Settings.`);
            }

            // Handle rate limiting with exponential backoff (longer delays)
            if (response.status === 429 && attempt < retries) {
              const backoffDelay = delay * Math.pow(3, attempt); // 2s, 6s, 18s
              console.log(`⏳ ${modelId} rate limited, waiting ${backoffDelay}ms before retry ${attempt + 2}/${retries + 1}...`);
              await new Promise(resolve => setTimeout(resolve, backoffDelay));
              continue;
            }
            
            // Handle server errors with retry
            if (response.status >= 500 && attempt < retries) {
              const backoffDelay = delay * Math.pow(2, attempt); // 2s, 4s, 8s
              console.log(`⏳ ${modelId} server error (${response.status}), waiting ${backoffDelay}ms before retry ${attempt + 2}/${retries + 1}...`);
              await new Promise(resolve => setTimeout(resolve, backoffDelay));
              continue;
            }

            // Handle payment/credit issues
            if (response.status === 402) {
              throw new Error(`${modelId} requires payment or credits. Please add credits to your account.`);
            }

            // Handle bad request errors
            if (response.status === 400) {
              throw new Error(`${modelId} bad request: ${errorText.substring(0, 200)}`);
            }

            throw new Error(`${modelId} API error (${response.status}): ${errorText.substring(0, 200)}`);
          } catch (error: any) {
            // Don't retry on specific errors
            if (
              attempt === retries || 
              error.message.includes('authentication') || 
              error.message.includes('API key') ||
              error.message.includes('Payment required') ||
              error.message.includes('credits') ||
              error.message.includes('bad request')
            ) {
              throw error;
            }
            
            // Network or timeout errors - retry with backoff
            console.error(`❌ ${modelId} attempt ${attempt + 1}/${retries + 1} failed:`, error.message);
            if (attempt < retries) {
              const backoffDelay = delay * Math.pow(2, attempt);
              console.log(`⏳ Retrying ${modelId} in ${backoffDelay}ms...`);
              await new Promise(resolve => setTimeout(resolve, backoffDelay));
            }
          }
        }
        throw new Error(`${modelId} failed after ${retries + 1} attempts`);
      };

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

Please synthesize the above web information to provide a current, accurate answer. Use numbered citations [1], [2] when referencing web data.`;

            // Replace last user message with enhanced prompt
            finalMessages = [
              ...processedMessages.slice(0, -1),
              {
                role: 'user',
                content: enhancedPrompt
              }
            ];
            
            console.log(`✅ Web search results injected for ${modelId}`);
          }
        }
      }

      const { success, data, error } = await makeAPICall();

      if (!success) {
        console.error(`❌ ${modelId} failed:`, error);
        return { success: false, model: modelId, error: error || 'Unknown error', sources: [] };
      }

      // Transform response using provider-specific transformation
      const response = config.responseTransform ? config.responseTransform(data) : data.choices[0]?.message?.content;
      
      // Extract sources from Perplexity native response
      let responseSources = webSearchSources;
      if (modelId === 'perplexity' && data.citations) {
        responseSources = data.citations.map((citation: string, index: number) => ({
          url: citation,
          title: `Source ${index + 1}`,
          snippet: ''
        }));
      }

      // Save model response
      await supabase.from('chat_messages').insert({
        chat_id: currentChatId,
        user_id: user.id,
        role: 'assistant',
        content: response || 'No response',
        model: modelId,
      });

      return { 
        success: true, 
        model: modelId, 
        response: response || 'No response', 
        sources: responseSources.length > 0 ? responseSources : undefined,
        webSearchApplied
      };
      
      // Handle PDF attachments - extract text using extract-pdf-text function
      if (attachmentUrl?.match(/\.pdf$/i)) {
        try {
          console.log(`📄 Extracting PDF text for ${modelId}...`);
          
          // Call the extract-pdf-text function
          const pdfExtractResponse = await fetch(`${supabaseUrl}/functions/v1/extract-pdf-text`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseAnonKey}`,
            },
            body: JSON.stringify({ url: attachmentUrl }),
          });
          
          if (!pdfExtractResponse.ok) {
            throw new Error('Failed to extract PDF text');
          }
          
          const pdfData = await pdfExtractResponse.json();
          
          if (pdfData.success && pdfData.text) {
            const lastMsg = finalMessages[finalMessages.length - 1];
            const baseContent = typeof lastMsg.content === 'string' ? lastMsg.content : '';
            
            finalMessages = [
              ...finalMessages.slice(0, -1),
              {
                role: 'user',
                content: `${baseContent}\n\n📄 **PDF Document Content** (${pdfData.wordCount} words):\n\n${pdfData.text}`
              }
            ];
            console.log(`✅ PDF content extracted for ${modelId} (${pdfData.wordCount} words)`);
          } else {
            console.warn(`⚠️ PDF extraction returned no text for ${modelId}`);
          }
        } catch (error) {
          console.error(`Failed to extract PDF for ${modelId}:`, error);
          // Continue without PDF text - don't fail the entire request
        }
      }
      
      // Handle image attachments (this needs to merge with web search if both are present)
      if (attachmentUrl?.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        const validAttachmentUrl: string = attachmentUrl!; // Non-null assertion - checked by if condition
        
        // Get the base content (either from web search enhanced prompt or original message)
        const lastMsg = webSearchApplied 
          ? finalMessages[finalMessages.length - 1]
          : messages[messages.length - 1];
        const baseContent = webSearchApplied 
          ? (finalMessages[finalMessages.length - 1].content as string)
          : lastMsg.content;
        
        // Use explicit extension if provided, otherwise detect from URL (without query params)
        const urlWithoutQuery = validAttachmentUrl.split('?')[0];
        const fileExtension = attachmentExtension || urlWithoutQuery.split('.').pop()?.toLowerCase();
        
        if (supportsVision) {
          if (modelId === 'gemini') {
            // Gemini needs base64 inline_data format
            try {
              console.log(`📥 Fetching image for Gemini (${modelId}) base64 conversion`);
              const imageResponse = await fetch(validAttachmentUrl);
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
        const basePrompt = effectiveWebSearchEnabled
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

Make complex topics accessible and engaging.`;

        const deepResearchPrompt = {
          role: 'system' as const,
          content: customInstructions 
            ? `${basePrompt}\n\n--- User's Custom Instructions ---\n${customInstructions}`
            : basePrompt
        };
        
        // Insert system message at the beginning
        finalMessages = [deepResearchPrompt, ...finalMessages];
      } else if (customInstructions) {
        // Add custom instructions even for normal mode
        const customPrompt = {
          role: 'system' as const,
          content: `You are a helpful AI assistant. Follow these custom instructions from the user:\n\n${customInstructions}`
        };
        finalMessages = [customPrompt, ...finalMessages];
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
              const waitTime = retryAfter ? parseInt(retryAfter || '0') * 1000 : (attempt + 1) * 2000;
              console.log(`⚠️ Rate limited for ${modelId}, retrying after ${waitTime}ms`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
              continue; // Retry
            }
            
            // Handle other errors with user-friendly messages
            console.error(`❌ Error from ${modelId} (${config.provider}):`, {
              status: response.status,
              statusText: response.statusText,
              error: errorDetails,
              endpoint: config.endpoint,
              model: config.model,
            });
            
            let userMessage = '';
            if (response.status === 429) {
              console.error(`   ⚠️ Rate limit/quota exceeded for ${modelId}`);
              userMessage = `${modelId} is currently experiencing high demand. Please try again in a moment.`;
            } else if (response.status === 402) {
              console.error(`   ⚠️ Payment required - credits exhausted for ${modelId}`);
              userMessage = `${modelId} service temporarily unavailable. Please try another model.`;
            } else if (response.status === 401) {
              console.error(`   ⚠️ Invalid API key for ${modelId}`);
              userMessage = `${modelId} authentication failed. Please contact support.`;
            } else if (response.status === 404) {
              console.error(`   ⚠️ Model not found: ${config.model}`);
              userMessage = `${modelId} model not found. Please try another model.`;
            } else if (response.status === 500 || response.status === 503) {
              userMessage = `${modelId} is temporarily unavailable. Please try again shortly.`;
            } else {
              userMessage = `${modelId} encountered an error. Please try another model or retry.`;
            }
            
            // Return user-friendly error instead of throwing
            return {
              success: false,
              model: modelId,
              error: userMessage
            };
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

      // All retries exhausted - return user-friendly message
      const timeoutMsg = lastError?.name === 'AbortError' 
        ? `${modelId} took too long to respond. Try again or use another model.`
        : `${modelId} is currently unavailable. Please try another model.`;
      
      return { 
        success: false, 
        model: modelId, 
        error: timeoutMsg
      };
    });

    // Run all models in parallel for maximum speed
    console.log(`🚀 Processing ${selectedModels.length} model(s) in parallel...`);
    const results = await Promise.allSettled(modelPromises);
    
    // Extract both successful and failed responses
    const responses = results.map(r => {
      if (r.status === 'fulfilled') {
        if (r.value.success) {
          return {
            model: r.value.model,
            response: r.value.content,
            sources: r.value.sources || [],
            success: true
          };
        } else {
          return {
            model: r.value.model,
            response: r.value.error || 'Unknown error occurred',
            success: false,
            error: true
          };
        }
      } else {
        // Promise rejected
        return {
          model: 'unknown',
          response: 'Request failed unexpectedly',
          success: false,
          error: true
        };
      }
    });

    // Check if we got any successful responses
    const successfulResponses = responses.filter(r => r.success);
    if (successfulResponses.length === 0) {
      console.error('⚠️ All models failed to respond');
      
      // Provide specific guidance based on failure type
      const hasTimeoutFailures = responses.some(r => r.response?.includes('too long'));
      
      if (hasTimeoutFailures) {
        return new Response(
          JSON.stringify({ 
            error: deepResearchMode 
              ? 'Deep Research timed out after 5 minutes. Try breaking your query into smaller parts or disabling web search.'
              : 'Request timed out. For complex queries, enable Deep Research mode.',
            responses, // Include error responses for debugging
            failedModels: selectedModels,
            suggestion: 'Try selecting fewer AI models or simplifying your question.'
          }),
          { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'All AI models failed to respond. This may be due to rate limits or API issues. Please try again in a few moments.',
          responses, // Include error responses so user can see what went wrong
          failedModels: selectedModels 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return response immediately to user
    const responseToSend = {
      responses,
      chatId: currentChatId,
      partialSuccess: successfulResponses.length < selectedModels.length,
      successCount: successfulResponses.length,
      totalRequested: selectedModels.length
    };

    // Save only successful AI responses to database in background (non-blocking)
    (async () => {
      try {
        await Promise.all(
          successfulResponses.map(r => 
            supabase.from('chat_messages').insert({
              chat_id: currentChatId,
              user_id: user.id,
              model: r.model,
              role: 'assistant',
              content: r.response,
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
