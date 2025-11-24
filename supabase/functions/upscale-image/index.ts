import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, scale = 4 } = await req.json();
    
    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'Image URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const REPLICATE_API_TOKEN = Deno.env.get('REPLICATE_API_TOKEN');
    if (!REPLICATE_API_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'Replicate API token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🎨 Starting ${scale}x upscaling for image: ${imageUrl.substring(0, 50)}...`);

    // Start the upscaling prediction
    const startResponse = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: '42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b',
        input: {
          image: imageUrl,
          scale: scale,
          face_enhance: false,
        }
      })
    });

    if (!startResponse.ok) {
      const error = await startResponse.text();
      console.error('❌ Replicate start error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to start upscaling' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prediction = await startResponse.json();
    const predictionId = prediction.id;
    console.log(`📊 Started prediction: ${predictionId}`);

    // Poll for completion
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds max
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await fetch(
        `https://api.replicate.com/v1/predictions/${predictionId}`,
        {
          headers: {
            'Authorization': `Token ${REPLICATE_API_TOKEN}`,
          }
        }
      );

      const status = await statusResponse.json();
      console.log(`⏳ Attempt ${attempts + 1}: ${status.status}`);
      
      if (status.status === 'succeeded') {
        console.log('✅ Upscaling completed successfully');
        return new Response(
          JSON.stringify({ 
            success: true, 
            upscaledImage: status.output,
            scale: scale 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (status.status === 'failed') {
        console.error('❌ Upscaling failed:', status.error);
        return new Response(
          JSON.stringify({ error: 'Upscaling failed: ' + (status.error || 'Unknown error') }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      attempts++;
    }

    console.error('❌ Upscaling timeout after 60 seconds');
    return new Response(
      JSON.stringify({ error: 'Upscaling timeout - please try again' }),
      { status: 408, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Upscaling error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Upscaling failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
