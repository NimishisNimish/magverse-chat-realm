import React, { memo, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { AIModelLogo } from '@/components/AIModelLogo';
import { AIModelBadge } from '@/components/AIModelBadge';
import { FeedbackButtons } from '@/components/FeedbackButtons';
import { MessageSources } from '@/components/MessageSources';
import { ThinkingAccordion } from '@/components/chat/ThinkingAccordion';
import CodeBlock from '@/components/CodeBlock';
import { softCleanMarkdown } from '@/utils/markdownCleaner';
import { 
  FileText, 
  Edit2, 
  Check, 
  RefreshCw, 
  Copy, 
  Download, 
  Brain,
  Clock,
  RotateCcw,
  FileDown,
  ChevronDown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';

interface Source {
  url: string;
  title: string;
  snippet?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  timestamp: Date;
  attachmentUrl?: string;
  attachmentType?: string;
  attachmentFileName?: string;
  userMessageId?: string;
  thinkingProcess?: string;
  reasoningSteps?: Array<{ step: number; thought: string; conclusion: string }>;
  isError?: boolean;
  ttft?: number;
  responseTime?: number;
  sources?: Source[];
}

interface ChatMessageProps {
  message: Message;
  isEditing: boolean;
  editText: string;
  loading: boolean;
  showThinkingProcess: boolean;
  activeQuickAction: string | null;
  enableMultiStepReasoning: boolean;
  chatId: string | null;
  isStreaming?: boolean;
  thinkingState?: {
    isThinking: boolean;
    content: string;
    complete: boolean;
  };
  onEditStart: (messageId: string, content: string) => void;
  onEditChange: (text: string) => void;
  onEditSave: (messageId: string) => void;
  onEditCancel: () => void;
  onRegenerate: (message: Message) => void;
  onCopy: (text: string) => void;
  onDownloadImage: (url: string, filename: string) => void;
  onRetry: (message: Message) => void;
  onRetryWithModel?: (message: Message, modelId: string) => void;
}

// Available models for retry
const RETRY_MODELS = [
  { id: 'lovable-gemini-flash', name: 'Gemini Flash', icon: '⚡' },
  { id: 'lovable-gemini-pro', name: 'Gemini Pro', icon: '🧠' },
  { id: 'lovable-gpt5-mini', name: 'GPT-5 Mini', icon: '✨' },
  { id: 'lovable-gpt5', name: 'GPT-5', icon: '🚀' },
  { id: 'perplexity', name: 'Perplexity Sonar', icon: '🔍' },
];

// Parse content and extract code blocks
const parseContentWithCodeBlocks = (content: string): React.ReactNode[] => {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let keyIndex = 0;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      const textBefore = content.slice(lastIndex, match.index);
      parts.push(
        <span key={`text-${keyIndex++}`} className="whitespace-pre-wrap">
          {textBefore}
        </span>
      );
    }

    // Add code block
    const language = match[1] || 'text';
    const code = match[2].trim();
    parts.push(
      <CodeBlock key={`code-${keyIndex++}`} code={code} language={language} />
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last code block
  if (lastIndex < content.length) {
    const remainingText = content.slice(lastIndex);
    parts.push(
      <span key={`text-${keyIndex++}`} className="whitespace-pre-wrap">
        {remainingText}
      </span>
    );
  }

  return parts.length > 0 ? parts : [<span key="content">{content}</span>];
};

// Memoized message content with code block support
const MessageContent = memo(({ 
  content, 
  isStreaming 
}: { 
  content: string; 
  isStreaming?: boolean;
}) => {
  const processedContent = useMemo(() => {
    if (isStreaming) {
      // During streaming, show raw text for performance
      return <span className="whitespace-pre-wrap">{content}</span>;
    }
    
    // Clean markdown first, then parse code blocks
    const cleanedContent = softCleanMarkdown(content);
    return parseContentWithCodeBlocks(cleanedContent);
  }, [content, isStreaming]);

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      {processedContent}
    </div>
  );
});

MessageContent.displayName = 'MessageContent';

// Download as PDF function
const downloadAsPdf = async (content: string, model?: string) => {
  try {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(16);
    doc.text('AI Response', 14, 20);
    
    // Model info
    if (model) {
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Model: ${model}`, 14, 28);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 34);
    }
    
    // Content
    doc.setTextColor(0);
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(content, 180);
    doc.text(lines, 14, 45);
    
    doc.save(`ai-response-${Date.now()}.pdf`);
    toast.success('Downloaded as PDF');
  } catch (error) {
    console.error('PDF download error:', error);
    toast.error('Failed to download PDF');
  }
};

// Download as Word function
const downloadAsWord = async (content: string, model?: string) => {
  try {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: 'AI Response',
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Model: ${model || 'AI Assistant'}`,
                italics: true,
                color: '666666',
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Generated: ${new Date().toLocaleString()}`,
                italics: true,
                color: '666666',
              }),
            ],
          }),
          new Paragraph({ text: '' }),
          ...content.split('\n').map(line => 
            new Paragraph({ text: line })
          ),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `ai-response-${Date.now()}.docx`);
    toast.success('Downloaded as Word document');
  } catch (error) {
    console.error('Word download error:', error);
    toast.error('Failed to download Word document');
  }
};

const ChatMessage = memo(({
  message,
  isEditing,
  editText,
  loading,
  showThinkingProcess,
  activeQuickAction,
  enableMultiStepReasoning,
  chatId,
  isStreaming,
  thinkingState,
  onEditStart,
  onEditChange,
  onEditSave,
  onEditCancel,
  onRegenerate,
  onCopy,
  onDownloadImage,
  onRetry,
  onRetryWithModel,
}: ChatMessageProps) => {
  const [showRetryMenu, setShowRetryMenu] = useState(false);
  
  // Check if this model should show sources (Perplexity or any message with sources)
  const shouldShowSources = message.role === 'assistant' && message.sources && message.sources.length > 0;
  const isPerplexityModel = message.model && 
    ['perplexity', 'perplexity-pro', 'perplexity-reasoning'].includes(message.model);
  
  // Handle retry with different model
  const handleRetryWithModel = (modelId: string) => {
    if (onRetryWithModel) {
      onRetryWithModel(message, modelId);
    }
    setShowRetryMenu(false);
  };
  
  return (
    <motion.div
      key={message.id}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-6`}
    >
      <div className={`max-w-[85%] ${message.role === 'user' ? 'ml-auto' : ''}`}>
        {/* Thinking Accordion for reasoning models */}
        {message.role === 'assistant' && thinkingState && (thinkingState.isThinking || thinkingState.content) && (
          <ThinkingAccordion
            isThinking={thinkingState.isThinking}
            thinkingContent={thinkingState.content}
            isComplete={thinkingState.complete}
            duration={message.responseTime}
            defaultOpen={showThinkingProcess}
          />
        )}
        
        <div
          className={`rounded-2xl px-4 py-3 ${
            message.role === 'user'
              ? 'bg-primary text-primary-foreground'
              : message.isError
                ? 'bg-destructive/10 border-2 border-destructive/40'
                : 'bg-card border border-border/40'
          }`}
        >
          {/* Image attachment */}
          {message.attachmentUrl && message.attachmentType === 'image' ? (
            <div className="mb-3 rounded-lg overflow-hidden border border-border/40">
              <motion.img 
                src={message.attachmentUrl} 
                alt="Generated image"
                className="w-full max-w-md h-auto object-contain"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
              {message.model?.includes('image') && (
                <div className="px-3 py-2 bg-muted/50 border-t border-border/40 flex items-center gap-2">
                  <AIModelLogo modelId={message.model} size="sm" />
                  <span className="text-xs text-muted-foreground">Generated Image</span>
                </div>
              )}
            </div>
          ) : message.attachmentUrl ? (
            <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="h-3 w-3" />
              <span>{message.attachmentFileName || 'Attachment'}</span>
            </div>
          ) : null}

          {/* User message with edit functionality */}
          {message.role === 'user' ? (
            isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editText}
                  onChange={(e) => onEditChange(e.target.value)}
                  className="min-h-[100px] resize-none bg-background/50"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => onEditSave(message.id)}
                    disabled={!editText.trim() || loading}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Save & Regenerate
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onEditCancel}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <MessageContent content={message.content} isStreaming={false} />
                <div className="flex items-center gap-1 pt-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-muted-foreground hover:text-foreground"
                    onClick={() => onEditStart(message.id, message.content)}
                    disabled={loading}
                    title="Edit message"
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    <span className="text-xs">Edit</span>
                  </Button>
                </div>
              </div>
            )
          ) : (
            <MessageContent content={message.content} isStreaming={isStreaming} />
          )}

          {/* Sources display - works for Perplexity and any AI with web search results */}
          {shouldShowSources && (
            <MessageSources sources={message.sources!} />
          )}

          {/* Legacy Thinking Process Display (for non-streaming) */}
          {message.role === 'assistant' && !thinkingState && (message.thinkingProcess || message.reasoningSteps) && (
            <ThinkingAccordion
              isThinking={false}
              thinkingContent={message.thinkingProcess || ''}
              reasoningSteps={message.reasoningSteps}
              isComplete={true}
              duration={message.responseTime}
              defaultOpen={showThinkingProcess}
            />
          )}
        </div>

        {/* Response Time Metrics */}
        {message.role === 'assistant' && !message.isError && (message.ttft || message.responseTime) && (
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {message.ttft && <span>TTFT: {message.ttft}ms</span>}
            {message.ttft && message.responseTime && <span>•</span>}
            {message.responseTime && <span>Total: {(message.responseTime / 1000).toFixed(1)}s</span>}
          </div>
        )}

        {/* AI Model Badge */}
        {message.role === 'assistant' && message.model && (
          <div className="mt-2">
            <AIModelBadge 
              modelId={message.model} 
              showReasoningMode={activeQuickAction === 'reasoning' || enableMultiStepReasoning}
            />
          </div>
        )}

        {/* Action buttons for assistant messages */}
        {message.role === 'assistant' && (
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            {/* Retry button for error messages */}
            {message.isError && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRetry(message)}
                disabled={loading}
                className="h-7 px-2 text-primary hover:text-primary"
                title="Retry this request"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
            
            {/* Download button for images */}
            {!message.isError && message.attachmentUrl && message.attachmentType === 'image' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDownloadImage(message.attachmentUrl!, `image-${Date.now()}.png`)}
                className="h-7 px-2"
                title="Download image"
              >
                <Download className="h-3 w-3" />
              </Button>
            )}
            
            {!message.isError && (
              <>
                {/* Regenerate with same model */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRegenerate(message)}
                  disabled={loading}
                  className="h-7 px-2"
                  title="Regenerate response"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
                
                {/* Retry with different model dropdown */}
                {onRetryWithModel && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={loading}
                        className="h-7 px-2 gap-1"
                        title="Retry with different model"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <ChevronDown className="h-2.5 w-2.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                        Retry with different model
                      </div>
                      <DropdownMenuSeparator />
                      {RETRY_MODELS.filter(m => m.id !== message.model).map((model) => (
                        <DropdownMenuItem
                          key={model.id}
                          onClick={() => handleRetryWithModel(model.id)}
                          className="gap-2"
                        >
                          <span>{model.icon}</span>
                          <span>{model.name}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                
                {/* Copy */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCopy(message.content)}
                  className="h-7 px-2"
                  title="Copy response"
                >
                  <Copy className="h-3 w-3" />
                </Button>
                
                {/* Download Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 gap-1"
                      title="Download response"
                    >
                      <FileDown className="h-3 w-3" />
                      <ChevronDown className="h-2.5 w-2.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => downloadAsPdf(message.content, message.model)} className="gap-2">
                      <FileText className="h-4 w-4" />
                      Download as PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => downloadAsWord(message.content, message.model)} className="gap-2">
                      <FileText className="h-4 w-4" />
                      Download as Word
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <FeedbackButtons
                  messageId={message.id}
                  chatId={chatId || ''}
                  model={message.model || 'AI'}
                  content={message.content}
                  timestamp={message.timestamp}
                  role={message.role}
                />
              </>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
});

ChatMessage.displayName = 'ChatMessage';

export default ChatMessage;
