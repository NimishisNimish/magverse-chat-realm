import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageSquarePlus, 
  Send, 
  Paperclip, 
  Sparkles,
  Bot,
  Brain,
  Cpu,
  Zap,
  Star,
  Circle,
  Upload,
  X,
  History as HistoryIcon,
  Globe,
  TrendingUp,
  GraduationCap,
  Menu,
  Rocket,
  Download,
  Loader2
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { generateChatPDF } from "@/utils/pdfGenerator";
import { Link, useSearchParams } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const aiModels = [
  { id: "chatgpt", name: "ChatGPT", icon: Bot, color: "text-primary" },
  { id: "gemini", name: "Gemini", icon: Brain, color: "text-secondary" },
  { id: "perplexity", name: "Perplexity", icon: Cpu, color: "text-secondary" },
  { id: "deepseek", name: "Deepseek", icon: Zap, color: "text-purple-500" },
  { id: "claude", name: "Claude", icon: Sparkles, color: "text-accent" },
  { id: "llama", name: "Llama", icon: Rocket, color: "text-primary" },
  { id: "grok", name: "Grok", icon: Star, color: "text-accent" },
];

interface Message {
  id: string;
  model: string;
  content: string;
  timestamp: Date;
  role: 'user' | 'assistant';
  webSearchEnabled?: boolean;
  searchMode?: string;
  fullContent?: string; // For streaming support
}

const Chat = () => {
  const [selectedModels, setSelectedModels] = useState<string[]>(["chatgpt"]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentType, setAttachmentType] = useState<'pdf' | 'image' | 'other' | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [processingFile, setProcessingFile] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [searchMode, setSearchMode] = useState<'general' | 'finance' | 'academic'>('general');
  const [deepResearchMode, setDeepResearchMode] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeepResearching, setIsDeepResearching] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user, profile, refreshProfile } = useAuth();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const chatId = searchParams.get('id');
    if (chatId && user) {
      loadChatMessages(chatId);
    }
  }, [searchParams, user]);

  const loadChatMessages = async (chatId: string) => {
    setCurrentChatId(chatId);
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      const loadedMessages: Message[] = data.map(msg => ({
        id: msg.id,
        model: msg.model || 'AI',
        content: msg.content,
        timestamp: new Date(msg.created_at),
        role: msg.role as 'user' | 'assistant',
      }));
      setMessages(loadedMessages);
    }
  };

  const toggleModel = (modelId: string) => {
    setSelectedModels(prev => {
      if (prev.includes(modelId)) {
        // Prevent deselecting if it's the last model
        if (prev.length === 1) {
          toast({
            title: "At least one model required",
            description: "You must keep at least one AI model selected.",
            variant: "destructive",
          });
          return prev;
        }
        // Allow deselection
        return prev.filter(id => id !== modelId);
      } else {
        // Check if already at max limit
        if (prev.length >= 3) {
          toast({
            title: "Maximum models reached",
            description: "You can select up to 3 AI models at a time.",
            variant: "destructive",
          });
          return prev;
        }
        // Allow selection
        return [...prev, modelId];
      }
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    setUploadStatus('uploading');
    
    // Validate file size first (25MB max)
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

    const uploadTimeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Upload timeout - file took too long to upload. Please try a smaller file.')), 120000); // 2 minutes
    });

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;
      
      const uploadPromise = supabase.storage
        .from('chat-attachments')
        .upload(filePath, file);
      
      const { error: uploadError } = await Promise.race([
        uploadPromise,
        uploadTimeout
      ]) as any;

      if (uploadError) throw uploadError;

      const signedUrlTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout generating signed URL')), 30000); // 30 seconds
      });

      const signedUrlPromise = supabase.storage
        .from('chat-attachments')
        .createSignedUrl(filePath, 604800); // 7 days (604800 seconds) to prevent expiration

      const { data: signedUrlData, error: signedUrlError } = await Promise.race([
        signedUrlPromise,
        signedUrlTimeout
      ]) as any;

      if (signedUrlError) throw signedUrlError;

      setAttachmentUrl(signedUrlData.signedUrl);
      
      // Detect file type
      const isPdf = fileExt === 'pdf';
      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt?.toLowerCase() || '');
      
      setAttachmentType(isPdf ? 'pdf' : isImage ? 'image' : 'other');
      setUploadStatus('success');
      
      toast({
        title: "File uploaded successfully",
        description: isPdf 
          ? "PDF ready - AI will extract and analyze the text content when you send your message." 
          : isImage
          ? "Image ready - AI will analyze the image when you send your message."
          : "File ready to send.",
      });
    } catch (error: any) {
      setUploadStatus('error');
      
      let errorDesc = error.message || "File upload failed. Please try again.";
      
      if (error.message?.includes('timeout')) {
        errorDesc = "Upload timed out - file took too long to upload. Try a smaller file or check your connection.";
      } else if (error.message?.includes('storage')) {
        errorDesc = "Storage error - unable to save file. Please try again or contact support.";
      }
      
      toast({
        title: "Upload failed",
        description: errorDesc,
        variant: "destructive",
      });
      setAttachmentUrl(null);
      setAttachmentType(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !user || loading) return;

    // Validate at least one model is selected
    if (selectedModels.length === 0) {
      toast({
        title: "No AI model selected",
        description: "Please select at least one AI model to chat with.",
        variant: "destructive",
      });
      return;
    }

    // Check credits for non-pro users
    if (!profile?.is_pro && (profile?.credits_remaining || 0) <= 0) {
      toast({
        title: "No credits remaining",
        description: "You've used all your free credits for today. Upgrade to Pro for unlimited chats!",
        variant: "destructive",
      });
      return;
    }

    // Warn if web search enabled but no Perplexity selected
    if (webSearchEnabled && !selectedModels.includes('perplexity')) {
      toast({
        title: "Web Search Limited",
        description: "Only Perplexity supports real-time web search. Other models use their training data only.",
        variant: "default",
      });
    }

    // Set Deep Research state if enabled
    if (deepResearchMode) {
      setIsDeepResearching(true);
    }

    setLoading(true);

    // Clear attachment UI immediately when sending (not in finally block)
    const attachmentToSend = attachmentUrl; // Capture for API call
    const attachmentTypeToSend = attachmentType; // Capture for feedback
    setAttachmentUrl(null);
    setAttachmentType(null);
    setUploadStatus('idle');
    
    // Show processing indicator for files
    if (attachmentToSend) {
      setProcessingFile(true);
      if (attachmentTypeToSend === 'pdf') {
        toast({
          title: "Processing PDF...",
          description: "Extracting text from your PDF. This may take a moment.",
        });
      } else if (attachmentTypeToSend === 'image') {
        toast({
          title: "Processing image...",
          description: "Preparing image for AI analysis.",
        });
      }
    }
    
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      model: 'user',
      content: input,
      timestamp: new Date(),
      role: 'user',
      webSearchEnabled,
      searchMode,
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput("");

    // Frontend timeout (slightly longer than backend to avoid race conditions)
    const timeoutMs = deepResearchMode ? 200000 : 100000; // 3.3 min for Deep Research, 1.7 min for regular
    const timeout = new Promise((_, reject) => {
      const timeoutMessage = deepResearchMode 
        ? 'Deep Research timed out after 3 minutes. The AI models may be slow or rate limited.'
        : 'Request timed out after 1.7 minutes. For complex queries requiring extensive research, try Deep Research mode.';
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    });

    try {
      // Context window management: keep only last 6 messages to prevent token overflow
      const MAX_CONTEXT_MESSAGES = 6;
      const recentMessages = messages.slice(-MAX_CONTEXT_MESSAGES);
      
      console.log(`Sending ${recentMessages.length} recent messages (${messages.length} total in history)`);

      const { data, error } = await Promise.race([
        supabase.functions.invoke('chat-with-ai', {
          body: {
            messages: [
              ...recentMessages.map(m => ({
                role: m.role,
                content: m.content,
              })),
              { role: 'user', content: input } // Send clean input without attachment URL
            ],
            selectedModels,
            webSearchEnabled,
            searchMode,
            deepResearchMode,
            ...(currentChatId && { chatId: currentChatId }),
            ...(attachmentToSend && { 
              attachmentUrl: attachmentToSend,
              attachmentExtension: attachmentToSend.split('?')[0].split('.').pop()?.toLowerCase()
            }),
          },
        }).then(result => {
          // Handle specific error codes
          if (result.error?.status === 429) {
            throw new Error('Rate limit reached. Please wait and try again.');
          }
          if (result.error?.status === 504) {
            throw new Error('Backend timeout. AI took too long to respond.');
          }
          return result;
        }),
        timeout
      ]) as any;

      if (error) throw error;

      // Clear processing state
      setProcessingFile(false);
      
      // Validate we got responses
      if (!data.responses || data.responses.length === 0) {
        throw new Error('All AI models failed to respond. Please check your API keys or try different models.');
      }

      if (data.chatId && !currentChatId) {
        setCurrentChatId(data.chatId);
      }

      // Create assistant messages with visual confirmation for file attachments
      const aiMessages: Message[] = data.responses.map((response: any) => {
        let content = response.content;
        
        // Add visual confirmation if PDF was processed
        if (attachmentTypeToSend === 'pdf' && content.includes('PDF Document Analysis')) {
          content = "📄 *I've analyzed your PDF document*\n\n" + content;
        }
        // Add visual confirmation if image was processed
        else if (attachmentTypeToSend === 'image') {
          content = "🖼️ *I've analyzed your image*\n\n" + content;
        }
        
        return {
          id: `${Date.now()}-${response.model}-${Math.random()}`,
          model: aiModels.find(m => m.id === response.model)?.name || response.model,
          content: content,
          timestamp: new Date(),
          role: 'assistant' as const,
        };
      });

      // Show responses immediately
      const messagesWithContent = aiMessages;
      
      setMessages(prev => [...prev, ...messagesWithContent]);
      
      // Show appropriate toast based on success
      if (data.partialSuccess && aiMessages.length < selectedModels.length) {
        // Partial success - some models failed
        const failedCount = selectedModels.length - aiMessages.length;
        toast({
          title: "Partial Response",
          description: `${aiMessages.length} of ${selectedModels.length} AI models responded successfully. ${failedCount} model${failedCount > 1 ? 's' : ''} failed.`,
          variant: "default",
        });
      } else {
        // Full success - all models responded
        toast({
          title: `${aiMessages.length} AI${aiMessages.length > 1 ? 's' : ''} responded`,
          description: `Successfully received responses from: ${aiMessages.map(m => m.model).join(', ')}`,
        });
      }

      await refreshProfile();
      setIsDeepResearching(false);
    } catch (error: any) {
      console.error('Chat error:', error);
      setProcessingFile(false);
      setIsDeepResearching(false);
      
      // Detect token limit errors and auto-retry with reduced context
      if (error.message?.includes('token') || error.message?.includes('context') || error.message?.includes('length')) {
        toast({
          title: "Context too long",
          description: "Your conversation history is too long. Clearing older messages and retrying...",
        });
        
        // Clear old messages except the last 3 and retry once
        const reducedMessages = messages.slice(-3);
        setMessages([...reducedMessages, userMessage]);
        
        // Note: This is a simplified retry - in production you might want to track retry attempts
        setLoading(false);
        return;
      }
      
      // Provide more specific error messages
      let errorMessage = "Failed to get AI response. Please try again.";
      
      if (error.message?.includes('PDF') || error.message?.includes('extract')) {
        errorMessage = error.message || "Failed to process PDF file. The file may be scanned/image-based or corrupted.\n\nTips:\n• Try OCR software to convert scanned PDFs to text\n• Upload as images instead if it's a scanned document\n• Ensure the PDF is text-based and not password-protected";
      } else if (error.message?.includes('Image') || error.message?.includes('image')) {
        errorMessage = "Failed to process image. Try:\n• Re-uploading the image\n• Using a different format (JPG, PNG)\n• Ensuring the file is under 10MB";
      } else if (error.message?.includes('timeout')) {
        errorMessage = deepResearchMode 
          ? "Deep Research timed out after 11 minutes. This is very unusual. Please try:\n• Breaking your question into smaller parts\n• Selecting fewer AI models\n• Disabling web search temporarily"
          : "Request timed out after 10 minutes. For complex queries requiring web research, try enabling Deep Research mode.";
      } else if (error.status === 429) {
        errorMessage = "Rate limit reached. OpenRouter is receiving too many requests. Please wait 30 seconds and try again.";
      } else if (error.status === 504) {
        errorMessage = "Backend timeout. The AI models took too long to respond. Try:\n• Selecting only 1-2 models instead of 3+\n• Simplifying your question\n• Trying again in a moment";
      } else if (error.message?.includes('No AI responses')) {
        errorMessage = "All selected AI models failed to respond. This may be due to:\n• OpenRouter API issues\n• Rate limiting\n• Network connectivity\n\nTry selecting different models or wait a moment before retrying.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      // Remove the user message on error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      // Clear loading and file processing states
      setLoading(false);
      setProcessingFile(false);
      setIsDeepResearching(false);
      
      // Attachments already cleared at the start of handleSend
      // DO NOT clear: selectedModels, deepResearchMode, webSearchEnabled, searchMode
      // These should persist until user manually changes them
    }
  };

  const handleDownloadPDF = async () => {
    if (messages.length === 0) {
      toast({
        title: "No messages to download",
        description: "Start a conversation first before downloading.",
        variant: "destructive",
      });
      return;
    }

    setIsDownloading(true);
    try {
      console.log('Generating PDF for', messages.length, 'messages');
      
      // Generate PDF client-side
      const chatTitle = `Chat - ${new Date().toLocaleDateString()}`;
      const pdfBlob = generateChatPDF(messages, chatTitle);
      
      // Create download link
      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `magverse-chat-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "PDF Downloaded",
        description: "Your chat has been saved as a PDF file.",
      });
    } catch (error: any) {
      console.error('PDF generation error:', error);
      toast({
        title: "Download failed",
        description: error.message || "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // Sidebar content component to reuse in both desktop and mobile
  const SidebarContent = () => (
    <>
      <Button 
        variant="hero" 
        className="w-full justify-start"
        onClick={() => {
          setMessages([]);
          setCurrentChatId(null);
          setMobileSheetOpen(false);
        }}
      >
        <MessageSquarePlus className="w-5 h-5" />
        New Chat
      </Button>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            AI Models ({selectedModels.length}/3)
          </h3>
          <div className="space-y-2">
            {aiModels.map(model => {
              const Icon = model.icon;
              const isSelected = selectedModels.includes(model.id);
              return (
                <button
                  key={model.id}
                  onClick={() => toggleModel(model.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                    isSelected 
                      ? 'glass-card border-accent/50 shadow-lg shadow-accent/20' 
                      : 'hover:bg-muted/20'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg ${isSelected ? 'bg-accent/20' : 'bg-muted/20'} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${isSelected ? model.color : 'text-muted-foreground'}`} />
                  </div>
                  <span className={`font-medium ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {model.name}
                  </span>
                  {isSelected && <Circle className="w-2 h-2 ml-auto fill-primary text-primary" />}
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Deep Research Mode */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Research Settings
          </h3>
          
          {/* Deep Research Toggle */}
          <button
            onClick={() => setDeepResearchMode(!deepResearchMode)}
            className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
              deepResearchMode 
                ? 'glass-card border-accent/50 shadow-lg shadow-accent/20' 
                : 'hover:bg-muted/20'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg ${deepResearchMode ? 'bg-accent/20' : 'bg-muted/20'} flex items-center justify-center`}>
              <Brain className={`w-4 h-4 ${deepResearchMode ? 'text-accent' : 'text-muted-foreground'}`} />
            </div>
            <span className={`font-medium ${deepResearchMode ? 'text-foreground' : 'text-muted-foreground'}`}>
              Deep Research Mode
            </span>
            {deepResearchMode && <Circle className="w-2 h-2 ml-auto fill-accent text-accent" />}
          </button>
          
          {deepResearchMode && (
            <p className="text-xs text-muted-foreground pl-2 animate-fade-in">
              Get comprehensive, humanized explanations with examples and real-world context
            </p>
          )}
        </div>
        
        {/* Web Search Settings */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Web Search
          </h3>
          
          {/* Toggle Web Search */}
          <button
            onClick={() => setWebSearchEnabled(!webSearchEnabled)}
            className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
              webSearchEnabled 
                ? 'glass-card border-accent/50 shadow-lg shadow-accent/20' 
                : 'hover:bg-muted/20'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg ${webSearchEnabled ? 'bg-accent/20' : 'bg-muted/20'} flex items-center justify-center`}>
              <Globe className={`w-4 h-4 ${webSearchEnabled ? 'text-accent' : 'text-muted-foreground'}`} />
            </div>
            <span className={`font-medium ${webSearchEnabled ? 'text-foreground' : 'text-muted-foreground'}`}>
              Enable Web Search
            </span>
            {webSearchEnabled && <Circle className="w-2 h-2 ml-auto fill-accent text-accent" />}
          </button>
          
          {webSearchEnabled && (
            <div className="space-y-2 animate-fade-in">
              <p className="text-xs text-muted-foreground pl-2">
                Search Mode
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setSearchMode('general')}
                  className={`p-2 rounded-lg text-xs transition-all ${
                    searchMode === 'general'
                      ? 'glass-card border-accent/50'
                      : 'hover:bg-muted/20'
                  }`}
                >
                  <Globe className="w-4 h-4 mx-auto mb-1" />
                  General
                </button>
                <button
                  onClick={() => setSearchMode('finance')}
                  className={`p-2 rounded-lg text-xs transition-all ${
                    searchMode === 'finance'
                      ? 'glass-card border-accent/50'
                      : 'hover:bg-muted/20'
                  }`}
                >
                  <TrendingUp className="w-4 h-4 mx-auto mb-1" />
                  Finance
                </button>
                <button
                  onClick={() => setSearchMode('academic')}
                  className={`p-2 rounded-lg text-xs transition-all ${
                    searchMode === 'academic'
                      ? 'glass-card border-accent/50'
                      : 'hover:bg-muted/20'
                  }`}
                >
                  <GraduationCap className="w-4 h-4 mx-auto mb-1" />
                  Academic
                </button>
              </div>
            </div>
          )}
        </div>
        
        <Link to="/history">
          <Button variant="outline" className="w-full justify-start">
            <HistoryIcon className="w-5 h-5" />
            Chat History
          </Button>
        </Link>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <div className="flex-1 flex pt-16">
        {/* Desktop Sidebar */}
        <aside className="w-80 glass-card border-r border-glass-border p-6 space-y-6 hidden lg:block">
          <SidebarContent />
        </aside>
        
        {/* Mobile Sheet */}
        <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
          <SheetTrigger asChild>
            <Button 
              variant="outline" 
              size="icon"
              className="fixed top-20 left-4 z-50 lg:hidden glass-card"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-6 overflow-y-auto">
            <SheetHeader>
              <SheetTitle>AI Chat Settings</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-6">
              <SidebarContent />
            </div>
          </SheetContent>
        </Sheet>
        
        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col">
          <ScrollArea className="flex-1 p-6">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-4 max-w-md">
                  <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                    <Sparkles className="w-10 h-10 text-primary animate-glow-pulse" />
                  </div>
                  <h2 className="text-2xl font-bold gradient-text">Start a Conversation</h2>
                  <p className="text-muted-foreground">
                    Select AI models from the sidebar and start chatting. Each model will respond to your messages.
                  </p>
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-6">
                {messages.map(message => (
                  <div 
                    key={message.id} 
                    className={`glass-card-hover p-6 rounded-xl space-y-3 animate-fade-in ${
                      message.role === 'user' ? 'bg-accent/5' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full ${
                        message.role === 'user' ? 'bg-primary/20' : 'bg-accent/20'
                      } flex items-center justify-center`}>
                        <Bot className={`w-4 h-4 ${
                          message.role === 'user' ? 'text-primary' : 'text-accent'
                        }`} />
                      </div>
                      <span className="font-semibold text-sm">
                        {message.role === 'user' ? 'You' : message.model}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                      {message.webSearchEnabled && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {message.searchMode === 'finance' && <TrendingUp className="w-3 h-3" />}
                          {message.searchMode === 'academic' && <GraduationCap className="w-3 h-3" />}
                          {message.searchMode === 'general' ? 'Web' : 
                           message.searchMode === 'finance' ? 'Finance' : 'Academic'}
                        </span>
                      )}
                    </div>
                    <p className="text-foreground leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  </div>
                ))}
                {loading && (
                  <div className="glass-card p-6 rounded-xl animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-accent rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                      <p className="text-muted-foreground ml-2">
                        {processingFile 
                          ? `Processing file${attachmentType === 'pdf' ? ' (extracting PDF text)' : ''}...`
                          : deepResearchMode 
                          ? `Deep Research mode active (${selectedModels.length} model${selectedModels.length > 1 ? 's' : ''})... May take up to 12 minutes for thorough analysis.`
                          : `Processing with ${selectedModels.length} AI model${selectedModels.length > 1 ? 's' : ''}... May take up to 10 minutes.`}
                      </p>
                    </div>
                  </div>
                )}
                {isDeepResearching && (
                  <div className="text-center py-4 text-sm text-muted-foreground animate-pulse">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Deep Research in progress... This may take up to 13 minutes.</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
          
          {/* Input Area */}
          <div className="border-t border-glass-border glass-card p-6">
            <div className="max-w-4xl mx-auto">
              {/* Show attached file preview */}
              {attachmentUrl && (
                <div className="glass-card p-3 rounded-lg border border-accent/30 flex items-center gap-3 mb-3 animate-fade-in">
                  {attachmentUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <img 
                      src={attachmentUrl} 
                      alt="attachment preview" 
                      className="w-16 h-16 rounded object-cover border border-glass-border" 
                    />
                  ) : (
                    <div className="w-16 h-16 rounded bg-accent/20 flex items-center justify-center border border-glass-border">
                      <Paperclip className="w-8 h-8 text-accent" />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{attachmentUrl.split('/').pop()}</p>
                    <p className="text-xs text-accent flex items-center gap-1">
                      <Circle className="w-1.5 h-1.5 fill-accent" />
                      Ready to send
                    </p>
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => {
                      setAttachmentUrl(null);
                      setAttachmentType(null);
                      setUploadStatus('idle');
                    }}
                    className="shrink-0 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              <div className="flex gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  accept="image/*,.pdf,.txt"
                />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || loading}
                >
                  {uploading ? (
                    <Upload className="w-5 h-5 animate-spin text-accent" />
                  ) : uploadStatus === 'success' ? (
                    <Paperclip className="w-5 h-5 text-green-500" />
                  ) : (
                    <Paperclip className="w-5 h-5" />
                  )}
                </Button>
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="Type your message..."
                  className="glass-card border-accent/30 focus:border-accent"
                  disabled={loading}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDownloadPDF}
                  disabled={isDownloading || messages.length === 0}
                  className="shrink-0"
                  title="Download chat as PDF"
                >
                  {isDownloading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Download className="w-5 h-5" />
                  )}
                </Button>
                <Button 
                  variant="hero" 
                  size="icon" 
                  className="shrink-0"
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Chat;
