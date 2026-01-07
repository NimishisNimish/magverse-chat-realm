import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TAVILY_API_KEY = Deno.env.get('TAVILY_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, maxResults = 5 } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!TAVILY_API_KEY) {
      console.error('TAVILY_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Tavily API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔍 Tavily search: "${query.substring(0, 50)}..."`);

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query,
        search_depth: 'basic',
        max_results: maxResults,
        include_answer: true,
        include_raw_content: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Tavily API error: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ error: 'Search failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    // Format sources for frontend
    const sources = (data.results || []).map((result: any, index: number) => ({
      url: result.url,
      title: result.title || `Source ${index + 1}`,
      snippet: result.content?.substring(0, 200) || '',
      score: result.score || 0,
    }));

    console.log(`✅ Found ${sources.length} sources`);

    return new Response(
      JSON.stringify({
        success: true,
        answer: data.answer || null,
        sources,
        query,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Tavily search error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message || 'Search failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
