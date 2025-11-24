/**
 * Model pricing in USD per 1M tokens
 * Prices are estimates and may vary
 */
export const MODEL_PRICING = {
  // OpenAI GPT-5 models
  'gpt-5-nano': { input: 0.15, output: 0.60, tier: 'budget' },
  'gpt-5-mini': { input: 0.30, output: 1.20, tier: 'standard' },
  'gpt-5': { input: 2.50, output: 10.00, tier: 'premium' },
  
  // OpenAI reasoning models
  'o3': { input: 15.00, output: 60.00, tier: 'premium' },
  'o4-mini': { input: 3.00, output: 12.00, tier: 'premium' },
  
  // Google Gemini 3 models
  'gemini-3-flash': { input: 0.075, output: 0.30, tier: 'budget' },
  'gemini-3-pro': { input: 1.25, output: 5.00, tier: 'premium' },
  'gemini-3-thinking': { input: 2.00, output: 8.00, tier: 'premium' },
  'gemini-flash-image': { input: 0.10, output: 0.40, tier: 'standard' },
} as const;

/**
 * Calculate cost for a model request
 */
export const calculateModelCost = (
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number => {
  const pricing = MODEL_PRICING[modelId as keyof typeof MODEL_PRICING];
  if (!pricing) return 0;

  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  
  return inputCost + outputCost;
};

/**
 * Estimate tokens from text (rough approximation: 1 token ≈ 4 characters)
 */
export const estimateTokens = (text: string): number => {
  return Math.ceil(text.length / 4);
};

/**
 * Get model pricing tier for display
 */
export const getModelTier = (modelId: string): string => {
  const pricing = MODEL_PRICING[modelId as keyof typeof MODEL_PRICING];
  return pricing?.tier || 'standard';
};

/**
 * Format cost to display with currency
 */
export const formatCost = (cost: number): string => {
  if (cost < 0.01) {
    return `$${(cost * 1000).toFixed(3)}‰`; // Show in per-mille for very small costs
  }
  return `$${cost.toFixed(4)}`;
};

/**
 * Calculate total estimated cost for multiple models
 */
export const calculateTotalCost = (
  models: string[],
  inputText: string,
  estimatedOutputTokens: number = 500
): number => {
  const inputTokens = estimateTokens(inputText);
  
  return models.reduce((total, modelId) => {
    return total + calculateModelCost(modelId, inputTokens, estimatedOutputTokens);
  }, 0);
};
