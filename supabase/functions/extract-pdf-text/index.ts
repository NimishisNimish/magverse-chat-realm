import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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
    
    let pdfResponse: Response;

    // Check if this is a Supabase storage URL (private bucket)
    const isSupabaseStorage = url.includes('supabase.co/storage/v1/object');
    
    if (isSupabaseStorage) {
      console.log('🔐 Detected Supabase storage URL, using service role to access private bucket...');
      
      // Extract bucket and path from URL
      // URL format: https://xxx.supabase.co/storage/v1/object/public/bucket/path or .../object/bucket/path
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/storage/v1/object/')[1];
      
      if (!pathParts) {
        throw new Error('Invalid Supabase storage URL format');
      }
      
      // Remove 'public/' prefix if present, then extract bucket and path
      const cleanPath = pathParts.replace(/^public\//, '');
      const [bucket, ...pathSegments] = cleanPath.split('/');
      const filePath = pathSegments.join('/');
      
      console.log(`📁 Bucket: ${bucket}, Path: ${filePath}`);
      
      // Use service role client to download from private bucket
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      const { data, error } = await supabase.storage
        .from(bucket)
        .download(filePath);
      
      if (error) {
        console.error('❌ Failed to download from Supabase storage:', error.message);
        throw new Error(`Failed to access file: ${error.message}`);
      }
      
      if (!data) {
        throw new Error('No data returned from storage');
      }
      
      // Convert Blob to Response for consistent handling
      pdfResponse = new Response(data, { status: 200 });
      console.log('✅ Successfully downloaded from private bucket');
      
    } else {
      // External URL - fetch directly with timeout
      console.log('🌐 Fetching from external URL...');
      
      const fetchTimeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('PDF fetch timeout - URL took too long to respond')), 30000);
      });

      pdfResponse = await Promise.race([
        fetch(url, {
          headers: {
            'User-Agent': 'Supabase-Function-PDF-Extractor/1.0'
          }
        }),
        fetchTimeout
      ]);

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

    // First, try basic text extraction
    let text = '';
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const pdfString = decoder.decode(pdfBytes);
    
    console.log('🔍 Attempting basic text extraction...');
    
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

    // If still no meaningful text, use Lovable AI (Gemini) to analyze the PDF
    if ((!text || text.length < 100) && LOVABLE_API_KEY) {
      console.log('🤖 Using Lovable AI to analyze PDF content...');
      
      // Convert PDF to base64 for AI analysis
      const base64Pdf = btoa(String.fromCharCode(...pdfBytes));
      
      try {
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: 'Extract and transcribe ALL text content from this PDF document. Include headings, paragraphs, lists, tables, and any other textual content. Preserve the document structure as much as possible. If the PDF contains images with text, describe what you can see. Output only the extracted text without any additional commentary.'
                  },
                  {
                    type: 'file',
                    file: {
                      data: base64Pdf,
                      mime_type: 'application/pdf'
                    }
                  }
                ]
              }
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const aiExtractedText = aiData.choices?.[0]?.message?.content;
          
          if (aiExtractedText && aiExtractedText.length > 50) {
            console.log('✅ AI successfully extracted text from PDF');
            text = aiExtractedText;
          }
        } else {
          console.warn('⚠️ AI extraction failed:', await aiResponse.text());
        }
      } catch (aiError) {
        console.warn('⚠️ AI extraction error:', aiError);
      }
    }

    // If still no text, return error with helpful message
    if (!text || text.length < 100) {
      console.warn('⚠️ Could not extract meaningful text from PDF - likely scanned/image-based');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'This PDF appears to be scanned or image-based. Please either:\n1. Use a text-based PDF\n2. Describe the contents in your message\n3. Try uploading as an image instead',
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
