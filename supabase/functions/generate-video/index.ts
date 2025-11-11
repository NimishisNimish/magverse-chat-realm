import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RUNWAYML_API_KEY = Deno.env.get('RUNWAYML_API_KEY');
const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, duration = 5, aspectRatio = "16:9", model = "runway" } = await req.json();

    if (!prompt) {
      throw new Error('Prompt is required');
    }

    console.log('🎬 Generating video:', { prompt, duration, aspectRatio, model });

    // Generate video based on selected model
    if (model === "veo3") {
      return await generateWithVeo3(prompt, duration, aspectRatio);
    } else {
      return await generateWithRunway(prompt, duration, aspectRatio);
    }

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

async function generateWithRunway(prompt: string, duration: number, aspectRatio: string) {
  if (!RUNWAYML_API_KEY) {
    throw new Error('RUNWAYML_API_KEY is not configured');
  }

  console.log('🎬 Generating video with Runway ML:', { prompt, duration, aspectRatio });

  // Step 1: Create video generation task
  const createResponse = await fetch('https://api.dev.runwayml.com/v1/text_to_video', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RUNWAYML_API_KEY}`,
      'Content-Type': 'application/json',
      'X-Runway-Version': '2024-11-06',
    },
    body: JSON.stringify({
      model: 'gen3a_turbo',
      promptText: prompt,
      duration,
      ratio: aspectRatio,
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
    const statusResponse = await fetch(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
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
    console.log('📊 Video generation status:', statusData.status, statusData);

    if (statusData.status === 'SUCCEEDED') {
      // Check if output exists and has videos
      const videoUrl = statusData.output?.[0] || statusData.output?.url || statusData.artifacts?.[0]?.url;
      
      if (!videoUrl) {
        console.error('❌ No video URL in response:', statusData);
        throw new Error('Video generation completed but no video URL found');
      }
      
      console.log('✅ Video generation completed:', videoUrl);
      return new Response(
        JSON.stringify({
          success: true,
          videoUrl,
          taskId,
          model: 'runway',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (statusData.status === 'FAILED') {
      const failureReason = statusData.failure?.reason || 'Unknown error';
      console.error('❌ Video generation failed:', failureReason);
      throw new Error(`Video generation failed: ${failureReason}`);
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  // Timeout reached
  throw new Error('Video generation timed out. Please try again with a shorter duration.');
}

async function generateWithVeo3(prompt: string, duration: number, aspectRatio: string) {
  if (!GOOGLE_AI_API_KEY) {
    throw new Error('GOOGLE_AI_API_KEY is not configured');
  }

  console.log('🎬 Generating video with Google Veo 3:', { prompt, duration, aspectRatio });

  // Google Veo 3 API call - this is a placeholder as the actual API might be different
  // You'll need to update this with the actual Veo 3 API endpoint when available
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/veo-3:generateVideo?key=${GOOGLE_AI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: {
        text: prompt,
      },
      videoConfig: {
        duration: duration,
        aspectRatio: aspectRatio,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Google Veo 3 API error:', errorText);
    
    // If endpoint not available, throw specific error
    if (response.status === 404) {
      throw new Error('Google Veo 3 API is not yet available. Please use Runway ML for now.');
    }
    
    throw new Error(`Google Veo 3 API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  // Extract video URL from response (adjust based on actual API response)
  const videoUrl = data.video?.uri || data.videoUrl || data.output;
  
  if (!videoUrl) {
    throw new Error('No video URL in Veo 3 response');
  }

  console.log('✅ Video generated with Veo 3:', videoUrl);
  
  return new Response(
    JSON.stringify({
      success: true,
      videoUrl,
      model: 'veo3',
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
