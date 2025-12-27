import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Convert Uint8Array to base64 without stack overflow
function uint8ArrayToBase64(bytes: Uint8Array): string {
  const CHUNK_SIZE = 0x8000; // 32KB chunks to avoid call stack issues
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, bytes.length));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

// Detect garbage/corrupted text
function isGarbageText(text: string): boolean {
  if (!text || text.length < 20) return true;
  
  // Count readable vs unreadable characters
  const readable = text.match(/[a-zA-Z0-9\s.,!?;:'"-]/g)?.length || 0;
  const total = text.length;
  const readableRatio = readable / total;
  
  // Check for common PDF garbage patterns
  const hasGarbagePatterns = /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(text) || // Control chars
    /[À-ÿ]{5,}/.test(text) || // Long runs of special chars
    /[\uFFFD]{2,}/.test(text) || // Replacement characters
    text.includes('�') || // Unicode replacement
    /[^\x00-\x7F]{10,}/.test(text); // Long non-ASCII runs
  
  // Too many special characters or unreadable
  if (readableRatio < 0.6 || hasGarbagePatterns) {
    return true;
  }
  
  // Check for meaningful words
  const words = text.split(/\s+/).filter(w => w.length > 2);
  const meaningfulWords = words.filter(w => /^[a-zA-Z]+$/.test(w));
  
  return meaningfulWords.length < words.length * 0.3;
}

// Clean extracted text
function cleanText(text: string): string {
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // Remove control chars
    .replace(/\uFFFD/g, '') // Remove replacement chars
    .replace(/[^\S\n]+/g, ' ') // Normalize whitespace
    .replace(/\n{3,}/g, '\n\n') // Max 2 newlines
    .replace(/^\s+|\s+$/gm, '') // Trim lines
    .trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, fileType } = await req.json();
    
    if (!url) {
      throw new Error('Document URL is required');
    }

    const detectedType = fileType || (url.toLowerCase().endsWith('.docx') ? 'docx' : 'pdf');
    console.log(`📄 Extracting ${detectedType.toUpperCase()} from:`, url.substring(0, 100));
    
    let fileResponse: Response;

    // Check if it's a signed URL (can be fetched directly) or needs storage client
    const isSignedUrl = url.includes('/storage/v1/object/sign/');
    const isPublicUrl = url.includes('/storage/v1/object/public/');
    const isPrivateStorageUrl = url.includes('supabase.co/storage/v1/object') && !isSignedUrl && !isPublicUrl;
    
    if (isPrivateStorageUrl) {
      // Private storage URL - need to use service role to download
      console.log('🔐 Accessing private Supabase storage...');
      
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/storage/v1/object/')[1];
      
      if (!pathParts) throw new Error('Invalid Supabase storage URL');
      
      const [bucket, ...pathSegments] = pathParts.split('/');
      const filePath = pathSegments.join('/');
      
      console.log(`📂 Bucket: ${bucket}, Path: ${filePath}`);
      
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data, error } = await supabase.storage.from(bucket).download(filePath);
      
      if (error || !data) {
        console.error('Storage error:', JSON.stringify(error));
        throw new Error(`Storage access failed: ${error?.message || 'Unknown error'}`);
      }
      
      fileResponse = new Response(data, { status: 200 });
      
    } else {
      // Signed URL, public URL, or external URL - fetch directly
      console.log('🌐 Fetching URL directly...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      fileResponse = await fetch(url, {
        headers: { 'User-Agent': 'MagVerse-PDF-Extractor/1.0' },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!fileResponse.ok) {
        console.error(`Fetch failed: ${fileResponse.status} ${fileResponse.statusText}`);
        if (fileResponse.status === 403) throw new Error('Access denied - link may have expired');
        if (fileResponse.status === 404) throw new Error('File not found');
        throw new Error(`Failed to fetch document: ${fileResponse.statusText}`);
      }
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    const fileBytes = new Uint8Array(fileBuffer);
    
    console.log(`📦 File size: ${(fileBytes.length / 1024 / 1024).toFixed(2)} MB`);

    let text = '';
    let usedAI = false;

    // Handle DOCX - always use AI
    if (detectedType === 'docx') {
      console.log('📝 Processing DOCX with AI...');
      
      if (LOVABLE_API_KEY) {
        const base64Doc = uint8ArrayToBase64(fileBytes);
        
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [{
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Extract ALL text from this Word document. Preserve structure with clear headings, paragraphs, and lists. Format cleanly without any commentary or descriptions. Just output the document text.`
                },
                {
                  type: 'file',
                  file: { data: base64Doc, mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
                }
              ]
            }],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          text = aiData.choices?.[0]?.message?.content || '';
          usedAI = true;
          console.log('✅ AI extracted DOCX text');
        }
      }
      
      if (!text || text.length < 50) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Could not extract text from Word document',
          text: '',
          isEmpty: true
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      
    } else {
      // Handle PDF
      const pdfHeader = String.fromCharCode(...fileBytes.slice(0, 4));
      if (pdfHeader !== '%PDF') {
        throw new Error('Invalid PDF format');
      }

      // Try basic text extraction first
      console.log('🔍 Attempting basic PDF extraction...');
      const decoder = new TextDecoder('utf-8', { fatal: false });
      const pdfString = decoder.decode(fileBytes);
      
      // Extract text between parentheses (PDF text objects)
      const textMatches = pdfString.match(/\(([^)]+)\)/g);
      if (textMatches) {
        text = textMatches
          .map(match => match.slice(1, -1))
          .join(' ')
          .replace(/\\n/g, '\n')
          .replace(/\\/g, '')
          .trim();
      }

      // Try BT/ET markers if needed
      if (!text || text.length < 100) {
        const btMatches = pdfString.match(/BT\s+(.*?)\s+ET/gs);
        if (btMatches) {
          text = btMatches
            .map(match => {
              const content = match.match(/\(([^)]+)\)/g);
              return content ? content.map(c => c.slice(1, -1)).join(' ') : '';
            })
            .join('\n')
            .trim();
        }
      }

      // Check if extraction is garbage
      const basicText = cleanText(text);
      const needsAIFallback = !basicText || basicText.length < 100 || isGarbageText(basicText);

      if (needsAIFallback && LOVABLE_API_KEY) {
        console.log('🤖 Basic extraction failed/garbage, using AI...');
        
        const base64Pdf = uint8ArrayToBase64(fileBytes);
        
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [{
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Extract ALL text content from this PDF document. 
                  
Rules:
- Preserve document structure (headings, paragraphs, lists, tables)
- Format headings clearly with line breaks
- Keep logical paragraph spacing
- If it's a scanned document, perform OCR
- Output ONLY the document text, no descriptions or commentary
- Clean up any formatting artifacts`
                },
                {
                  type: 'file',
                  file: { data: base64Pdf, mime_type: 'application/pdf' }
                }
              ]
            }],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const aiText = aiData.choices?.[0]?.message?.content;
          
          if (aiText && aiText.length > 50 && !isGarbageText(aiText)) {
            text = aiText;
            usedAI = true;
            console.log('✅ AI successfully extracted PDF text');
          }
        } else {
          console.warn('⚠️ AI extraction failed:', await aiResponse.text());
        }
      } else if (!needsAIFallback) {
        text = basicText;
      }

      // Final fallback message
      if (!text || text.length < 100 || isGarbageText(text)) {
        return new Response(JSON.stringify({
          success: false,
          error: 'This PDF appears to be scanned or image-based. Try uploading as an image instead.',
          text: '',
          isEmpty: true,
          isScanned: true
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // Clean and limit text
    text = cleanText(text);
    const maxLength = 100000;
    const wasTruncated = text.length > maxLength;
    if (wasTruncated) {
      text = text.substring(0, maxLength) + '\n\n[Document truncated - showing first 100,000 characters]';
    }

    const wordCount = text.split(/\s+/).length;
    console.log(`✅ Extracted: ${text.length} chars, ${wordCount} words${usedAI ? ' (AI)' : ''}${wasTruncated ? ' (truncated)' : ''}`);

    return new Response(JSON.stringify({
      success: true,
      text,
      wordCount,
      charCount: text.length,
      wasTruncated,
      usedAI
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('❌ Extraction error:', error.message);
    
    let errorMessage = error.message || 'Unknown error';
    if (error.message?.includes('timeout') || error.name === 'AbortError') {
      errorMessage = 'Document extraction timeout - try a smaller file';
    }
    
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
