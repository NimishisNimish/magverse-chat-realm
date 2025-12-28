import { AIModelLogo } from './AIModelLogo';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';

interface AITypingIndicatorProps {
  modelId: string;
  modelName: string;
  startTime?: number; // When the request started
  showElapsed?: boolean;
}

// Progressive status stages based on elapsed time
const STATUS_STAGES = [
  { elapsed: 0, text: "Analyzing prompt...", progress: 10 },
  { elapsed: 2000, text: "Generating response...", progress: 25 },
  { elapsed: 5000, text: "Processing context...", progress: 40 },
  { elapsed: 10000, text: "Finalizing output...", progress: 60 },
  { elapsed: 20000, text: "Heavy processing...", progress: 75 },
  { elapsed: 30000, text: "Taking a bit longer...", progress: 85 },
  { elapsed: 60000, text: "Complex request in progress...", progress: 90 },
];

export const AITypingIndicator = ({ 
  modelId, 
  modelName, 
  startTime,
  showElapsed = true 
}: AITypingIndicatorProps) => {
  const [elapsed, setElapsed] = useState(0);
  const [currentStage, setCurrentStage] = useState(STATUS_STAGES[0]);

  useEffect(() => {
    if (!startTime) return;
    
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedMs = now - startTime;
      setElapsed(elapsedMs);
      
      // Find the appropriate stage based on elapsed time
      const stage = [...STATUS_STAGES]
        .reverse()
        .find(s => elapsedMs >= s.elapsed) || STATUS_STAGES[0];
      setCurrentStage(stage);
    }, 100);
    
    return () => clearInterval(interval);
  }, [startTime]);

  const formatElapsed = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-col gap-2 px-6 py-4"
    >
      <div className="flex items-center gap-3">
        {/* Animated AI Model Logo */}
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <AIModelLogo modelId={modelId} size="lg" />
        </motion.div>
        
        {/* Status Text with Dynamic Stage */}
        <div className="flex flex-col gap-1 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground/80">
              {modelName}
            </span>
            <motion.div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-primary"
                  animate={{
                    y: [0, -6, 0],
                    opacity: [0.3, 1, 0.3]
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.15,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </motion.div>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <motion.span
              key={currentStage.text}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              {currentStage.text}
            </motion.span>
            {showElapsed && startTime && (
              <span className="text-muted-foreground/60">
                • {formatElapsed(elapsed)}
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Progress bar */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="px-1"
      >
        <Progress 
          value={currentStage.progress} 
          className="h-1 bg-muted/30" 
        />
      </motion.div>
    </motion.div>
  );
};