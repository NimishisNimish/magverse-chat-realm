import { useState } from "react";
import { FileText, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { generateChatPDF } from "@/utils/pdfGenerator";
import { generateChatWord } from "@/utils/wordGenerator";

interface FeedbackButtonsProps {
  messageId: string;
  chatId: string;
  model?: string;
  content: string;
  timestamp: Date | string;
  role: string;
}

export function FeedbackButtons({ content, timestamp, role, model }: FeedbackButtonsProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const message = {
        role,
        model: model || 'AI',
        content,
        timestamp,
      };
      
      const blob = await generateChatPDF([message], `${model || 'AI'}_Response`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${model || 'AI'}_Response_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadWord = async () => {
    setDownloading(true);
    try {
      const message = {
        role,
        model: model || 'AI',
        content,
        timestamp,
      };
      
      await generateChatWord([message], `${model || 'AI'}_Response`);
      toast.success('Word document downloaded successfully');
    } catch (error) {
      console.error('Word generation error:', error);
      toast.error('Failed to generate Word document');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 mt-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDownloadPDF}
        disabled={downloading}
        title="Download as PDF"
      >
        <FileText className="h-4 w-4" />
        <span className="ml-1 text-xs">PDF</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDownloadWord}
        disabled={downloading}
        title="Download as Word"
      >
        <FileDown className="h-4 w-4" />
        <span className="ml-1 text-xs">Word</span>
      </Button>
    </div>
  );
}