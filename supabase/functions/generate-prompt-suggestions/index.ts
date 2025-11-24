import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid messages array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build context from recent messages
    const context = messages.map(m => `${m.role}: ${m.content}`).join('\n');

    // Call Lovable AI to generate suggestions
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that suggests relevant follow-up questions or prompts based on conversation context. Return ONLY a JSON array of 3-4 short, actionable follow-up prompts (each under 60 characters). Format: ["prompt1", "prompt2", "prompt3"]'
          },
          {
            role: 'user',
            content: `Based on this conversation, suggest 3-4 relevant follow-up questions or prompts:\n\n${context}`
          }
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      console.error('Lovable AI error:', response.status);
      return new Response(
        JSON.stringify({ error: 'Failed to generate suggestions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '[]';

    // Parse JSON array from response
    let suggestions: string[] = [];
    try {
      // Extract JSON array from response (handle markdown code blocks)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: split by newlines and clean up
        suggestions = content
          .split('\n')
          .map((s: string) => s.trim().replace(/^[-*•]\s*/, '').replace(/^"\s*/, '').replace(/\s*"$/, ''))
          .filter((s: string) => s.length > 0 && s.length < 100)
          .slice(0, 4);
      }
    } catch (e) {
      console.error('Failed to parse suggestions:', e);
      suggestions = ['Tell me more about this', 'Can you explain further?', 'What are the alternatives?'];
    }

    // Ensure we have 3-4 suggestions
    if (suggestions.length < 3) {
      suggestions = [
        ...suggestions,
        'Can you elaborate on that?',
        'What are some examples?',
        'How does this compare to alternatives?'
      ].slice(0, 4);
    }

    return new Response(
      JSON.stringify({ suggestions: suggestions.slice(0, 4) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating suggestions:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});