import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface RequestTimerProps {
  startTime: number;
  isActive: boolean;
}

export const RequestTimer = ({ startTime, isActive }: RequestTimerProps) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 100);

    return () => clearInterval(interval);
  }, [startTime, isActive]);

  if (!isActive) return null;

  const seconds = (elapsed / 1000).toFixed(1);
  const isWarning = elapsed > 30000; // Warning after 30s
  const isDanger = elapsed > 60000; // Danger after 60s

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
      isDanger ? 'bg-destructive/10 border-destructive text-destructive' :
      isWarning ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500' :
      'bg-primary/10 border-primary text-primary'
    }`}>
      <Clock className="w-4 h-4 animate-pulse" />
      <span className="text-sm font-medium">
        {seconds}s - AI is processing...
      </span>
    </div>
  );
};
