import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const VALID_MODELS = ['chatgpt', 'gemini', 'claude', 'llama', 'mistral', 'grok'] as const;
const STORAGE_BUCKET_URL = 'https://pqdgpxetysqcdcjwormb.supabase.co/storage/';
const MAX_FILE_SIZE = 10_000_000; // 10MB
const MAX_MESSAGE_LENGTH = 10000;
const MAX_MODELS_PER_REQUEST = 3;
const RATE_LIMIT_REQUESTS = 10;
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute

const modelMapping: Record<string, string> = {
  chatgpt: 'openai/gpt-4o',
  gemini: 'google/gemini-pro',
  claude: 'anthropic/claude-3-5-sonnet',
  llama: 'meta-llama/llama-3.1-70b-instruct',
  mistral: 'mistralai/mistral-large',
  grok: 'x-ai/grok-2-1212',
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
  
  chatId: z.string().uuid().optional(),
  
  attachmentUrl: z.string().url().optional().refine(
    (url) => !url || url.startsWith(STORAGE_BUCKET_URL),
    'Attachment must be from your storage bucket'
  )
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse and validate request body
    const requestBody = await req.json();
    const validationResult = chatRequestSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error.errors);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request parameters', 
          details: validationResult.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { messages, selectedModels, chatId, attachmentUrl } = validationResult.data;
    
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting check
    const rateLimitStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const { count } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', rateLimitStart);

    if (count && count >= RATE_LIMIT_REQUESTS) {
      console.log(`Rate limit exceeded for user ${user.id}: ${count} requests`);
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded',
          message: `Maximum ${RATE_LIMIT_REQUESTS} requests per minute. Please try again later.`
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process attachment if present with size validation
    let processedMessages = [...messages];
    if (attachmentUrl) {
      // Validate file size before processing
      try {
        const headResponse = await fetch(attachmentUrl, { method: 'HEAD' });
        const fileSize = parseInt(headResponse.headers.get('content-length') || '0');
        
        if (fileSize > MAX_FILE_SIZE) {
          return new Response(
            JSON.stringify({ 
              error: 'File too large',
              message: `Maximum file size is ${MAX_FILE_SIZE / 1_000_000}MB`
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (error) {
        console.error('Error checking file size:', error);
        return new Response(
          JSON.stringify({ error: 'Unable to process attachment' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const fileExtension = attachmentUrl.split('.').pop()?.toLowerCase();
      const lastMessage = processedMessages[processedMessages.length - 1];
      
      if (fileExtension === 'pdf') {
        // For PDFs, add a note to the message
        processedMessages[processedMessages.length - 1] = {
          ...lastMessage,
          content: `${lastMessage.content}\n\n[I have uploaded a PDF document: ${attachmentUrl}]\nPlease help me analyze this document. Ask me to describe specific sections if needed.`
        };
      } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension || '')) {
        // For images with vision models, use proper format
        processedMessages[processedMessages.length - 1] = {
          role: 'user',
          content: [
            { type: 'text', text: lastMessage.content },
            { type: 'image_url', image_url: { url: attachmentUrl } }
          ]
        };
      } else if (['txt', 'md', 'json', 'csv'].includes(fileExtension || '')) {
        // For text files, try to fetch content
        try {
          const fileResponse = await fetch(attachmentUrl);
          const fileContent = await fileResponse.text();
          processedMessages[processedMessages.length - 1] = {
            ...lastMessage,
            content: `${lastMessage.content}\n\nFile content:\n\`\`\`\n${fileContent.slice(0, 5000)}\n\`\`\``
          };
        } catch (error) {
          console.error('Error fetching file content:', error);
          processedMessages[processedMessages.length - 1] = {
            ...lastMessage,
            content: `${lastMessage.content}\n\n[File attached: ${attachmentUrl}]`
          };
        }
      } else {
        // For other file types
        processedMessages[processedMessages.length - 1] = {
          ...lastMessage,
          content: `${lastMessage.content}\n\n[File attached: ${attachmentUrl}]`
        };
      }
    }

    // Check credits
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_pro, credits_remaining')
      .eq('id', user.id)
      .single();

    if (!profile?.is_pro && (!profile?.credits_remaining || profile.credits_remaining <= 0)) {
      return new Response(
        JSON.stringify({ error: 'No credits remaining. Please upgrade to Pro.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
        .insert({ user_id: user.id, title: title || 'New Chat' })
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

    const responses = [];

    for (const modelId of selectedModels) {
      const modelName = modelMapping[modelId] || modelMapping.chatgpt;

      // Check if model supports vision
      const visionModels = ['chatgpt', 'claude', 'gemini'];
      const supportsVision = visionModels.includes(modelId);
      
      // Use appropriate messages based on vision support
      let finalMessages = processedMessages;
      if (!supportsVision && attachmentUrl?.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        // For non-vision models with images, convert to text message
        const lastMsg = messages[messages.length - 1];
        finalMessages = [
          ...messages.slice(0, -1),
          {
            role: 'user',
            content: `${lastMsg.content}\n\n[Image attached: ${attachmentUrl}]\nNote: Please ask me to describe the image as this model cannot view it directly.`
          }
        ];
      }

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://magverse.ai',
          'X-Title': 'Magverse AI',
        },
        body: JSON.stringify({
          model: modelName,
          messages: finalMessages,
        }),
      });

      if (!response.ok) {
        console.error(`Error from ${modelId}:`, await response.text());
        continue;
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || 'No response';

      // Save AI response
      await supabase.from('chat_messages').insert({
        chat_id: currentChatId,
        user_id: user.id,
        model: modelId,
        role: 'assistant',
        content: content,
      });

      responses.push({
        model: modelId,
        content: content,
      });
    }

    // Deduct credit for free users
    if (!profile?.is_pro) {
      await supabase.rpc('check_and_deduct_credit', { p_user_id: user.id });
    }

    return new Response(
      JSON.stringify({ responses, chatId: currentChatId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in chat-with-ai function:', error);
    // Return generic error message to client, log details server-side
    return new Response(
      JSON.stringify({ 
        error: 'An error occurred processing your request',
        message: 'Please try again or contact support if the issue persists'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
