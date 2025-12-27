import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * AI Fast Chat - Optimized for speed
 * - No DB writes before streaming
 * - Minimal context (last 4 messages)
 * - Immediate token delivery
 * - Strict timeouts
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const FIRST_TOKEN_DEADLINE_MS = 5000; // 5 seconds max to first token
const MAX_CONTEXT_MESSAGES = 4;

// Model routing for fast responses
const FAST_MODELS: Record<string, string> = {
  'gemini-flash': 'google/gemini-2.5-flash',
  'gpt5-mini': 'openai/gpt-5-mini',
  'gpt5-nano': 'openai/gpt-5-nano',
};

const FALLBACK_MODEL = 'google/gemini-2.5-flash';

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestStart = Date.now();
  console.log(`⚡ [ai-fast-chat] Request started at ${new Date().toISOString()}`);

  try {
    const { messages, model = 'gemini-flash' } = await req.json();

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Optimize: only send last N messages for speed
    const optimizedMessages = messages.length > MAX_CONTEXT_MESSAGES
      ? messages.slice(-MAX_CONTEXT_MESSAGES)
      : messages;

    // Add concise system prompt
    const finalMessages = [
      { role: 'system', content: 'Be direct and concise. Answer immediately.' },
      ...optimizedMessages,
    ];

    const selectedModel = FAST_MODELS[model] || FALLBACK_MODEL;
    console.log(`📤 Streaming with ${selectedModel}, ${finalMessages.length} messages`);

    // Create abort controller for timeout
    const abortController = new AbortController();
    
    // Strict first token deadline - abort if no response starts
    const firstTokenTimeout = setTimeout(() => {
      console.error(`⏰ First token deadline exceeded (${FIRST_TOKEN_DEADLINE_MS}ms)`);
      abortController.abort();
    }, FIRST_TOKEN_DEADLINE_MS);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: finalMessages,
        stream: true,
      }),
      signal: abortController.signal,
    });

    // Clear timeout once we get response headers
    clearTimeout(firstTokenTimeout);
    
    const headerTime = Date.now() - requestStart;
    console.log(`📥 Headers received in ${headerTime}ms`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API error: ${response.status}`, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`API error: ${response.status}`);
    }

    // Stream response directly - no processing overhead
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Request-Start": requestStart.toString(),
      },
    });

  } catch (error: any) {
    console.error(`❌ [ai-fast-chat] Error:`, error.message);
    
    if (error.name === 'AbortError') {
      return new Response(
        JSON.stringify({ error: "Request timed out. Try a faster model." }),
        { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
