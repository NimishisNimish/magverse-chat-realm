import { useState, memo } from "react";
import { Globe, ChevronDown, ChevronUp, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { CitationCard } from "@/components/CitationCard";

interface Source {
  url: string;
  title?: string;
  snippet?: string;
  domain?: string;
}

interface ChatSourcesProps {
  sources: Source[];
  modelId?: string;
}

export const ChatSources = memo(({ sources, modelId }: ChatSourcesProps) => {
  const [expanded, setExpanded] = useState(true);
  
  // Only show sources for Perplexity models or when sources exist
  const isPerplexityModel = modelId?.includes('perplexity');
  
  if (!sources || sources.length === 0 || !isPerplexityModel) {
    return null;
  }

  const displayedSources = expanded ? sources : sources.slice(0, 3);
  const hasMore = sources.length > 3;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="mt-4 pt-4 border-t border-border/30"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground -ml-2 h-8"
        >
          <div className="p-1 rounded-md bg-gradient-to-br from-primary/20 to-primary/5">
            <Search className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-sm font-medium">Web Sources</span>
          <Badge 
            variant="secondary" 
            className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-0"
          >
            {sources.length}
          </Badge>
          <motion.div
            animate={{ rotate: expanded ? 0 : -90 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </Button>
        
        {hasMore && !expanded && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(true)}
            className="h-7 text-xs gap-1 text-primary hover:text-primary"
          >
            Show all
          </Button>
        )}
      </div>

      {/* Sources Grid */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div className="grid gap-2.5">
              {displayedSources.map((source, index) => (
                <CitationCard
                  key={`${source.url}-${index}`}
                  index={index}
                  url={source.url}
                  title={source.title || ''}
                  snippet={source.snippet}
                  delay={index}
                />
              ))}
            </div>
            
            {/* Footer */}
            {sources.length > 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: displayedSources.length * 0.05 + 0.3 }}
                className="flex items-center gap-2 mt-3 pt-3 border-t border-border/20"
              >
                <Sparkles className="w-3 h-3 text-primary/60" />
                <span className="text-[11px] text-muted-foreground/70">
                  Powered by Perplexity AI • Click to view sources
                </span>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

ChatSources.displayName = 'ChatSources';

export default ChatSources;