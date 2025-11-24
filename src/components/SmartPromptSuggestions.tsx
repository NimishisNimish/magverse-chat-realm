import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Lightbulb, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Message {
  role: string;
  content: string;
}

interface SmartPromptSuggestionsProps {
  messages: Message[];
  onSuggestionClick: (suggestion: string) => void;
  enabled?: boolean;
}

export const SmartPromptSuggestions = ({
  messages,
  onSuggestionClick,
  enabled = true,
}: SmartPromptSuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [cachedKey, setCachedKey] = useState<string>('');

  useEffect(() => {
    if (!enabled || messages.length < 2) return;

    // Only generate suggestions after assistant responses
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== 'assistant') return;

    // Create cache key from last 3 messages
    const recentMessages = messages.slice(-3);
    const cacheKey = recentMessages.map(m => m.content.slice(0, 50)).join('|');
    
    // Skip if already cached
    if (cacheKey === cachedKey) return;

    generateSuggestions(recentMessages, cacheKey);
  }, [messages, enabled]);

  const generateSuggestions = async (recentMessages: Message[], cacheKey: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-prompt-suggestions', {
        body: { messages: recentMessages }
      });

      if (error) throw error;

      if (data?.suggestions && Array.isArray(data.suggestions)) {
        setSuggestions(data.suggestions);
        setCachedKey(cacheKey);
      }
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
      // Fail silently - suggestions are optional UX enhancement
    } finally {
      setLoading(false);
    }
  };

  if (!enabled || (suggestions.length === 0 && !loading)) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="flex flex-wrap items-center gap-2 mb-4 p-3 glass-card rounded-lg"
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground mr-2">
          <Lightbulb className="w-4 h-4 text-accent" />
          <span className="font-medium">Suggestions:</span>
        </div>
        
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Generating ideas...</span>
          </div>
        ) : (
          suggestions.map((suggestion, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => onSuggestionClick(suggestion)}
              className="text-xs hover:bg-accent/20 hover:text-accent hover:border-accent transition-all"
            >
              {suggestion}
            </Button>
          ))
        )}
      </motion.div>
    </AnimatePresence>
  );
};