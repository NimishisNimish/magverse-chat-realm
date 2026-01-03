import { useState } from "react";
import { Globe, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

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

const extractDomain = (url: string): string => {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return domain;
  } catch {
    return url;
  }
};

const getFaviconUrl = (url: string): string => {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return '';
  }
};

export const ChatSources = ({ sources, modelId }: ChatSourcesProps) => {
  const [expanded, setExpanded] = useState(false);
  
  // Only show sources for Perplexity models
  const isPerplexityModel = modelId?.includes('perplexity');
  
  if (!sources || sources.length === 0 || !isPerplexityModel) {
    return null;
  }

  const displayedSources = expanded ? sources : sources.slice(0, 3);
  const hasMore = sources.length > 3;

  return (
    <div className="mt-4 pt-4 border-t border-border/30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Globe className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-medium">{sources.length} sources</span>
        </div>
        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="h-7 text-xs gap-1"
          >
            {expanded ? (
              <>
                Show less
                <ChevronUp className="w-3 h-3" />
              </>
            ) : (
              <>
                Show all
                <ChevronDown className="w-3 h-3" />
              </>
            )}
          </Button>
        )}
      </div>

      <AnimatePresence>
        <div className="grid gap-2">
          {displayedSources.map((source, index) => {
            const domain = source.domain || extractDomain(source.url);
            const favicon = getFaviconUrl(source.url);
            
            return (
              <motion.a
                key={index}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 border border-border/30 hover:border-primary/30 transition-all"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-background border border-border/50 shrink-0">
                  {favicon ? (
                    <img 
                      src={favicon} 
                      alt="" 
                      className="w-4 h-4"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <Globe className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                      {index + 1}
                    </Badge>
                    <span className="text-xs text-muted-foreground truncate">
                      {domain}
                    </span>
                  </div>
                  <p className="text-sm font-medium line-clamp-1 group-hover:text-primary transition-colors">
                    {source.title || domain}
                  </p>
                  {source.snippet && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {source.snippet}
                    </p>
                  )}
                </div>
                
                <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </motion.a>
            );
          })}
        </div>
      </AnimatePresence>
    </div>
  );
};

export default ChatSources;