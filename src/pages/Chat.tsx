import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Send, 
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
  MessageSquare,
  FileText,
  RefreshCw,
  Square,
  Download,
  Image as ImageIcon,
  Plus,
  Wrench,
  Menu,
  FileSearch,
  Search,
  Code,
  Settings,
  Eye,
  Volume2,
  VolumeX,
  Layers
} from "lucide-react";
import Navbar from "@/components/Navbar";
import FilePreview from "@/components/FilePreview";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import { SmartPromptSuggestions } from "@/components/SmartPromptSuggestions";
import { QuickActions, QuickActionType } from "@/components/QuickActions";
import { playSound, getSoundPreference, setSoundPreference, isSoundSupported } from "@/utils/soundNotifications";
import { classifyQuery, getOptimalModels, getQueryTypeInfo, QueryType } from "@/utils/queryClassifier";

const aiModels = [
  { id: "chatgpt", name: "ChatGPT", icon: Bot, color: "text-green-400", category: "reasoning" },
  { id: "gemini", name: "Gemini", icon: Sparkles, color: "text-blue-400", category: "reasoning" },
  { id: "claude", name: "Claude", icon: Brain, color: "text-purple-400", category: "reasoning" },
  { id: "perplexity", name: "Perplexity", icon: Globe, color: "text-orange-400", category: "research" },
  { id: "grok", name: "Grok", icon: Zap, color: "text-cyan-400", category: "reasoning" },
  { id: "bytez-qwen", name: "Qwen 2.5", icon: Cpu, color: "text-pink-400", category: "small" },
  { id: "bytez-phi3", name: "Phi-3", icon: Cpu, color: "text-indigo-400", category: "small" },
  { id: "bytez-mistral", name: "Mistral 7B", icon: Cpu, color: "text-amber-400", category: "small" },
];

const tools = [
  { 
    id: 'create-image', 
    name: '✨ Create images', 
    icon: ImageIcon,
    action: 'image-generation',
    description: 'Generate AI images from text descriptions'
  },
  { 
    id: 'document-analysis', 
    name: '📄 Document analysis', 
    icon: FileSearch,
    action: 'document-analysis',
    description: 'Analyze and extract insights from documents'
  },
  { 
    id: 'web-search', 
    name: '🔍 Web search', 
    icon: Search,
    action: 'web-search',
    description: 'Search the web for real-time information'
  },
  { 
    id: 'code-generation', 
    name: '💻 Code generation', 
    icon: Code,
    action: 'code-generation',
    description: 'Generate and explain code snippets'
  },
  { 
    id: 'model-selection', 
    name: '⚙️ Select AI models', 
    icon: Settings,
    action: 'model-selection',
    description: 'Choose which AI models to use'
  },
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
  thinkingProcess?: string; // Reasoning steps from thinking models
  reasoningSteps?: Array<{ step: number; thought: string; conclusion: string }>; // Multi-step reasoning
}

interface QueuedMessage {
  id: string;
  content: string;
  models: string[];
  attachment?: { url: string; type: string; fileName: string };
  priority: 'normal' | 'urgent';
  timestamp: number;
}

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [selectedModels, setSelectedModels] = useState<string[]>(["gemini"]);
  const [autoSelectModel, setAutoSelectModel] = useState(false);
  const [loading, setLoading] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentType, setAttachmentType] = useState<string | null>(null);
  const [attachmentFileName, setAttachmentFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingPdf, setIsDraggingPdf] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const [activeQuickAction, setActiveQuickAction] = useState<QuickActionType>(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageStyle, setImageStyle] = useState("realistic");
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStage, setGenerationStage] = useState("");
  const [takingLonger, setTakingLonger] = useState(false);
  const [showModels, setShowModels] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [analyzingDocument, setAnalyzingDocument] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatHistoryList, setChatHistoryList] = useState<any[]>([]);
  const [modelSelectionOpen, setModelSelectionOpen] = useState(false);
  const [responseStartTime, setResponseStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [processingStage, setProcessingStage] = useState<'analyzing' | 'thinking' | 'generating' | null>(null);
  const [messageQueue, setMessageQueue] = useState<QueuedMessage[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(getSoundPreference());
  const [batchModeEnabled, setBatchModeEnabled] = useState(false);
  const [batchProcessingStatus, setBatchProcessingStatus] = useState<{
    total: number;
    completed: number;
    inProgress: string[];
  }>({ total: 0, completed: 0, inProgress: [] });
  const [showThinkingProcess, setShowThinkingProcess] = useState<boolean>(() => {
    const saved = localStorage.getItem('showThinkingProcess');
    return saved ? JSON.parse(saved) : true;
  });
  const [enableMultiStepReasoning, setEnableMultiStepReasoning] = useState<boolean>(() => {
    const saved = localStorage.getItem('enableMultiStepReasoning');
    return saved ? JSON.parse(saved) : false;
  });
  const abortControllerRef = useRef<AbortController | null>(null);
  
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
      loadChatHistoryList();
    }
  }, [user, refreshProfile]);

  const loadChatHistoryList = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setChatHistoryList(data || []);
    } catch (error) {
      console.error('Error loading chat history list:', error);
    }
  };

  useEffect(() => {
    const chatIdFromUrl = searchParams.get('chatId');
    if (chatIdFromUrl) {
      loadChatHistory(chatIdFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Safety net: auto-reset loading after 3 minutes as last resort
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (loading) {
      timeoutId = setTimeout(() => {
        console.warn('Loading state auto-reset after 3 minutes');
        setLoading(false);
        setElapsedTime(0);
        setResponseStartTime(null);
        sonnerToast.warning("Request is taking longer than expected. You can try sending your message again.");
      }, 180000); // 3 minutes
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [loading]);

  // Track elapsed time during AI response and play sounds
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let lastStage: typeof processingStage = null;
    
    if (loading && responseStartTime) {
      intervalId = setInterval(() => {
        const elapsed = Math.floor((Date.now() - responseStartTime) / 1000);
        setElapsedTime(elapsed);
        
        // Update processing stage based on elapsed time
        let newStage: typeof processingStage = null;
        if (elapsed < 2) {
          newStage = 'analyzing';
        } else if (elapsed < 5) {
          newStage = 'thinking';
        } else {
          newStage = 'generating';
        }
        
        // Play sound when stage changes
        if (newStage !== lastStage && soundEnabled && isSoundSupported()) {
          if (newStage) playSound(newStage);
          lastStage = newStage;
        }
        
        setProcessingStage(newStage);
      }, 1000);
    } else {
      setElapsedTime(0);
      setProcessingStage(null);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [loading, responseStartTime, soundEnabled]);

  // Process message queue (sort by priority)
  useEffect(() => {
    const processQueue = async () => {
      if (messageQueue.length > 0 && !loading && !isProcessingQueue && !batchModeEnabled) {
        setIsProcessingQueue(true);
        
        // Sort queue by priority (urgent first) then by timestamp
        const sortedQueue = [...messageQueue].sort((a, b) => {
          if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
          if (b.priority === 'urgent' && a.priority !== 'urgent') return 1;
          return a.timestamp - b.timestamp;
        });
        
        const nextMessage = sortedQueue[0];
        setMessageQueue(prev => prev.filter(m => m.id !== nextMessage.id));
        
        // Set input and attachment from queue
        setInput(nextMessage.content);
        if (nextMessage.attachment) {
          setAttachmentUrl(nextMessage.attachment.url);
          setAttachmentType(nextMessage.attachment.type);
          setAttachmentFileName(nextMessage.attachment.fileName);
        }
        
        // Small delay to allow UI to update
        await sleep(100);
        
        // Send the queued message
        await handleSend(nextMessage.models);
        setIsProcessingQueue(false);
      }
    };
    
    processQueue();
  }, [messageQueue, loading, isProcessingQueue, batchModeEnabled]);
  
  // Save sound preference when changed
  useEffect(() => {
    setSoundPreference(soundEnabled);
  }, [soundEnabled]);
  
  useEffect(() => {
    localStorage.setItem('showThinkingProcess', JSON.stringify(showThinkingProcess));
  }, [showThinkingProcess]);

  useEffect(() => {
    localStorage.setItem('enableMultiStepReasoning', JSON.stringify(enableMultiStepReasoning));
  }, [enableMultiStepReasoning]);

  useEffect(() => {
    localStorage.setItem('showThinkingProcess', JSON.stringify(showThinkingProcess));
  }, [showThinkingProcess]);

  useEffect(() => {
    localStorage.setItem('enableMultiStepReasoning', JSON.stringify(enableMultiStepReasoning));
  }, [enableMultiStepReasoning]);

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
      console.error('Upload error:', error);
      setUploadStatus('error');
      setAttachmentUrl(null);
      setAttachmentType(null);
      setAttachmentFileName(null);
      setPendingFile(null);
      sonnerToast.error(error.message || "File upload failed");
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
    setIsDraggingPdf(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      // If PDF, open document analysis dialog
      if (file.type === 'application/pdf') {
        setDocumentFile(file);
        setDocumentDialogOpen(true);
      } else {
        await processFileUpload(file);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    
    // Check if dragged file is PDF
    const items = e.dataTransfer.items;
    if (items.length > 0) {
      const item = items[0];
      if (item.type === 'application/pdf') {
        setIsDraggingPdf(true);
      } else {
        setIsDraggingPdf(false);
      }
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setIsDraggingPdf(false);
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

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setLoading(false);
      setElapsedTime(0);
      setResponseStartTime(null);
      setRetryAttempt(0);
      setProcessingStage(null);
      setIsProcessingQueue(false);
      setBatchProcessingStatus({ total: 0, completed: 0, inProgress: [] });
      sonnerToast.info("Response stopped");
    }
  };
  
  const markAsUrgent = (messageId: string) => {
    setMessageQueue(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, priority: 'urgent' } : msg
    ));
    if (soundEnabled && isSoundSupported()) {
      playSound('urgentQueue');
    }
    sonnerToast.info("Message marked as urgent and moved to front of queue");
  };

  const cancelQueuedMessage = (messageId: string) => {
    setMessageQueue(prev => prev.filter(m => m.id !== messageId));
    sonnerToast.success("Message removed from queue");
  };

  const clearQueue = () => {
    setMessageQueue([]);
    sonnerToast.success("Queue cleared");
  };
  
  const processBatch = async () => {
    if (messageQueue.length === 0 || loading) return;
    
    // Sort by priority first
    const sortedQueue = [...messageQueue].sort((a, b) => {
      if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
      if (b.priority === 'urgent' && a.priority !== 'urgent') return 1;
      return a.timestamp - b.timestamp;
    });
    
    // Process up to 3 messages simultaneously
    const batchSize = Math.min(3, sortedQueue.length);
    const batch = sortedQueue.slice(0, batchSize);
    
    setBatchProcessingStatus({
      total: batch.length,
      completed: 0,
      inProgress: batch.map(m => m.id)
    });
    
    // Remove batch from queue
    setMessageQueue(prev => prev.filter(m => !batch.find(b => b.id === m.id)));
    
    setLoading(true);
    
    // Process all messages in parallel
    const promises = batch.map(async (msg) => {
      try {
        // Add user message to chat
        const userMessage: Message = {
          id: `${Date.now()}-${Math.random()}`,
          role: "user",
          content: msg.content,
          timestamp: new Date(),
          attachmentUrl: msg.attachment?.url,
          attachmentType: msg.attachment?.type,
          attachmentFileName: msg.attachment?.fileName,
        };
        
        setMessages(prev => [...prev, userMessage]);
        
        // Call AI
        const messagesForApi = [
          ...messages.map(m => ({ role: m.role, content: m.content })),
          { role: 'user' as const, content: msg.content }
        ];
        
        const { data, error } = await supabase.functions.invoke('chat-with-ai', {
          body: {
            messages: messagesForApi,
            selectedModels: msg.models,
            chatId,
            attachmentUrl: msg.attachment?.url,
          },
        });
        
        if (error) throw error;
        
        // Add AI response
        if (data?.responses && Array.isArray(data.responses)) {
          const assistantMessages: Message[] = data.responses.map((response: any) => ({
            id: response.messageId || `${Date.now()}-${Math.random()}`,
            role: "assistant" as const,
            content: response.content || 'No response',
            model: response.model,
            timestamp: new Date(),
            userMessageId: userMessage.id,
          }));
          
          setMessages(prev => [...prev, ...assistantMessages]);
        }
        
        // Update progress
        setBatchProcessingStatus(prev => ({
          ...prev,
          completed: prev.completed + 1,
          inProgress: prev.inProgress.filter(id => id !== msg.id)
        }));
        
        return { success: true, msg };
      } catch (error) {
        console.error('Batch processing error:', error);
        setBatchProcessingStatus(prev => ({
          ...prev,
          completed: prev.completed + 1,
          inProgress: prev.inProgress.filter(id => id !== msg.id)
        }));
        return { success: false, msg, error };
      }
    });
    
    await Promise.all(promises);
    
    setLoading(false);
    setBatchProcessingStatus({ total: 0, completed: 0, inProgress: [] });
    
    if (soundEnabled && isSoundSupported()) {
      playSound('complete');
    }
    
    await refreshProfile();
    sonnerToast.success(`Batch processing complete (${batch.length} messages processed)`);
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const handleSend = async (specificModels?: string[], urgent: boolean = false) => {
    if (!input.trim() && !attachmentUrl) return;
    
    // If AI is currently responding, queue the message
    if (loading) {
      const queuedMessage: QueuedMessage = {
        id: `queue-${Date.now()}-${Math.random()}`,
        content: input,
        models: specificModels || selectedModels,
        priority: urgent ? 'urgent' : 'normal',
        timestamp: Date.now(),
        attachment: attachmentUrl ? {
          url: attachmentUrl,
          type: attachmentType || 'other',
          fileName: attachmentFileName || 'file'
        } : undefined
      };
      
      setMessageQueue(prev => [...prev, queuedMessage]);
      setInput("");
      removeAttachment();
      
      if (soundEnabled && isSoundSupported()) {
        playSound(urgent ? 'urgentQueue' : 'queueAdd');
      }
      
      sonnerToast.info(`Message ${urgent ? '⚡ urgently ' : ''}added to queue (${messageQueue.length + 1} in queue)`);
      return;
    }
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to use the chat.",
        variant: "destructive",
      });
      return;
    }

    let modelsToUse = specificModels || selectedModels;
    
    // Automatic model selection based on query type
    if (!specificModels && autoSelectModel && input.trim()) {
      const queryType = classifyQuery(input);
      const optimalModels = getOptimalModels(queryType);
      modelsToUse = optimalModels;
      
      const queryInfo = getQueryTypeInfo(queryType);
      sonnerToast.info(`${queryInfo.icon} Auto-selected ${queryInfo.label} mode`);
    }
    
    // Apply quick action model selection - only if not using specificModels or auto-selection
    if (!specificModels && !autoSelectModel) {
      if (activeQuickAction === 'fast') {
        modelsToUse = ['bytez-phi3', 'bytez-mistral'];
      } else if (activeQuickAction === 'reasoning') {
        modelsToUse = ['chatgpt', 'claude'];
      } else if (activeQuickAction === 'research') {
        modelsToUse = ['perplexity'];
      }
    }
    
    // Ensure at least one model is selected
    if (modelsToUse.length === 0) {
      toast({
        title: "No model selected",
        description: "Please select at least one AI model to continue.",
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
    setResponseStartTime(Date.now());
    setElapsedTime(0);
    setProcessingStage('analyzing');
    
    // Create abort controller
    abortControllerRef.current = new AbortController();
    
    const currentAttachmentUrl = attachmentUrl;
    const currentAttachmentType = attachmentType;
    removeAttachment();

    // Retry logic with exponential backoff
    let lastError: any = null;
    const maxRetries = 3;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10s
        setRetryAttempt(attempt);
        sonnerToast.info(`Retrying... (Attempt ${attempt + 1}/${maxRetries + 1})`);
        await sleep(backoffDelay);
      }

      try {
      const messagesForApi = [
        ...messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        {
          role: 'user' as const,
          content: userMessage.content,
        }
      ];
      
      console.log('🚀 Sending message:', { 
        models: modelsToUse, 
        messageCount: messagesForApi.length,
        streaming: modelsToUse.length === 1,
        timestamp: new Date().toISOString()
      });

      const startTime = Date.now();

      // Use streaming for single model requests
      if (modelsToUse.length === 1) {
        console.log('📡 Starting streaming for', modelsToUse[0]);
        const streamingClient = new (await import('@/utils/streamingClient')).StreamingClient();
        
        let hasReceivedToken = false;
        const streamingMessage: Message = {
          id: `streaming-${Date.now()}`,
          role: "assistant",
          content: "",
          model: modelsToUse[0],
          timestamp: new Date(),
          userMessageId: userMessage.id,
        };

        setMessages(prev => [...prev, streamingMessage]);

        try {
          await streamingClient.startStream(
            messagesForApi,
            modelsToUse[0],
            chatId,
            (model, token, fullContent) => {
              if (!hasReceivedToken) {
                console.log('✅ First token received from', model);
                hasReceivedToken = true;
              }
              setMessages(prev => 
                prev.map(msg => 
                  msg.id === streamingMessage.id
                    ? { ...msg, content: fullContent }
                    : msg
                )
              );
            },
            (model, messageId) => {
              console.log('✅ Stream complete for', model, 'messageId:', messageId);
              setMessages(prev => 
                prev.map(msg => 
                  msg.id === streamingMessage.id
                    ? { ...msg, id: messageId || msg.id }
                    : msg
                )
              );
            },
            (model, error) => {
              console.error('❌ Stream error:', model, error);
              throw new Error(error);
            }
          );

          const elapsed = Date.now() - startTime;
          console.log(`✅ Streaming complete in ${elapsed}ms`);
          
          await refreshProfile();
          setRetryAttempt(0);
          
          if (soundEnabled && isSoundSupported()) {
            playSound('complete');
          }
          
          break;
        } catch (streamError: any) {
          console.error('❌ Streaming failed after', Date.now() - startTime, 'ms:', streamError.message);
          console.log('⚠️ Falling back to non-streaming mode');
          
          // Remove the failed streaming message
          setMessages(prev => prev.filter(msg => msg.id !== streamingMessage.id));
        }
      }

      // Fallback to non-streaming for multiple models or if streaming failed
      console.log('📤 Using non-streaming mode');
      const invokePromise = supabase.functions.invoke('chat-with-ai', {
        body: {
          messages: messagesForApi,
          selectedModels: modelsToUse,
          chatId,
          attachmentUrl: currentAttachmentUrl,
          webSearchEnabled: activeQuickAction === 'research',
          deepResearch: activeQuickAction === 'research',
          enableMultiStepReasoning,
          stream: false,
        },
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout - please try again or use fewer models')), 300000)
      );

      const { data, error } = await Promise.race([invokePromise, timeoutPromise]) as any;

      console.log('📥 Response received:', { 
        hasData: !!data, 
        hasError: !!error,
        responsesCount: data?.responses?.length 
      });

      if (error) {
        console.error('❌ Function invoke error:', error);
        throw error;
      }

      // Record metrics for each model
      if (data?.responses && user) {
        const responseTime = Date.now() - startTime;
        for (const modelResponse of data.responses) {
          await supabase.from('ai_model_metrics').insert({
            user_id: user.id,
            model_name: modelResponse.model || 'unknown',
            response_time_ms: responseTime,
            tokens_total: modelResponse.tokens || null,
            message_id: modelResponse.messageId || null,
          });
        }
      }

      if (error) throw error;

      let currentChatId = chatId;
      if (data.chatId && !chatId) {
        setChatId(data.chatId);
        currentChatId = data.chatId;
      }

      if (data.responses && Array.isArray(data.responses)) {
        const assistantMessages: Message[] = data.responses
          .filter((response: any) => response.success)
          .map((response: any) => ({
            id: `${Date.now()}-${response.model}-${Math.random()}`,
            role: "assistant" as const,
            content: response.response,
            model: response.model,
            timestamp: new Date(),
            userMessageId: userMessage.id,
            thinkingProcess: response.thinkingProcess,
            reasoningSteps: response.reasoningSteps,
          }));

        setMessages(prev => [...prev, ...assistantMessages]);
      }

        await refreshProfile();
        setRetryAttempt(0);
        
        // Play completion sound on success
        if (soundEnabled && isSoundSupported()) {
          playSound('complete');
        }
        
        break; // Success, exit retry loop
      } catch (error: any) {
        console.error('Chat error:', error);
        lastError = error;
        
        // Don't retry if aborted
        if (error.name === 'AbortError') {
          setLoading(false);
          setElapsedTime(0);
          setResponseStartTime(null);
          setRetryAttempt(0);
          setProcessingStage(null);
          return;
        }
        
        // If this was the last attempt, show error and play error sound
        if (attempt === maxRetries) {
          if (soundEnabled && isSoundSupported()) {
            playSound('error');
          }
          
          // Better error messages
          let errorMessage = "Failed to send message after multiple attempts";
          if (error.message?.includes('Rate limit')) {
            errorMessage = "Rate limit exceeded. Please try again in a moment.";
          } else if (error.message?.includes('API key')) {
            errorMessage = "API configuration error. Please contact support.";
          } else if (error.message?.includes('timeout')) {
            errorMessage = "Request timed out. Please try again.";
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
          });
        }
      } finally {
        // ALWAYS clear loading state
        if (attempt === maxRetries) {
          setLoading(false);
          setElapsedTime(0);
          setResponseStartTime(null);
          setRetryAttempt(0);
          setProcessingStage(null);
          abortControllerRef.current = null;
        }
      }
    }
    
    // Final cleanup after retry loop (redundant safety net)
    setLoading(false);
    setElapsedTime(0);
    setResponseStartTime(null);
    setRetryAttempt(0);
    setProcessingStage(null);
    abortControllerRef.current = null;
  };

  const handleRegenerate = async (message: Message) => {
    if (!message.model || !message.userMessageId || loading) return;
    
    const userMsg = messages.find(m => m.id === message.userMessageId);
    if (!userMsg) return;

    setLoading(true);
    setResponseStartTime(Date.now());
    setElapsedTime(0);
    setProcessingStage('analyzing');
    
    // Retry logic with exponential backoff
    let lastError: any = null;
    const maxRetries = 3;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        setRetryAttempt(attempt);
        sonnerToast.info(`Retrying... (Attempt ${attempt + 1}/${maxRetries + 1})`);
        await sleep(backoffDelay);
      }

      try {
      // Build messages up to the user message that triggered this response
      const messagesUpToUser = messages
        .filter(m => m.timestamp <= userMsg.timestamp)
        .map(m => ({
          role: m.role,
          content: m.content,
        }));

      const { data, error } = await supabase.functions.invoke('chat-with-ai', {
        body: {
          messages: messagesUpToUser,
          selectedModels: [message.model],
          chatId,
          attachmentUrl: userMsg.attachmentUrl,
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
        setRetryAttempt(0);
        
        // Play completion sound on success
        if (soundEnabled && isSoundSupported()) {
          playSound('complete');
        }
        
        break; // Success, exit retry loop
      } catch (error: any) {
        console.error('Regenerate error:', error);
        lastError = error;
        
        // If this was the last attempt, show error and play error sound
        if (attempt === maxRetries) {
          if (soundEnabled && isSoundSupported()) {
            playSound('error');
          }
          toast({
            title: "Error",
            description: lastError?.message || "Failed to regenerate response after multiple attempts",
            variant: "destructive",
          });
        }
      }
    }
    
    setLoading(false);
    setElapsedTime(0);
    setResponseStartTime(null);
    setRetryAttempt(0);
    setProcessingStage(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Check for urgent message shortcut (Ctrl+Shift+Enter)
      const urgent = e.ctrlKey && e.shiftKey;
      handleSend(undefined, urgent);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    sonnerToast.success("Copied to clipboard");
  };

  const downloadImage = (imageUrl: string, filename: string = 'generated-image.png') => {
    // For base64 images
    if (imageUrl.startsWith('data:image')) {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      sonnerToast.success("Image downloaded");
    } else {
      // For URL images, fetch and download
      fetch(imageUrl)
        .then(res => res.blob())
        .then(blob => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          sonnerToast.success("Image downloaded");
        })
        .catch(() => {
          sonnerToast.error("Failed to download image");
        });
    }
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim() || !user) return;
    
    setGenerating(true);
    setGenerationProgress(0);
    setGenerationStage("Initializing...");
    setTakingLonger(false);

    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 95) return prev;
        return prev + 2;
      });
    }, 1000);

    const longerTimeout = setTimeout(() => {
      setTakingLonger(true);
    }, 15000);

    try {
      setGenerationStage("Sending request to AI...");
      
      const enhancedPrompt = `Create a ${imageStyle} style image: ${imagePrompt}`;
      
      const { data, error } = await supabase.functions.invoke('chat-with-ai', {
        body: {
          messages: [
            { role: 'user', content: enhancedPrompt }
          ],
          selectedModels: ['gemini-flash-image'],
          generateImage: true,
        }
      });

      if (error) throw error;

      setGenerationStage("Processing response...");
      setGenerationProgress(90);

      const imageUrl = data.responses?.[0]?.imageUrl || data.imageUrl;

      if (!imageUrl) {
        throw new Error('No image URL returned from the server');
      }

      setGenerationProgress(100);
      
      const newMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `✨ Generated image: ${imagePrompt}`,
        timestamp: new Date(),
        attachmentUrl: imageUrl,
        attachmentType: 'image',
      };

      setMessages(prev => [...prev, newMessage]);
      
      sonnerToast.success("Image generated successfully!");
      setImageDialogOpen(false);
      setImagePrompt("");
      setImageStyle("realistic");
      
    } catch (error: any) {
      console.error('Image generation error:', error);
      sonnerToast.error(error.message || "Failed to generate image");
    } finally {
      clearInterval(progressInterval);
      clearTimeout(longerTimeout);
      setGenerating(false);
      setGenerationProgress(0);
      setGenerationStage("");
      setTakingLonger(false);
    }
  };

  const handleToolSelect = (toolId: string) => {
    if (toolId === 'create-image') {
      setImageDialogOpen(true);
    } else if (toolId === 'model-selection') {
      setModelSelectionOpen(true);
    } else if (toolId === 'document-analysis') {
      setDocumentDialogOpen(true);
    } else if (toolId === 'web-search') {
      setInput('🔍 Search the web for: ');
    } else if (toolId === 'code-generation') {
      setInput('💻 Generate code for: ');
    }
  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setDocumentFile(file);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file",
        variant: "destructive",
      });
    }
  };

  const handleAnalyzeDocument = async () => {
    if (!documentFile || !user) return;

    setAnalyzingDocument(true);
    try {
      // Upload PDF to Supabase storage
      const fileExt = documentFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, documentFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(filePath);

      // Call edge function to extract text
      const { data, error } = await supabase.functions.invoke('extract-pdf-text', {
        body: { fileUrl: publicUrl }
      });

      if (error) throw error;

      const text = data.text || "";
      setExtractedText(text);
      
      // Add to chat
      setInput(`📄 Analyze this document:\n\n${text.substring(0, 1000)}${text.length > 1000 ? '...' : ''}`);
      setDocumentDialogOpen(false);
      setDocumentFile(null);
      
      toast({
        title: "Document processed",
        description: "Text extracted successfully. You can now ask questions about it.",
      });
    } catch (error) {
      console.error('Error analyzing document:', error);
      toast({
        title: "Analysis failed",
        description: "Could not extract text from the document",
        variant: "destructive",
      });
    } finally {
      setAnalyzingDocument(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <Navbar />
      <BudgetAlertDialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen} />
      
      {/* Chat History Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-80 p-0">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle>Chat History</SheetTitle>
            <SheetDescription>Your recent conversations</SheetDescription>
          </SheetHeader>
          
          {/* Search Bar */}
          <div className="px-6 py-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <ScrollArea className="h-[calc(100vh-180px)]">
            <div className="px-4 py-2 space-y-1">
              <Button
                onClick={() => {
                  setMessages([]);
                  setChatId(null);
                  setSidebarOpen(false);
                }}
                variant="ghost"
                className="w-full justify-start gap-2 mb-2"
              >
                <MessageSquare className="h-4 w-4" />
                New Chat
              </Button>
              
              {chatHistoryList
                .filter(chat => 
                  !searchQuery || 
                  chat.title?.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  {searchQuery ? 'No conversations found' : 'No chat history yet'}
                </div>
              ) : (
                chatHistoryList
                  .filter(chat => 
                    !searchQuery || 
                    chat.title?.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((chat) => (
                    <Button
                      key={chat.id}
                      variant={chatId === chat.id ? "secondary" : "ghost"}
                      className="w-full justify-start text-left h-auto py-2 px-3"
                      onClick={() => {
                        loadChatHistory(chat.id);
                        setSidebarOpen(false);
                      }}
                    >
                      <div className="flex-1 truncate">
                        <div className="text-sm font-medium truncate">
                          {chat.title || 'Untitled Chat'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(chat.updated_at).toLocaleDateString()}
                        </div>
                      </div>
                    </Button>
                  ))
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Main Chat Area - Centered */}
      <div 
        className="flex-1 flex flex-col items-center overflow-hidden"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="w-full max-w-4xl flex flex-col h-full">
          {/* Header - Minimal with Hamburger Menu */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="shrink-0 h-9 w-9"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <MessageSquare className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">
                {chatId ? 'Continue conversation' : 'New conversation'}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {/* Sound Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSoundEnabled(!soundEnabled)}
                title={soundEnabled ? "Disable sound notifications" : "Enable sound notifications"}
                className="h-9 w-9"
              >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" title="Reasoning settings">
                    <Brain className="h-4 w-4 mr-2" />
                    Reasoning
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <div className="p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-thinking" className="text-sm cursor-pointer">
                        Show thinking process
                      </Label>
                      <Switch
                        id="show-thinking"
                        checked={showThinkingProcess}
                        onCheckedChange={setShowThinkingProcess}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="multi-step" className="text-sm cursor-pointer">
                          Multi-step reasoning
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Break down complex problems
                        </p>
                      </div>
                      <Switch
                        id="multi-step"
                        checked={enableMultiStepReasoning}
                        onCheckedChange={setEnableMultiStepReasoning}
                      />
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
              
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
                        {message.attachmentUrl && message.attachmentType === 'image' ? (
                          <div className="mb-3 rounded-lg overflow-hidden border border-border/40">
                            <img 
                              src={message.attachmentUrl} 
                              alt="Generated image"
                              className="w-full max-w-md h-auto object-contain"
                            />
                          </div>
                        ) : message.attachmentUrl ? (
                          <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                            <FileText className="h-3 w-3" />
                            <span>{message.attachmentFileName || 'Attachment'}</span>
                          </div>
                        ) : null}
                          
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            {renderWithCitations(message.content)}
                          </div>
                          
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

                        {message.role === 'assistant' && (
                          <div className="flex items-center gap-1 mt-2">
                            {/* Download button for images */}
                            {message.attachmentUrl && message.attachmentType === 'image' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => downloadImage(
                                  message.attachmentUrl!, 
                                  `image-${Date.now()}.png`
                                )}
                                className="h-7 px-2"
                                title="Download image"
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                            )}
                            
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
                  className="space-y-3"
                >
                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg border border-border/40">
                    {processingStage === 'analyzing' && (
                      <FileSearch className="h-5 w-5 animate-pulse text-blue-500" />
                    )}
                    {processingStage === 'thinking' && (
                      <Brain className="h-5 w-5 animate-pulse text-purple-500" />
                    )}
                    {processingStage === 'generating' && (
                      <Sparkles className="h-5 w-5 animate-pulse text-primary" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {processingStage === 'analyzing' && 'Analyzing input...'}
                          {processingStage === 'thinking' && 'Processing your request...'}
                          {processingStage === 'generating' && 'Generating response...'}
                        </span>
                        {retryAttempt > 0 && (
                          <Badge variant="outline" className="text-xs">
                            Retry {retryAttempt}/3
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {elapsedTime}s elapsed
                        </span>
                        <div className="flex gap-1">
                          <div className={`h-1 w-8 rounded-full transition-all ${processingStage === 'analyzing' ? 'bg-blue-500' : 'bg-muted'}`} />
                          <div className={`h-1 w-8 rounded-full transition-all ${processingStage === 'thinking' ? 'bg-purple-500' : 'bg-muted'}`} />
                          <div className={`h-1 w-8 rounded-full transition-all ${processingStage === 'generating' ? 'bg-primary' : 'bg-muted'}`} />
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={handleStop}
                      size="sm"
                      variant="destructive"
                      className="h-8"
                    >
                      <Square className="h-4 w-4 mr-1" />
                      Stop
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Message Queue Display */}
              {messageQueue.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg border border-border/40">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {messageQueue.length} message{messageQueue.length > 1 ? 's' : ''} in queue
                      </span>
                      
                      {/* Batch Mode Toggle */}
                      {messageQueue.length >= 2 && (
                        <div className="flex items-center gap-2">
                          <Switch 
                            checked={batchModeEnabled} 
                            onCheckedChange={setBatchModeEnabled}
                            className="scale-75"
                          />
                          <Label className="text-xs cursor-pointer" onClick={() => setBatchModeEnabled(!batchModeEnabled)}>
                            Batch Mode
                          </Label>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* Process All Button (Batch Mode) */}
                      {batchModeEnabled && messageQueue.length >= 2 && !loading && (
                        <Button
                          onClick={processBatch}
                          size="sm"
                          variant="secondary"
                          className="h-7 text-xs"
                        >
                          <Layers className="h-3 w-3 mr-1" />
                          Process All ({messageQueue.length})
                        </Button>
                      )}
                      
                      <Button
                        onClick={clearQueue}
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>
                  
                  {/* Batch Processing Status */}
                  {batchProcessingStatus.total > 0 && (
                    <div className="p-3 bg-primary/10 rounded-lg border border-primary/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Layers className="h-4 w-4 text-primary animate-pulse" />
                        <span className="text-sm font-medium">
                          Batch Processing: {batchProcessingStatus.completed}/{batchProcessingStatus.total}
                        </span>
                      </div>
                      <Progress 
                        value={(batchProcessingStatus.completed / batchProcessingStatus.total) * 100} 
                        className="h-2"
                      />
                    </div>
                  )}
                  
                  <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                    {messageQueue.map((msg, index) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className={`flex items-center gap-2 p-2 bg-background/50 rounded border ${
                          msg.priority === 'urgent' ? 'border-orange-500/50 bg-orange-500/5' : 'border-border/30'
                        }`}
                      >
                        <Badge variant="outline" className="text-xs shrink-0">
                          #{index + 1}
                        </Badge>
                        
                        {msg.priority === 'urgent' && (
                          <Badge variant="destructive" className="text-xs shrink-0">
                            <Zap className="h-3 w-3 mr-1" />
                            Urgent
                          </Badge>
                        )}
                        
                        <p className="text-xs text-muted-foreground flex-1 truncate">
                          {msg.content}
                        </p>
                        
                        {msg.priority !== 'urgent' && (
                          <Button
                            onClick={() => markAsUrgent(msg.id)}
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 shrink-0"
                            title="Mark as urgent"
                          >
                            <Zap className="h-3 w-3 text-orange-500" />
                          </Button>
                        )}
                        
                        <Button
                          onClick={() => cancelQueuedMessage(msg.id)}
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 shrink-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
              
              {/* Smart Prompt Suggestions */}
              <SmartPromptSuggestions 
                messages={messages}
                onSuggestionClick={(suggestion) => {
                  setInput(suggestion);
                }}
                enabled={messages.length > 0 && !loading}
              />
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Quick Actions */}
          <QuickActions 
            activeAction={activeQuickAction}
            onActionSelect={(action) => {
              setActiveQuickAction(action);
              if (action === 'summarize') {
                setInput('Please summarize our conversation so far');
                setTimeout(() => handleSend(), 100);
              } else if (action === 'image') {
                // Auto-select Gemini 3 Flash for image generation
                setSelectedModels(['gemini-flash']);
              }
            }}
          />

          {/* Fixed Input Area at Bottom */}
          <div className="border-t border-border/40 bg-background">
            <div className="px-6 py-3">
              {/* Enhanced File Preview */}
              {(attachmentUrl || pendingFile) && (
                <div className="mb-3">
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg border border-border/40">
                    {/* Visual Preview */}
                    {pendingFile && (
                      <div className="relative shrink-0">
                        {pendingFile.type.startsWith('image/') ? (
                          <div className="w-16 h-16 rounded-lg overflow-hidden border border-border/40">
                            <img 
                              src={URL.createObjectURL(pendingFile)} 
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center border border-border/40">
                            <FileText className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        {uploading && (
                          <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-lg">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {attachmentFileName || 'File attached'}
                      </p>
                      {pendingFile && (
                        <p className="text-xs text-muted-foreground">
                          {(pendingFile.size / 1024).toFixed(1)} KB
                        </p>
                      )}
                      {uploadStatus === 'success' && (
                        <p className="text-xs text-green-500">✓ Uploaded successfully</p>
                      )}
                    </div>
                    
                    {/* Preview & Remove Buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      {attachmentUrl && attachmentType === 'image' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPreviewModalOpen(true)}
                          className="h-8 w-8"
                          title="Preview"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={removeAttachment}
                        className="h-8 w-8"
                        title="Remove"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Main Input Row */}
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.txt,.md"
                />
                
                {/* Plus Button for File Upload */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || loading}
                  className="shrink-0 rounded-full h-10 w-10"
                  title="Add files"
                >
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Plus className="h-5 w-5" />
                  )}
                </Button>

                {/* Tools Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="gap-2 h-10 px-3 rounded-full"
                    >
                      <Wrench className="h-4 w-4" />
                      <span className="text-sm">Tools</span>
                    </Button>
                  </DropdownMenuTrigger>
                   <DropdownMenuContent align="start" className="w-64">
                    {tools.map(tool => {
                      const Icon = tool.icon;
                      return (
                        <DropdownMenuItem 
                          key={tool.id}
                          onClick={() => handleToolSelect(tool.id)}
                          className="gap-3 cursor-pointer py-3"
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{tool.name}</span>
                            <span className="text-xs text-muted-foreground">{tool.description}</span>
                          </div>
                        </DropdownMenuItem>
                      );
                    })}
                    <div className="border-t border-border my-2" />
                    <div className="px-3 py-3 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">🤖 Auto-select models</span>
                        <span className="text-xs text-muted-foreground">AI picks best model for your query</span>
                      </div>
                      <Switch
                        checked={autoSelectModel}
                        onCheckedChange={setAutoSelectModel}
                      />
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Input Field */}
                <div className="flex-1">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Ask AI..."
                    className="min-h-[44px] max-h-[200px] resize-none rounded-full px-4 border-border/40"
                    disabled={loading}
                  />
                </div>

                {/* Send/Stop Button with Urgent Option */}
                {loading ? (
                  <Button
                    onClick={handleStop}
                    size="icon"
                    variant="destructive"
                    className="shrink-0 rounded-full h-10 w-10"
                    title="Stop generation"
                  >
                    <Square className="h-5 w-5" />
                  </Button>
                ) : (
                  <div className="flex gap-1">
                    <Button
                      onClick={() => handleSend()}
                      disabled={!input.trim() && !attachmentUrl}
                      size="icon"
                      className="shrink-0 rounded-full h-10 w-10"
                      title="Send message (Enter)"
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                    
                    <Button
                      onClick={() => handleSend(undefined, true)}
                      disabled={!input.trim() && !attachmentUrl}
                      size="icon"
                      variant="secondary"
                      className="shrink-0 rounded-full h-10 w-10"
                      title="Send as urgent (Ctrl+Shift+Enter)"
                    >
                      <Zap className="h-5 w-5 text-orange-500" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Selected Models Display */}
              {selectedModels.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {aiModels.map(model => {
                    const Icon = model.icon;
                    const isSelected = selectedModels.includes(model.id);
                    if (!isSelected) return null;
                    return (
                      <Badge
                        key={model.id}
                        variant="secondary"
                        className="h-6 px-2 gap-1 text-xs cursor-pointer hover:bg-secondary/80 transition-colors"
                        onClick={() => handleModelToggle(model.id)}
                      >
                        <Icon className={`h-3 w-3 ${model.color}`} />
                        {model.name}
                        <X className="h-3 w-3 ml-1" />
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Drag Overlay */}
      {isDragging && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center p-8 rounded-2xl border-2 border-dashed border-primary">
            {isDraggingPdf ? (
              <>
                <FileSearch className="h-12 w-12 mx-auto mb-4 text-primary" />
                <p className="text-lg font-medium">Drop PDF for Document Analysis</p>
                <p className="text-sm text-muted-foreground mt-1">Extract and analyze text content</p>
              </>
            ) : (
              <>
                <Plus className="h-12 w-12 mx-auto mb-4 text-primary" />
                <p className="text-lg font-medium">Drop your file here</p>
                <p className="text-sm text-muted-foreground mt-1">Images, PDFs, text files supported</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>File Preview</DialogTitle>
          </DialogHeader>
          {attachmentUrl && attachmentType === 'image' && (
            <div className="max-h-[70vh] overflow-auto rounded-lg">
              <img 
                src={attachmentUrl} 
                alt="Preview" 
                className="w-full h-auto rounded-lg"
              />
            </div>
          )}
          {attachmentUrl && attachmentType === 'pdf' && (
            <div className="h-[500px]">
              <iframe 
                src={attachmentUrl} 
                className="w-full h-full rounded-lg border"
                title="PDF Preview"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Model Selection Dialog */}
      <Dialog open={modelSelectionOpen} onOpenChange={setModelSelectionOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Select AI Models</DialogTitle>
            <DialogDescription>
              Choose up to 3 AI models (currently {selectedModels.length}/3 selected)
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-2">
              {aiModels.map(model => {
                const Icon = model.icon;
                const isSelected = selectedModels.includes(model.id);
                return (
                  <Button
                    key={model.id}
                    variant={isSelected ? "secondary" : "outline"}
                    className="w-full justify-start h-auto py-3"
                    onClick={() => handleModelToggle(model.id)}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <Icon className={`h-5 w-5 ${model.color}`} />
                      <div className="flex-1 text-left">
                        <div className="font-medium">{model.name}</div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {model.category}
                        </div>
                      </div>
                      {isSelected && (
                        <Badge variant="default" className="text-xs">
                          Selected
                        </Badge>
                      )}
                    </div>
                  </Button>
                );
              })}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button onClick={() => setModelSelectionOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Analysis Dialog */}
      <Dialog open={documentDialogOpen} onOpenChange={setDocumentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>📄 Analyze Document</DialogTitle>
            <DialogDescription>
              Upload a PDF to extract and analyze its content
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="document-upload">PDF Document</Label>
              <div className="flex items-center gap-2">
                <input
                  id="document-upload"
                  type="file"
                  accept=".pdf"
                  onChange={handleDocumentUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('document-upload')?.click()}
                  className="w-full"
                >
                  <FileSearch className="h-4 w-4 mr-2" />
                  {documentFile ? documentFile.name : 'Choose PDF file'}
                </Button>
              </div>
              {documentFile && (
                <p className="text-xs text-muted-foreground">
                  Ready to analyze: {documentFile.name} ({(documentFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            {analyzingDocument && (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Extracting text from PDF...</span>
                </div>
                <Progress value={50} />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDocumentDialogOpen(false);
                setDocumentFile(null);
              }}
              disabled={analyzingDocument}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAnalyzeDocument}
              disabled={!documentFile || analyzingDocument}
            >
              {analyzingDocument ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <FileSearch className="h-4 w-4 mr-2" />
                  Analyze
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Generation Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>✨ Create Image</DialogTitle>
            <DialogDescription>
              Describe the image you want to generate
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="image-prompt">Prompt</Label>
              <Textarea
                id="image-prompt"
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                placeholder="A beautiful sunset over mountains..."
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="image-style">Style</Label>
              <Select value={imageStyle} onValueChange={setImageStyle}>
                <SelectTrigger id="image-style">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="realistic">Realistic</SelectItem>
                  <SelectItem value="minimalist">Minimalist</SelectItem>
                  <SelectItem value="watercolor">Watercolor</SelectItem>
                  <SelectItem value="oil-painting">Oil Painting</SelectItem>
                  <SelectItem value="sketch">Pencil Sketch</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {generating && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{generationStage}</span>
                  <span>{generationProgress.toFixed(0)}%</span>
                </div>
                <Progress value={generationProgress} />
                {takingLonger && generationProgress >= 90 && (
                  <p className="text-xs text-yellow-500">
                    ⏳ This is taking longer than usual...
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setImageDialogOpen(false)}
              disabled={generating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerateImage}
              disabled={!imagePrompt.trim() || generating}
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Chat;