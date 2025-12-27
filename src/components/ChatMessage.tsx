import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { AIModelLogo } from '@/components/AIModelLogo';
import { AIModelBadge } from '@/components/AIModelBadge';
import { FeedbackButtons } from '@/components/FeedbackButtons';
import { renderWithCitations } from '@/utils/citationRenderer';
import { softCleanMarkdown } from '@/utils/markdownCleaner';
import { 
  FileText, 
  Edit2, 
  Check, 
  RefreshCw, 
  Copy, 
  Download, 
  Brain,
  Clock
} from 'lucide-react';

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
  onEditStart: (messageId: string, content: string) => void;
  onEditChange: (text: string) => void;
  onEditSave: (messageId: string) => void;
  onEditCancel: () => void;
  onRegenerate: (message: Message) => void;
  onCopy: (text: string) => void;
  onDownloadImage: (url: string, filename: string) => void;
  onRetry: (message: Message) => void;
}

// Memoized message content - only parse markdown when content is final
const MessageContent = memo(({ 
  content, 
  isStreaming 
}: { 
  content: string; 
  isStreaming?: boolean;
}) => {
  // During streaming, show raw text for performance
  // Parse markdown only when streaming is complete
  const processedContent = useMemo(() => {
    if (isStreaming) {
      return content; // Raw text during streaming for performance
    }
    return softCleanMarkdown(renderWithCitations(content));
  }, [content, isStreaming]);

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
      {processedContent}
    </div>
  );
});

MessageContent.displayName = 'MessageContent';

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
  onEditStart,
  onEditChange,
  onEditSave,
  onEditCancel,
  onRegenerate,
  onCopy,
  onDownloadImage,
  onRetry,
}: ChatMessageProps) => {
  
  return (
    <motion.div
      key={message.id}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-6`}
    >
      <div className={`max-w-[85%] ${message.role === 'user' ? 'ml-auto' : ''}`}>
        <div
          className={`rounded-2xl px-4 py-3 ${
            message.role === 'user'
              ? 'bg-primary text-primary-foreground'
              : message.isError
                ? 'bg-destructive/10 border-2 border-destructive/40'
                : 'bg-muted/50 border border-border/40'
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

          {/* Thinking Process Display */}
          {message.role === 'assistant' && (message.thinkingProcess || message.reasoningSteps) && (
            <details className="mt-3 pt-3 border-t border-border/40" open={showThinkingProcess}>
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
                <Brain className="h-3 w-3" />
                {message.reasoningSteps ? 'Multi-Step Reasoning Process' : 'Thinking Process'}
              </summary>
              <div className="mt-2 p-3 bg-background/50 rounded-lg border border-border/30 text-xs space-y-2">
                {message.reasoningSteps ? (
                  message.reasoningSteps.map((step) => (
                    <div key={step.step} className="space-y-1">
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="shrink-0 text-xs">
                          Step {step.step}
                        </Badge>
                        <span className="text-muted-foreground italic">{step.thought}</span>
                      </div>
                      {step.conclusion && (
                        <div className="pl-14 text-foreground">
                          → {step.conclusion}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-muted-foreground whitespace-pre-wrap">
                    {message.thinkingProcess}
                  </div>
                )}
              </div>
            </details>
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
          <div className="flex items-center gap-1 mt-2">
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCopy(message.content)}
                  className="h-7 px-2"
                >
                  <Copy className="h-3 w-3" />
                </Button>
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
