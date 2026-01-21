import { AIModelLogo } from './AIModelLogo';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, memo, useMemo } from 'react';
import { Sparkles, Clock, Zap, Brain, Loader2 } from 'lucide-react';

interface AITypingIndicatorProps {
  modelId: string;
  modelName: string;
  startTime?: number;
  showElapsed?: boolean;
  tokensReceived?: number;
  ttft?: number | null;
}

// Progressive status stages with icons
const STATUS_STAGES = [
  { elapsed: 0, text: "Connecting to AI...", icon: Loader2 },
  { elapsed: 1500, text: "Analyzing your prompt...", icon: Brain },
  { elapsed: 4000, text: "Generating response...", icon: Sparkles },
  { elapsed: 10000, text: "Processing context...", icon: Brain },
  { elapsed: 20000, text: "Complex reasoning...", icon: Brain },
  { elapsed: 35000, text: "Taking a bit longer...", icon: Clock },
  { elapsed: 60000, text: "Still working on it...", icon: Loader2 },
];

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

  const currentStage = useMemo(() => {
    return [...STATUS_STAGES]
      .reverse()
      .find(s => elapsed >= s.elapsed) || STATUS_STAGES[0];
  }, [elapsed]);

  const StatusIcon = currentStage.icon;

  const formatElapsed = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Calculate estimated progress (logarithmic curve, max 95%)
  const progress = useMemo(() => {
    if (tokensReceived > 0) {
      return Math.min(50 + Math.log10(tokensReceived + 1) * 15, 95);
    }
    const seconds = elapsed / 1000;
    return Math.min(Math.log10(seconds + 1) * 30 + 8, 45);
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
            
            {/* Status text with icon */}
            <div className="flex items-center gap-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStage.text}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <StatusIcon className="w-3 h-3 animate-pulse" />
                  <span>{currentStage.text}</span>
                </motion.div>
              </AnimatePresence>
              
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
          
          {/* Stats column */}
          <div className="flex flex-col items-end gap-1 text-[10px] text-muted-foreground tabular-nums">
            {ttft !== null && (
              <div className="flex items-center gap-1 text-green-500">
                <Zap className="w-2.5 h-2.5" />
                <span>{ttft}ms</span>
              </div>
            )}
            {tokensReceived > 0 && (
              <div className="flex items-center gap-1 text-primary">
                <Sparkles className="w-2.5 h-2.5" />
                <span>{tokensReceived}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

AITypingIndicator.displayName = 'AITypingIndicator';