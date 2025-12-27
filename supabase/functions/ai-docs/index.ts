import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';

/**
 * AI Docs - Document analysis endpoint
 * - PDF/document processing
 * - Summarization
 * - Separate from main chat flow
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

const MAX_DOC_LENGTH = 50000; // 50k chars max
const TIMEOUT_MS = 60000; // 60s for doc processing

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestStart = Date.now();
  console.log(`📄 [ai-docs] Request started at ${new Date().toISOString()}`);

  try {
    const { documentText, query, action = 'summarize' } = await req.json();

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    if (!documentText) {
      return new Response(
        JSON.stringify({ error: "No document text provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Truncate document if too long
    const truncatedDoc = documentText.length > MAX_DOC_LENGTH
      ? documentText.substring(0, MAX_DOC_LENGTH) + "\n\n[Document truncated...]"
      : documentText;

    console.log(`📄 Processing ${truncatedDoc.length} chars, action=${action}`);

    // Build prompt based on action
    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'summarize':
        systemPrompt = 'You are a document summarization expert. Provide clear, structured summaries.';
        userPrompt = `Summarize the following document:\n\n${truncatedDoc}`;
        break;
      case 'analyze':
        systemPrompt = 'You are a document analyst. Extract key insights, themes, and important points.';
        userPrompt = `Analyze this document and provide key insights:\n\n${truncatedDoc}`;
        break;
      case 'query':
        systemPrompt = 'You are a helpful assistant. Answer questions based on the provided document.';
        userPrompt = `Document:\n${truncatedDoc}\n\nQuestion: ${query || 'What is this document about?'}`;
        break;
      default:
        systemPrompt = 'You are a helpful assistant.';
        userPrompt = truncatedDoc;
    }

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      console.error(`⏰ Doc processing timeout (${TIMEOUT_MS}ms)`);
      abortController.abort();
    }, TIMEOUT_MS);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash', // Fast model for doc processing
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        stream: true,
      }),
      signal: abortController.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API error: ${response.status}`, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`API error: ${response.status}`);
    }

    const processTime = Date.now() - requestStart;
    console.log(`📤 Streaming doc response after ${processTime}ms`);

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
    console.error(`❌ [ai-docs] Error:`, error.message);

    if (error.name === 'AbortError') {
      return new Response(
        JSON.stringify({ error: "Document processing timed out. Try a smaller document." }),
        { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
