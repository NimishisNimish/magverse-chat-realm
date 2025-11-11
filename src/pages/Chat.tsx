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
  ExternalLink,
  Edit2,
  GitBranch,
  Save,
  Video,
  Ban,
  Heart,
  Trash2,
  Image as ImageIcon,
  Palette,
  MessageCircle,
  FileText
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { generateChatPDF } from "@/utils/pdfGenerator";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useCreditAlerts } from "@/hooks/useCreditAlerts";
import { usePaymentNotifications } from "@/hooks/usePaymentNotifications";
import FilePreview from "@/components/FilePreview";
import { FeedbackButtons } from "@/components/FeedbackButtons";
import { CustomInstructionsButton } from "@/components/CustomInstructionsDialog";
import { PromptLibrary } from "@/components/PromptLibrary";
import { ChatExportDialog } from "@/components/ChatExportDialog";
import { CollaborativeChatPresence } from "@/components/CollaborativeChatPresence";
import { ConversationBranching } from "@/components/ConversationBranching";
import { ModelABTesting } from "@/components/ModelABTesting";
import VideoGenerator from "@/components/VideoGenerator";
import VideoEditor from "@/components/VideoEditor";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const aiModels = [
  { id: "gpt-5-mini", name: "GPT-5 Mini", icon: Sparkles, color: "text-purple-400", model: "openai/gpt-5-mini" },
  { id: "gemini-flash", name: "Gemini Flash", icon: Zap, color: "text-primary", model: "google/gemini-2.5-flash" },
  { id: "gemini-pro", name: "Gemini Pro", icon: Brain, color: "text-secondary", model: "google/gemini-2.5-pro" },
  { id: "gemini-lite", name: "Gemini Lite", icon: Cpu, color: "text-muted-foreground", model: "google/gemini-2.5-flash-lite" },
  { id: "gpt-5", name: "GPT-5", icon: Bot, color: "text-accent", model: "openai/gpt-5" },
  { id: "gpt-5-nano", name: "GPT-5 Nano", icon: Star, color: "text-blue-400", model: "openai/gpt-5-nano" },
  { id: "claude", name: "Claude", icon: Bot, color: "text-orange-400", model: "anthropic/claude-3.5-sonnet" },
  { id: "perplexity", name: "Perplexity", icon: Globe, color: "text-green-400", model: "perplexity/llama-3.1-sonar-large-128k-online" },
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
  videos?: Array<{videoUrl: string, prompt: string}>; // Generated videos
  attachmentFile?: { name: string; type: string; url: string; }; // Attached file metadata
}

const Chat = () => {
  const [selectedModels, setSelectedModels] = useState<string[]>(["gpt-5-mini"]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentType, setAttachmentType] = useState<'pdf' | 'image' | 'other' | null>(null);
  const [attachmentFileName, setAttachmentFileName] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [processingFile, setProcessingFile] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [searchMode, setSearchMode] = useState<'general' | 'finance' | 'academic'>('general');
  const [deepResearchMode, setDeepResearchMode] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeepResearching, setIsDeepResearching] = useState(false);
  const [imageGenerationMode, setImageGenerationMode] = useState(false);
  const [imageStyle, setImageStyle] = useState<'realistic' | 'artistic' | 'cartoon' | 'anime' | 'photographic'>('realistic');
  const [videoGenerationMode, setVideoGenerationMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [editingVideoUrl, setEditingVideoUrl] = useState<string | null>(null);
  const [customInstructions, setCustomInstructions] = useState<string | null>(null);
  const [uploadAbortController, setUploadAbortController] = useState<AbortController | null>(null);
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [imageEditPrompt, setImageEditPrompt] = useState("");
  const [savedImages, setSavedImages] = useState<Array<{id: string, url: string, prompt: string, timestamp: Date}>>([]);
  const [showGallery, setShowGallery] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [upscalingImageId, setUpscalingImageId] = useState<string | null>(null);
  const [messageCount, setMessageCount] = useState(0);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const { user, profile, refreshProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Enable credit alerts and payment notifications
  useCreditAlerts();
  usePaymentNotifications();

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

  // Load saved images from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('savedImages');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSavedImages(parsed.map((img: any) => ({
          ...img,
          timestamp: new Date(img.timestamp)
        })));
      } catch (error) {
        console.error('Failed to load saved images:', error);
      }
    }
  }, []);

  // Load custom instructions
  useEffect(() => {
    const loadCustomInstructions = async () => {
      if (!user) return;
      
      try {
        const { data } = await supabase
          .from('ai_custom_instructions')
          .select('instructions')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();
        
        if (data) {
          setCustomInstructions(data.instructions);
        }
      } catch (error) {
        // No custom instructions set
        console.log('No custom instructions found');
      }
    };
    
    loadCustomInstructions();
  }, [user]);

  const loadChatMessages = async (chatId: string) => {
    try {
      setLoading(true);
      setCurrentChatId(chatId);
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) {
        toast({
          title: "Failed to load chat history",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      if (data) {
        const loadedMessages: Message[] = data.map(msg => ({
          id: msg.id,
          model: msg.model || 'AI',
          content: msg.content,
          timestamp: new Date(msg.created_at),
          role: msg.role as 'user' | 'assistant',
        }));
        setMessages(loadedMessages);
        setMessageCount(loadedMessages.filter(m => m.role === 'user').length);
        toast({
          title: "Chat history loaded",
          description: `Loaded ${loadedMessages.length} messages`,
        });
      }
    } catch (error) {
      console.error('Error loading chat:', error);
      toast({
        title: "Error loading chat history",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Auto-select model when entering image or video generation mode
  useEffect(() => {
    if (imageGenerationMode && !selectedModels.includes('gemini-flash')) {
      setSelectedModels(['gemini-flash']);
    }
    if (videoGenerationMode) {
      setSelectedModels([]);
    }
  }, [imageGenerationMode, videoGenerationMode]);

  const toggleModel = (modelId: string) => {
    const isPro = profile?.is_pro || profile?.subscription_type === 'monthly' || profile?.subscription_type === 'lifetime' || profile?.subscription_type === 'yearly';
    const premiumModels = ['gemini-flash', 'gemini-pro', 'gemini-lite', 'gpt-5', 'gpt-5-nano'];
    
    // Check if free user is trying to select premium model
    if (!isPro && premiumModels.includes(modelId) && !selectedModels.includes(modelId)) {
      toast({
        title: "Upgrade to Pro",
        description: "Free users can only use GPT-5 Mini. Upgrade to access all AI models!",
        variant: "destructive",
        action: (
          <Button variant="outline" size="sm" onClick={() => window.location.href = '/payment'}>
            View Plans
          </Button>
        ),
      });
      return;
    }

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

  const processFileUpload = async (file: File) => {
    if (!file || !user) return;

    // Store original filename for clean display
    setAttachmentFileName(file.name);
    
    // First, set the pending file for preview
    setPendingFile(file);
    
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

  const exportChatAsJSON = () => {
    const chatData = {
      exportDate: new Date().toISOString(),
      messageCount: messages.length,
      messages: messages.map(m => ({
        model: m.model,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        sources: m.sources,
      }))
    };
    
    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Chat exported as JSON",
      description: "Download started successfully",
    });
  };

  const saveChatToDatabase = async (userMsg: Message, aiResponses: Message[]) => {
    if (!user) return;

    try {
      let chatHistoryId = currentChatId;

      // Create chat_history entry if this is a new chat
      if (!chatHistoryId) {
        const chatTitle = userMsg.content.substring(0, 50) + (userMsg.content.length > 50 ? '...' : '');
        const { data: chatData, error: chatError } = await supabase
          .from('chat_history')
          .insert({
            user_id: user.id,
            title: chatTitle,
          })
          .select()
          .single();

        if (chatError) {
          console.error('Failed to create chat history:', chatError);
          return;
        }

        chatHistoryId = chatData.id;
        setCurrentChatId(chatHistoryId);
      }

      // Save user message
      const { error: userMsgError } = await supabase
        .from('chat_messages')
        .insert({
          chat_id: chatHistoryId,
          user_id: user.id,
          role: 'user',
          content: userMsg.content,
          model: 'user',
        });

      if (userMsgError) {
        console.error('Failed to save user message:', userMsgError);
      }

      // Save all AI responses
      for (const aiMsg of aiResponses) {
        if (aiMsg.error) continue; // Skip error messages

        const { error: aiMsgError } = await supabase
          .from('chat_messages')
          .insert({
            chat_id: chatHistoryId,
            user_id: user.id,
            role: 'assistant',
            content: aiMsg.content,
            model: aiMsg.model,
          });

        if (aiMsgError) {
          console.error('Failed to save AI message:', aiMsgError);
        }
      }
    } catch (error) {
      console.error('Error saving chat to database:', error);
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

    // Check if user is free and has selected premium models
    const isPro = profile?.is_pro || profile?.subscription_type === 'monthly' || profile?.subscription_type === 'lifetime';
    const premiumModels = ['gemini-flash', 'gemini-pro', 'gemini-lite', 'gpt-5', 'gpt-5-nano', 'perplexity', 'claude'];
    const selectedPremiumModels = selectedModels.filter(id => premiumModels.includes(id));
    
    if (!isPro && selectedPremiumModels.length > 0) {
      toast({
        title: "Upgrade Required",
        description: "Free users can only access GPT-5 Mini. Upgrade to Pro to unlock all AI models!",
        variant: "destructive",
        action: (
          <Button variant="outline" size="sm" onClick={() => window.location.href = '/payment'}>
            Upgrade Now
          </Button>
        ),
      });
      return;
    }

    // Check credits for free users (5 messages per day)
    if (!isPro && (profile?.credits_remaining || 0) <= 0) {
      toast({
        title: "Daily Limit Reached",
        description: "You've used all 5 free messages today. Upgrade to Pro for unlimited messages!",
        variant: "destructive",
        action: (
          <Button variant="outline" size="sm" onClick={() => window.location.href = '/payment'}>
            Upgrade to Pro
          </Button>
        ),
      });
      return;
    }

    // Check credits for Yearly Pro users (500 messages per day)
    if (profile?.subscription_type === 'monthly') {
      const creditsUsed = profile?.monthly_credits_used || 0;
      if (creditsUsed >= 500) {
        toast({
          title: "Daily Limit Reached",
          description: "You've used all 500 messages today. Your credits will reset tomorrow or upgrade to Lifetime Pro for unlimited access!",
          variant: "destructive",
          action: (
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/payment'}>
              Upgrade to Lifetime
            </Button>
          ),
        });
        return;
      }
    }

    // Check deep research limit for free users (2 per day)
    if (!isPro && deepResearchMode) {
      const todayDeepResearch = messages.filter(m => 
        m.timestamp.toDateString() === new Date().toDateString() && 
        m.webSearchEnabled
      ).length;
      
      if (todayDeepResearch >= 2) {
        toast({
          title: "Deep Research Limit Reached",
          description: "Free users get 2 deep research queries per day. Upgrade for unlimited access!",
          variant: "destructive",
          action: (
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/payment'}>
              Upgrade to Pro
            </Button>
          ),
        });
        return;
      }
    }

    // Check image generation access for free users
    if (!isPro && imageGenerationMode) {
      toast({
        title: "Upgrade Required",
        description: "Image generation is only available for Pro users. Upgrade to create stunning AI images!",
        variant: "destructive",
        action: (
          <Button variant="outline" size="sm" onClick={() => window.location.href = '/payment'}>
            Upgrade to Pro
          </Button>
        ),
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
      attachmentFile: pendingFile ? {
        name: pendingFile.name,
        type: pendingFile.type,
        url: attachmentToSend || '',
      } : undefined,
    };
    
    setMessages(prev => [...prev, userMessage]);
    setMessageCount(prev => prev + 1);
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
      // Send full conversation history for better context awareness
      // Only limit if conversation becomes extremely long (>50 messages)
      const MAX_CONTEXT_MESSAGES = 50;
      // Include the new user message in the conversation history
      const allMessages = [...messages, userMessage];
      const conversationHistory = allMessages.length > MAX_CONTEXT_MESSAGES 
        ? allMessages.slice(-MAX_CONTEXT_MESSAGES)
        : allMessages;
      
      console.log(`Sending ${conversationHistory.length} messages for full context (${allMessages.length} total in history)`);

      // Helper function for retry with exponential backoff
      const fetchWithRetry = async (
        url: string, 
        options: RequestInit, 
        maxRetries = 3, 
        baseDelay = 1000
      ): Promise<Response> => {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            const response = await fetch(url, options);
            
            // Handle rate limiting
            if (response.status === 429) {
              if (attempt < maxRetries) {
                const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
                console.log(`Rate limited. Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
                
                toast({
                  title: "Rate limit reached",
                  description: `Waiting ${delay / 1000}s before retry (${attempt + 1}/${maxRetries})...`,
                });
                
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
              } else {
                throw new Error('Rate limit exceeded. Please try again in a few moments.');
              }
            }
            
            // Handle payment required
            if (response.status === 402) {
              throw new Error('Credits exhausted. Please add credits to your Lovable AI workspace.');
            }
            
            return response;
          } catch (error: any) {
            if (attempt === maxRetries || error.message.includes('Credits exhausted')) {
              throw error;
            }
            // Network errors - retry with backoff
            const delay = baseDelay * Math.pow(2, attempt);
            console.log(`Network error. Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
        throw new Error('Max retries exceeded');
      };

      // Separate models into Lovable AI vs External APIs
      const lovableAIModels = selectedModels.filter(id => 
        ['gemini-flash', 'gemini-pro', 'gemini-lite', 'gpt-5', 'gpt-5-mini', 'gpt-5-nano'].includes(id)
      );
      const externalModels = selectedModels.filter(id => 
        ['claude', 'perplexity'].includes(id)
      );

      const allAIResponses: Message[] = [];

      // Clear pending file after sending
      setPendingFile(null);

      // Process Lovable AI models (streaming)
      const lovablePromises = lovableAIModels.map(async (modelId) => {
        const modelConfig = aiModels.find(m => m.id === modelId);
        if (!modelConfig) return;

        const assistantMessageId = Date.now().toString() + Math.random() + modelId;
        const placeholderMessage: Message = {
          id: assistantMessageId,
          model: modelConfig.name,
          content: "",
          timestamp: new Date(),
          role: 'assistant',
        };

        setMessages(prev => [...prev, placeholderMessage]);
        allAIResponses.push(placeholderMessage);

        try {
          const CHAT_URL = `https://pqdgpxetysqcdcjwormb.supabase.co/functions/v1/lovable-ai-chat`;
          
          // Image generation requires non-streaming mode to get complete response
          const shouldStream = !imageGenerationMode;
          
          const response = await fetchWithRetry(CHAT_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxZGdweGV0eXNxY2Rjandvcm1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTcwMDMsImV4cCI6MjA3NzMzMzAwM30.AspAeB_iUnc-XJmDNhdV5_HYTMLg32LM1bVAdwM6A5E`,
            },
            body: JSON.stringify({
              model: modelConfig.model,
              messages: [...conversationHistory.map(m => ({ role: m.role, content: m.content })), { 
                role: 'user', 
                content: imageGenerationMode 
                  ? `Generate a ${imageStyle} style image: ${input}` 
                  : input 
              }],
              stream: shouldStream,
              generateImage: imageGenerationMode,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP ${response.status}`);
          }

          // Handle image generation (non-streaming) vs regular streaming
          if (imageGenerationMode) {
            // Non-streaming mode for image generation
            const data = await response.json();
            const modelResponse = data.responses?.[0]?.message?.content || '';
            const images = data.images || [];
            const sources = data.sources || [];
            
            // Update message with content and images
            setMessages(prev => prev.map(msg => 
              msg.id === assistantMessageId 
                ? { 
                    ...msg, 
                    content: modelResponse || 'Image generated successfully',
                    images: images.length > 0 ? images : undefined,
                    sources: sources.length > 0 ? sources : undefined
                  }
                : msg
            ));
            
            console.log(`Image generation complete for ${modelConfig.name}`, { imageCount: images.length });
          } else {
            // Streaming mode for regular chat
            if (!response.body) {
              throw new Error('No response body');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let fullContent = '';
            let streamDone = false;

            while (!streamDone) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });

              let newlineIndex: number;
              while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
                let line = buffer.slice(0, newlineIndex);
                buffer = buffer.slice(newlineIndex + 1);

                if (line.endsWith('\r')) line = line.slice(0, -1);
                if (line.startsWith(':') || line.trim() === '') continue;
                if (!line.startsWith('data: ')) continue;

                const jsonStr = line.slice(6).trim();
                if (jsonStr === '[DONE]') {
                  streamDone = true;
                  break;
                }

                try {
                  const parsed = JSON.parse(jsonStr);
                  const content = parsed.choices?.[0]?.delta?.content as string | undefined;
                  
                  if (content) {
                    fullContent += content;
                    
                    // Update the message in real-time
                    setMessages(prev => prev.map(msg => 
                      msg.id === assistantMessageId 
                        ? { ...msg, content: fullContent }
                        : msg
                    ));
                  }
                } catch (parseError) {
                  // Incomplete JSON, put it back and wait for more data
                  buffer = line + '\n' + buffer;
                  break;
                }
              }
            }

            // Final flush
            if (buffer.trim()) {
              for (let raw of buffer.split('\n')) {
                if (!raw || raw.startsWith(':') || raw.trim() === '') continue;
                if (!raw.startsWith('data: ')) continue;
                const jsonStr = raw.slice(6).trim();
                if (jsonStr === '[DONE]') continue;
                
                try {
                  const parsed = JSON.parse(jsonStr);
                  const content = parsed.choices?.[0]?.delta?.content as string | undefined;
                  if (content) {
                    fullContent += content;
                    setMessages(prev => prev.map(msg => 
                      msg.id === assistantMessageId 
                        ? { ...msg, content: fullContent }
                        : msg
                    ));
                  }
                } catch { /* ignore */ }
              }
            }

            console.log(`Streaming complete for ${modelConfig.name}`);
          }
        } catch (err: any) {
          console.error(`Error with ${modelConfig.name}:`, err);
          
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId 
              ? { 
                  ...msg, 
                  content: `Error: ${err.message}`, 
                  error: true,
                  userQuery: imageGenerationMode 
                    ? `Generate a ${imageStyle} style image: ${input}` 
                    : input,
                  webSearchEnabled: !imageGenerationMode && webSearchEnabled,
                  searchMode: !imageGenerationMode ? searchMode : undefined
                }
              : msg
          ));
          
          if (err.message.includes('Rate limit')) {
            toast({
              title: `${modelConfig.name} rate limited`,
              description: "All retry attempts exhausted. Please wait a moment before trying again.",
              variant: "destructive",
            });
          }
        }
      });

      // Process External API models (Claude, Perplexity) via chat-with-ai
      const externalPromises = externalModels.map(async (modelId) => {
        const modelConfig = aiModels.find(m => m.id === modelId);
        if (!modelConfig) return;

        const assistantMessageId = Date.now().toString() + Math.random() + modelId;
        const placeholderMessage: Message = {
          id: assistantMessageId,
          model: modelConfig.name,
          content: "",
          timestamp: new Date(),
          role: 'assistant',
        };

        setMessages(prev => [...prev, placeholderMessage]);
        allAIResponses.push(placeholderMessage);

        try {
          // Map UI model names to chat-with-ai expected names
          const modelMapping: Record<string, string> = {
            'claude': 'claude',
            'perplexity': 'perplexity',
          };

              const { data, error } = await supabase.functions.invoke('chat-with-ai', {
            body: {
              messages: conversationHistory.map(m => ({ role: m.role, content: m.content })),
              selectedModels: [modelMapping[modelId]],
              webSearchEnabled,
              searchMode,
              deepResearchMode,
              attachmentUrl: attachmentToSend || undefined,
              attachmentExtension: attachmentToSend ? attachmentToSend.split('.').pop()?.toLowerCase() : undefined,
            },
          });

          if (error) throw error;

          console.log(`✅ ${modelConfig.name} response data:`, data);
          
          // Extract response for this model
          const modelResponse = data.responses?.find((r: any) => r.model === modelMapping[modelId]);
          console.log(`🔍 Found response for ${modelConfig.name}:`, modelResponse);
          
          if (modelResponse && modelResponse.response && !modelResponse.error) {
            setMessages(prev => prev.map(msg => 
              msg.id === assistantMessageId 
                ? { 
                    ...msg, 
                    content: modelResponse.response,
                    sources: modelResponse.sources 
                  }
                : msg
            ));
          } else {
            const errorMsg = modelResponse?.response || 'No response received from model';
            console.error(`❌ ${modelConfig.name} error:`, errorMsg);
            throw new Error(errorMsg);
          }
        } catch (err: any) {
          console.error(`Error with ${modelConfig.name}:`, err);
          
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId 
              ? { 
                  ...msg, 
                  content: `Error: ${err.message}`, 
                  error: true,
                  userQuery: input,
                  webSearchEnabled,
                  searchMode
                }
              : msg
          ));
          
          toast({
            title: `${modelConfig.name} error`,
            description: err.message || "Failed to get response. Please try again.",
            variant: "destructive",
          });
        }
      });

      await Promise.all([...lovablePromises, ...externalPromises]);
      
      // Clear loading and processing states
      setLoading(false);
      setProcessingFile(false);
      setIsDeepResearching(false);
      
      // Deduct credits after successful responses
      const isPro = profile?.is_pro || profile?.subscription_type === 'monthly' || profile?.subscription_type === 'lifetime';
      
      if (user) {
        try {
          if (profile?.subscription_type === 'monthly') {
            // Yearly Pro: Check and deduct daily credits (500 per day)
            const { data: hasCredit, error: creditError } = await supabase.rpc('check_and_deduct_yearly_credit', { p_user_id: user.id });
            
            if (creditError) {
              console.error('Credit check error:', creditError);
            } else if (hasCredit === false) {
              toast({
                title: "Daily Limit Reached",
                description: "You've used all 500 messages today. Your credits will reset tomorrow or upgrade to Lifetime Pro for unlimited access!",
                variant: "destructive",
                duration: 8000,
              });
            }
          } else if (!isPro) {
            // Free users: Deduct from 5 daily credits
            const { error: creditError } = await supabase.rpc('check_and_deduct_credit', { p_user_id: user.id });
            
            if (!creditError) {
              await refreshProfile();
            }
          }
          // Lifetime Pro: No credit deduction needed (unlimited)
          
          await refreshProfile();
        } catch (creditErr) {
          console.log('Credit deduction error:', creditErr);
        }
      }
      
      // Save chat to database
      const successfulResponses = allAIResponses.filter(msg => !msg.error && msg.content);
      if (successfulResponses.length > 0) {
        await saveChatToDatabase(userMessage, successfulResponses);
      }
      
      // Clear all loading states
      setLoading(false);
      setProcessingFile(false);
      setIsDeepResearching(false);
      
      const successCount = selectedModels.length;
      toast({
        title: `${successCount} AI${successCount > 1 ? 's' : ''} responded`,
        description: `Received responses successfully.`,
      });

      await refreshProfile();
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
    const modelConfig = aiModels.find(m => m.name === modelName);
    if (!modelConfig) return;

    // Mark message as retrying
    setMessages(prev => prev.map(m => 
      m.id === messageId ? { ...m, retrying: true } : m
    ));

    try {
      // Get recent messages for context (exclude error messages)
      const MAX_CONTEXT_MESSAGES = 6;
      const validMessages = messages.filter(m => !m.error && !m.retrying);
      const recentMessages = validMessages.slice(-MAX_CONTEXT_MESSAGES);

      // Determine if it's a Lovable AI model or external model
      const lovableModels = ['gpt-5', 'gpt-5-mini', 'gpt-5-nano', 'gemini-flash', 'gemini-pro', 'gemini-lite'];
      const externalModels = ['claude', 'perplexity'];
      
      if (lovableModels.includes(modelConfig.id)) {
        // Retry with Lovable AI
        const { data, error } = await supabase.functions.invoke('lovable-ai-chat', {
          body: {
            model: modelConfig.model,
            messages: [
              ...recentMessages.map(m => ({ role: m.role, content: m.content })),
              { role: 'user', content: messageToRetry.userQuery }
            ],
            stream: false,
            generateImage: false,
            webSearchEnabled: messageToRetry.webSearchEnabled || false,
            searchMode: messageToRetry.searchMode || 'general',
          },
        });

        if (error) throw error;

        if (!data.choices?.[0]?.message?.content) {
          throw new Error('Model failed to respond again');
        }

        // Replace error message with successful response
        setMessages(prev => prev.map(m => 
          m.id === messageId 
            ? {
                ...m,
                content: data.choices[0].message.content,
                sources: data.sources,
                error: false,
                retrying: false,
              }
            : m
        ));
      } else if (externalModels.includes(modelConfig.id)) {
        // Retry with external API (Claude/Perplexity)
        const modelMapping: Record<string, string> = {
          'claude': 'claude',
          'perplexity': 'perplexity',
        };

        const { data, error } = await supabase.functions.invoke('chat-with-ai', {
          body: {
            messages: [
              ...recentMessages.map(m => ({ role: m.role, content: m.content })),
              { role: 'user', content: messageToRetry.userQuery }
            ],
            selectedModels: [modelMapping[modelConfig.id]],
            webSearchEnabled: messageToRetry.webSearchEnabled || false,
            searchMode: messageToRetry.searchMode || 'general',
            deepResearchMode: false,
          }
        });

        if (error) throw error;

        const modelResponse = data.responses?.find((r: any) => r.model === modelMapping[modelConfig.id]);
        if (!modelResponse?.response) {
          throw new Error('Model failed to respond again');
        }

        // Replace error message with successful response
        setMessages(prev => prev.map(m => 
          m.id === messageId 
            ? {
                ...m,
                content: modelResponse.response,
                sources: modelResponse.sources,
                error: false,
                retrying: false,
              }
            : m
        ));
      }

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

    // Check if free user is trying to export PDF
    const isPro = profile?.is_pro || profile?.subscription_type === 'monthly' || profile?.subscription_type === 'lifetime';
    if (!isPro) {
      toast({
        title: "Upgrade Required",
        description: "PDF export is only available for Pro users. Upgrade to save your conversations!",
        variant: "destructive",
        action: (
          <Button variant="outline" size="sm" onClick={() => window.location.href = '/payment'}>
            Upgrade to Pro
          </Button>
        ),
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

  const handleEditMessage = (messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditedContent(content);
  };

  const handleSaveEdit = (messageId: string) => {
    if (!editedContent.trim()) {
      toast({
        title: "Empty message",
        description: "Message cannot be empty",
        variant: "destructive",
      });
      return;
    }

    // Update the message content
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, content: editedContent }
        : msg
    ));

    setEditingMessageId(null);
    setEditedContent("");

    toast({
      title: "Message updated",
      description: "Your message has been edited. Click 'Branch from here' to regenerate AI responses.",
    });
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditedContent("");
  };

  const handleBranchFromMessage = async (messageIndex: number) => {
    if (loading) return;

    const message = messages[messageIndex];
    
    // Truncate messages at this point
    const truncatedMessages = messages.slice(0, messageIndex + 1);
    
    // If branching from a user message, regenerate AI responses
    if (message.role === 'user') {
      setMessages(truncatedMessages);
      setInput(message.content);
      
      toast({
        title: "Branch created",
        description: "Creating new conversation branch. Send your message to generate new AI responses.",
      });
    } 
    // If branching from an AI message, go back to the previous user message
    else {
      // Find the previous user message
      const lastUserMessageIndex = truncatedMessages.findIndex((m, idx) => 
        idx < messageIndex && m.role === 'user'
      );
      
      if (lastUserMessageIndex === -1) {
        toast({
          title: "Cannot branch",
          description: "No user message found to branch from",
          variant: "destructive",
        });
        return;
      }

      const messagesUpToUser = truncatedMessages.slice(0, lastUserMessageIndex + 1);
      const userMessage = truncatedMessages[lastUserMessageIndex];
      
      setMessages(messagesUpToUser);
      setLoading(true);

      toast({
        title: "Branching conversation",
        description: "Regenerating AI responses from this point...",
      });

      try {
        // Send full conversation history for better context awareness
        const MAX_CONTEXT_MESSAGES = 50;
        const conversationHistory = messagesUpToUser.length > MAX_CONTEXT_MESSAGES 
          ? messagesUpToUser.slice(-MAX_CONTEXT_MESSAGES)
          : messagesUpToUser;

        // Regenerate with the same models that were selected
        const modelPromises = selectedModels.map(async (modelId) => {
          const modelConfig = aiModels.find(m => m.id === modelId);
          if (!modelConfig) return;

          const assistantMessageId = Date.now().toString() + Math.random() + modelId;
          const placeholderMessage: Message = {
            id: assistantMessageId,
            model: modelConfig.name,
            content: "",
            timestamp: new Date(),
            role: 'assistant',
          };

          setMessages(prev => [...prev, placeholderMessage]);

          try {
            const CHAT_URL = `https://pqdgpxetysqcdcjwormb.supabase.co/functions/v1/lovable-ai-chat`;
            
            const response = await fetch(CHAT_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxZGdweGV0eXNxY2Rjandvcm1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTcwMDMsImV4cCI6MjA3NzMzMzAwM30.AspAeB_iUnc-XJmDNhdV5_HYTMLg32LM1bVAdwM6A5E`,
              },
              body: JSON.stringify({
                model: modelConfig.model,
                messages: conversationHistory.map(m => ({ role: m.role, content: m.content })),
                stream: true,
                generateImage: imageGenerationMode,
              }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            if (!response.body) {
              throw new Error('No response body');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let fullContent = '';
            let streamDone = false;

            while (!streamDone) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });

              let newlineIndex: number;
              while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
                let line = buffer.slice(0, newlineIndex);
                buffer = buffer.slice(newlineIndex + 1);

                if (line.endsWith('\r')) line = line.slice(0, -1);
                if (line.startsWith(':') || line.trim() === '') continue;
                if (!line.startsWith('data: ')) continue;

                const jsonStr = line.slice(6).trim();
                if (jsonStr === '[DONE]') {
                  streamDone = true;
                  break;
                }

                try {
                  const parsed = JSON.parse(jsonStr);
                  const content = parsed.choices?.[0]?.delta?.content as string | undefined;
                  
                  if (content) {
                    fullContent += content;
                    setMessages(prev => prev.map(msg => 
                      msg.id === assistantMessageId 
                        ? { ...msg, content: fullContent }
                        : msg
                    ));
                  }
                } catch (parseError) {
                  buffer = line + '\n' + buffer;
                  break;
                }
              }
            }
          } catch (err: any) {
            console.error(`Error with ${modelConfig.name}:`, err);
            setMessages(prev => prev.map(msg => 
              msg.id === assistantMessageId 
                ? { ...msg, content: `Error: ${err.message}`, error: true }
                : msg
            ));
          }
        });

        await Promise.all(modelPromises);

        toast({
          title: "Branch created",
          description: "New conversation path generated successfully!",
        });
      } catch (error: any) {
        console.error('Branch error:', error);
        toast({
          title: "Branching failed",
          description: error.message || "Failed to create branch. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  // Image gallery functions
  const saveImageToGallery = (imageUrl: string, prompt: string) => {
    const newImage = {
      id: crypto.randomUUID(),
      url: imageUrl,
      prompt: prompt,
      timestamp: new Date()
    };
    const updated = [...savedImages, newImage];
    setSavedImages(updated);
    localStorage.setItem('savedImages', JSON.stringify(updated));
    toast({
      title: "Image saved",
      description: "Added to your gallery",
    });
  };

  const deleteImageFromGallery = (imageId: string) => {
    const updated = savedImages.filter(img => img.id !== imageId);
    setSavedImages(updated);
    localStorage.setItem('savedImages', JSON.stringify(updated));
    toast({
      title: "Image removed",
      description: "Removed from gallery",
    });
  };

  const handleEditImage = async (imageUrl: string, editPrompt: string) => {
    if (!editPrompt.trim()) {
      toast({
        title: "Edit prompt required",
        description: "Please enter what changes you want to make",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('https://pqdgpxetysqcdcjwormb.supabase.co/functions/v1/lovable-ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxZGdweGV0eXNxY2Rjandvcm1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTcwMDMsImV4cCI6MjA3NzMzMzAwM30.AspAeB_iUnc-XJmDNhdV5_HYTMLg32LM1bVAdwM6A5E`,
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-image-preview',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: editPrompt },
                { type: 'image_url', image_url: { url: imageUrl } }
              ]
            }
          ],
          stream: false,
          generateImage: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to edit image');
      }

      const data = await response.json();
      const editedImage = data.images?.[0]?.image_url?.url;

      if (editedImage) {
        const newMessage: Message = {
          id: crypto.randomUUID(),
          model: 'Image Editor',
          content: `Edited: ${editPrompt}`,
          timestamp: new Date(),
          role: 'assistant',
          images: [{ image_url: { url: editedImage } }]
        };
        setMessages(prev => [...prev, newMessage]);
        toast({
          title: "Image edited successfully",
          description: "Your edited image is ready",
        });
      }
    } catch (error: any) {
      console.error('Image edit error:', error);
      toast({
        title: "Failed to edit image",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setEditingImageId(null);
      setImageEditPrompt("");
    }
  };

  const handleUpscaleImage = async (imageUrl: string, messageId: string) => {
    setUpscalingImageId(messageId);
    try {
      const response = await fetch('https://pqdgpxetysqcdcjwormb.supabase.co/functions/v1/lovable-ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxZGdweGV0eXNxY2Rjandvcm1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTcwMDMsImV4cCI6MjA3NzMzMzAwM30.AspAeB_iUnc-XJmDNhdV5_HYTMLg32LM1bVAdwM6A5E`,
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-image-preview',
          messages: [
            {
              role: 'user',
              content: [
                { 
                  type: 'text', 
                  text: 'Enhance this image to higher resolution and quality while preserving all details. Improve sharpness, clarity, and overall quality.' 
                },
                { type: 'image_url', image_url: { url: imageUrl } }
              ]
            }
          ],
          stream: false,
          generateImage: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to upscale image');
      }

      const data = await response.json();
      const upscaledImage = data.images?.[0]?.image_url?.url;

      if (upscaledImage) {
        const newMessage: Message = {
          id: crypto.randomUUID(),
          model: 'Image Upscaler',
          content: 'Upscaled to higher resolution',
          timestamp: new Date(),
          role: 'assistant',
          images: [{ image_url: { url: upscaledImage } }]
        };
        setMessages(prev => [...prev, newMessage]);
        toast({
          title: "Image upscaled successfully",
          description: "Your enhanced image is ready",
        });
      }
    } catch (error: any) {
      console.error('Image upscale error:', error);
      toast({
        title: "Failed to upscale image",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpscalingImageId(null);
    }
  };

  // Sidebar content component to reuse in both desktop and mobile
  const SidebarContent = () => {
    return (
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
        {/* AI Models Selection */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            AI Models
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
                  {isSelected && <Circle className="w-1.5 h-1.5 ml-auto fill-accent text-accent" />}
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
        
        {/* Image Generation Settings */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            AI Generation
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
            <>
              <p className="text-xs text-muted-foreground pl-2 animate-fade-in">
                Using Gemini 2.5 Flash Image to generate images from your prompts
              </p>
              
              {/* Image Style Selector */}
              <div className="space-y-2 pl-2">
                <label className="text-xs font-medium text-muted-foreground">Image Style</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['realistic', 'artistic', 'cartoon', 'anime', 'photographic'] as const).map(style => (
                    <button
                      key={style}
                      onClick={() => setImageStyle(style)}
                      className={`p-2 rounded-lg text-xs capitalize transition-all ${
                        imageStyle === style
                          ? 'glass-card border-accent/50 text-foreground'
                          : 'bg-muted/20 text-muted-foreground hover:bg-muted/30'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          
          <button
            onClick={() => setVideoGenerationMode(!videoGenerationMode)}
            className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
              videoGenerationMode 
                ? 'glass-card border-blue-500/50 shadow-lg shadow-blue-500/20' 
                : 'hover:bg-muted/20'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg ${videoGenerationMode ? 'bg-blue-500/20' : 'bg-muted/20'} flex items-center justify-center`}>
              <Video className={`w-4 h-4 ${videoGenerationMode ? 'text-blue-400' : 'text-muted-foreground'}`} />
            </div>
            <span className={`font-medium ${videoGenerationMode ? 'text-foreground' : 'text-muted-foreground'}`}>
              Generate Videos
            </span>
            {videoGenerationMode && <Circle className="w-2 h-2 ml-auto fill-blue-400 text-blue-400" />}
          </button>
          
          {videoGenerationMode && (
            <div className="pl-2 animate-fade-in">
              <VideoGenerator 
                profile={profile}
                onVideoGenerated={(url, prompt) => {
                  const videoMessage: Message = {
                    id: crypto.randomUUID(),
                    model: 'RunwayML Video',
                    content: prompt,
                    timestamp: new Date(),
                    role: 'assistant',
                    videos: [{ videoUrl: url, prompt }]
                  };
                  setMessages(prev => [...prev, videoMessage]);
                  
                  // Save to localStorage for gallery
                  const savedVideos = JSON.parse(localStorage.getItem('savedVideos') || '[]');
                  savedVideos.push({
                    id: crypto.randomUUID(),
                    url,
                    prompt,
                    timestamp: new Date()
                  });
                  localStorage.setItem('savedVideos', JSON.stringify(savedVideos));
                  
                  toast({
                    title: "Video Generated!",
                    description: "Your video has been created successfully.",
                  });
                }} 
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Image Gallery Button */}
      <Link to="/image-gallery">
        <Button variant="outline" className="w-full justify-start">
          <ImageIcon className="w-5 h-5" />
          Image Gallery ({savedImages.length})
        </Button>
      </Link>
      
      {/* Video Gallery Button */}
      <Link to="/video-gallery">
        <Button variant="outline" className="w-full justify-start">
          <Video className="w-5 h-5" />
          Video Gallery
        </Button>
      </Link>
      
      {/* Custom Instructions */}
      <CustomInstructionsButton 
        onInstructionsUpdate={setCustomInstructions}
      />
      
      {/* Prompt Library */}
      <PromptLibrary onSelectPrompt={(prompt) => setInput(prompt)} />
      
      {/* Export Chat */}
      <ChatExportDialog 
        messages={messages}
        chatTitle={currentChatId ? 'Chat Export' : 'New Chat'}
      />
      
      {/* Conversation Branching */}
      {currentChatId && messages.length > 0 && (
        <ConversationBranching
          currentChatId={currentChatId}
          messages={messages}
          onBranchSelect={(branchId) => {
            navigate(`/chat?id=${branchId}`);
            toast({ title: "Switched to branch", description: "You are now viewing the branched conversation" });
          }}
        />
      )}
      
      <Link to="/history">
        <Button variant="outline" className="w-full justify-start">
          <HistoryIcon className="w-5 h-5" />
          Chat History
        </Button>
      </Link>
      </>
    );
  };

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
              <SheetTitle>AI Models & Settings</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-6">
              <SidebarContent />
            </div>
          </SheetContent>
        </Sheet>
        
        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col">
          {/* Collaborative Presence Indicator */}
          {currentChatId && (
            <CollaborativeChatPresence conversationId={currentChatId} />
          )}
          
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
                {messages.map((message, index) => (
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
                    
                    {/* Message content or edit mode */}
                    {editingMessageId === message.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editedContent}
                          onChange={(e) => setEditedContent(e.target.value)}
                          className="min-h-[100px]"
                          placeholder="Edit your message..."
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSaveEdit(message.id)}
                          >
                            <Save className="w-3 h-3 mr-1" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEdit}
                          >
                            <Ban className="w-3 h-3 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                         <p className="text-foreground leading-relaxed whitespace-pre-wrap">{message.content}</p>
                        
                        {/* Display attached file preview for user messages */}
                        {message.role === 'user' && message.attachmentFile && (
                          <div className="mt-3 p-3 rounded-lg bg-muted/30 border border-border">
                            <div className="flex items-start gap-3">
                              {message.attachmentFile.type.startsWith('image/') ? (
                                <div className="relative w-16 h-16 rounded overflow-hidden border border-border shrink-0">
                                  <img
                                    src={message.attachmentFile.url}
                                    alt={message.attachmentFile.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="w-16 h-16 rounded bg-muted flex items-center justify-center border border-border shrink-0">
                                  <FileText className="h-8 w-8 text-muted-foreground" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{message.attachmentFile.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {message.attachmentFile.type === 'application/pdf' ? 'PDF Document' : 
                                   message.attachmentFile.type.startsWith('image/') ? 'Image File' : 
                                   'Attachment'}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Feedback buttons for AI responses */}
                        {message.role === 'assistant' && currentChatId && (
                          <FeedbackButtons
                            messageId={message.id}
                            chatId={currentChatId}
                            model={message.model}
                          />
                        )}
                        
                        {/* Action buttons */}
                        <div className="flex gap-2 mt-3">
                          {message.role === 'user' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditMessage(message.id, message.content)}
                              className="text-xs"
                            >
                              <Edit2 className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                          )}
                          
                          {index < messages.length - 1 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleBranchFromMessage(index)}
                              disabled={loading}
                              className="text-xs"
                            >
                              <GitBranch className="w-3 h-3 mr-1" />
                              Branch from here
                            </Button>
                          )}
                        </div>
                      </>
                    )}
                    
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
                        {message.images.map((img, idx) => {
                          const downloadImage = async (format: 'png' | 'jpeg' | 'webp') => {
                            try {
                              const response = await fetch(img.image_url.url);
                              const blob = await response.blob();
                              
                              // Create canvas to convert image format
                              const canvas = document.createElement('canvas');
                              const ctx = canvas.getContext('2d');
                              const image = new Image();
                              
                              image.onload = () => {
                                canvas.width = image.width;
                                canvas.height = image.height;
                                ctx?.drawImage(image, 0, 0);
                                
                                canvas.toBlob((convertedBlob) => {
                                  if (convertedBlob) {
                                    const url = URL.createObjectURL(convertedBlob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `generated-image-${Date.now()}-${idx}.${format}`;
                                    a.click();
                                    URL.revokeObjectURL(url);
                                  }
                                }, `image/${format === 'jpeg' ? 'jpeg' : format}`);
                              };
                              
                              image.src = img.image_url.url;
                            } catch (error) {
                              console.error('Error downloading image:', error);
                              toast({
                                title: "Download failed",
                                description: "Could not download the image",
                                variant: "destructive",
                              });
                            }
                          };

                          return (
                            <div key={idx} className="relative group">
                              <img 
                                src={img.image_url.url} 
                                alt={`Generated image ${idx + 1}`}
                                className="w-full rounded-lg border border-border shadow-lg"
                              />
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                <Button 
                                  size="sm" 
                                  variant="secondary"
                                  onClick={() => downloadImage('png')}
                                  className="shadow-lg"
                                  title="Download as PNG"
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="secondary"
                                  onClick={() => saveImageToGallery(img.image_url.url, message.content)}
                                  className="shadow-lg"
                                  title="Save to Gallery"
                                >
                                  <Heart className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="secondary"
                                  onClick={() => {
                                    setEditingImageId(img.image_url.url);
                                    setImageEditPrompt("");
                                  }}
                                  className="shadow-lg"
                                  title="Edit Image"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="secondary"
                                  onClick={() => handleUpscaleImage(img.image_url.url, message.id)}
                                  disabled={upscalingImageId === message.id}
                                  className="shadow-lg"
                                  title="Upscale Image"
                                >
                                  {upscalingImageId === message.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Sparkles className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                              
                              {/* Image edit prompt */}
                              {editingImageId === img.image_url.url && (
                                <div className="mt-3 space-y-2 animate-fade-in">
                                  <Textarea
                                    value={imageEditPrompt}
                                    onChange={(e) => setImageEditPrompt(e.target.value)}
                                    placeholder="Describe your edits (e.g., 'make it sunset', 'add snow', 'change to night')"
                                    className="min-h-[80px]"
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => handleEditImage(img.image_url.url, imageEditPrompt)}
                                      disabled={loading || !imageEditPrompt.trim()}
                                    >
                                      {loading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Palette className="w-3 h-3 mr-1" />}
                                      Apply Edit
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setEditingImageId(null);
                                        setImageEditPrompt("");
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {/* Display generated videos */}
                    {message.role === 'assistant' && message.videos && message.videos.length > 0 && (
                      <div className="mt-4 space-y-4">
                        {message.videos.map((vid, idx) => (
                          <div key={idx} className="relative group">
                            <video 
                              src={vid.videoUrl} 
                              controls 
                              className="w-full rounded-lg border border-border shadow-lg"
                            />
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                              <Button 
                                size="sm" 
                                variant="secondary"
                                onClick={() => setEditingVideoUrl(vid.videoUrl)}
                                className="shadow-lg"
                                title="Edit Video"
                              >
                                <Sparkles className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="secondary"
                                onClick={async () => {
                                  try {
                                    const a = document.createElement('a');
                                    a.href = vid.videoUrl;
                                    a.download = `video-${Date.now()}-${idx}.mp4`;
                                    a.click();
                                    toast({
                                      title: "Download started",
                                      description: "Your video is being downloaded",
                                    });
                                  } catch (error) {
                                    console.error('Error downloading video:', error);
                                    toast({
                                      title: "Download failed",
                                      description: "Could not download the video",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                                className="shadow-lg"
                                title="Download Video"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">{vid.prompt}</p>
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
                    
                    {/* A/B Testing Vote - Show after AI responses when there are exactly 2 models */}
                    {message.role === 'assistant' && !message.error && index < messages.length - 1 && (
                      (() => {
                        // Find the previous user message
                        const prevMessages = messages.slice(0, index + 1);
                        const lastUserMsgIndex = [...prevMessages].reverse().findIndex(m => m.role === 'user');
                        if (lastUserMsgIndex === -1) return null;
                        
                        const userMsgIndex = prevMessages.length - 1 - lastUserMsgIndex;
                        const userMessage = messages[userMsgIndex];
                        
                        // Count AI responses after this user message
                        const aiResponses = messages
                          .slice(userMsgIndex + 1)
                          .filter(m => m.role === 'assistant' && !m.error);
                        
                        // Only show on the last AI response if exactly 2 responses
                        const isLastAIResponse = aiResponses[aiResponses.length - 1]?.id === message.id;
                        
                        if (aiResponses.length === 2 && isLastAIResponse && currentChatId) {
                          return (
                            <div className="mt-4">
                              <ModelABTesting
                                prompt={userMessage.content}
                                responses={aiResponses.map(r => ({
                                  model: r.model,
                                  content: r.content
                                }))}
                                chatId={currentChatId}
                              />
                            </div>
                          );
                        }
                        return null;
                      })()
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
              {/* Credit cost indicator */}
              {profile && (
                <div className="mb-3 flex items-center justify-between text-sm bg-muted/30 px-3 py-2 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    <span className="text-muted-foreground">
                      This {deepResearchMode ? 'deep research query' : imageGenerationMode ? 'image generation' : 'message'} costs{' '}
                      <span className="font-bold text-foreground">
                        {deepResearchMode ? '2' : imageGenerationMode ? '3' : '1'} credit{(deepResearchMode || imageGenerationMode) ? 's' : ''}
                      </span>
                    </span>
                  </div>
                  <div className="text-right">
                    {profile.subscription_type === 'lifetime' ? (
                      <span className="text-sm text-green-500 font-semibold">∞ Unlimited</span>
                    ) : profile.subscription_type === 'monthly' ? (
                      <span className="text-sm">
                        <span className={`font-semibold ${(500 - (profile.monthly_credits_used || 0)) < 50 ? 'text-destructive' : 'text-foreground'}`}>
                          {500 - (profile.monthly_credits_used || 0)}
                        </span>
                        <span className="text-muted-foreground">/500 daily</span>
                      </span>
                    ) : (
                      <span className="text-sm">
                        <span className={`font-semibold ${(profile.credits_remaining || 0) < 2 ? 'text-destructive' : 'text-foreground'}`}>
                          {profile.credits_remaining || 0}
                        </span>
                        <span className="text-muted-foreground">/5 daily</span>
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              {/* Input area with drag-and-drop support */}
              <div 
                className={`relative ${isDragging ? 'ring-2 ring-accent ring-offset-2 ring-offset-background rounded-lg' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                {isDragging && (
                  <div className="absolute inset-0 bg-accent/10 border-2 border-dashed border-accent rounded-lg flex items-center justify-center z-10 pointer-events-none">
                    <div className="text-center">
                      <Upload className="w-12 h-12 mx-auto text-accent mb-2" />
                      <p className="text-accent font-medium">Drop file here</p>
                    </div>
                  </div>
                )}
              
              {/* Video Generator */}
              {videoGenerationMode && (
                <div className="mb-4">
                  <VideoGenerator 
                    profile={profile} 
                    onVideoGenerated={(videoUrl, prompt) => {
                      // Add user prompt message first
                      const userMessage: Message = {
                        id: Date.now().toString(),
                        model: 'User',
                        content: prompt,
                        timestamp: new Date(),
                        role: 'user'
                      };
                      
                      // Then add video response message
                      const videoMessage: Message = {
                        id: (Date.now() + 1).toString(),
                        model: 'Video AI',
                        content: `Generated video: "${prompt}"`,
                        timestamp: new Date(),
                        role: 'assistant',
                        videos: [{ videoUrl, prompt }]
                      };
                      
                      setMessages(prev => [...prev, userMessage, videoMessage]);
                      toast({ 
                        title: "Video added to chat", 
                        description: "Your generated video is now in the conversation" 
                      });
                      
                      // Exit video generation mode after successful generation
                      setVideoGenerationMode(false);
                    }}
                  />
                </div>
              )}
              
              {/* Image Generation Mode Indicator */}
              {imageGenerationMode && (
                <div className="mb-3 flex items-center gap-2 text-xs bg-purple-500/20 text-purple-300 px-3 py-1.5 rounded-md w-fit">
                  <Sparkles className="w-3 h-3" />
                  Image Generation Mode
                </div>
              )}
              
              {/* Message counter */}
              {messageCount > 0 && (
                <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <MessageCircle className="w-3 h-3" />
                  <span>{messageCount} messages in conversation</span>
                </div>
              )}

              {/* File preview before upload */}
              {pendingFile && !uploading && !attachmentUrl && (
                <div className="mb-3">
                  <FilePreview file={pendingFile} onRemove={() => {
                    setPendingFile(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }} />
                </div>
              )}

              {/* Show attached file ready to send */}
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
                    <p className="text-sm font-medium truncate">{attachmentFileName || 'Uploaded file'}</p>
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
                      setAttachmentFileName(null);
                      setUploadStatus('idle');
                    }}
                    className="shrink-0 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* Show cancel button during upload */}
              {uploading && (
                <div className="mb-3 flex items-center gap-2 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-accent" />
                  <span className="text-muted-foreground">Uploading file...</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      uploadAbortController?.abort();
                      setUploading(false);
                      setUploadStatus('idle');
                      setPendingFile(null);
                      toast({
                        title: "Upload cancelled",
                        description: "File upload has been cancelled.",
                      });
                    }}
                  >
                    Cancel
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
                  variant="ghost"
                  size="icon"
                  onClick={exportChatAsJSON}
                  disabled={messages.length === 0}
                  className="shrink-0"
                  title="Export chat as JSON"
                >
                  <FileText className="w-5 h-5" />
                </Button>
                <Button 
                  variant="hero" 
                  size="icon" 
                  className="shrink-0"
                  onClick={handleSend}
                  disabled={!input.trim() || loading || 
                    (profile?.subscription_type !== 'lifetime' && 
                      ((profile?.subscription_type === 'monthly' && (profile?.monthly_credits_used || 0) >= 500) || 
                      (profile?.subscription_type === 'free' && (profile?.credits_remaining || 0) < (deepResearchMode ? 2 : imageGenerationMode ? 3 : 1)))
                    )
                  }
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Image Gallery Modal */}
      {showGallery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in" onClick={() => setShowGallery(false)}>
          <div className="glass-card p-6 rounded-xl max-w-4xl max-h-[80vh] w-full mx-4 overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <ImageIcon className="w-6 h-6 text-accent" />
                Image Gallery ({savedImages.length})
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setShowGallery(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            {savedImages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ImageIcon className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
                <p className="text-lg text-muted-foreground mb-2">No saved images yet</p>
                <p className="text-sm text-muted-foreground">Generate images and click the heart icon to save them here</p>
              </div>
            ) : (
              <ScrollArea className="flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                  {savedImages.map((image) => (
                    <div key={image.id} className="relative group glass-card p-3 rounded-lg">
                      <img 
                        src={image.url} 
                        alt={image.prompt}
                        className="w-full aspect-square object-cover rounded-lg mb-3"
                      />
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{image.prompt}</p>
                      <p className="text-xs text-muted-foreground">{new Date(image.timestamp).toLocaleDateString()}</p>
                      
                      <div className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            const a = document.createElement('a');
                            a.href = image.url;
                            a.download = `image-${image.id}.png`;
                            a.click();
                          }}
                          className="shadow-lg"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => deleteImageFromGallery(image.id)}
                          className="shadow-lg hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      )}

      {/* Video Editor Dialog */}
      {editingVideoUrl && (
        <Dialog open={!!editingVideoUrl} onOpenChange={() => setEditingVideoUrl(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <VideoEditor
              videoUrl={editingVideoUrl}
              onSave={(editedUrl) => {
                setEditingVideoUrl(null);
                toast({
                  title: "Video edited",
                  description: "Your video has been edited successfully",
                });
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Chat;
