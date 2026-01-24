import { AIModelLogo } from './AIModelLogo';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, memo, useMemo } from 'react';
import { Sparkles, Zap } from 'lucide-react';

interface AITypingIndicatorProps {
  modelId: string;
  modelName: string;
  startTime?: number;
  showElapsed?: boolean;
  tokensReceived?: number;
  ttft?: number | null;
}

// Simplified status: only "Connecting" until TTFT, then "Generating"
const getStatusText = (tokensReceived: number, ttft: number | null): string => {
  if (tokensReceived > 0) return 'Generating...';
  if (ttft !== null) return 'Streaming...';
  return 'Connecting...';
};

export const AITypingIndicator = memo(({ 
  modelId, 
  modelName, 
  startTime,
  showElapsed = true,
  tokensReceived = 0,
  ttft = null
}: AITypingIndicatorProps) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startTime) return;
    
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 100);
    
    return () => clearInterval(interval);
  }, [startTime]);

  const statusText = useMemo(() => 
    getStatusText(tokensReceived, ttft), 
    [tokensReceived, ttft]
  );

  const formatElapsed = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Token-synchronized progress:
  // - While waiting (no tokens): time-based up to 15%
  // - Once streaming: token-based up to 95%
  const progress = useMemo(() => {
    if (tokensReceived > 0) {
      // Token-based progress: estimate ~400 tokens for full response
      return Math.min(15 + (tokensReceived / 400) * 80, 95);
    }
    // Time-based progress for waiting phase (max 15%)
    const seconds = elapsed / 1000;
    return Math.min(Math.log10(seconds + 1) * 15 + 5, 15);
  }, [elapsed, tokensReceived]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-card to-muted/20 shadow-lg"
    >
      {/* Animated background */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-primary/3 via-primary/8 to-primary/3"
        animate={{
          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        style={{ backgroundSize: '200% 100%' }}
      />
      
      {/* Shimmer */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
        animate={{ x: ['-200%', '200%'] }}
        transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
      />

      <div className="relative p-4">
        <div className="flex items-center gap-3">
          {/* Animated AI Model Logo */}
          <motion.div
            className="relative flex-shrink-0"
            animate={{
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <AIModelLogo modelId={modelId} size="lg" />
            
            {/* Pulse ring */}
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-primary/30"
              animate={{
                scale: [1, 1.5, 1.5],
                opacity: [0.5, 0, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeOut',
              }}
            />
          </motion.div>
          
          {/* Status Content */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                {modelName}
              </span>
              
              {/* Typing dots */}
              <div className="flex gap-0.5">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-primary"
                    animate={{
                      y: [0, -5, 0],
                      opacity: [0.4, 1, 0.4]
                    }}
                    transition={{
                      duration: 0.7,
                      repeat: Infinity,
                      delay: i * 0.12,
                      ease: "easeInOut"
                    }}
                  />
                ))}
              </div>
            </div>
            
            {/* Simplified status text with icon */}
            <div className="flex items-center gap-2">
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <Sparkles className="w-3 h-3 animate-pulse text-primary" />
                <span>{statusText}</span>
              </motion.div>
              
              {showElapsed && startTime && elapsed > 0 && (
                <span className="text-xs text-muted-foreground/60 tabular-nums">
                  • {formatElapsed(elapsed)}
                </span>
              )}
            </div>
            
            {/* Progress bar */}
            <div className="relative h-1.5 bg-muted/40 rounded-full overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-primary/80 to-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
              
              {/* Shimmer on progress */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              />
            </div>
          </div>
          
          {/* Stats column - TTFT prominent, token count visible */}
          <div className="flex flex-col items-end gap-1 text-xs tabular-nums">
            {ttft !== null && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium"
              >
                <Zap className="w-3 h-3" />
                <span>TTFT: {ttft}ms</span>
              </motion.div>
            )}
            {tokensReceived > 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-1 text-primary"
              >
                <Sparkles className="w-3 h-3" />
                <span>{tokensReceived} words</span>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

AITypingIndicator.displayName = 'AITypingIndicator';
