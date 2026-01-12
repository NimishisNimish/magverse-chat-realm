import { memo, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSkeleton } from "@/components/ui/skeleton";
import ChatMessage from "@/components/ChatMessage";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Bot, Zap, Brain, Globe } from "lucide-react";

interface Source {
  url: string;
  title: string;
  snippet?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
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

interface ChatMessageListProps {
  messages: Message[];
  loading: boolean;
  editingMessageId: string | null;
  editText: string;
  showThinkingProcess: boolean;
  activeQuickAction: string | null;
  enableMultiStepReasoning: boolean;
  chatId: string | null;
  streamingMessageId?: string | null;
  onEditStart: (messageId: string, content: string) => void;
  onEditChange: (text: string) => void;
  onEditSave: (messageId: string) => void;
  onEditCancel: () => void;
  onRegenerate: (message: Message) => void;
  onCopy: (text: string) => void;
  onDownloadImage: (url: string, filename: string) => void;
  onRetry: (message: Message) => void;
  onSuggestionSelect: (suggestion: string) => void;
}

// Empty State Component
const EmptyState = memo(({ onSuggestionSelect }: { onSuggestionSelect: (s: string) => void }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex-1 flex flex-col items-center justify-center p-8 text-center"
  >
    {/* Animated Logo/Icon */}
    <motion.div
      className="relative mb-6"
      animate={{ 
        scale: [1, 1.02, 1],
      }}
      transition={{ 
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center border border-purple-500/30 shadow-lg shadow-purple-500/10">
        <Sparkles className="h-10 w-10 text-purple-400" />
      </div>
      {/* Floating particles */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-purple-400/60"
          style={{
            top: `${20 + i * 20}%`,
            left: `${-10 + i * 10}%`,
          }}
          animate={{
            y: [0, -10, 0],
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{
            duration: 2 + i * 0.5,
            repeat: Infinity,
            delay: i * 0.3,
          }}
        />
      ))}
    </motion.div>

    <h2 className="text-2xl font-bold gradient-text mb-2">
      Welcome to Magverse AI
    </h2>
    <p className="text-muted-foreground mb-8 max-w-md">
      Start a conversation with the most powerful AI models. Ask anything, create content, or explore ideas.
    </p>

    {/* Quick Start Options */}
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
      {[
        { icon: Bot, label: "Chat", desc: "Start talking", color: "from-green-500/20 to-emerald-500/20 border-green-500/30" },
        { icon: Zap, label: "Fast", desc: "Quick answers", color: "from-yellow-500/20 to-orange-500/20 border-yellow-500/30" },
        { icon: Brain, label: "Think", desc: "Deep analysis", color: "from-purple-500/20 to-pink-500/20 border-purple-500/30" },
        { icon: Globe, label: "Search", desc: "Web search", color: "from-cyan-500/20 to-blue-500/20 border-cyan-500/30" },
      ].map(({ icon: Icon, label, desc, color }) => (
        <motion.button
          key={label}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          className={`p-4 rounded-xl bg-gradient-to-br ${color} border flex flex-col items-center gap-2 transition-all hover:shadow-lg`}
          onClick={() => onSuggestionSelect(`Help me with ${label.toLowerCase()}`)}
        >
          <Icon className="h-6 w-6" />
          <div>
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-muted-foreground">{desc}</p>
          </div>
        </motion.button>
      ))}
    </div>

  </motion.div>
));

EmptyState.displayName = 'EmptyState';

export const ChatMessageList = memo(({
  messages,
  loading,
  editingMessageId,
  editText,
  showThinkingProcess,
  activeQuickAction,
  enableMultiStepReasoning,
  chatId,
  streamingMessageId,
  onEditStart,
  onEditChange,
  onEditSave,
  onEditCancel,
  onRegenerate,
  onCopy,
  onDownloadImage,
  onRetry,
  onSuggestionSelect,
}: ChatMessageListProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0 && !loading) {
    return <EmptyState onSuggestionSelect={onSuggestionSelect} />;
  }

  return (
    <ScrollArea ref={scrollAreaRef} className="flex-1 px-4 py-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <AnimatePresence mode="popLayout">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              isEditing={editingMessageId === message.id}
              editText={editText}
              loading={loading}
              showThinkingProcess={showThinkingProcess}
              activeQuickAction={activeQuickAction}
              enableMultiStepReasoning={enableMultiStepReasoning}
              chatId={chatId}
              isStreaming={streamingMessageId === message.id}
              onEditStart={onEditStart}
              onEditChange={onEditChange}
              onEditSave={onEditSave}
              onEditCancel={onEditCancel}
              onRegenerate={onRegenerate}
              onCopy={onCopy}
              onDownloadImage={onDownloadImage}
              onRetry={onRetry}
            />
          ))}
        </AnimatePresence>

        {/* Loading Skeleton */}
        {loading && !streamingMessageId && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <MessageSkeleton />
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
});

ChatMessageList.displayName = 'ChatMessageList';
