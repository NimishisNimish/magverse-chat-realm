import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const modelMapping: Record<string, string> = {
  chatgpt: 'openai/gpt-4o',
  gemini: 'google/gemini-pro',
  claude: 'anthropic/claude-3-5-sonnet',
  llama: 'meta-llama/llama-3.1-70b-instruct',
  mistral: 'mistralai/mistral-large',
  grok: 'x-ai/grok-2-1212',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, selectedModels, chatId } = await req.json();
    
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
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
      const { data: newChat } = await supabase
        .from('chat_history')
        .insert({ user_id: user.id, title: messages[0]?.content?.substring(0, 50) || 'New Chat' })
        .select()
        .single();
      currentChatId = newChat?.id;
    }

    // Save user message
    await supabase.from('chat_messages').insert({
      chat_id: currentChatId,
      user_id: user.id,
      role: 'user',
      content: messages[messages.length - 1].content,
    });

    const responses = [];

    for (const modelId of selectedModels) {
      const modelName = modelMapping[modelId] || modelMapping.chatgpt;

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
          messages: messages,
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
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
