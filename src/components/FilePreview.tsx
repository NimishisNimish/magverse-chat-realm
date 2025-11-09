import { useState, useEffect } from "react";
import { X, FileText, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface FilePreviewProps {
  file: File;
  onRemove: () => void;
}

export default function FilePreview({ file, onRemove }: FilePreviewProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const fileType = file.type;
  const isImage = fileType.startsWith('image/');
  const isPDF = fileType === 'application/pdf';

  useEffect(() => {
    if (isImage) {
      // Create image preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else if (isPDF) {
      // For PDFs, we'll show a placeholder icon
      // In a production app, you could use PDF.js to render the first page
      setPreview(null);
    }

    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [file]);

  return (
    <div className="relative inline-block">
      <div className="relative group">
        {isImage && preview ? (
          <div className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-primary/20">
            <img
              src={preview}
              alt={file.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : isPDF ? (
          <div className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-primary/20 bg-muted flex items-center justify-center">
            <FileText className="h-10 w-10 text-muted-foreground" />
          </div>
        ) : (
          <div className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-primary/20 bg-muted flex items-center justify-center">
            <FileText className="h-10 w-10 text-muted-foreground" />
          </div>
        )}
        
        <Button
          size="icon"
          variant="destructive"
          className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="mt-1 max-w-24">
        <p className="text-xs truncate text-muted-foreground">{file.name}</p>
        <Badge variant="secondary" className="text-xs mt-1">
          {(file.size / 1024).toFixed(1)} KB
        </Badge>
      </div>
    </div>
  );
}
