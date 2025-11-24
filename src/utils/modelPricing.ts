/**
 * Model pricing in USD per 1M tokens
 * Prices are estimates and may vary
 */
export const MODEL_PRICING = {
  // All models with reasoning capabilities
  'chatgpt': { input: 15.00, output: 60.00, tier: 'premium' },
  'gemini': { input: 1.25, output: 5.00, tier: 'premium' },
  'claude': { input: 3.00, output: 15.00, tier: 'premium' },
  'perplexity': { input: 1.00, output: 1.00, tier: 'standard' },
  'grok': { input: 5.00, output: 15.00, tier: 'premium' },
  'bytez-qwen': { input: 0.10, output: 0.10, tier: 'budget' },
  'bytez-phi3': { input: 0.05, output: 0.15, tier: 'budget' },
  'bytez-mistral': { input: 0.08, output: 0.25, tier: 'budget' },
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
