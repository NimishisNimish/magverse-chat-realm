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
  Ban
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
  { id: "gemini-flash", name: "Gemini Flash", icon: Zap, color: "text-primary", model: "google/gemini-2.5-flash" },
  { id: "gemini-pro", name: "Gemini Pro", icon: Brain, color: "text-secondary", model: "google/gemini-2.5-pro" },
  { id: "gemini-lite", name: "Gemini Lite", icon: Cpu, color: "text-muted-foreground", model: "google/gemini-2.5-flash-lite" },
  { id: "gpt-5", name: "GPT-5", icon: Bot, color: "text-accent", model: "openai/gpt-5" },
  { id: "gpt-5-mini", name: "GPT-5 Mini", icon: Sparkles, color: "text-purple-400", model: "openai/gpt-5-mini" },
  { id: "gpt-5-nano", name: "GPT-5 Nano", icon: Star, color: "text-blue-400", model: "openai/gpt-5-nano" },
  { id: "perplexity", name: "Perplexity", icon: Globe, color: "text-green-400", model: "perplexity/sonar" },
  { id: "claude", name: "Claude", icon: Rocket, color: "text-orange-400", model: "anthropic/claude" },
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
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState("");
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
      // Send full conversation history for better context awareness
      // Only limit if conversation becomes extremely long (>50 messages)
      const MAX_CONTEXT_MESSAGES = 50;
      const conversationHistory = messages.length > MAX_CONTEXT_MESSAGES 
        ? messages.slice(-MAX_CONTEXT_MESSAGES)
        : messages;
      
      console.log(`Sending ${conversationHistory.length} messages for full context (${messages.length} total in history)`);

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

      // Process each model with streaming
      const modelPromises = selectedModels.map(async (modelId) => {
        const modelConfig = aiModels.find(m => m.id === modelId);
        if (!modelConfig) return;

        // Create placeholder message for this model
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
          
          const response = await fetchWithRetry(CHAT_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxZGdweGV0eXNxY2Rjandvcm1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTcwMDMsImV4cCI6MjA3NzMzMzAwM30.AspAeB_iUnc-XJmDNhdV5_HYTMLg32LM1bVAdwM6A5E`,
            },
            body: JSON.stringify({
              model: modelConfig.model,
              messages: [...conversationHistory.map(m => ({ role: m.role, content: m.content })), { role: 'user', content: input }],
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
          let images: any[] = [];

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
                const parsedImages = parsed.choices?.[0]?.message?.images;
                
                if (content) {
                  fullContent += content;
                  
                  // Update the message in real-time
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessageId 
                      ? { ...msg, content: fullContent }
                      : msg
                  ));
                }

                if (parsedImages) {
                  images = parsedImages;
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessageId 
                      ? { ...msg, images: parsedImages.map((img: any) => ({ image_url: { url: img.image_url?.url || img.url } })) }
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
        } catch (err: any) {
          console.error(`Error with ${modelConfig.name}:`, err);
          
          // Update message to show error
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId 
              ? { ...msg, content: `Error: ${err.message}`, error: true }
              : msg
          ));
          
          // Show specific error toast for rate limiting
          if (err.message.includes('Rate limit')) {
            toast({
              title: `${modelConfig.name} rate limited`,
              description: "All retry attempts exhausted. Please wait a moment before trying again.",
              variant: "destructive",
            });
          }
        }
      });

      await Promise.all(modelPromises);
      
      // Clear processing state
      setProcessingFile(false);
      
      const successCount = selectedModels.length;
      toast({
        title: `${successCount} AI${successCount > 1 ? 's' : ''} responded`,
        description: `Received streaming responses successfully.`,
      });

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
                                >
                                  <Download className="w-4 h-4 mr-1" />
                                  PNG
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="secondary"
                                  onClick={() => downloadImage('jpeg')}
                                >
                                  <Download className="w-4 h-4 mr-1" />
                                  JPEG
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="secondary"
                                  onClick={() => downloadImage('webp')}
                                >
                                  <Download className="w-4 h-4 mr-1" />
                                  WEBP
                                </Button>
                              </div>
                            </div>
                          );
                        })}
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
