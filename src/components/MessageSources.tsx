import { useState, memo } from "react";
import { ChevronDown, ChevronUp, Search, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CitationCard } from "@/components/CitationCard";

interface Source {
  url: string;
  title: string;
  snippet?: string;
}

interface MessageSourcesProps {
  sources: Source[];
}

export const MessageSources = memo(({ sources }: MessageSourcesProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!sources || sources.length === 0) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="mt-4 pt-4 border-t border-border/30"
    >
      {/* Header */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-3 -ml-2 h-8"
      >
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-gradient-to-br from-primary/20 to-primary/5">
            <Search className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-sm font-medium">
            Web Sources
          </span>
          <Badge 
            variant="secondary" 
            className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-0"
          >
            {sources.length}
          </Badge>
        </div>
        
        <motion.div
          animate={{ rotate: isExpanded ? 0 : -90 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4" />
        </motion.div>
      </Button>

      {/* Sources Grid */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {sources.map((source, index) => (
                <CitationCard
                  key={`${source.url}-${index}`}
                  index={index}
                  url={source.url}
                  title={source.title}
                  snippet={source.snippet}
                  delay={index}
                />
              ))}
            </div>
            
            {/* Footer hint */}
            {sources.length > 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: sources.length * 0.05 + 0.3 }}
                className="flex items-center gap-2 mt-3 pt-3 border-t border-border/20"
              >
                <Sparkles className="w-3 h-3 text-primary/60" />
                <span className="text-[11px] text-muted-foreground/70">
                  Click any source to view the original content
                </span>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

MessageSources.displayName = 'MessageSources';
