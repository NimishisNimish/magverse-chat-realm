import { Progress } from "@/components/ui/progress";
import { Bot, CheckCircle2, XCircle } from "lucide-react";
import { motion } from "framer-motion";

interface ModelProgressBarProps {
  modelName: string;
  modelColor: string;
  progress: number;
  status: 'streaming' | 'complete' | 'error';
  estimatedTokens?: number;
  currentTokens?: number;
}

export const ModelProgressBar = ({ 
  modelName, 
  modelColor, 
  progress, 
  status,
  estimatedTokens,
  currentTokens 
}: ModelProgressBarProps) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Bot className={`w-4 h-4 ${modelColor} animate-pulse`} />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'complete':
        return 'bg-green-500';
      case 'error':
        return 'bg-destructive';
      default:
        return 'bg-primary';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center gap-3 px-4 py-2 rounded-lg border bg-card/50 backdrop-blur"
    >
      {getStatusIcon()}
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className={`font-medium ${modelColor}`}>{modelName}</span>
          <span className="text-xs text-muted-foreground">
            {status === 'streaming' && currentTokens && estimatedTokens 
              ? `${currentTokens}/${estimatedTokens} tokens`
              : `${Math.round(progress)}%`
            }
          </span>
        </div>
        <Progress 
          value={progress} 
          className={`h-1.5 ${status === 'complete' ? '[&>div]:bg-green-500' : status === 'error' ? '[&>div]:bg-destructive' : ''}`}
        />
      </div>
    </motion.div>
  );
};
