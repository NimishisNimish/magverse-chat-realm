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
      console.error('❌ No URL provided');
      throw new Error('PDF URL is required');
    }

    console.log('📄 Starting PDF extraction from:', url);
    
    // Add timeout for fetch
    const fetchTimeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('PDF fetch timeout - URL took too long to respond')), 30000);
    });

    // Fetch the PDF file with timeout
    const pdfResponse = await Promise.race([
      fetch(url, {
        headers: {
          'User-Agent': 'Supabase-Function-PDF-Extractor/1.0'
        }
      }),
      fetchTimeout
    ]) as Response;

    if (!pdfResponse.ok) {
      console.error(`❌ Failed to fetch PDF: ${pdfResponse.status} ${pdfResponse.statusText}`);
      
      if (pdfResponse.status === 403) {
        throw new Error('PDF access denied - the link may have expired or is not accessible');
      }
      if (pdfResponse.status === 404) {
        throw new Error('PDF not found - the file may have been deleted');
      }
      
      throw new Error(`Failed to fetch PDF: ${pdfResponse.statusText}`);
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    const pdfBytes = new Uint8Array(pdfBuffer);
    
    console.log('📦 PDF size:', pdfBytes.length, 'bytes', `(${(pdfBytes.length / 1024 / 1024).toFixed(2)} MB)`);

    // Validate it's actually a PDF
    const pdfHeader = String.fromCharCode(...pdfBytes.slice(0, 4));
    if (pdfHeader !== '%PDF') {
      console.error('❌ Invalid PDF format, header:', pdfHeader);
      throw new Error('File is not a valid PDF document');
    }

    // Simple text extraction - look for text objects in PDF
    let text = '';
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const pdfString = decoder.decode(pdfBytes);
    
    console.log('🔍 Attempting text extraction...');
    
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
      console.log('⚠️ Primary extraction yielded minimal text, trying alternative method...');
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

    if (!text || text.length < 100) {
      console.warn('⚠️ Could not extract meaningful text from PDF - likely scanned/image-based');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'This PDF appears to be scanned or image-based. I cannot read image-based PDFs yet. Please either:\n1. Convert the PDF to a text-based format\n2. Describe the contents of the PDF in your message\n3. Use a different file format (Word, plain text)',
          text: '',
          isEmpty: true,
          isScanned: true
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // Limit text to reasonable size (approx 100k chars = ~25k tokens)
    const maxLength = 100000;
    const wasTruncated = text.length > maxLength;
    if (wasTruncated) {
      text = text.substring(0, maxLength) + '\n\n[Document truncated for length - showing first 100,000 characters]';
      console.log('✂️ Text truncated from', text.length, 'to', maxLength, 'characters');
    }

    const wordCount = text.split(/\s+/).length;
    console.log(`✅ Successfully extracted text: ${text.length} chars, ${wordCount} words${wasTruncated ? ' (truncated)' : ''}`);

    return new Response(
      JSON.stringify({
        success: true,
        text: text,
        wordCount: wordCount,
        charCount: text.length,
        wasTruncated
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('❌ Error extracting PDF text:', error);
    
    // Provide specific error messages
    let errorMessage = error.message || 'Unknown error occurred';
    
    if (error.message?.includes('timeout')) {
      errorMessage = 'PDF extraction timeout - the file took too long to process. Try a smaller PDF.';
    } else if (error.message?.includes('fetch')) {
      errorMessage = 'Failed to download PDF - please check if the file link is valid and accessible.';
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
