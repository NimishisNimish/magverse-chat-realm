import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * AI Reasoning - For complex queries
 * - Supports deep research models
 * - Higher timeout limits
 * - Web search integration
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");

const FIRST_TOKEN_DEADLINE_MS = 30000; // 30s for reasoning models
const MAX_CONTEXT_MESSAGES = 10;

// Reasoning model routing
const REASONING_MODELS: Record<string, { provider: string; model: string }> = {
  'gemini-pro': { provider: 'lovable', model: 'google/gemini-2.5-pro' },
  'gpt5': { provider: 'lovable', model: 'openai/gpt-5' },
  'perplexity-pro': { provider: 'perplexity', model: 'sonar-pro' },
  'perplexity-reasoning': { provider: 'perplexity', model: 'sonar-deep-research' },
};

const FALLBACK = { provider: 'lovable', model: 'google/gemini-2.5-flash' };

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestStart = Date.now();
  console.log(`🧠 [ai-reasoning] Request started at ${new Date().toISOString()}`);

  try {
    const { messages, model = 'gemini-pro', webSearch = false } = await req.json();

    // Get model config or fallback
    const config = REASONING_MODELS[model] || FALLBACK;
    console.log(`📤 Using ${config.provider}/${config.model}, webSearch=${webSearch}`);

    // Optimize messages
    const optimizedMessages = messages.length > MAX_CONTEXT_MESSAGES
      ? messages.slice(-MAX_CONTEXT_MESSAGES)
      : messages;

    // Add reasoning-focused system prompt
    const finalMessages = [
      { 
        role: 'system', 
        content: 'You are a thorough analytical assistant. Think step-by-step and provide comprehensive answers with clear reasoning.' 
      },
      ...optimizedMessages,
    ];

    // Abort controller for timeout
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      console.error(`⏰ Reasoning timeout exceeded (${FIRST_TOKEN_DEADLINE_MS}ms)`);
      abortController.abort();
    }, FIRST_TOKEN_DEADLINE_MS);

    let response: Response;

    if (config.provider === 'perplexity') {
      if (!PERPLEXITY_API_KEY) {
        throw new Error("Perplexity API key not configured");
      }

      // Perplexity doesn't always support streaming for deep research
      const supportsStream = config.model !== 'sonar-deep-research';

      response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.model,
          messages: finalMessages,
          temperature: 0.2,
          max_tokens: 8192,
          stream: supportsStream,
        }),
        signal: abortController.signal,
      });
    } else {
      if (!LOVABLE_API_KEY) {
        throw new Error("LOVABLE_API_KEY not configured");
      }

      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.model,
          messages: finalMessages,
          stream: true,
        }),
        signal: abortController.signal,
      });
    }

    clearTimeout(timeoutId);
    
    const headerTime = Date.now() - requestStart;
    console.log(`📥 Headers received in ${headerTime}ms`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API error: ${response.status}`, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`API error: ${response.status}`);
    }

    // Check content type - stream if SSE, otherwise return JSON
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('text/event-stream')) {
      return new Response(response.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "X-Request-Start": requestStart.toString(),
        },
      });
    }

    // Non-streaming response (e.g., Perplexity deep research)
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error(`❌ [ai-reasoning] Error:`, error.message);
    
    if (error.name === 'AbortError') {
      return new Response(
        JSON.stringify({ error: "Request timed out. Reasoning models need more time - try again." }),
        { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
