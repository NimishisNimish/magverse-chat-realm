import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  ChevronFirst, 
  ChevronLast,
  Sun,
  Moon,
  Download,
  ExternalLink,
  Loader2,
  AlertCircle,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PDFPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdfUrl?: string;
  fileName?: string;
  extractedText?: string;
  onExtractText?: (url: string) => Promise<string>;
}

const CHARS_PER_PAGE = 2500;

export function PDFPreviewDialog({
  open,
  onOpenChange,
  pdfUrl,
  fileName = 'Document',
  extractedText: initialExtractedText,
  onExtractText,
}: PDFPreviewDialogProps) {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [extractedText, setExtractedText] = useState(initialExtractedText || '');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [extractionTimeout, setExtractionTimeout] = useState(false);

  // Extract text when dialog opens
  useEffect(() => {
    if (open && pdfUrl && !extractedText && onExtractText) {
      const extractText = async () => {
        setIsExtracting(true);
        setExtractionError(null);
        setExtractionTimeout(false);
        
        // Set a 30 second timeout
        const timeoutId = setTimeout(() => {
          setExtractionTimeout(true);
          setIsExtracting(false);
          setExtractionError('Text extraction timed out. The PDF may be too large or complex.');
        }, 30000);

        try {
          const text = await onExtractText(pdfUrl);
          clearTimeout(timeoutId);
          setExtractedText(text);
        } catch (error: any) {
          clearTimeout(timeoutId);
          console.error('PDF extraction error:', error);
          setExtractionError(error.message || 'Failed to extract text from PDF');
        } finally {
          if (!extractionTimeout) {
            setIsExtracting(false);
          }
        }
      };

      extractText();
    }
  }, [open, pdfUrl, onExtractText, extractedText, extractionTimeout]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setCurrentPage(1);
      if (!initialExtractedText) {
        setExtractedText('');
        setExtractionError(null);
        setExtractionTimeout(false);
      }
    }
  }, [open, initialExtractedText]);

  // Split text into pages
  const pages = useCallback(() => {
    if (!extractedText) return [];
    const chunks: string[] = [];
    const paragraphs = extractedText.split(/\n\n+/);
    let currentChunk = '';
    
    for (const para of paragraphs) {
      if ((currentChunk + para).length > CHARS_PER_PAGE && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = para;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + para;
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks.length > 0 ? chunks : [extractedText];
  }, [extractedText])();

  const totalPages = pages.length;

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const formatText = (rawText: string) => {
    if (!rawText) return null;
    
    const paragraphs = rawText.split(/\n+/).filter(p => p.trim());
    
    return paragraphs.map((para, idx) => {
      const trimmed = para.trim();
      
      const isHeading = trimmed.length < 100 && (
        trimmed === trimmed.toUpperCase() || 
        (!trimmed.endsWith('.') && !trimmed.endsWith(',') && !trimmed.endsWith(';')) ||
        trimmed.endsWith(':')
      );
      
      const isListItem = /^[\d•\-\*]\s*[\.\)]*\s/.test(trimmed);
      
      return (
        <p
          key={idx}
          className={cn(
            'leading-relaxed',
            isHeading && 'font-bold text-lg mt-6 mb-2 border-b pb-1',
            isListItem && 'pl-4 mb-1',
            !isHeading && !isListItem && 'mb-4 text-justify'
          )}
        >
          {trimmed}
        </p>
      );
    });
  };

  const handleDownload = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  const wordCount = extractedText.split(/\s+/).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              {fileName}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {pdfUrl && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(pdfUrl, '_blank')}
                    className="gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Original
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="gap-2"
              >
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {isDarkMode ? 'Light' : 'Dark'}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {isExtracting ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-medium">Extracting text from PDF...</p>
                <p className="text-sm">This may take a moment for large documents</p>
              </div>
            </div>
          ) : extractionError ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 p-8">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <div className="text-center max-w-md">
                <p className="font-medium text-lg mb-2">Text extraction failed</p>
                <p className="text-sm text-muted-foreground mb-4">{extractionError}</p>
                {pdfUrl && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(pdfUrl, '_blank')}
                    className="gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View Original PDF
                  </Button>
                )}
              </div>
            </div>
          ) : extractedText ? (
            <ScrollArea 
              className={cn(
                'h-full transition-colors duration-300',
                isDarkMode 
                  ? 'bg-zinc-900 text-zinc-100' 
                  : 'bg-white text-zinc-900'
              )}
            >
              <div className={cn(
                'p-8 font-serif text-[15px] leading-relaxed min-h-full',
                isDarkMode 
                  ? 'selection:bg-purple-500/30' 
                  : 'selection:bg-purple-200'
              )}>
                {formatText(pages[currentPage - 1])}
              </div>
            </ScrollArea>
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
              <FileText className="h-12 w-12 opacity-50" />
              <p>No content to display</p>
            </div>
          )}
        </div>

        {/* Footer with pagination and stats */}
        {extractedText && totalPages > 0 && (
          <div className={cn(
            'px-6 py-3 border-t flex items-center justify-between flex-shrink-0',
            isDarkMode 
              ? 'bg-zinc-900 text-zinc-400 border-zinc-800' 
              : 'bg-gray-50 text-gray-500 border-gray-200'
          )}>
            <span className="text-sm">
              {wordCount.toLocaleString()} words • {extractedText.length.toLocaleString()} characters
            </span>
            
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => goToPage(1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronFirst className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-[80px] text-center text-sm font-medium">
                  Page {currentPage} / {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => goToPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLast className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default PDFPreviewDialog;
