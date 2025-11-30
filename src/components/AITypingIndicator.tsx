import { AIModelLogo } from './AIModelLogo';
import { motion } from 'framer-motion';

interface AITypingIndicatorProps {
  modelId: string;
  modelName: string;
}

export const AITypingIndicator = ({ modelId, modelName }: AITypingIndicatorProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center gap-3 px-6 py-4"
    >
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
      
      {/* Typing Text with Dots Animation */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground/80">
          {modelName} is thinking
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
    </motion.div>
  );
};
