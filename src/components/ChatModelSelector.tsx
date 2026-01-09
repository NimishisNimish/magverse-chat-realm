import { useState } from "react";
import { Check, Zap, Brain, Globe, Search, Sparkles, Bot, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AIModelLogo } from "@/components/AIModelLogo";
import { MODEL_CONFIG } from "@/config/modelConfig";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";

interface ModelCategory {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
  models: string[];
}

const MODEL_CATEGORIES: ModelCategory[] = [
  {
    id: "fast",
    name: "Fast",
    icon: Zap,
    description: "Quick responses with lightweight models",
    models: ["lovable-gemini-flash", "lovable-gpt5-mini", "mistral"],
  },
  {
    id: "reasoning",
    name: "Reasoning",
    icon: Brain,
    description: "Advanced reasoning & analysis",
    models: ["lovable-gpt5", "lovable-gemini-pro", "chatgpt", "claude"],
  },
  {
    id: "web-search",
    name: "Web Search",
    icon: Globe,
    description: "Search the web with real-time data",
    models: ["perplexity", "grok"],
  },
  {
    id: "deep-research",
    name: "Deep Research",
    icon: Search,
    description: "Multi-query comprehensive research",
    models: ["perplexity-reasoning", "perplexity-pro"],
  },
  {
    id: "uncensored",
    name: "Uncensored",
    icon: Sparkles,
    description: "Unfiltered AI responses",
    models: ["uncensored-chat"],
  },
];

interface ChatModelSelectorProps {
  selectedModels: string[];
  onModelSelect: (modelId: string) => void;
  disabled?: boolean;
}

export const ChatModelSelector = ({
  selectedModels,
  onModelSelect,
  disabled = false,
}: ChatModelSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const getSelectedModelInfo = () => {
    if (selectedModels.length === 0) {
      return { name: "Select Model", icon: Bot };
    }
    const modelConfig = MODEL_CONFIG.find((m) => m.id === selectedModels[0]);
    return {
      name: modelConfig?.name || selectedModels[0],
      icon: modelConfig?.category === "fast" ? Zap : Brain,
    };
  };

  const selectedInfo = getSelectedModelInfo();

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="gap-2 h-9 px-3 rounded-full border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all"
        >
          {selectedModels.length > 0 && (
            <AIModelLogo modelId={selectedModels[0]} size="sm" />
          )}
          <span className="text-sm font-medium max-w-[120px] truncate">
            {selectedInfo.name}
          </span>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="start" 
        className="w-80 p-0 overflow-hidden"
        sideOffset={8}
      >
        <ScrollArea className="max-h-[400px]">
          <div className="p-2">
            {MODEL_CATEGORIES.map((category) => {
              const CategoryIcon = category.icon;
              const isActive = activeCategory === category.id;
              const hasSelectedModel = category.models.some(m => selectedModels.includes(m));
              
              return (
                <div key={category.id} className="mb-1">
                  {/* Category Header */}
                  <button
                    onClick={() => setActiveCategory(isActive ? null : category.id)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-all ${
                      hasSelectedModel
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      hasSelectedModel ? "bg-primary/20" : "bg-muted"
                    }`}>
                      <CategoryIcon className={`w-4 h-4 ${hasSelectedModel ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{category.name}</span>
                        {hasSelectedModel && (
                          <Badge variant="secondary" className="h-4 text-[10px] px-1.5">
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{category.description}</p>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isActive ? "rotate-180" : ""}`} />
                  </button>
                  
                  {/* Models List */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="pl-4 pr-2 py-2 space-y-1">
                          {category.models.map((modelId) => {
                            const modelConfig = MODEL_CONFIG.find((m) => m.id === modelId);
                            const isSelected = selectedModels.includes(modelId);
                            const credits = modelConfig?.creditsPerMessage || 1;
                            
                            return (
                              <button
                                key={modelId}
                                onClick={() => {
                                  onModelSelect(modelId);
                                  setOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-all ${
                                  isSelected
                                    ? "bg-primary text-primary-foreground"
                                    : "hover:bg-muted/80"
                                }`}
                              >
                                <AIModelLogo modelId={modelId} size="sm" />
                                <div className="flex-1 text-left">
                                  <span className="text-sm font-medium">
                                    {modelConfig?.name || modelId}
                                  </span>
                                </div>
                                <Badge 
                                  variant={isSelected ? "secondary" : "outline"} 
                                  className="text-[10px] h-5 px-1.5"
                                >
                                  {credits} cr
                                </Badge>
                                {isSelected && (
                                  <Check className="w-4 h-4" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ChatModelSelector;