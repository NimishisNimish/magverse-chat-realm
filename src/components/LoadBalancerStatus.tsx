import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Shuffle, TrendingUp, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

interface LoadBalancerStatusProps {
  originalModel: string;
  selectedModel: string;
  wasRerouted: boolean;
  reason?: string;
  healthScore: number;
  alternativesCount: number;
}

export const LoadBalancerStatus = ({
  originalModel,
  selectedModel,
  wasRerouted,
  reason,
  healthScore,
  alternativesCount,
}: LoadBalancerStatusProps) => {
  if (!wasRerouted) {
    return null;
  }

  const getHealthColor = (score: number) => {
    if (score >= 70) return 'text-green-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20"
    >
      <Shuffle className="w-4 h-4 text-blue-500" />
      
      <div className="flex-1 flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Auto-routed from</span>
        <Badge variant="outline" className="text-xs">
          {originalModel}
        </Badge>
        <span className="text-muted-foreground">→</span>
        <Badge variant="outline" className="text-xs bg-blue-500/10 border-blue-500/20">
          {selectedModel}
        </Badge>
      </div>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 cursor-help">
              <TrendingUp className={`w-3.5 h-3.5 ${getHealthColor(healthScore)}`} />
              <span className={`text-xs font-medium tabular-nums ${getHealthColor(healthScore)}`}>
                {healthScore.toFixed(0)}%
              </span>
              {alternativesCount > 0 && (
                <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-1 text-xs">
              <div className="font-semibold">Intelligent Load Balancing</div>
              {reason && (
                <div className="text-muted-foreground">{reason}</div>
              )}
              <div className="text-muted-foreground">
                Health Score: <span className="font-medium">{healthScore.toFixed(0)}/100</span>
              </div>
              {alternativesCount > 0 && (
                <div className="text-muted-foreground">
                  Considered {alternativesCount} alternative{alternativesCount !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </motion.div>
  );
};
