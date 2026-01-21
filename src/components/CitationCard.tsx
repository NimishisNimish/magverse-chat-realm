import { memo, useState } from "react";
import { ExternalLink, Globe, Hash, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

interface CitationCardProps {
  index: number;
  url: string;
  title: string;
  snippet?: string;
  delay?: number;
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

export const CitationCard = memo(({ 
  index, 
  url, 
  title, 
  snippet,
  delay = 0 
}: CitationCardProps) => {
  const [imgError, setImgError] = useState(false);
  const domain = getDomain(url);
  const faviconUrl = getFaviconUrl(url);

  return (
    <motion.a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      id={`source-${index}`}
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        delay: delay * 0.05, 
        duration: 0.3,
        ease: [0.25, 0.1, 0.25, 1]
      }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="group relative flex items-start gap-3 p-3.5 rounded-xl bg-gradient-to-br from-muted/40 via-muted/20 to-transparent border border-border/50 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer overflow-hidden"
    >
      {/* Background shimmer on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 -translate-x-full group-hover:translate-x-full" 
        style={{ animation: 'shimmer 1s ease-in-out' }}
      />
      
      {/* Citation Number Badge */}
      <div className="relative flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 shadow-sm">
        <span className="text-xs font-bold text-primary tabular-nums">
          {index + 1}
        </span>
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1.5">
        {/* Header with favicon and domain */}
        <div className="flex items-center gap-2">
          <div className="flex-shrink-0 w-4 h-4 rounded overflow-hidden bg-muted flex items-center justify-center">
            {!imgError && faviconUrl ? (
              <img 
                src={faviconUrl} 
                alt="" 
                className="w-full h-full object-contain"
                onError={() => setImgError(true)}
                loading="lazy"
              />
            ) : (
              <Globe className="w-3 h-3 text-muted-foreground" />
            )}
          </div>
          <span className="text-xs text-muted-foreground truncate font-medium">
            {domain}
          </span>
          <ExternalLink className="w-3 h-3 text-muted-foreground/50 group-hover:text-primary transition-colors flex-shrink-0 ml-auto opacity-0 group-hover:opacity-100" />
        </div>
        
        {/* Title */}
        <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug">
          {title || domain}
        </p>
        
        {/* Snippet */}
        {snippet && (
          <p className="text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed">
            {snippet}
          </p>
        )}
      </div>
    </motion.a>
  );
});

CitationCard.displayName = 'CitationCard';
