import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, AlertCircle, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModelConnectionStatusProps {
  modelId: string;
  modelName: string;
  status?: 'healthy' | 'degraded' | 'down';
  avgResponseTime?: number;
  recentFailureRate?: number;
  lastCheck?: Date;
  className?: string;
}

export const ModelConnectionStatus = ({
  modelId,
  modelName,
  status = 'healthy',
  avgResponseTime = 0,
  recentFailureRate = 0,
  lastCheck,
  className,
}: ModelConnectionStatusProps) => {
  const [isChecking, setIsChecking] = useState(false);

  // Simulate checking animation when status changes
  useEffect(() => {
    if (status === 'degraded' || status === 'down') {
      setIsChecking(true);
      const timeout = setTimeout(() => setIsChecking(false), 1000);
      return () => clearTimeout(timeout);
    }
  }, [status]);

  const getStatusIcon = () => {
    if (isChecking) {
      return <Loader2 className="h-3 w-3 animate-spin" />;
    }
    
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="h-3 w-3" />;
      case 'degraded':
        return <AlertCircle className="h-3 w-3" />;
      case 'down':
        return <XCircle className="h-3 w-3" />;
      default:
        return <CheckCircle2 className="h-3 w-3" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'degraded':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'down':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-green-500/10 text-green-500 border-green-500/20';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'healthy':
        return 'Online';
      case 'degraded':
        return 'Degraded';
      case 'down':
        return 'Offline';
      default:
        return 'Online';
    }
  };

  const getTooltipContent = () => {
    return (
      <div className="space-y-1 text-xs">
        <div className="font-semibold">{modelName} Status</div>
        <div className="text-muted-foreground">
          Status: <span className={cn(
            "font-medium",
            status === 'healthy' && "text-green-500",
            status === 'degraded' && "text-yellow-500",
            status === 'down' && "text-red-500"
          )}>{getStatusText()}</span>
        </div>
        {avgResponseTime > 0 && (
          <div className="text-muted-foreground">
            Avg Response: <span className="font-medium">{avgResponseTime.toFixed(0)}ms</span>
          </div>
        )}
        {recentFailureRate > 0 && (
          <div className="text-muted-foreground">
            Failure Rate: <span className="font-medium">{recentFailureRate.toFixed(1)}%</span>
          </div>
        )}
        {lastCheck && (
          <div className="text-muted-foreground">
            Last Check: <span className="font-medium">{new Date(lastCheck).toLocaleTimeString()}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              "gap-1.5 transition-all cursor-help",
              getStatusColor(),
              className
            )}
          >
            {getStatusIcon()}
            <span className="text-xs">{getStatusText()}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          {getTooltipContent()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
