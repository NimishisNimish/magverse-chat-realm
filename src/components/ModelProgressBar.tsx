import { Progress } from "@/components/ui/progress";
import { Bot, CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface ModelProgressBarProps {
  modelName: string;
  modelColor: string;
  progress: number;
  status: 'waiting' | 'streaming' | 'complete' | 'error';
  estimatedTokens?: number;
  currentTokens?: number;
  estimatedTime?: number; // in seconds
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
  const getStatusIcon = () => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-destructive" />;
      case 'waiting':
        return <Clock className={`w-4 h-4 ${modelColor} opacity-60`} />;
      case 'streaming':
        return <Loader2 className={`w-4 h-4 ${modelColor} animate-spin`} />;
      default:
        return <Bot className={`w-4 h-4 ${modelColor} animate-pulse`} />;
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'waiting':
        return 'Waiting...';
      case 'streaming':
        if (retryAttempt && retryAttempt > 0) {
          return `Retrying (${retryAttempt}/${maxRetries})`;
        }
        return 'Processing';
      case 'complete':
        return 'Complete';
      case 'error':
        return 'Failed';
      default:
        return 'Processing';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-card/50 backdrop-blur-sm shadow-sm"
    >
      {getStatusIcon()}
      <div className="flex-1 space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className={`font-semibold ${modelColor}`}>{modelName}</span>
            <span className="text-xs text-muted-foreground font-medium px-2 py-0.5 rounded-full bg-muted/50">
              {getStatusLabel()}
            </span>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {status === 'waiting' && estimatedTime
              ? `~${estimatedTime}s`
              : `${Math.round(progress)}%`
            }
          </span>
        </div>
        <Progress 
          value={progress} 
          className={`h-2 ${
            status === 'complete' 
              ? '[&>div]:bg-green-500' 
              : status === 'error' 
              ? '[&>div]:bg-destructive' 
              : status === 'waiting'
              ? '[&>div]:bg-muted-foreground/30'
              : '[&>div]:bg-primary'
          }`}
        />
      </div>
    </motion.div>
  );
};
