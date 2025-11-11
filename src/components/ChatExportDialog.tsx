import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Download, FileJson, FileText } from 'lucide-react';
import { generateChatPDF } from '@/utils/pdfGenerator';
import { toast } from 'sonner';

interface Message {
  id: string;
  model: string;
  content: string;
  timestamp: Date;
  role: 'user' | 'assistant';
  images?: Array<{image_url: {url: string}}>;
  videos?: Array<{videoUrl: string, prompt: string}>;
  attachmentFile?: { name: string; type: string; url: string; };
  sources?: Array<{url: string, title: string}>;
}

interface ChatExportDialogProps {
  messages: Message[];
  chatTitle?: string;
}

export const ChatExportDialog = ({ messages, chatTitle = 'Chat History' }: ChatExportDialogProps) => {
  const [includeImages, setIncludeImages] = useState(true);
  const [includeVideos, setIncludeVideos] = useState(true);
  const [includeAttachments, setIncludeAttachments] = useState(true);
  const [includeSources, setIncludeSources] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(true);

  const exportAsJSON = () => {
    const exportData = {
      title: chatTitle,
      exportedAt: new Date().toISOString(),
      messageCount: messages.length,
      messages: messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        model: msg.model,
        content: msg.content,
        timestamp: msg.timestamp.toISOString(),
        ...(includeImages && msg.images ? { images: msg.images } : {}),
        ...(includeVideos && msg.videos ? { videos: msg.videos } : {}),
        ...(includeAttachments && msg.attachmentFile ? { attachment: msg.attachmentFile } : {}),
        ...(includeSources && msg.sources ? { sources: msg.sources } : {}),
        ...(includeMetadata ? {
          metadata: {
            hasImages: !!msg.images?.length,
            hasVideos: !!msg.videos?.length,
            hasAttachment: !!msg.attachmentFile,
            hasSources: !!msg.sources?.length
          }
        } : {})
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chatTitle.replace(/\s+/g, '-')}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Chat exported as JSON');
  };

  const exportAsPDF = async () => {
    try {
      const filteredMessages = messages.map(msg => ({
        ...msg,
        images: includeImages ? msg.images : undefined,
        videos: includeVideos ? msg.videos : undefined,
        attachmentFile: includeAttachments ? msg.attachmentFile : undefined,
        sources: includeSources ? msg.sources : undefined,
      }));

      await generateChatPDF(filteredMessages, chatTitle);
      toast.success('Chat exported as PDF');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Export Chat
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export Chat History</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Customize what to include in your export
          </p>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="images" className="cursor-pointer">Include Images</Label>
              <Switch id="images" checked={includeImages} onCheckedChange={setIncludeImages} />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="videos" className="cursor-pointer">Include Videos</Label>
              <Switch id="videos" checked={includeVideos} onCheckedChange={setIncludeVideos} />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="attachments" className="cursor-pointer">Include Attachments</Label>
              <Switch id="attachments" checked={includeAttachments} onCheckedChange={setIncludeAttachments} />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="sources" className="cursor-pointer">Include Sources</Label>
              <Switch id="sources" checked={includeSources} onCheckedChange={setIncludeSources} />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="metadata" className="cursor-pointer">Include Metadata</Label>
              <Switch id="metadata" checked={includeMetadata} onCheckedChange={setIncludeMetadata} />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={exportAsJSON} className="flex-1">
              <FileJson className="w-4 h-4 mr-2" />
              Export JSON
            </Button>
            <Button onClick={exportAsPDF} className="flex-1" variant="secondary">
              <FileText className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
