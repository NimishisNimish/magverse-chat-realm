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
  Upload
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const aiModels = [
  { id: "chatgpt", name: "ChatGPT", icon: Bot, color: "text-primary" },
  { id: "gemini", name: "Gemini", icon: Brain, color: "text-secondary" },
  { id: "claude", name: "Claude", icon: Sparkles, color: "text-accent" },
  { id: "llama", name: "Llama", icon: Zap, color: "text-primary" },
  { id: "mistral", name: "Mistral", icon: Cpu, color: "text-secondary" },
  { id: "grok", name: "Grok", icon: Star, color: "text-accent" },
];

interface Message {
  id: string;
  model: string;
  content: string;
  timestamp: Date;
  role: 'user' | 'assistant';
}

const Chat = () => {
  const [selectedModels, setSelectedModels] = useState<string[]>(["chatgpt"]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user, profile, refreshProfile } = useAuth();

  const toggleModel = (modelId: string) => {
    setSelectedModels(prev => 
      prev.includes(modelId) 
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(filePath);

      setAttachmentUrl(publicUrl);
      toast({
        title: "File uploaded",
        description: "Your file has been attached to the message.",
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !user || loading) return;
    
    if (!profile?.is_pro && (!profile?.credits_remaining || profile.credits_remaining <= 0)) {
      toast({
        title: "Daily limit reached",
        description: "Upgrade to Pro for unlimited access.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      model: 'user',
      content: input,
      timestamp: new Date(),
      role: 'user',
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput("");

    try {
      const { data, error } = await supabase.functions.invoke('chat-with-ai', {
        body: {
          messages: [
            ...messages.map(m => ({
              role: m.role,
              content: m.content,
            })),
            { role: 'user', content: input }
          ],
          selectedModels,
          chatId: currentChatId,
        },
      });

      if (error) throw error;

      if (data.chatId && !currentChatId) {
        setCurrentChatId(data.chatId);
      }

      const aiMessages: Message[] = data.responses.map((response: any) => ({
        id: `${Date.now()}-${response.model}`,
        model: aiModels.find(m => m.id === response.model)?.name || response.model,
        content: response.content,
        timestamp: new Date(),
        role: 'assistant' as const,
      }));

      setMessages(prev => [...prev, ...aiMessages]);
      await refreshProfile();
    } catch (error: any) {
      console.error('Chat error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to get AI response",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setAttachmentUrl(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <div className="flex-1 flex pt-16">
        {/* Sidebar */}
        <aside className="w-80 glass-card border-r border-glass-border p-6 space-y-6 hidden lg:block">
          <Button 
            variant="hero" 
            className="w-full justify-start"
            onClick={() => {
              setMessages([]);
              setCurrentChatId(null);
            }}
          >
            <MessageSquarePlus className="w-5 h-5" />
            New Chat
          </Button>
          
          <div className="space-y-4">
            <div className="space-y-2">
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
                      {isSelected && <Circle className="w-2 h-2 ml-auto fill-primary text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="glass-card p-4 rounded-lg space-y-2 border-accent/30">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Credits</span>
                <span className={`text-lg font-bold ${profile?.is_pro ? 'text-accent' : 'text-primary'}`}>
                  {profile?.is_pro ? '∞' : profile?.credits_remaining || 0}
                </span>
              </div>
              {!profile?.is_pro && (
                <p className="text-xs text-muted-foreground">
                  {(profile?.credits_remaining || 0) > 0 
                    ? `${profile?.credits_remaining} chats remaining today` 
                    : 'No credits left today'}
                </p>
              )}
            </div>
          </div>
        </aside>
        
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
                    </div>
                    <p className="text-foreground leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  </div>
                ))}
                {loading && (
                  <div className="glass-card p-6 rounded-xl animate-pulse">
                    <p className="text-muted-foreground">AI is thinking...</p>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
          
          {/* Input Area */}
          <div className="border-t border-glass-border glass-card p-6">
            <div className="max-w-4xl mx-auto">
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
                  disabled={uploading}
                >
                  {uploading ? <Upload className="w-5 h-5 animate-pulse" /> : <Paperclip className="w-5 h-5" />}
                </Button>
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="Type your message..."
                  className="glass-card border-accent/30 focus:border-accent"
                  disabled={loading || (!profile?.is_pro && (!profile?.credits_remaining || profile.credits_remaining <= 0))}
                />
                <Button 
                  variant="hero" 
                  size="icon" 
                  className="shrink-0"
                  onClick={handleSend}
                  disabled={!input.trim() || loading || (!profile?.is_pro && (!profile?.credits_remaining || profile.credits_remaining <= 0))}
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
              {attachmentUrl && (
                <p className="text-xs text-muted-foreground mt-2">
                  File attached: {attachmentUrl.split('/').pop()}
                </p>
              )}
              {!profile?.is_pro && (!profile?.credits_remaining || profile.credits_remaining <= 0) && (
                <p className="text-sm text-destructive mt-2 text-center">
                  Daily limit reached. Upgrade to Pro for unlimited access.
                </p>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Chat;
