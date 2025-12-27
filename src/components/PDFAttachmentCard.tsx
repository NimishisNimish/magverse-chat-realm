import { useState, useCallback } from 'react';
import { FileText, Eye, X, Edit2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PDFAttachmentCardProps {
  fileName: string;
  fileUrl?: string;
  fileSize?: number;
  onPreview: () => void;
  onRemove?: () => void;
  onEdit?: () => void;
  isEditable?: boolean;
  variant?: 'input' | 'message';
  className?: string;
}

export function PDFAttachmentCard({
  fileName,
  fileUrl,
  fileSize,
  onPreview,
  onRemove,
  onEdit,
  isEditable = false,
  variant = 'message',
  className,
}: PDFAttachmentCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Open PDF in new tab (Chrome-safe, no blocking)
  const openInNewTab = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (fileUrl) {
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
    }
  }, [fileUrl]);

  return (
    <div
      className={cn(
        'group relative flex items-center gap-3 p-3 rounded-xl transition-all duration-200 cursor-pointer',
        variant === 'input' 
          ? 'bg-card border-2 border-primary/20 hover:border-primary/40'
          : 'bg-muted/60 dark:bg-muted/40 border border-border/60 hover:border-primary/40 hover:bg-muted/80 dark:hover:bg-muted/60',
        className
      )}
      onClick={onPreview}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* PDF Icon */}
      <div className={cn(
        'flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center',
        'bg-red-500/15 dark:bg-red-500/20'
      )}>
        <FileText className="h-6 w-6 text-red-600 dark:text-red-400" />
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate text-sm text-foreground">
          {fileName}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <Badge 
            variant="secondary" 
            className="text-xs font-normal bg-red-500/10 text-red-700 dark:text-red-300 border-0"
          >
            PDF
          </Badge>
          {fileSize && (
            <span className="text-xs text-muted-foreground">
              {formatFileSize(fileSize)}
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className={cn(
        'flex items-center gap-1 transition-opacity',
        isHovered ? 'opacity-100' : 'opacity-0 sm:opacity-100'
      )}>
        {/* Preview in dialog */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-primary hover:text-primary hover:bg-primary/10"
          onClick={(e) => {
            e.stopPropagation();
            onPreview();
          }}
          title="Preview PDF"
        >
          <Eye className="h-4 w-4" />
        </Button>

        {/* Open in new tab (Chrome-safe) */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
          onClick={openInNewTab}
          title="Open in new tab"
        >
          <ExternalLink className="h-4 w-4" />
        </Button>

        {isEditable && onEdit && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            title="Edit"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
        )}

        {onRemove && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            title="Remove"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default PDFAttachmentCard;
