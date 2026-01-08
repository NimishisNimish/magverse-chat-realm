import { useState } from "react";
import { ExternalLink, ChevronDown, ChevronUp, Globe, Search, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Source {
  url: string;
  title: string;
  snippet?: string;
}

interface MessageSourcesProps {
  sources: Source[];
}

// Extract domain from URL for display
const getDomain = (url: string): string => {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return domain;
  } catch {
    return url;
  }
};

// Get favicon URL for a domain
const getFaviconUrl = (url: string): string => {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return '';
  }
};

export const MessageSources = ({ sources }: MessageSourcesProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-4 border-t border-border/50 pt-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-2"
      >
        <Search className="w-4 h-4 text-purple-400" />
        <span className="text-sm font-medium">
          Web Sources ({sources.length})
        </span>
        <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-400">
          Verified
        </Badge>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 ml-1" />
        ) : (
          <ChevronDown className="w-4 h-4 ml-1" />
        )}
      </Button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-hidden"
          >
            {sources.map((source, index) => (
              <motion.a
                key={index}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-br from-muted/30 to-muted/10 border border-border/50 hover:border-purple-500/50 hover:bg-muted/50 transition-all duration-200 group"
              >
                {/* Source Number Badge */}
                <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 text-xs font-bold">
                  {index + 1}
                </div>
                
                <div className="flex-1 min-w-0">
                  {/* Title Row with Favicon */}
                  <div className="flex items-center gap-2 mb-1">
                    <img 
                      src={getFaviconUrl(source.url)} 
                      alt="" 
                      className="w-4 h-4 rounded-sm"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <p className="text-sm font-medium text-foreground truncate group-hover:text-purple-400 transition-colors">
                      {source.title || getDomain(source.url)}
                    </p>
                    <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-purple-400 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100" />
                  </div>
                  
                  {/* Snippet */}
                  {source.snippet && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                      {source.snippet}
                    </p>
                  )}
                  
                  {/* Domain */}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground/70">
                    <Globe className="w-3 h-3" />
                    <span className="truncate">{getDomain(source.url)}</span>
                  </div>
                </div>
              </motion.a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
