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
    const { url } = await req.json();
    
    if (!url) {
      throw new Error('PDF URL is required');
    }

    console.log('Fetching PDF from:', url);
    
    // Fetch the PDF file
    const pdfResponse = await fetch(url);
    if (!pdfResponse.ok) {
      throw new Error(`Failed to fetch PDF: ${pdfResponse.statusText}`);
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    const pdfBytes = new Uint8Array(pdfBuffer);
    
    console.log('PDF size:', pdfBytes.length, 'bytes');

    // Simple text extraction - look for text objects in PDF
    let text = '';
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const pdfString = decoder.decode(pdfBytes);
    
    // Extract text between stream markers (basic approach)
    const textMatches = pdfString.match(/\(([^)]+)\)/g);
    if (textMatches) {
      text = textMatches
        .map(match => match.slice(1, -1))
        .join(' ')
        .replace(/\\n/g, '\n')
        .replace(/\\/g, '')
        .trim();
    }

    // If no text found, try alternative extraction
    if (!text || text.length < 50) {
      // Look for text objects with different patterns
      const altMatches = pdfString.match(/BT\s+(.*?)\s+ET/gs);
      if (altMatches) {
        text = altMatches
          .map(match => {
            const content = match.match(/\(([^)]+)\)/g);
            return content ? content.map(c => c.slice(1, -1)).join(' ') : '';
          })
          .join('\n')
          .replace(/\\n/g, '\n')
          .replace(/\\/g, '')
          .trim();
      }
    }

    if (!text || text.length < 10) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Could not extract text from PDF. This might be a scanned document or image-based PDF.',
          text: ''
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // Limit text to reasonable size (approx 50k chars = ~12.5k tokens)
    const maxLength = 50000;
    if (text.length > maxLength) {
      text = text.substring(0, maxLength) + '\n\n[Document truncated for length]';
    }

    console.log('Extracted text length:', text.length);

    return new Response(
      JSON.stringify({
        success: true,
        text: text,
        wordCount: text.split(/\s+/).length,
        charCount: text.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('Error extracting PDF text:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
