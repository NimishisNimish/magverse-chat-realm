import { useState } from "react";
import { ExternalLink, ChevronDown, ChevronUp, Globe } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

interface Source {
  url: string;
  title: string;
  snippet?: string;
}

interface MessageSourcesProps {
  sources: Source[];
}

export const MessageSources = ({ sources }: MessageSourcesProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 border-t border-border/50 pt-3">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
      >
        <Globe className="w-4 h-4" />
        <span className="text-sm font-medium">
          {sources.length} {sources.length === 1 ? 'source' : 'sources'}
        </span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </Button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-2 space-y-2 overflow-hidden"
          >
            {sources.map((source, index) => (
              <motion.a
                key={index}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-start gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
              >
                <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {source.title}
                    </p>
                    <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  </div>
                  {source.snippet && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {source.snippet}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground/70 mt-1 truncate">
                    {source.url}
                  </p>
                </div>
              </motion.a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
