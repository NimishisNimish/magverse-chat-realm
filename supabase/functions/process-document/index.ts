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
  const CHUNK_SIZE = 0x8000;
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
  
  const readable = text.match(/[a-zA-Z0-9\s.,!?;:'"-]/g)?.length || 0;
  const total = text.length;
  const readableRatio = readable / total;
  
  const hasGarbagePatterns = /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(text) ||
    /[À-ÿ]{5,}/.test(text) ||
    /[\uFFFD]{2,}/.test(text) ||
    text.includes('�') ||
    /[^\x00-\x7F]{10,}/.test(text);
  
  if (readableRatio < 0.6 || hasGarbagePatterns) {
    return true;
  }
  
  const words = text.split(/\s+/).filter(w => w.length > 2);
  const meaningfulWords = words.filter(w => /^[a-zA-Z]+$/.test(w));
  
  return meaningfulWords.length < words.length * 0.3;
}

// Clean extracted text
function cleanText(text: string): string {
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/\uFFFD/g, '')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s+|\s+$/gm, '')
    .trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, filePath, fileType } = await req.json();
    
    if (!url && !filePath) {
      throw new Error('Document URL or file path is required');
    }

    const fileUrl = url || filePath;
    const detectedType = fileType || (fileUrl.toLowerCase().endsWith('.docx') ? 'docx' : 'pdf');
    console.log(`📄 Processing ${detectedType.toUpperCase()} document...`);
    
    let fileBytes: Uint8Array;

    // Download the file
    const isSignedUrl = fileUrl.includes('/storage/v1/object/sign/');
    const isPublicUrl = fileUrl.includes('/storage/v1/object/public/');
    const isPrivateStorageUrl = fileUrl.includes('supabase.co/storage/v1/object') && !isSignedUrl && !isPublicUrl;
    
    if (isPrivateStorageUrl) {
      console.log('🔐 Accessing private Supabase storage...');
      
      const urlObj = new URL(fileUrl);
      const pathParts = urlObj.pathname.split('/storage/v1/object/')[1];
      
      if (!pathParts) throw new Error('Invalid Supabase storage URL');
      
      const [bucket, ...pathSegments] = pathParts.split('/');
      const storagePath = pathSegments.join('/');
      
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data, error } = await supabase.storage.from(bucket).download(storagePath);
      
      if (error || !data) {
        throw new Error(`Storage access failed: ${error?.message || 'Unknown error'}`);
      }
      
      fileBytes = new Uint8Array(await data.arrayBuffer());
    } else {
      console.log('🌐 Fetching URL directly...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout
      
      const fileResponse = await fetch(fileUrl, {
        headers: { 'User-Agent': 'MagVerse-Document-Processor/1.0' },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!fileResponse.ok) {
        if (fileResponse.status === 403) throw new Error('Access denied - link may have expired');
        if (fileResponse.status === 404) throw new Error('File not found');
        throw new Error(`Failed to fetch document: ${fileResponse.statusText}`);
      }
      
      fileBytes = new Uint8Array(await fileResponse.arrayBuffer());
    }

    console.log(`📦 File size: ${(fileBytes.length / 1024 / 1024).toFixed(2)} MB`);

    let text = '';

    // Always use AI for reliable text extraction
    if (LOVABLE_API_KEY) {
      console.log('🤖 Using AI for document extraction...');
      
      const base64Doc = uint8ArrayToBase64(fileBytes);
      const mimeType = detectedType === 'docx' 
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/pdf';
      
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
                text: `Extract ALL text content from this document. Preserve document structure including headings, paragraphs, lists, and tables. Format cleanly without any commentary or descriptions. Just output the document text.`
              },
              {
                type: 'file',
                file: { data: base64Doc, mime_type: mimeType }
              }
            ]
          }],
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        text = aiData.choices?.[0]?.message?.content || '';
        console.log('✅ AI extracted document text');
      } else {
        console.warn('⚠️ AI extraction failed, falling back to basic extraction');
      }
    }

    // Fallback: basic PDF extraction if AI fails
    if ((!text || text.length < 50) && detectedType === 'pdf') {
      const pdfHeader = String.fromCharCode(...fileBytes.slice(0, 4));
      if (pdfHeader === '%PDF') {
        const decoder = new TextDecoder('utf-8', { fatal: false });
        const pdfString = decoder.decode(fileBytes);
        
        const textMatches = pdfString.match(/\(([^)]+)\)/g);
        if (textMatches) {
          text = textMatches
            .map(match => match.slice(1, -1))
            .join(' ')
            .replace(/\\n/g, '\n')
            .replace(/\\/g, '')
            .trim();
        }
      }
    }

    // Clean and validate
    text = cleanText(text);
    
    if (!text || text.length < 50 || isGarbageText(text)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Could not extract text from document. The file may be scanned/image-based.',
        text: '',
        isEmpty: true,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Limit text size
    const maxLength = 150000;
    const wasTruncated = text.length > maxLength;
    if (wasTruncated) {
      text = text.substring(0, maxLength) + '\n\n[Document truncated - showing first 150,000 characters]';
    }

    const wordCount = text.split(/\s+/).length;
    console.log(`✅ Extracted: ${text.length} chars, ${wordCount} words`);

    return new Response(JSON.stringify({
      success: true,
      text,
      wordCount,
      charCount: text.length,
      wasTruncated,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('❌ Document processing error:', error.message);
    
    let errorMessage = error.message || 'Unknown error';
    if (error.message?.includes('timeout') || error.name === 'AbortError') {
      errorMessage = 'Document processing timeout - try a smaller file';
    }
    
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
