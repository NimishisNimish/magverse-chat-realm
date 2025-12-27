import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileText, 
  ExternalLink,
  Download,
  Loader2,
  AlertCircle,
  Eye,
  FileSearch,
  CheckCircle2,
  Copy
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PDFViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdfUrl: string;
  fileName?: string;
  onTextExtracted?: (text: string) => void;
}

type ExtractionStatus = 'idle' | 'loading' | 'success' | 'error' | 'cached';

/**
 * Google Drive / Gemini style PDF Viewer
 * - Preview tab: Shows native PDF using iframe (instant, no blocking)
 * - Analysis tab: Shows extracted text (runs in background)
 * - Properly separated: Preview never waits for extraction
 */
export function PDFViewerDialog({
  open,
  onOpenChange,
  pdfUrl,
  fileName = 'Document.pdf',
  onTextExtracted,
}: PDFViewerDialogProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'analysis'>('preview');
  const [extractedText, setExtractedText] = useState('');
  const [extractionStatus, setExtractionStatus] = useState<ExtractionStatus>('idle');
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const { toast } = useToast();
  const { user } = useAuth();

  // Generate simple hash from URL for caching
  const generateUrlHash = useCallback((url: string): string => {
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }, []);

  // Check cache for extracted text
  const checkCache = useCallback(async (): Promise<string | null> => {
    if (!user || !pdfUrl) return null;
    
    try {
      const fileHash = generateUrlHash(pdfUrl);
      const { data, error } = await supabase
        .from('pdf_text_cache')
        .select('extracted_text, word_count')
        .eq('file_hash', fileHash)
        .eq('user_id', user.id)
        .single();
      
      if (error || !data) return null;
      
      setWordCount(data.word_count || 0);
      return data.extracted_text;
    } catch {
      return null;
    }
  }, [user, pdfUrl, generateUrlHash]);

  // Save to cache
  const saveToCache = useCallback(async (text: string, wc: number) => {
    if (!user || !pdfUrl) return;
    
    try {
      const fileHash = generateUrlHash(pdfUrl);
      await supabase.from('pdf_text_cache').insert({
        file_hash: fileHash,
        file_url: pdfUrl,
        file_name: fileName,
        extracted_text: text,
        word_count: wc,
        char_count: text.length,
        user_id: user.id,
      });
    } catch (e) {
      console.error('Failed to cache PDF text:', e);
    }
  }, [user, pdfUrl, fileName, generateUrlHash]);

  // Extract text in background (non-blocking)
  const extractText = useCallback(async () => {
    if (!pdfUrl || extractionStatus === 'loading') return;
    
    // Check cache first
    const cachedText = await checkCache();
    if (cachedText) {
      setExtractedText(cachedText);
      setExtractionStatus('cached');
      onTextExtracted?.(cachedText);
      return;
    }
    
    setExtractionStatus('loading');
    setExtractionError(null);
    
    // 30 second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    try {
      const response = await supabase.functions.invoke('extract-pdf-text', {
        body: { url: pdfUrl, fileType: 'pdf' },
      });
      
      clearTimeout(timeoutId);
      
      if (response.error) {
        throw new Error(response.error.message || 'Extraction failed');
      }
      
      const data = response.data;
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to extract text');
      }
      
      const text = data.text || '';
      const wc = data.wordCount || text.split(/\s+/).length;
      
      setExtractedText(text);
      setWordCount(wc);
      setExtractionStatus('success');
      
      // Save to cache for future use
      await saveToCache(text, wc);
      
      onTextExtracted?.(text);
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('PDF extraction error:', error);
      
      const errorMsg = error.name === 'AbortError' 
        ? 'Text extraction timed out. PDF may be too large.'
        : error.message || 'Failed to extract text';
      
      setExtractionError(errorMsg);
      setExtractionStatus('error');
    }
  }, [pdfUrl, extractionStatus, checkCache, saveToCache, onTextExtracted]);

  // Start background extraction when dialog opens
  useEffect(() => {
    if (open && pdfUrl && extractionStatus === 'idle') {
      // Start extraction in background (doesn't block preview)
      extractText();
    }
  }, [open, pdfUrl, extractionStatus, extractText]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setActiveTab('preview');
      setExtractedText('');
      setExtractionStatus('idle');
      setExtractionError(null);
      setWordCount(0);
    }
  }, [open]);

  // Open PDF in new tab (Chrome-safe method)
  const openInNewTab = useCallback(() => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank', 'noopener,noreferrer');
    }
  }, [pdfUrl]);

  // Download PDF
  const downloadPdf = useCallback(() => {
    if (pdfUrl) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = fileName;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [pdfUrl, fileName]);

  // Copy extracted text
  const copyText = useCallback(() => {
    if (extractedText) {
      navigator.clipboard.writeText(extractedText);
      toast({
        title: "Copied",
        description: "Text copied to clipboard",
      });
    }
  }, [extractedText, toast]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-destructive" />
              <span className="truncate max-w-[300px]">{fileName}</span>
              {extractionStatus === 'cached' && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Cached
                </Badge>
              )}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadPdf}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Download</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={openInNewTab}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                <span className="hidden sm:inline">Open in Tab</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <Tabs 
          value={activeTab} 
          onValueChange={(v) => setActiveTab(v as 'preview' | 'analysis')}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="px-6 pt-2 border-b">
            <TabsList className="grid w-full max-w-xs grid-cols-2">
              <TabsTrigger value="preview" className="gap-2">
                <Eye className="h-4 w-4" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="analysis" className="gap-2 relative">
                <FileSearch className="h-4 w-4" />
                Analysis
                {extractionStatus === 'loading' && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
                )}
                {extractionStatus === 'success' || extractionStatus === 'cached' ? (
                  <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">
                    {wordCount.toLocaleString()} words
                  </Badge>
                ) : null}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Preview Tab - Native PDF Viewer */}
          <TabsContent value="preview" className="flex-1 m-0 overflow-hidden">
            <div className="w-full h-full bg-muted/30">
              {pdfUrl ? (
                <iframe
                  src={`${pdfUrl}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`}
                  className="w-full h-full border-0"
                  title={fileName}
                  loading="lazy"
                />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <FileText className="h-12 w-12 opacity-50" />
                </div>
              )}
            </div>
          </TabsContent>

          {/* Analysis Tab - Extracted Text */}
          <TabsContent value="analysis" className="flex-1 m-0 overflow-hidden flex flex-col">
            {extractionStatus === 'loading' ? (
              <div className="h-full flex flex-col items-center justify-center gap-4 text-muted-foreground p-8">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <div className="text-center">
                  <p className="font-medium">Extracting text from PDF...</p>
                  <p className="text-sm mt-1">This may take a moment for large documents</p>
                  <p className="text-xs mt-2 opacity-60">You can switch to Preview tab while waiting</p>
                </div>
              </div>
            ) : extractionStatus === 'error' ? (
              <div className="h-full flex flex-col items-center justify-center gap-4 p-8">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                </div>
                <div className="text-center max-w-md">
                  <p className="font-medium text-lg mb-2">Text extraction failed</p>
                  <p className="text-sm text-muted-foreground mb-4">{extractionError}</p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setExtractionStatus('idle');
                        extractText();
                      }}
                      className="gap-2"
                    >
                      Try Again
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setActiveTab('preview')}
                      className="gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      View PDF
                    </Button>
                  </div>
                </div>
              </div>
            ) : extractedText ? (
              <>
                <div className="px-6 py-2 border-b flex items-center justify-between bg-muted/30">
                  <span className="text-sm text-muted-foreground">
                    {wordCount.toLocaleString()} words • {extractedText.length.toLocaleString()} characters
                    {extractionStatus === 'cached' && ' • From cache'}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyText}
                    className="gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copy All
                  </Button>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-6 font-serif text-[15px] leading-relaxed whitespace-pre-wrap">
                    {extractedText}
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
                <FileSearch className="h-12 w-12 opacity-50" />
                <p>No text extracted yet</p>
                <Button
                  variant="outline"
                  onClick={extractText}
                  className="gap-2"
                >
                  Extract Text
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default PDFViewerDialog;
