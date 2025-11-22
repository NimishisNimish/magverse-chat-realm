import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DollarSign } from 'lucide-react';

interface CostEstimatorProps {
  selectedModels: string[];
  hasAttachment: boolean;
  webSearchEnabled: boolean;
  imageGenerationEnabled: boolean;
  deepResearchEnabled: boolean;
}

const MODEL_COSTS: Record<string, number> = {
  'gpt-5-mini': 1,
  'gemini-flash': 1,
  'gpt-5': 2,
  'claude': 2,
  'grok': 2,
  'perplexity': 2,
  'gemini-pro': 3,
};

export const CostEstimator = ({
  selectedModels,
  hasAttachment,
  webSearchEnabled,
  imageGenerationEnabled,
  deepResearchEnabled,
}: CostEstimatorProps) => {
  const calculateCost = () => {
    let totalCost = 0;

    // Base cost for models
    selectedModels.forEach((model) => {
      totalCost += MODEL_COSTS[model] || 1;
    });

    // Additional costs
    if (webSearchEnabled) totalCost += 1;
    if (deepResearchEnabled) totalCost += 2;
    if (imageGenerationEnabled) totalCost += 3;
    if (hasAttachment) totalCost += 1;

    return totalCost;
  };

  const cost = calculateCost();

  const getCostLevel = () => {
    if (cost <= 2) return { color: 'bg-green-500', label: 'Low' };
    if (cost <= 5) return { color: 'bg-yellow-500', label: 'Medium' };
    return { color: 'bg-red-500', label: 'High' };
  };

  const costLevel = getCostLevel();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={`${costLevel.color} text-white border-none gap-1`}
        >
          <DollarSign className="h-3 w-3" />
          {cost} {cost === 1 ? 'Credit' : 'Credits'}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <div className="space-y-1 text-sm">
          <p className="font-semibold">Estimated Cost: {cost} credits</p>
          <p className="text-muted-foreground">Cost Level: {costLevel.label}</p>
          {selectedModels.length > 0 && (
            <div className="mt-2 space-y-1">
              <p className="font-medium">Model Breakdown:</p>
              {selectedModels.map((model) => (
                <p key={model} className="text-xs">
                  • {model}: {MODEL_COSTS[model] || 1} credit{MODEL_COSTS[model] !== 1 ? 's' : ''}
                </p>
              ))}
            </div>
          )}
          {(webSearchEnabled || deepResearchEnabled || imageGenerationEnabled || hasAttachment) && (
            <div className="mt-2 space-y-1">
              <p className="font-medium">Additional Features:</p>
              {webSearchEnabled && <p className="text-xs">• Web Search: +1 credit</p>}
              {deepResearchEnabled && <p className="text-xs">• Deep Research: +2 credits</p>}
              {imageGenerationEnabled && <p className="text-xs">• Image Generation: +3 credits</p>}
              {hasAttachment && <p className="text-xs">• File Attachment: +1 credit</p>}
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
