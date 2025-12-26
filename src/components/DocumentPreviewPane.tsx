import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sun, Moon, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocumentPreviewPaneProps {
  text: string;
  title?: string;
  className?: string;
}

const CHARS_PER_PAGE = 3000; // ~750 words per page

export const DocumentPreviewPane = ({ text, title = 'Document Preview', className }: DocumentPreviewPaneProps) => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Split text into pages
  const pages = useMemo(() => {
    if (!text) return [];
    const chunks: string[] = [];
    
    // Split by paragraphs first to preserve structure
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

  // Format text with better structure
  const formatText = (rawText: string) => {
    if (!rawText) return null;
    
    // Split into paragraphs and render with proper spacing
    const paragraphs = rawText.split(/\n+/).filter(p => p.trim());
    
    return paragraphs.map((para, idx) => {
      // Detect headings (all caps or short lines ending without period)
      const isHeading = para.length < 80 && (
        para === para.toUpperCase() || 
        (!para.endsWith('.') && !para.endsWith(','))
      );
      
      return (
        <p
          key={idx}
          className={cn(
            'mb-3 leading-relaxed',
            isHeading && 'font-semibold text-lg mt-4'
          )}
        >
          {para}
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

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FileText className="h-4 w-4" />
          {title}
        </CardTitle>
        
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="h-8 w-8 p-0"
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
          
          {/* Page Navigation */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1 text-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[60px] text-center text-muted-foreground">
                {currentPage} / {totalPages}
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
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea 
          className={cn(
            'h-[400px] transition-colors duration-200',
            isDarkMode 
              ? 'bg-zinc-900 text-zinc-100' 
              : 'bg-white text-zinc-900'
          )}
        >
          <div className={cn(
            'p-6 font-serif text-base',
            isDarkMode ? 'selection:bg-purple-500/30' : 'selection:bg-purple-200'
          )}>
            {formatText(pages[currentPage - 1])}
          </div>
        </ScrollArea>
      </CardContent>
      
      {/* Word count footer */}
      <div className={cn(
        'px-4 py-2 text-xs border-t',
        isDarkMode ? 'bg-zinc-900 text-zinc-500 border-zinc-800' : 'bg-gray-50 text-gray-500 border-gray-200'
      )}>
        {text.split(/\s+/).length.toLocaleString()} words • {text.length.toLocaleString()} characters
      </div>
    </Card>
  );
};

export default DocumentPreviewPane;
