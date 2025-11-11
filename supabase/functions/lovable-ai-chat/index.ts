import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Add Perplexity API key for web search
const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");

/**
 * Helper function to perform web search and format results
 */
async function performWebSearch(query: string, searchMode: string = 'general'): Promise<{ content: string, sources: Array<{url: string, title: string}> }> {
  if (!PERPLEXITY_API_KEY) {
    console.error('⚠️ Perplexity API key not configured for web search');
    return { content: '', sources: [] };
  }

  try {
    console.log('🔍 Performing web search for Lovable AI:', query);
    
    const domains = getSearchDomains(searchMode);
    const searchPayload: any = {
      model: 'sonar',
      messages: [
        {
          role: 'system',
          content: 'You are a web search assistant. Provide concise, factual information from recent web sources.'
        },
        { role: 'user', content: query }
      ],
      temperature: 0.2,
      max_tokens: 1000,
      search_recency_filter: 'month',
      return_citations: true,
    };

    if (domains.length > 0) {
      searchPayload.search_domain_filter = domains;
    }

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
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
    const citations = data.citations || [];
    const sources = citations.map((citation: string, index: number) => ({
      url: citation,
      title: `Source ${index + 1}`,
    }));
    
    return { content: searchResults, sources };
  } catch (error) {
    console.error('❌ Web search error:', error);
    return { content: '', sources: [] };
  }
}

function getSearchDomains(searchMode?: string): string[] {
  switch (searchMode) {
    case 'finance':
      return ['bloomberg.com', 'reuters.com', 'wsj.com', 'marketwatch.com'];
    case 'academic':
      return ['scholar.google.com', 'arxiv.org', 'pubmed.ncbi.nlm.nih.gov'];
    default:
      return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, model = "google/gemini-2.5-flash", stream = false, generateImage = false, webSearchEnabled = false, searchMode = 'general' } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const selectedModel = generateImage ? "google/gemini-2.5-flash-image-preview" : model;
    console.log(`Processing request for model: ${selectedModel}, generateImage: ${generateImage}`);

    // Process messages to handle images properly
    const processedMessages = messages.map((msg: any) => {
      if (typeof msg.content === 'string') {
        return msg;
      }
      
      // Handle multimodal content (text + images/PDFs)
      if (Array.isArray(msg.content)) {
        return {
          role: msg.role,
          content: msg.content.map((part: any) => {
            if (part.type === 'text') {
              return { type: 'text', text: part.text };
            } else if (part.type === 'image_url') {
              // Lovable AI expects image_url format
              return {
                type: 'image_url',
                image_url: {
                  url: part.image_url.url
                }
              };
            }
            return part;
          })
        };
      }
      
      return msg;
    });

    console.log('📨 Lovable AI request:', {
      model: selectedModel,
      messageCount: processedMessages.length,
      hasMultimodal: processedMessages.some((m: any) => Array.isArray(m.content)),
      webSearchEnabled
    });

    // Perform web search if enabled (inject web results into messages)
    let finalMessages = processedMessages;
    let webSearchSources: Array<{url: string, title: string}> = [];
    
    if (webSearchEnabled && !generateImage) {
      const lastMsg = processedMessages[processedMessages.length - 1];
      const userQuery = typeof lastMsg.content === 'string' 
        ? lastMsg.content 
        : (Array.isArray(lastMsg.content) && lastMsg.content[0]?.text) || '';

      if (userQuery) {
        console.log('🌐 Web search enabled for Lovable AI model');
        const searchResults = await performWebSearch(userQuery, searchMode);
        
        if (searchResults.content) {
          webSearchSources = searchResults.sources;
          
          const sourcesText = searchResults.sources.length > 0 
            ? `\n\n**Sources:**\n${searchResults.sources.map((s, i) => `[${i+1}] ${s.url}`).join('\n')}`
            : '';
          
          const enhancedPrompt = `${userQuery}

---
📊 **Recent Web Information:**
${searchResults.content}${sourcesText}
---

Please synthesize the above web information to provide a current, accurate answer. Use numbered citations [1], [2] when referencing web data.`;

          finalMessages = [
            ...processedMessages.slice(0, -1),
            {
              role: 'user',
              content: enhancedPrompt
            }
          ];
          
          console.log(`✅ Web search results injected into Lovable AI prompt`);
        }
      }
    }

    const requestBody: any = {
      model: selectedModel,
      messages: finalMessages,
      stream,
    };

    if (generateImage) {
      requestBody.modalities = ["image", "text"];
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Lovable AI API error (${response.status}):`, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: "Rate limit exceeded. Please try again in a moment." 
          }),
          { 
            status: 429, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: "Payment required. Please add credits to your Lovable AI workspace." 
          }),
          { 
            status: 402, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      throw new Error(`Lovable AI API error: ${response.status} ${errorText}`);
    }

    if (stream) {
      return new Response(response.body, {
        headers: { 
          ...corsHeaders, 
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    const data = await response.json();
    
    // Extract images if present
    const images = data.choices?.[0]?.message?.images || [];
    
    return new Response(
      JSON.stringify({
        ...data,
        images,
        sources: webSearchSources.length > 0 ? webSearchSources : undefined,
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Error in lovable-ai-chat function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "An unknown error occurred" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
