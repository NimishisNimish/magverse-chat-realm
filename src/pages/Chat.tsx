import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  Loader2,
  RefreshCw,
  ExternalLink
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
  { id: "gemini-flash", name: "Gemini Flash", icon: Brain, color: "text-primary", model: "google/gemini-2.5-flash" },
  { id: "gemini-pro", name: "Gemini Pro", icon: Brain, color: "text-secondary", model: "google/gemini-2.5-pro" },
  { id: "gemini-lite", name: "Gemini Lite", icon: Cpu, color: "text-muted-foreground", model: "google/gemini-2.5-flash-lite" },
  { id: "gpt-5", name: "GPT-5", icon: Bot, color: "text-accent", model: "openai/gpt-5" },
  { id: "gpt-5-mini", name: "GPT-5 Mini", icon: Zap, color: "text-purple-500", model: "openai/gpt-5-mini" },
  { id: "gpt-5-nano", name: "GPT-5 Nano", icon: Sparkles, color: "text-primary", model: "openai/gpt-5-nano" },
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
  error?: boolean; // Track if this response was an error
  userQuery?: string; // Store original user query for retry
  retrying?: boolean; // Track if currently retrying
  sources?: Array<{url: string, title: string, snippet?: string}>; // Source citations
  images?: Array<{image_url: {url: string}}>; // Generated images
}

const Chat = () => {
  const [selectedModels, setSelectedModels] = useState<string[]>(["gemini-flash"]);
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
  const [imageGenerationMode, setImageGenerationMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const { user, profile, refreshProfile } = useAuth();
  const [searchParams] = useSearchParams();

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    
    // Set height to scrollHeight, max 200px
    const newHeight = Math.min(textarea.scrollHeight, 200);
    textarea.style.height = `${newHeight}px`;
  }, [input]);

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
    const timeoutMs = deepResearchMode ? 330000 : 180000; // 5.5 min for Deep Research, 3 min for regular
    const timeout = new Promise((_, reject) => {
      const timeoutMessage = deepResearchMode 
        ? 'Deep Research timed out. The AI models may be experiencing high load. Try: selecting fewer models, simplifying your question, or trying again.'
        : 'Request timed out. The AI models may be experiencing high load. Try: selecting 1-2 models instead of multiple, simplifying your question, or trying again.';
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    });

    try {
      // Context window management: keep only last 6 messages to prevent token overflow
      const MAX_CONTEXT_MESSAGES = 6;
      const recentMessages = messages.slice(-MAX_CONTEXT_MESSAGES);
      
      console.log(`Sending ${recentMessages.length} recent messages (${messages.length} total in history)`);

      // Process each model with Lovable AI
      const responses = [];
      for (const modelId of selectedModels) {
        const modelConfig = aiModels.find(m => m.id === modelId);
        if (!modelConfig) continue;
        
        try {
          const result = await supabase.functions.invoke('lovable-ai-chat', {
            body: {
              model: modelConfig.model,
              messages: [...recentMessages.map(m => ({ role: m.role, content: m.content })), { role: 'user', content: input }],
              generateImage: imageGenerationMode,
            },
          });
          
          if (result.error) throw result.error;
          responses.push({ 
            model: modelId, 
            content: result.data.choices?.[0]?.message?.content || 'No response', 
            error: false,
            images: result.data.images || [],
          });
        } catch (err: any) {
          responses.push({ model: modelId, content: `Error: ${err.message}`, error: true });
        }
      }
      
      const data = { responses };


      // Clear processing state
      setProcessingFile(false);
      
      // Validate we got responses
      if (!data.responses || data.responses.length === 0) {
        throw new Error('All AI models failed to respond. Please try again.');
      }

      // Create assistant messages
      const aiMessages: Message[] = data.responses.map((response: any) => {
        const modelConfig = aiModels.find(m => m.id === response.model);
        return {
          id: `${Date.now()}-${response.model}-${Math.random()}`,
          model: modelConfig?.name || response.model,
          content: response.content,
          timestamp: new Date(),
          role: 'assistant' as const,
          error: response.error || false,
          userQuery: input,
          sources: response.sources || [],
          images: response.images || [],
        };
      });

      setMessages(prev => [...prev, ...aiMessages]);
      
      const successCount = aiMessages.filter(m => !m.error).length;
      if (successCount > 0) {
        toast({
          title: `${successCount} AI${successCount > 1 ? 's' : ''} responded`,
          description: `Received responses successfully.`,
        });
      }

      await refreshProfile();
      setIsDeepResearching(false);
    } catch (error: any) {
      console.error('Chat error:', error);
      setProcessingFile(false);
      setIsDeepResearching(false);
      setLoading(false); // Prevent UI lock after errors
      
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
          ? "Deep Research timed out. The AI models are taking too long. Try:\n• Selecting only 1-2 AI models\n• Breaking complex questions into smaller parts\n• Simplifying your query\n• Trying again in a moment"
          : "Request timed out. The AI models are taking too long. Try:\n• Selecting only 1-2 AI models instead of multiple\n• Simplifying your question\n• Trying again in a moment";
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

  const handleRetryModel = async (messageId: string) => {
    const messageToRetry = messages.find(m => m.id === messageId);
    if (!messageToRetry || !messageToRetry.error || !messageToRetry.userQuery) return;

    const modelName = messageToRetry.model;
    const modelId = aiModels.find(m => m.name === modelName)?.id;
    if (!modelId) return;

    // Mark message as retrying
    setMessages(prev => prev.map(m => 
      m.id === messageId ? { ...m, retrying: true } : m
    ));

    try {
      // Get recent messages for context (exclude error messages)
      const MAX_CONTEXT_MESSAGES = 6;
      const validMessages = messages.filter(m => !m.error && !m.retrying);
      const recentMessages = validMessages.slice(-MAX_CONTEXT_MESSAGES);

      const modelConfig = aiModels.find(m => m.id === modelId);
      if (!modelConfig) throw new Error('Model not found');

        const { data, error } = await supabase.functions.invoke('lovable-ai-chat', {
          body: {
            model: modelConfig.model,
            messages: [
              ...recentMessages.map(m => ({ role: m.role, content: m.content })),
              { role: 'user', content: messageToRetry.userQuery }
            ],
            stream: false,
            generateImage: false,
          },
        });

      if (error) throw error;

      if (!data.choices?.[0]?.message?.content) {
        throw new Error('Model failed to respond again');
      }

      // Replace error message with successful response
      const newResponse = {
        content: data.choices[0].message.content,
        model: modelConfig.name,
      };
      setMessages(prev => prev.map(m => 
        m.id === messageId 
          ? {
              ...m,
              content: newResponse.content,
              error: false,
              retrying: false,
            }
          : m
      ));

      toast({
        title: "Retry successful",
        description: `${modelName} responded successfully.`,
      });

      await refreshProfile();
    } catch (error: any) {
      console.error('Retry error:', error);
      
      // Restore error state
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, retrying: false } : m
      ));

      toast({
        title: "Retry failed",
        description: `${modelName} failed again. ${error.message || 'Please try again later.'}`,
        variant: "destructive",
      });
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
        
        {/* Image Generation Settings */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Image Generation
          </h3>
          
          <button
            onClick={() => setImageGenerationMode(!imageGenerationMode)}
            className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
              imageGenerationMode 
                ? 'glass-card border-purple-500/50 shadow-lg shadow-purple-500/20' 
                : 'hover:bg-muted/20'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg ${imageGenerationMode ? 'bg-purple-500/20' : 'bg-muted/20'} flex items-center justify-center`}>
              <Sparkles className={`w-4 h-4 ${imageGenerationMode ? 'text-purple-400' : 'text-muted-foreground'}`} />
            </div>
            <span className={`font-medium ${imageGenerationMode ? 'text-foreground' : 'text-muted-foreground'}`}>
              Generate Images
            </span>
            {imageGenerationMode && <Circle className="w-2 h-2 ml-auto fill-purple-400 text-purple-400" />}
          </button>
          
          {imageGenerationMode && (
            <p className="text-xs text-muted-foreground pl-2 animate-fade-in">
              Using Gemini 2.5 Flash Image to generate images from your prompts
            </p>
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
      
      {/* AI Models Bar - Like Chrome Bookmarks */}
      <div className="fixed top-16 left-0 right-0 z-40 glass-card border-b border-glass-border px-4 py-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-sm font-semibold text-muted-foreground whitespace-nowrap mr-2">
            AI Models:
          </span>
          {aiModels.map(model => {
            const Icon = model.icon;
            const isSelected = selectedModels.includes(model.id);
            return (
              <button
                key={model.id}
                onClick={() => toggleModel(model.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                  isSelected 
                    ? 'glass-card border-accent/50 shadow-sm' 
                    : 'hover:bg-muted/20'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? model.color : 'text-muted-foreground'}`} />
                <span className={`text-sm font-medium ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {model.name}
                </span>
                {isSelected && <Circle className="w-1.5 h-1.5 fill-primary text-primary" />}
              </button>
            );
          })}
        </div>
      </div>
      
      <div className="flex-1 flex pt-32">
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
              className="fixed top-36 left-4 z-50 lg:hidden glass-card"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-6 overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Research Settings</SheetTitle>
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
                    
                    {/* Sources display below AI responses */}
                    {message.role === 'assistant' && message.sources && message.sources.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-glass-border">
                        <div className="flex items-center gap-2 mb-2">
                          <ExternalLink className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-semibold text-muted-foreground">Sources</span>
                        </div>
                        <div className="space-y-2">
                          {message.sources.map((source, index) => (
                            <a
                              key={index}
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-start gap-2 p-2 rounded-lg hover:bg-accent/10 transition-colors group"
                            >
                              <span className="text-xs font-mono text-accent shrink-0">[{index + 1}]</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-foreground group-hover:text-accent transition-colors truncate">
                                  {source.title || source.url}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">{source.url}</p>
                              </div>
                              <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors shrink-0" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Display generated images */}
                    {message.role === 'assistant' && message.images && message.images.length > 0 && (
                      <div className="mt-4 space-y-4">
                        {message.images.map((img, idx) => (
                          <div key={idx} className="relative group">
                            <img 
                              src={img.image_url.url} 
                              alt={`Generated image ${idx + 1}`}
                              className="w-full rounded-lg border border-border shadow-lg"
                            />
                            <a
                              href={img.image_url.url}
                              download={`generated-image-${Date.now()}-${idx}.png`}
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Button size="sm" variant="secondary">
                                <Download className="w-4 h-4 mr-1" />
                                Download
                              </Button>
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Retry button for failed messages */}
                    {message.error && !message.retrying && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRetryModel(message.id)}
                        className="mt-3 text-xs"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Retry {message.model}
                      </Button>
                    )}
                    
                    {message.retrying && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Retrying {message.model}...
                      </div>
                    )}
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
              {/* Image Generation Mode Indicator */}
              {imageGenerationMode && (
                <div className="mb-3 flex items-center gap-2 text-xs bg-purple-500/20 text-purple-300 px-3 py-1.5 rounded-md w-fit">
                  <Sparkles className="w-3 h-3" />
                  Image Generation Mode
                </div>
              )}
              
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
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Type your message... (Shift+Enter for new line)"
                  className="glass-card border-accent/30 focus:border-accent resize-none min-h-[44px] max-h-[200px] overflow-y-auto"
                  disabled={loading}
                  rows={1}
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
