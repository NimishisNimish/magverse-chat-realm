import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Zap, ArrowRight } from 'lucide-react';
import { AIModelLogo } from './AIModelLogo';
import { motion } from 'framer-motion';

// Fallback model mapping - when a model fails, suggest an alternative
export const FALLBACK_MODELS: Record<string, { 
  fallback: string; 
  fallbackName: string;
  reason: string;
}> = {
  'chatgpt': { 
    fallback: 'lovable-gemini-flash', 
    fallbackName: 'Gemini Flash',
    reason: 'Faster and more reliable for most queries'
  },
  'claude': { 
    fallback: 'lovable-gemini-pro', 
    fallbackName: 'Gemini Pro',
    reason: 'Similar reasoning capabilities with better availability'
  },
  'perplexity-pro': { 
    fallback: 'perplexity', 
    fallbackName: 'Perplexity Sonar',
    reason: 'Standard version with faster response times'
  },
  'perplexity-reasoning': { 
    fallback: 'perplexity-pro', 
    fallbackName: 'Perplexity Pro',
    reason: 'Pro version processes faster than deep research'
  },
  'grok': { 
    fallback: 'lovable-gemini-flash', 
    fallbackName: 'Gemini Flash',
    reason: 'Fast alternative with similar capabilities'
  },
  'uncensored-chat': { 
    fallback: 'lovable-gpt5', 
    fallbackName: 'GPT-5',
    reason: 'Powerful mainstream alternative'
  },
  'lovable-gpt5': { 
    fallback: 'lovable-gpt5-mini', 
    fallbackName: 'GPT-5 Mini',
    reason: 'Faster variant with good quality'
  },
  'lovable-gemini-pro': { 
    fallback: 'lovable-gemini-flash', 
    fallbackName: 'Gemini Flash',
    reason: 'Faster variant for simpler queries'
  },
};

interface ModelFallbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  failedModel: string;
  failedModelName: string;
  errorMessage: string;
  onRetry: () => void;
  onUseFallback: (fallbackModelId: string) => void;
}

export const ModelFallbackDialog = ({
  open,
  onOpenChange,
  failedModel,
  failedModelName,
  errorMessage,
  onRetry,
  onUseFallback,
}: ModelFallbackDialogProps) => {
  const [loading, setLoading] = useState(false);
  const fallbackInfo = FALLBACK_MODELS[failedModel];

  const handleRetry = () => {
    setLoading(true);
    onRetry();
    onOpenChange(false);
    setLoading(false);
  };

  const handleFallback = () => {
    if (fallbackInfo) {
      setLoading(true);
      onUseFallback(fallbackInfo.fallback);
      onOpenChange(false);
      setLoading(false);
    }
  };

  const getErrorType = (error: string): 'timeout' | 'rate_limit' | 'unavailable' | 'unknown' => {
    if (error.includes('timeout') || error.includes('timed out')) return 'timeout';
    if (error.includes('rate limit') || error.includes('429')) return 'rate_limit';
    if (error.includes('unavailable') || error.includes('503')) return 'unavailable';
    return 'unknown';
  };

  const errorType = getErrorType(errorMessage);
  
  const errorTypeMessages = {
    timeout: 'The model is taking too long to respond.',
    rate_limit: 'Too many requests. Please wait a moment.',
    unavailable: 'The service is temporarily unavailable.',
    unknown: 'Something went wrong with the request.',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Model Unavailable
          </DialogTitle>
          <DialogDescription>
            {errorTypeMessages[errorType]}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Failed model info */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <AIModelLogo modelId={failedModel} size="md" />
            <div>
              <p className="font-medium text-foreground">{failedModelName}</p>
              <p className="text-xs text-muted-foreground truncate max-w-[250px]">
                {errorMessage}
              </p>
            </div>
          </div>

          {/* Fallback suggestion */}
          {fallbackInfo && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20"
            >
              <AIModelLogo modelId={fallbackInfo.fallback} size="md" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">{fallbackInfo.fallbackName}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                    Recommended
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {fallbackInfo.reason}
                </p>
              </div>
            </motion.div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleRetry}
            disabled={loading}
            className="flex-1"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry {failedModelName}
          </Button>
          
          {fallbackInfo && (
            <Button
              onClick={handleFallback}
              disabled={loading}
              className="flex-1 bg-primary"
            >
              <Zap className="w-4 h-4 mr-2" />
              Use {fallbackInfo.fallbackName}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};