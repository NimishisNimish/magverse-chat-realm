import { Progress } from "@/components/ui/progress";
import { Bot, CheckCircle2, XCircle, Clock, Loader2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface ModelProgressBarProps {
  modelName: string;
  modelColor: string;
  progress: number;
  status: 'waiting' | 'streaming' | 'complete' | 'error';
  estimatedTokens?: number;
  currentTokens?: number;
  estimatedTime?: number;
  retryAttempt?: number;
  maxRetries?: number;
}

export const ModelProgressBar = ({ 
  modelName, 
  modelColor, 
  progress, 
  status,
  estimatedTokens,
  currentTokens,
  estimatedTime,
  retryAttempt,
  maxRetries = 4,
}: ModelProgressBarProps) => {
  const [displayProgress, setDisplayProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Smooth progress animation
  useEffect(() => {
    const targetProgress = Math.min(progress, 100);
    const step = (targetProgress - displayProgress) / 10;
    
    if (Math.abs(targetProgress - displayProgress) > 0.5) {
      const timer = setTimeout(() => {
        setDisplayProgress(prev => prev + step);
      }, 30);
      return () => clearTimeout(timer);
    } else {
      setDisplayProgress(targetProgress);
    }
  }, [progress, displayProgress]);

  // Elapsed time counter
  useEffect(() => {
    if (status === 'streaming' || status === 'waiting') {
      const interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setElapsedTime(0);
    }
  }, [status]);

  const getStatusIcon = () => {
    switch (status) {
      case 'complete':
        return (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
          >
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          </motion.div>
        );
      case 'error':
        return (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
          >
            <XCircle className="w-5 h-5 text-destructive" />
          </motion.div>
        );
      case 'waiting':
        return (
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <Clock className="w-5 h-5 text-muted-foreground" />
          </motion.div>
        );
      case 'streaming':
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          >
            <Sparkles className={`w-5 h-5 ${modelColor}`} />
          </motion.div>
        );
      default:
        return <Bot className={`w-5 h-5 ${modelColor}`} />;
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'waiting':
        return 'Initializing';
      case 'streaming':
        if (retryAttempt && retryAttempt > 0) {
          return `Retry ${retryAttempt}/${maxRetries}`;
        }
        return 'Generating';
      case 'complete':
        return 'Complete';
      case 'error':
        return 'Failed';
      default:
        return 'Processing';
    }
  };

  const getProgressColor = () => {
    switch (status) {
      case 'complete':
        return 'bg-gradient-to-r from-green-500 to-emerald-500';
      case 'error':
        return 'bg-gradient-to-r from-red-500 to-rose-500';
      case 'waiting':
        return 'bg-gradient-to-r from-muted-foreground/30 to-muted-foreground/50';
      case 'streaming':
        return 'bg-gradient-to-r from-primary via-primary/80 to-primary';
      default:
        return 'bg-primary';
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-card via-card to-card/80 shadow-lg backdrop-blur-xl"
    >
      {/* Animated background gradient for streaming */}
      <AnimatePresence>
        {status === 'streaming' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5"
            style={{
              backgroundSize: '200% 100%',
            }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative p-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 p-2 rounded-lg bg-muted/50">
            {getStatusIcon()}
          </div>
          
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`font-semibold text-sm truncate ${modelColor}`}>
                  {modelName}
                </span>
                <span className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full transition-colors ${
                  status === 'complete' 
                    ? 'bg-green-500/10 text-green-600 dark:text-green-400' 
                    : status === 'error'
                    ? 'bg-destructive/10 text-destructive'
                    : status === 'streaming'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {getStatusLabel()}
                </span>
              </div>
              
              <div className="flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
                {(status === 'streaming' || status === 'waiting') && elapsedTime > 0 && (
                  <span className="opacity-70">{formatTime(elapsedTime)}</span>
                )}
                <span className="font-medium min-w-[3ch] text-right">
                  {Math.round(displayProgress)}%
                </span>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="relative h-2 bg-muted/50 rounded-full overflow-hidden">
              <motion.div
                className={`absolute inset-y-0 left-0 rounded-full ${getProgressColor()}`}
                initial={{ width: 0 }}
                animate={{ width: `${displayProgress}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
              
              {/* Shimmer effect for streaming */}
              {status === 'streaming' && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                />
              )}
            </div>
            
            {/* Token info */}
            {currentTokens !== undefined && currentTokens > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-muted-foreground"
              >
                {currentTokens.toLocaleString()} tokens
                {estimatedTokens && ` / ~${estimatedTokens.toLocaleString()}`}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
