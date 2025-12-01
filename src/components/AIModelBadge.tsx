import { AIModelLogo } from './AIModelLogo';
import { getModelConfig } from '@/config/modelConfig';

interface AIModelBadgeProps {
  modelId: string;
  showReasoningMode?: boolean;
  className?: string;
}

export const AIModelBadge = ({ modelId, showReasoningMode, className = '' }: AIModelBadgeProps) => {
  const modelConfig = getModelConfig(modelId);
  
  if (!modelConfig) return null;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/30 ${className}`}>
      <AIModelLogo modelId={modelId} size="sm" />
      <span className="text-xs font-medium text-foreground/80">{modelConfig.name}</span>
      {showReasoningMode && (
        <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
          Reasoning
        </span>
      )}
    </div>
  );
};
