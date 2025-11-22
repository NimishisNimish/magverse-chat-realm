import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp } from 'lucide-react';
import { calculateTotalCost, formatCost } from '@/utils/modelPricing';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CostEstimatorProps {
  selectedModels: string[];
  hasAttachment: boolean;
  webSearchEnabled: boolean;
  imageGenerationEnabled: boolean;
  deepResearchEnabled: boolean;
  inputText?: string;
  onOpenBudgetSettings?: () => void;
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
  inputText = '',
  onOpenBudgetSettings,
}: CostEstimatorProps) => {
  const { user } = useAuth();
  const [monthlySpending, setMonthlySpending] = useState(0);
  const [budgetAlert, setBudgetAlert] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadSpendingData();
    }
  }, [user]);

  const loadSpendingData = async () => {
    if (!user) return;

    try {
      // Get monthly spending
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: logs } = await supabase
        .from('credit_usage_logs')
        .select('cost_usd')
        .eq('user_id', user.id)
        .gte('created_at', startOfMonth.toISOString());

      const total = logs?.reduce((sum, log) => sum + (log.cost_usd || 0), 0) || 0;
      setMonthlySpending(total);

      // Get budget alert
      const { data: alert } = await supabase
        .from('user_budget_alerts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (alert) {
        setBudgetAlert(alert);
      }
    } catch (error) {
      console.error('Error loading spending data:', error);
    }
  };

  const calculateCreditCost = () => {
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

  const creditCost = calculateCreditCost();
  const usdCost = calculateTotalCost(selectedModels, inputText, 500);
  const estimatedTotalCost = monthlySpending + usdCost;

  const getCostLevel = () => {
    if (creditCost <= 2) return { color: 'bg-green-500', label: 'Low' };
    if (creditCost <= 5) return { color: 'bg-yellow-500', label: 'Medium' };
    return { color: 'bg-red-500', label: 'High' };
  };

  const costLevel = getCostLevel();
  
  const budgetPercent = budgetAlert 
    ? (estimatedTotalCost / budgetAlert.budget_limit_usd) * 100 
    : 0;
  const isOverBudget = budgetPercent >= (budgetAlert?.alert_threshold_percent || 100);

  return (
    <div className="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`${costLevel.color} text-white border-none gap-1`}
          >
            <DollarSign className="h-3 w-3" />
            {creditCost} {creditCost === 1 ? 'Credit' : 'Credits'}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1 text-sm">
            <p className="font-semibold">Estimated Cost: {creditCost} credits</p>
            <p className="text-muted-foreground">USD Cost: {formatCost(usdCost)}</p>
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

      {user && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenBudgetSettings}
              className={`gap-1 text-xs ${isOverBudget ? 'text-yellow-500' : ''}`}
            >
              <TrendingUp className="h-3 w-3" />
              ${monthlySpending.toFixed(2)}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1 text-sm">
              <p className="font-semibold">Monthly Spending</p>
              <p className="text-muted-foreground">Current: ${monthlySpending.toFixed(2)}</p>
              {budgetAlert && (
                <>
                  <p className="text-muted-foreground">
                    Budget: ${budgetAlert.budget_limit_usd.toFixed(2)}
                  </p>
                  <p className={`font-medium ${isOverBudget ? 'text-yellow-500' : 'text-green-500'}`}>
                    {budgetPercent.toFixed(0)}% used
                  </p>
                </>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Click to manage budget
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
};
