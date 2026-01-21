import { memo, useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Zap, Brain, Loader2, Clock, CheckCircle2 } from 'lucide-react';
import { AIModelLogo } from './AIModelLogo';
import { Progress } from '@/components/ui/progress';

interface StreamingTypingIndicatorProps {
  modelId: string;
  modelName: string;
  startTime?: number;
  isStreaming?: boolean;
  tokensReceived?: number;
  ttft?: number | null; // Time to first token
}

// Dynamic status messages based on elapsed time
const getStatusMessage = (elapsed: number, isStreaming: boolean, tokensReceived: number): string => {
  if (tokensReceived > 0) {
    return 'Generating response...';
  }
  
  if (elapsed < 1000) return 'Connecting...';
  if (elapsed < 3000) return 'Analyzing your prompt...';
  if (elapsed < 6000) return 'Processing with AI...';
  if (elapsed < 12000) return 'Generating response...';
  if (elapsed < 25000) return 'Complex reasoning in progress...';
  if (elapsed < 45000) return 'Taking a bit longer than usual...';
  return 'Still working on it...';
};

// Estimated progress based on time (capped at 95%)
const getEstimatedProgress = (elapsed: number, tokensReceived: number): number => {
  if (tokensReceived > 0) {
    // If we're receiving tokens, show higher progress
    return Math.min(50 + Math.log10(tokensReceived + 1) * 15, 95);
  }
  
  // Time-based progress estimation (logarithmic curve)
  const seconds = elapsed / 1000;
  return Math.min(Math.log10(seconds + 1) * 35 + 5, 45);
};

export const StreamingTypingIndicator = memo(({
  modelId,
  modelName,
  startTime,
  isStreaming = true,
  tokensReceived = 0,
  ttft = null
}: StreamingTypingIndicatorProps) => {
  const [elapsed, setElapsed] = useState(0);
  const [animatedTokens, setAnimatedTokens] = useState(0);

  // Update elapsed time
  useEffect(() => {
    if (!startTime || !isStreaming) return;
    
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 100);
    
    return () => clearInterval(interval);
  }, [startTime, isStreaming]);

  // Animate token count
  useEffect(() => {
    if (tokensReceived > animatedTokens) {
      const step = Math.ceil((tokensReceived - animatedTokens) / 5);
      const timer = setTimeout(() => {
        setAnimatedTokens(prev => Math.min(prev + step, tokensReceived));
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [tokensReceived, animatedTokens]);

  const statusMessage = useMemo(
    () => getStatusMessage(elapsed, isStreaming, tokensReceived),
    [elapsed, isStreaming, tokensReceived]
  );

  const progress = useMemo(
    () => getEstimatedProgress(elapsed, tokensReceived),
    [elapsed, tokensReceived]
  );

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-card to-muted/30 shadow-lg backdrop-blur-xl"
    >
      {/* Animated background gradient */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5"
        animate={{
          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'linear',
        }}
        style={{ backgroundSize: '200% 100%' }}
      />
      
      {/* Shimmer effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
        animate={{ x: ['-200%', '200%'] }}
        transition={{ repeat: Infinity, duration: 2.5, ease: 'linear' }}
      />

      <div className="relative p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-3">
          {/* Animated AI Logo */}
          <motion.div
            className="relative"
            animate={{ 
              scale: [1, 1.08, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <AIModelLogo modelId={modelId} size="lg" />
            
            {/* Pulse ring */}
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-primary/40"
              animate={{
                scale: [1, 1.4, 1.4],
                opacity: [0.6, 0, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeOut',
              }}
            />
          </motion.div>
          
          {/* Model name and status */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-foreground">
                {modelName}
              </span>
              
              {/* Typing dots */}
              <div className="flex items-center gap-0.5">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-primary"
                    animate={{
                      y: [0, -5, 0],
                      opacity: [0.4, 1, 0.4],
                    }}
                    transition={{
                      duration: 0.7,
                      repeat: Infinity,
                      delay: i * 0.12,
                      ease: 'easeInOut',
                    }}
                  />
                ))}
              </div>
            </div>
            
            {/* Status message with animation */}
            <AnimatePresence mode="wait">
              <motion.p
                key={statusMessage}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="text-xs text-muted-foreground"
              >
                {statusMessage}
              </motion.p>
            </AnimatePresence>
          </div>
          
          {/* Stats */}
          <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground tabular-nums">
            {elapsed > 0 && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{formatTime(elapsed)}</span>
              </div>
            )}
            {ttft !== null && (
              <div className="flex items-center gap-1 text-green-500">
                <Zap className="w-3 h-3" />
                <span>TTFT: {ttft}ms</span>
              </div>
            )}
            {animatedTokens > 0 && (
              <div className="flex items-center gap-1 text-primary">
                <Sparkles className="w-3 h-3" />
                <span>{animatedTokens} tokens</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="relative h-1.5 bg-muted/50 rounded-full overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-primary/80 to-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
          
          {/* Animated shimmer on progress */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
          />
        </div>
      </div>
    </motion.div>
  );
});

StreamingTypingIndicator.displayName = 'StreamingTypingIndicator';
