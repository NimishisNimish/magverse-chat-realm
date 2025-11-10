import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { prompt, duration = 5, aspectRatio = "16:9" } = await req.json();

    if (!prompt) {
      throw new Error('Prompt is required');
    }

    // Use Runway ML Gen-3 API for video generation
    const RUNWAYML_API_KEY = Deno.env.get('RUNWAYML_API_KEY');
    
    if (!RUNWAYML_API_KEY) {
      throw new Error('RUNWAYML_API_KEY not configured');
    }

    console.log('Generating video with Runway ML:', {
      prompt: prompt.substring(0, 50) + '...',
      duration,
      aspectRatio
    });

    // Create video generation task
    const response = await fetch('https://api.runwayml.com/v1/gen3/text_to_video', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RUNWAYML_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text_prompt: prompt,
        duration,
        aspect_ratio: aspectRatio,
        model: 'gen3a_turbo',
        watermark: false
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Runway ML API error:', response.status, errorText);
      throw new Error(`Video generation failed: ${response.status}`);
    }

    const data = await response.json();
    const taskId = data.id;

    console.log('Video generation task created:', taskId);

    // Poll for completion
    let videoUrl: string | null = null;
    const maxAttempts = 60; // 60 seconds timeout
    let attempts = 0;

    while (!videoUrl && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      
      const statusResponse = await fetch(`https://api.runwayml.com/v1/tasks/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${RUNWAYML_API_KEY}`,
        },
      });

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        console.log('Video generation status:', statusData.status);

        if (statusData.status === 'SUCCEEDED') {
          videoUrl = statusData.output?.[0];
          break;
        } else if (statusData.status === 'FAILED') {
          throw new Error('Video generation failed');
        }
      }

      attempts++;
    }

    if (!videoUrl) {
      throw new Error('Video generation timed out');
    }

    console.log('Video generated successfully:', videoUrl);

    return new Response(
      JSON.stringify({ 
        videoUrl,
        prompt,
        duration,
        aspectRatio
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in generate-video function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Video generation failed'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
