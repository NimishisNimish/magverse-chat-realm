import { useState } from "react";
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
  Circle
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useToast } from "@/hooks/use-toast";

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
}

const Chat = () => {
  const [selectedModels, setSelectedModels] = useState<string[]>(["chatgpt"]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [credits, setCredits] = useState(10);
  const [isPro, setIsPro] = useState(false);
  const { toast } = useToast();

  const toggleModel = (modelId: string) => {
    setSelectedModels(prev => 
      prev.includes(modelId) 
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    );
  };

  const handleSend = () => {
    if (!input.trim()) return;
    
    if (!isPro && credits <= 0) {
      toast({
        title: "Daily limit reached",
        description: "Upgrade to Pro for unlimited access.",
        variant: "destructive",
      });
      return;
    }

    // Simulate AI responses
    selectedModels.forEach(modelId => {
      const model = aiModels.find(m => m.id === modelId);
      if (model) {
        const newMessage: Message = {
          id: `${Date.now()}-${modelId}`,
          model: model.name,
          content: `This is a simulated response from ${model.name}. In production, this would use the OpenRouter API to generate actual AI responses based on your message: "${input}"`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, newMessage]);
      }
    });

    if (!isPro) {
      setCredits(prev => Math.max(0, prev - 1));
    }
    
    setInput("");
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
            onClick={() => setMessages([])}
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
                <span className={`text-lg font-bold ${isPro ? 'text-accent' : 'text-primary'}`}>
                  {isPro ? '∞' : credits}
                </span>
              </div>
              {!isPro && (
                <p className="text-xs text-muted-foreground">
                  {credits > 0 ? `${credits} chats remaining today` : 'No credits left today'}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                History
              </h3>
              <div className="text-sm text-muted-foreground">
                No previous chats
              </div>
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
                  <div key={message.id} className="glass-card-hover p-6 rounded-xl space-y-3 animate-fade-in">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-accent" />
                      </div>
                      <span className="font-semibold text-sm">{message.model}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-foreground leading-relaxed">{message.content}</p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          
          {/* Input Area */}
          <div className="border-t border-glass-border glass-card p-6">
            <div className="max-w-4xl mx-auto">
              <div className="flex gap-3">
                <Button variant="ghost" size="icon" className="shrink-0">
                  <Paperclip className="w-5 h-5" />
                </Button>
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Type your message..."
                  className="glass-card border-accent/30 focus:border-accent"
                  disabled={!isPro && credits <= 0}
                />
                <Button 
                  variant="hero" 
                  size="icon" 
                  className="shrink-0"
                  onClick={handleSend}
                  disabled={!input.trim() || (!isPro && credits <= 0)}
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
              {!isPro && credits <= 0 && (
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
