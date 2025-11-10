import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RUNWAYML_API_KEY = Deno.env.get('RUNWAYML_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RUNWAYML_API_KEY) {
      throw new Error('RUNWAYML_API_KEY is not configured');
    }

    const { prompt, duration = 5, aspectRatio = "16:9" } = await req.json();

    if (!prompt) {
      throw new Error('Prompt is required');
    }

    console.log('🎬 Generating video with Runway ML:', { prompt, duration, aspectRatio });

    // Step 1: Create video generation task
    const createResponse = await fetch('https://api.runwayml.com/v1/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RUNWAYML_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Runway-Version': '2024-11-06',
      },
      body: JSON.stringify({
        model: 'gen3a_turbo',
        prompt_text: prompt,
        duration,
        aspect_ratio: aspectRatio,
      }),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('❌ Runway ML API error:', errorText);
      throw new Error(`Runway ML API error: ${createResponse.status} - ${errorText}`);
    }

    const taskData = await createResponse.json();
    const taskId = taskData.id;

    console.log('✅ Video generation task created:', taskId);

    // Step 2: Poll for completion (with timeout)
    const maxWaitTime = 180000; // 3 minutes
    const pollInterval = 5000; // 5 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const statusResponse = await fetch(`https://api.runwayml.com/v1/tasks/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${RUNWAYML_API_KEY}`,
          'X-Runway-Version': '2024-11-06',
        },
      });

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        console.error('❌ Failed to check video status:', errorText);
        throw new Error(`Failed to check video status: ${statusResponse.status}`);
      }

      const statusData = await statusResponse.json();
      console.log('📊 Video generation status:', statusData.status);

      if (statusData.status === 'SUCCEEDED') {
        console.log('✅ Video generation completed:', statusData.output);
        return new Response(
          JSON.stringify({
            success: true,
            videoUrl: statusData.output[0],
            taskId,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else if (statusData.status === 'FAILED') {
        throw new Error('Video generation failed');
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    // Timeout reached
    throw new Error('Video generation timed out. Please try again with a shorter duration.');

  } catch (error: any) {
    console.error('❌ Error in generate-video function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to generate video',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
