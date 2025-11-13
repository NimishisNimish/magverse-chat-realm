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

    // Always use Runway ML (Veo 3 API not yet available)
    if (model === "veo3") {
      console.log('⚠️ Veo 3 requested but not available, using Runway ML instead');
    }
    return await generateWithRunway(prompt, duration, aspectRatio);

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

  console.log('🎬 Generating video with Runway ML (Veo 3.1 Fast):', { prompt, duration, aspectRatio });

  // Map aspect ratios to Runway ML format
  const ratioMap: Record<string, string> = {
    '16:9': '1920:1080',
    '9:16': '1080:1920',
  };
  
  const ratio = ratioMap[aspectRatio] || '1920:1080';
  
  // Runway ML Veo models only support 4, 6, or 8 seconds
  const validDuration = duration <= 4 ? 4 : duration <= 6 ? 6 : 8;

  // Step 1: Create video generation task using Veo 3.1 Fast
  const createResponse = await fetch('https://api.dev.runwayml.com/v1/text_to_video', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RUNWAYML_API_KEY}`,
      'Content-Type': 'application/json',
      'X-Runway-Version': '2024-11-06',
    },
    body: JSON.stringify({
      model: 'veo3.1_fast',
      promptText: prompt,
      duration: validDuration,
      ratio: ratio,
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

  // Step 2: Poll for completion (with timeout and progress tracking)
  const maxWaitTime = 300000; // 5 minutes
  const pollInterval = 3000; // 3 seconds
  const startTime = Date.now();
  let pollCount = 0;

  while (Date.now() - startTime < maxWaitTime) {
    pollCount++;
    await new Promise(resolve => setTimeout(resolve, pollInterval));
    
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
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    console.log(`📊 Video generation status (poll #${pollCount}, ${elapsedSeconds}s):`, {
      status: statusData.status,
      progress: statusData.progress,
      taskId
    });

    if (statusData.status === 'SUCCEEDED' || statusData.status === 'succeeded') {
      // Check multiple possible locations for video URL
      const videoUrl = statusData.output?.[0] || 
                       statusData.output?.url || 
                       statusData.artifacts?.[0]?.url ||
                       statusData.videoUrl ||
                       statusData.url;
      
      if (!videoUrl) {
        console.error('❌ No video URL in response:', JSON.stringify(statusData, null, 2));
        throw new Error('Video generation completed but no video URL found in response');
      }
      
      // Validate video URL is accessible
      try {
        const videoCheckResponse = await fetch(videoUrl, { method: 'HEAD' });
        if (!videoCheckResponse.ok) {
          throw new Error(`Video URL not accessible: ${videoCheckResponse.status}`);
        }
      } catch (urlError) {
        console.error('❌ Video URL validation failed:', urlError);
        throw new Error('Video generated but URL is not accessible');
      }
      
      console.log('✅ Video generation completed and validated:', videoUrl);
      return new Response(
        JSON.stringify({
          success: true,
          videoUrl,
          taskId,
          model: 'runway',
          duration: elapsedSeconds,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (statusData.status === 'FAILED' || statusData.status === 'failed') {
      const failureReason = statusData.failure?.reason || statusData.error || 'Unknown error';
      console.error('❌ Video generation failed:', failureReason);
      throw new Error(`Video generation failed: ${failureReason}`);
    } else if (statusData.status === 'PENDING' || statusData.status === 'pending') {
      console.log(`⏳ Video generation pending (${elapsedSeconds}s elapsed)...`);
    } else if (statusData.status === 'PROCESSING' || statusData.status === 'processing') {
      console.log(`🎬 Video generation in progress (${elapsedSeconds}s elapsed)...`);
    } else {
      console.log(`🔄 Video status: ${statusData.status} (${elapsedSeconds}s elapsed)...`);
    }
  }

  // Timeout reached
  const elapsedMinutes = Math.floor((Date.now() - startTime) / 60000);
  throw new Error(`Video generation timed out after ${elapsedMinutes} minutes. The video may still be processing. Please try again or use a shorter duration.`);
}

async function generateWithVeo3(prompt: string, duration: number, aspectRatio: string) {
  if (!GOOGLE_AI_API_KEY) {
    throw new Error('GOOGLE_AI_API_KEY is not configured. Please add your Google AI API key.');
  }

  console.log('🎬 Generating video with Google Veo 3:', { prompt, duration, aspectRatio });

  // Step 1: Create video generation request
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/veo-002:generateVideo?key=${GOOGLE_AI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: {
          text: prompt,
        },
        videoConfig: {
          duration: `${duration}s`,
          aspectRatio: aspectRatio,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Google Veo 3 API error:', errorText);
      
      // Handle specific errors
      if (response.status === 404) {
        throw new Error('Google Veo 3 API endpoint not found. The API may not be available yet. Please use Runway ML instead.');
      } else if (response.status === 401 || response.status === 403) {
        throw new Error('Google AI API authentication failed. Please check your API key in Settings.');
      } else if (response.status === 429) {
        throw new Error('Google AI API rate limit exceeded. Please try again in a few moments.');
      }
      
      throw new Error(`Google Veo 3 API error (${response.status}): ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    console.log('📊 Veo 3 initial response:', JSON.stringify(data, null, 2));
    
    // Check if response contains operation name for polling
    const operationName = data.name || data.operation;
    
    if (operationName) {
      // Poll for completion
      const maxWaitTime = 300000; // 5 minutes
      const pollInterval = 5000; // 5 seconds
      const startTime = Date.now();
      let pollCount = 0;

      while (Date.now() - startTime < maxWaitTime) {
        pollCount++;
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
        const statusResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${GOOGLE_AI_API_KEY}`,
          {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }
        );

        if (!statusResponse.ok) {
          console.error('❌ Failed to check Veo 3 status');
          continue;
        }

        const statusData = await statusResponse.json();
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        console.log(`📊 Veo 3 status (poll #${pollCount}, ${elapsedSeconds}s):`, statusData.done ? 'DONE' : 'PROCESSING');

        if (statusData.done) {
          // Extract video URL from completed operation
          const videoUrl = statusData.response?.videoUri || 
                          statusData.response?.uri || 
                          statusData.response?.url ||
                          statusData.result?.videoUri;
          
          if (!videoUrl) {
            console.error('❌ No video URL in Veo 3 completion response:', JSON.stringify(statusData, null, 2));
            throw new Error('Video generation completed but no video URL found');
          }

          console.log('✅ Veo 3 video generated:', videoUrl);
          
          return new Response(
            JSON.stringify({
              success: true,
              videoUrl,
              model: 'veo3',
              duration: elapsedSeconds,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (statusData.error) {
          throw new Error(`Veo 3 generation failed: ${statusData.error.message || 'Unknown error'}`);
        }
      }

      throw new Error('Veo 3 video generation timed out after 5 minutes');
    } else {
      // Immediate response with video URL
      const videoUrl = data.video?.uri || data.videoUri || data.uri || data.url;
      
      if (!videoUrl) {
        console.error('❌ No video URL in immediate Veo 3 response:', JSON.stringify(data, null, 2));
        throw new Error('No video URL in Veo 3 response');
      }

      console.log('✅ Veo 3 video generated (immediate):', videoUrl);
      
      return new Response(
        JSON.stringify({
          success: true,
          videoUrl,
          model: 'veo3',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: any) {
    console.error('❌ Veo 3 generation error:', error);
    throw error;
  }
}
