import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * AI Reasoning - For complex queries with streaming thinking support
 * - Supports deep research models
 * - Higher timeout limits
 * - Web search integration
 * - Streaming thinking content extraction
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
  'gemini-pro': { provider: 'lovable', model: 'google/gemini-3-pro-preview' },
  'gpt5': { provider: 'lovable', model: 'openai/gpt-5' },
  'perplexity-pro': { provider: 'perplexity', model: 'sonar-pro' },
  'perplexity-reasoning': { provider: 'perplexity', model: 'sonar-deep-research' },
};

const FALLBACK = { provider: 'lovable', model: 'google/gemini-3-flash-preview' };

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestStart = Date.now();
  console.log(`🧠 [ai-reasoning] Request started at ${new Date().toISOString()}`);

  try {
    const { messages, model = 'gemini-pro', webSearch = false, enableThinking = true } = await req.json();

    // Get model config or fallback
    const config = REASONING_MODELS[model] || FALLBACK;
    console.log(`📤 Using ${config.provider}/${config.model}, webSearch=${webSearch}, thinking=${enableThinking}`);

    // Optimize messages
    const optimizedMessages = messages.length > MAX_CONTEXT_MESSAGES
      ? messages.slice(-MAX_CONTEXT_MESSAGES)
      : messages;

    // Add reasoning-focused system prompt with thinking support
    const systemPrompt = enableThinking 
      ? `You are a thorough analytical assistant with advanced reasoning capabilities. 

When solving complex problems, structure your response like this:
1. First, think through the problem in a <thinking> block
2. Show your step-by-step reasoning clearly
3. Then provide your final answer after </thinking>

Format example:
<thinking>
Let me analyze this carefully...
Step 1: [First consideration]
Step 2: [Second consideration]
Conclusion: [Key insight]
</thinking>

[Your well-structured final answer here]

Be thorough but concise. Show your reasoning process for complex questions.`
      : 'You are a thorough analytical assistant. Think step-by-step and provide comprehensive answers with clear reasoning.';

    const finalMessages = [
      { role: 'system', content: systemPrompt },
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
          max_tokens: 8192,
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
    
    if (contentType.includes('text/event-stream') && enableThinking) {
      // Process stream to extract thinking content
      const reader = response.body?.getReader();
      const encoder = new TextEncoder();
      
      let isInsideThinking = false;
      let thinkingContent = '';

      const stream = new ReadableStream({
        async start(controller) {
          if (!reader) {
            controller.close();
            return;
          }

          const decoder = new TextDecoder();
          let buffer = '';

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });

              let newlineIndex: number;
              while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
                let line = buffer.slice(0, newlineIndex);
                buffer = buffer.slice(newlineIndex + 1);
                if (line.endsWith('\r')) line = line.slice(0, -1);

                if (!line.trim() || line.startsWith(':')) continue;
                if (!line.startsWith('data:')) continue;

                const dataStr = line.substring(5).trim();
                if (dataStr === '[DONE]') {
                  // Send final thinking content if we have any
                  if (thinkingContent) {
                    const thinkingEvent = `data: ${JSON.stringify({
                      thinking: true,
                      content: thinkingContent,
                      complete: true
                    })}\n\n`;
                    controller.enqueue(encoder.encode(thinkingEvent));
                  }
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                  continue;
                }

                try {
                  const parsed = JSON.parse(dataStr);
                  const content = parsed.choices?.[0]?.delta?.content || '';
                  
                  if (content) {
                    // Check for thinking tags
                    let remaining = content;
                    
                    while (remaining) {
                      if (!isInsideThinking) {
                        const thinkingStart = remaining.indexOf('<thinking>');
                        if (thinkingStart !== -1) {
                          // Emit content before thinking tag
                          if (thinkingStart > 0) {
                            const beforeThinking = remaining.slice(0, thinkingStart);
                            const event = `data: ${JSON.stringify({
                              choices: [{ delta: { content: beforeThinking } }]
                            })}\n\n`;
                            controller.enqueue(encoder.encode(event));
                          }
                          isInsideThinking = true;
                          remaining = remaining.slice(thinkingStart + 10);
                          
                          // Send thinking start event
                          const thinkingStartEvent = `data: ${JSON.stringify({
                            thinking: true,
                            started: true
                          })}\n\n`;
                          controller.enqueue(encoder.encode(thinkingStartEvent));
                        } else {
                          // No thinking tag, emit as normal content
                          const event = `data: ${JSON.stringify({
                            choices: [{ delta: { content: remaining } }]
                          })}\n\n`;
                          controller.enqueue(encoder.encode(event));
                          remaining = '';
                        }
                      } else {
                        const thinkingEnd = remaining.indexOf('</thinking>');
                        if (thinkingEnd !== -1) {
                          // Add content before end tag to thinking
                          thinkingContent += remaining.slice(0, thinkingEnd);
                          
                          // Send thinking complete event
                          const thinkingEvent = `data: ${JSON.stringify({
                            thinking: true,
                            content: thinkingContent,
                            complete: true
                          })}\n\n`;
                          controller.enqueue(encoder.encode(thinkingEvent));
                          
                          isInsideThinking = false;
                          remaining = remaining.slice(thinkingEnd + 11);
                        } else {
                          // Still inside thinking
                          thinkingContent += remaining;
                          
                          // Send thinking content update (streaming)
                          const thinkingEvent = `data: ${JSON.stringify({
                            thinking: true,
                            delta: remaining,
                            content: thinkingContent
                          })}\n\n`;
                          controller.enqueue(encoder.encode(thinkingEvent));
                          remaining = '';
                        }
                      }
                    }
                  }
                } catch {
                  // JSON parse error - ignore incomplete chunks
                }
              }
            }
          } catch (error) {
            console.error('Stream processing error:', error);
          } finally {
            controller.close();
          }
        }
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "X-Request-Start": requestStart.toString(),
        },
      });
    }
    
    if (contentType.includes('text/event-stream')) {
      // Plain streaming without thinking extraction
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
