/**
 * Model pricing in USD per 1M tokens
 * Prices are estimates and may vary
 */
export const MODEL_PRICING = {
  // Google Gemini models
  'gemini-flash': { input: 0.075, output: 0.30, tier: 'budget' },
  'gemini-lite': { input: 0.05, output: 0.15, tier: 'budget' },
  'gemini-pro': { input: 1.25, output: 5.00, tier: 'premium' },
  
  // OpenAI GPT models
  'gpt-5-nano': { input: 0.15, output: 0.60, tier: 'budget' },
  'gpt-5-mini': { input: 0.30, output: 1.20, tier: 'standard' },
  'gpt-5': { input: 2.50, output: 10.00, tier: 'premium' },
  
  // Anthropic Claude
  'claude': { input: 3.00, output: 15.00, tier: 'premium' },
  
  // Perplexity
  'perplexity': { input: 1.00, output: 1.00, tier: 'standard' },
  
  // Grok
  'grok': { input: 2.00, output: 8.00, tier: 'premium' },
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
