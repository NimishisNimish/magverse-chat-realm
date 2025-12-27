import { useState, useMemo, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sun, Moon, ChevronLeft, ChevronRight, FileText, ChevronFirst, ChevronLast } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocumentPreviewPaneProps {
  text: string;
  title?: string;
  className?: string;
  height?: string;
}

const CHARS_PER_PAGE = 2500; // ~600 words per page

export const DocumentPreviewPane = memo(({ 
  text, 
  title = 'Document Preview', 
  className,
  height = '400px'
}: DocumentPreviewPaneProps) => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Split text into pages, preserving paragraph structure
  const pages = useMemo(() => {
    if (!text) return [];
    const chunks: string[] = [];
    
    // Split by paragraphs to preserve structure
    const paragraphs = text.split(/\n\n+/);
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
    
    return chunks.length > 0 ? chunks : [text];
  }, [text]);

  const totalPages = pages.length;

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Format text with better structure - detect headings, lists, etc.
  const formatText = (rawText: string) => {
    if (!rawText) return null;
    
    const paragraphs = rawText.split(/\n+/).filter(p => p.trim());
    
    return paragraphs.map((para, idx) => {
      const trimmed = para.trim();
      
      // Detect headings (all caps, short lines without ending punctuation, or lines ending with colon)
      const isHeading = trimmed.length < 100 && (
        trimmed === trimmed.toUpperCase() || 
        (!trimmed.endsWith('.') && !trimmed.endsWith(',') && !trimmed.endsWith(';')) ||
        trimmed.endsWith(':')
      );
      
      // Detect list items
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

  if (!text) {
    return (
      <Card className={cn('glass-card', className)}>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mb-4 opacity-50" />
          <p>No document content to preview</p>
        </CardContent>
      </Card>
    );
  }

  const wordCount = text.split(/\s+/).filter(Boolean).length;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b bg-muted/30">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FileText className="h-4 w-4" />
          {title}
        </CardTitle>
        
        <div className="flex items-center gap-2">
          {/* Light/Dark Toggle (independent of site theme) */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="h-8 px-3 gap-2"
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? (
              <>
                <Sun className="h-4 w-4" />
                <span className="text-xs">Light</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4" />
                <span className="text-xs">Dark</span>
              </>
            )}
          </Button>
          
          {/* Page Navigation */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1 text-sm border rounded-lg p-1 bg-background">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
                className="h-7 w-7 p-0"
                title="First page"
              >
                <ChevronFirst className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="h-7 w-7 p-0"
                title="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[70px] text-center text-muted-foreground text-xs font-medium">
                Page {currentPage} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="h-7 w-7 p-0"
                title="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages}
                className="h-7 w-7 p-0"
                title="Last page"
              >
                <ChevronLast className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea 
          className={cn(
            'transition-colors duration-300',
            isDarkMode 
              ? 'bg-zinc-900 text-zinc-100' 
              : 'bg-white text-zinc-900'
          )}
          style={{ height }}
        >
          <div className={cn(
            'p-6 font-serif text-[15px] leading-relaxed',
            isDarkMode 
              ? 'selection:bg-purple-500/30' 
              : 'selection:bg-purple-200'
          )}>
            {formatText(pages[currentPage - 1])}
          </div>
        </ScrollArea>
      </CardContent>
      
      {/* Footer with stats */}
      <div className={cn(
        'px-4 py-2 text-xs border-t flex items-center justify-between',
        isDarkMode 
          ? 'bg-zinc-900 text-zinc-500 border-zinc-800' 
          : 'bg-gray-50 text-gray-500 border-gray-200'
      )}>
        <span>{wordCount.toLocaleString()} words • {text.length.toLocaleString()} characters</span>
        <span>Page {currentPage} of {totalPages}</span>
      </div>
    </Card>
  );
});

DocumentPreviewPane.displayName = 'DocumentPreviewPane';

export default DocumentPreviewPane;
