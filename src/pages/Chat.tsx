import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send, 
  Paperclip, 
  Sparkles,
  Bot,
  Brain,
  Cpu,
  Zap,
  Star,
  Globe,
  X,
  Loader2,
  Copy,
  ThumbsUp,
  ThumbsDown,
  MoreVertical,
  ChevronDown,
  Settings,
  MessageSquare,
  FileText,
  RefreshCw
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Link, useSearchParams } from "react-router-dom";
import { useCreditAlerts } from "@/hooks/useCreditAlerts";
import { usePaymentNotifications } from "@/hooks/usePaymentNotifications";
import { useCreditLimitNotifications } from "@/hooks/useCreditLimitNotifications";
import { FeedbackButtons } from "@/components/FeedbackButtons";
import { CustomInstructionsButton } from "@/components/CustomInstructionsDialog";
import { BudgetAlertDialog } from "@/components/BudgetAlertDialog";
import { renderWithCitations } from "@/utils/citationRenderer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";

const aiModels = [
  { id: "gpt-5-mini", name: "GPT 5.1 Mini", icon: Sparkles, color: "text-purple-400" },
  { id: "gemini-flash", name: "Gemini 3 Pro Flash", icon: Zap, color: "text-primary" },
  { id: "gemini-pro", name: "Gemini 3 Pro", icon: Brain, color: "text-secondary" },
  { id: "gemini-lite", name: "Gemini 3 Pro Lite", icon: Cpu, color: "text-muted-foreground" },
  { id: "gpt-5", name: "GPT 5.1", icon: Bot, color: "text-accent" },
  { id: "gpt-5-nano", name: "GPT 5.1 Nano", icon: Star, color: "text-blue-400" },
  { id: "claude", name: "Claude", icon: Bot, color: "text-orange-400" },
  { id: "perplexity", name: "Perplexity Sonar", icon: Globe, color: "text-green-400" },
  { id: "grok", name: "Grok 4", icon: Zap, color: "text-cyan-400" },
];

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  model?: string;
  timestamp: Date;
  attachmentUrl?: string;
  attachmentType?: string;
  attachmentFileName?: string;
  userMessageId?: string; // Track which user message this is responding to
}

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [selectedModels, setSelectedModels] = useState<string[]>(["gemini-flash"]);
  const [loading, setLoading] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentType, setAttachmentType] = useState<string | null>(null);
  const [attachmentFileName, setAttachmentFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [searchParams] = useSearchParams();
  
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useCreditAlerts();
  usePaymentNotifications();
  useCreditLimitNotifications();

  useEffect(() => {
    if (user) {
      refreshProfile();
    }
  }, [user, refreshProfile]);

  useEffect(() => {
    const chatIdFromUrl = searchParams.get('chatId');
    if (chatIdFromUrl) {
      loadChatHistory(chatIdFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadChatHistory = async (id: string) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const loadedMessages: Message[] = data.map(msg => ({
        id: msg.id,
        role: msg.role as "user" | "assistant",
        content: msg.content,
        model: msg.model || undefined,
        timestamp: new Date(msg.created_at || Date.now()),
        attachmentUrl: msg.attachment_url || undefined,
      }));

      setMessages(loadedMessages);
      setChatId(id);
    } catch (error) {
      console.error('Error loading chat:', error);
    }
  };

  const handleModelToggle = (modelId: string) => {
    setSelectedModels(prev => {
      if (prev.includes(modelId)) {
        return prev.filter(id => id !== modelId);
      } else {
        if (prev.length >= 3) {
          toast({
            title: "Maximum models reached",
            description: "You can select up to 3 AI models at a time.",
            variant: "destructive",
          });
          return prev;
        }
        return [...prev, modelId];
      }
    });
  };

  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;
          
          // Max dimensions
          const MAX_WIDTH = 1920;
          const MAX_HEIGHT = 1920;
          
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            if (blob) {
              const compressed = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressed);
            } else {
              resolve(file);
            }
          }, 'image/jpeg', 0.85);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const processFileUpload = async (file: File) => {
    if (!file || !user) return;

    setAttachmentFileName(file.name);
    setPendingFile(file);
    setUploading(true);
    setUploadStatus('uploading');
    
    const MAX_FILE_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File too large",
        description: `Maximum file size is 25MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`,
        variant: "destructive",
      });
      setUploading(false);
      setUploadStatus('error');
      return;
    }

    try {
      // Compress image files before upload
      let fileToUpload = file;
      const fileExt = file.name.split('.').pop();
      const isImageFile = ['jpg', 'jpeg', 'png', 'webp'].includes(fileExt?.toLowerCase() || '');
      
      if (isImageFile && file.size > 500000) { // Compress if > 500KB
        sonnerToast.info("Compressing image...");
        fileToUpload = await compressImage(file);
        sonnerToast.success(`Compressed from ${(file.size / 1024).toFixed(0)}KB to ${(fileToUpload.size / 1024).toFixed(0)}KB`);
      }
      
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, fileToUpload);

      if (uploadError) throw uploadError;

      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('chat-attachments')
        .createSignedUrl(filePath, 604800);

      if (signedUrlError) throw signedUrlError;

      setAttachmentUrl(signedUrlData.signedUrl);
      
      const isPdf = fileExt === 'pdf';
      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt?.toLowerCase() || '');
      
      setAttachmentType(isPdf ? 'pdf' : isImage ? 'image' : 'other');
      setUploadStatus('success');
      
      sonnerToast.success("File uploaded successfully");
    } catch (error: any) {
      setUploadStatus('error');
      sonnerToast.error(error.message || "File upload failed");
      setAttachmentUrl(null);
      setAttachmentType(null);
      setAttachmentFileName(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processFileUpload(file);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) await processFileUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const removeAttachment = () => {
    setAttachmentUrl(null);
    setAttachmentType(null);
    setAttachmentFileName(null);
    setPendingFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async (specificModels?: string[]) => {
    if ((!input.trim() && !attachmentUrl) || loading) return;
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to use the chat.",
        variant: "destructive",
      });
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
      attachmentUrl: attachmentUrl || undefined,
      attachmentType: attachmentType || undefined,
      attachmentFileName: attachmentFileName || undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    
    const currentAttachmentUrl = attachmentUrl;
    const currentAttachmentType = attachmentType;
    removeAttachment();

    try {
      const modelsToUse = specificModels || selectedModels;
      const { data, error } = await supabase.functions.invoke('lovable-ai-chat', {
        body: {
          message: userMessage.content,
          models: modelsToUse.map(id => {
            const model = aiModels.find(m => m.id === id);
            return model?.id || id;
          }),
          chatId,
          attachmentUrl: currentAttachmentUrl,
          attachmentType: currentAttachmentType,
        },
      });

      if (error) throw error;

      let currentChatId = chatId;
      if (data.chatId && !chatId) {
        setChatId(data.chatId);
        currentChatId = data.chatId;
      }

      if (data.responses && Array.isArray(data.responses)) {
        const assistantMessages: Message[] = data.responses.map((response: any) => ({
          id: `${Date.now()}-${response.model}`,
          role: "assistant" as const,
          content: response.response,
          model: response.model,
          timestamp: new Date(),
          userMessageId: userMessage.id,
        }));

        setMessages(prev => [...prev, ...assistantMessages]);
      }

      await refreshProfile();
    } catch (error: any) {
      console.error('Chat error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async (message: Message) => {
    if (!message.model || !message.userMessageId || loading) return;
    
    const userMsg = messages.find(m => m.id === message.userMessageId);
    if (!userMsg) return;

    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('lovable-ai-chat', {
        body: {
          message: userMsg.content,
          models: [message.model],
          chatId,
          attachmentUrl: userMsg.attachmentUrl,
          attachmentType: userMsg.attachmentType,
        },
      });

      if (error) throw error;

      if (data.responses && Array.isArray(data.responses)) {
        const newResponse: Message = {
          id: `${Date.now()}-${data.responses[0].model}`,
          role: "assistant",
          content: data.responses[0].response,
          model: data.responses[0].model,
          timestamp: new Date(),
          userMessageId: userMsg.id,
        };

        // Replace the old message with the new one
        setMessages(prev => prev.map(m => m.id === message.id ? newResponse : m));
        sonnerToast.success("Response regenerated");
      }

      await refreshProfile();
    } catch (error: any) {
      console.error('Regenerate error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to regenerate response",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    sonnerToast.success("Copied to clipboard");
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <Navbar />
      <BudgetAlertDialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen} />
      
      {/* Main Chat Area - Centered */}
      <div 
        className="flex-1 flex flex-col items-center overflow-hidden"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="w-full max-w-4xl flex flex-col h-full">
          {/* Header - Minimal */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">Chat</h1>
            </div>
            <div className="flex items-center gap-2">
              <CustomInstructionsButton />
              <Link to="/history">
                <Button variant="ghost" size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  History
                </Button>
              </Link>
            </div>
          </div>

          {/* Messages Area */}
          <ScrollArea className="flex-1 px-6" ref={scrollAreaRef}>
            <div className="py-8 space-y-6">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-semibold mb-2">Welcome to AI Chat</h2>
                  <p className="text-muted-foreground mb-6 max-w-md">
                    Choose your AI models and start a conversation
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {aiModels.slice(0, 3).map((model) => {
                      const Icon = model.icon;
                      return (
                        <Button
                          key={model.id}
                          variant="outline"
                          size="sm"
                          onClick={() => handleModelToggle(model.id)}
                          className="gap-2"
                        >
                          <Icon className={`h-4 w-4 ${model.color}`} />
                          {model.name}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <AnimatePresence>
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-6`}
                    >
                      <div className={`max-w-[85%] ${message.role === 'user' ? 'ml-auto' : ''}`}>
                        {message.role === 'assistant' && (
                          <div className="flex items-center gap-2 mb-2">
                            {(() => {
                              const model = aiModels.find(m => m.id === message.model);
                              const Icon = model?.icon || Bot;
                              return (
                                <>
                                  <Icon className={`h-4 w-4 ${model?.color || 'text-primary'}`} />
                                  <span className="text-xs font-medium text-muted-foreground">
                                    {model?.name || 'AI'}
                                  </span>
                                </>
                              );
                            })()}
                          </div>
                        )}
                        
                        <div
                          className={`rounded-2xl px-4 py-3 ${
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted/50 border border-border/40'
                          }`}
                        >
                          {message.attachmentUrl && (
                            <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                              <FileText className="h-3 w-3" />
                              <span>{message.attachmentFileName || 'Attachment'}</span>
                            </div>
                          )}
                          
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            {renderWithCitations(message.content)}
                          </div>
                        </div>

                        {message.role === 'assistant' && (
                          <div className="flex items-center gap-1 mt-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRegenerate(message)}
                              disabled={loading}
                              className="h-7 px-2"
                              title="Regenerate response"
                            >
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(message.content)}
                              className="h-7 px-2"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <FeedbackButtons
                              messageId={message.id}
                              chatId={chatId || ''}
                              model={message.model}
                            />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
              
              {loading && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-muted-foreground"
                >
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">AI is thinking...</span>
                </motion.div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Fixed Input Area at Bottom */}
          <div className="border-t border-border/40 bg-background/80 backdrop-blur-sm">
            <div className="px-6 py-4">
              {/* File Preview */}
              {attachmentUrl && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border/40">
                    <div className="flex items-center gap-2 flex-1">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm truncate">{attachmentFileName || 'File attached'}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={removeAttachment}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Input Box */}
              <div className="flex flex-col gap-3">
                <div className="flex items-end gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.txt,.md"
                  />
                  
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || loading}
                    className="shrink-0"
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Paperclip className="h-4 w-4" />
                    )}
                  </Button>

                  <div className="flex-1 relative">
                    <Textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Type your message..."
                      className="min-h-[52px] max-h-[200px] resize-none pr-12 rounded-xl"
                      disabled={loading}
                    />
                  </div>

                  <Button
                    onClick={() => handleSend()}
                    disabled={(!input.trim() && !attachmentUrl) || loading}
                    size="icon"
                    className="shrink-0 rounded-xl"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>

                {/* Model Selector */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">Models:</span>
                  {aiModels.map((model) => {
                    const Icon = model.icon;
                    const isSelected = selectedModels.includes(model.id);
                    return (
                      <Button
                        key={model.id}
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleModelToggle(model.id)}
                        className="h-7 px-3 gap-1.5"
                      >
                        <Icon className={`h-3 w-3 ${isSelected ? '' : model.color}`} />
                        <span className="text-xs">{model.name}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Drag overlay */}
      {isDragging && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center">
            <Paperclip className="h-12 w-12 mx-auto mb-4 text-primary" />
            <p className="text-lg font-medium">Drop your file here</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;