import { useCallback, useState } from 'react';
import { useModelHealth } from './useModelHealth';
import { toast as sonnerToast } from 'sonner';

interface LoadBalancerConfig {
  enableAutoFailover: boolean;
  maxRetries: number;
  healthThreshold: number; // Minimum health score (0-100)
  preferenceWeight: number; // How much to weight user preference vs health (0-1)
}

interface RoutingDecision {
  selectedModelId: string;
  originalModelId: string;
  wasRerouted: boolean;
  reason?: string;
  healthScore: number;
  alternativesConsidered: Array<{
    modelId: string;
    healthScore: number;
    reason: string;
  }>;
}

interface ModelCapability {
  id: string;
  name: string;
  capabilities: string[];
  tier: 'premium' | 'standard' | 'lite';
}

const MODEL_CAPABILITIES: ModelCapability[] = [
  { id: 'gpt-5', name: 'GPT-5.1', capabilities: ['text', 'vision', 'reasoning'], tier: 'premium' },
  { id: 'gpt-5-mini', name: 'GPT-5 Mini', capabilities: ['text', 'vision', 'reasoning'], tier: 'standard' },
  { id: 'gpt-5-nano', name: 'GPT-5 Nano', capabilities: ['text'], tier: 'lite' },
  { id: 'gemini-pro', name: 'Gemini 3 Pro', capabilities: ['text', 'vision', 'reasoning'], tier: 'premium' },
  { id: 'gemini-flash', name: 'Gemini 3 Flash', capabilities: ['text', 'vision', 'image-gen'], tier: 'standard' },
  { id: 'gemini-lite', name: 'Gemini Lite', capabilities: ['text'], tier: 'lite' },
  { id: 'claude', name: 'Claude', capabilities: ['text', 'vision', 'reasoning'], tier: 'premium' },
  { id: 'perplexity', name: 'Perplexity', capabilities: ['text', 'search'], tier: 'standard' },
  { id: 'grok', name: 'Grok', capabilities: ['text'], tier: 'standard' },
];

// Fallback chains based on capabilities and performance tiers
const CAPABILITY_FALLBACKS: Record<string, string[]> = {
  'gpt-5': ['gpt-5-mini', 'gemini-pro', 'claude', 'gemini-flash'],
  'gpt-5-mini': ['gemini-flash', 'gpt-5-nano', 'gemini-lite'],
  'gpt-5-nano': ['gemini-lite', 'gemini-flash'],
  'gemini-pro': ['gpt-5', 'claude', 'gemini-flash', 'gpt-5-mini'],
  'gemini-flash': ['gpt-5-mini', 'gemini-lite', 'gpt-5-nano'],
  'gemini-lite': ['gemini-flash', 'gpt-5-nano'],
  'claude': ['gpt-5', 'gemini-pro', 'gpt-5-mini'],
  'perplexity': ['grok', 'gemini-flash'],
  'grok': ['perplexity', 'gemini-flash'],
};

const DEFAULT_CONFIG: LoadBalancerConfig = {
  enableAutoFailover: true,
  maxRetries: 3,
  healthThreshold: 30, // Minimum health score of 30/100
  preferenceWeight: 0.3, // 30% user preference, 70% health
};

export const useIntelligentLoadBalancer = (config: Partial<LoadBalancerConfig> = {}) => {
  const modelHealth = useModelHealth();
  const [routingHistory, setRoutingHistory] = useState<RoutingDecision[]>([]);
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  // Calculate health score for a model (0-100)
  const calculateHealthScore = useCallback((modelId: string): number => {
    const health = modelHealth.getModelHealth(modelId);
    
    if (!health) {
      return 50; // Unknown health = neutral score
    }

    if (health.isDisabled || health.status === 'down') {
      return 0; // Unavailable
    }

    let score = 100;

    // Penalize for recent failures
    score -= health.recentFailureRate * 0.5; // -0.5 per percent failure rate
    
    // Penalize for consecutive failures
    score -= health.consecutiveFailures * 15; // -15 per consecutive failure
    
    // Penalize for slow response time (normalize to 0-10 seconds)
    const responseTimePenalty = Math.min((health.avgResponseTime / 1000) * 2, 20);
    score -= responseTimePenalty;
    
    // Bonus for recent success
    if (health.lastSuccess) {
      const timeSinceSuccess = Date.now() - health.lastSuccess.getTime();
      if (timeSinceSuccess < 60000) { // Within last minute
        score += 10;
      }
    }

    // Status impact
    if (health.status === 'degraded') {
      score -= 20;
    }

    return Math.max(0, Math.min(100, score));
  }, [modelHealth]);

  // Find the best available model considering health and capabilities
  const selectBestModel = useCallback((
    preferredModelId: string,
    requiredCapabilities: string[] = ['text'],
    excludeModels: string[] = []
  ): RoutingDecision => {
    const alternatives: RoutingDecision['alternativesConsidered'] = [];
    
    // Check if preferred model is healthy enough
    const preferredScore = calculateHealthScore(preferredModelId);
    const preferredHealth = modelHealth.getModelHealth(preferredModelId);
    
    if (
      preferredScore >= fullConfig.healthThreshold &&
      (!preferredHealth || !preferredHealth.isDisabled)
    ) {
      return {
        selectedModelId: preferredModelId,
        originalModelId: preferredModelId,
        wasRerouted: false,
        healthScore: preferredScore,
        alternativesConsidered: [],
      };
    }

    // Preferred model is unhealthy, find alternatives
    const fallbackChain = CAPABILITY_FALLBACKS[preferredModelId] || [];
    const candidateModels = fallbackChain.filter(id => !excludeModels.includes(id));

    // Score all candidates
    const scoredCandidates = candidateModels.map(modelId => {
      const score = calculateHealthScore(modelId);
      const modelInfo = MODEL_CAPABILITIES.find(m => m.id === modelId);
      const hasRequiredCapabilities = requiredCapabilities.every(cap =>
        modelInfo?.capabilities.includes(cap)
      );

      let reason = '';
      if (score < fullConfig.healthThreshold) {
        reason = 'Below health threshold';
      } else if (!hasRequiredCapabilities) {
        reason = 'Missing required capabilities';
      } else {
        reason = 'Healthy alternative';
      }

      return {
        modelId,
        healthScore: score,
        reason,
        hasRequiredCapabilities,
        modelInfo,
      };
    });

    // Filter to only healthy models with required capabilities
    const viableCandidates = scoredCandidates.filter(
      c => c.healthScore >= fullConfig.healthThreshold && c.hasRequiredCapabilities
    );

    // Track all alternatives considered
    alternatives.push(...scoredCandidates.map(c => ({
      modelId: c.modelId,
      healthScore: c.healthScore,
      reason: c.reason,
    })));

    // Select best candidate
    if (viableCandidates.length > 0) {
      // Sort by health score
      viableCandidates.sort((a, b) => b.healthScore - a.healthScore);
      const bestCandidate = viableCandidates[0];

      const decision: RoutingDecision = {
        selectedModelId: bestCandidate.modelId,
        originalModelId: preferredModelId,
        wasRerouted: true,
        reason: `Original model ${preferredModelId} unhealthy (score: ${preferredScore.toFixed(0)}). Routed to ${bestCandidate.modelInfo?.name} (score: ${bestCandidate.healthScore.toFixed(0)})`,
        healthScore: bestCandidate.healthScore,
        alternativesConsidered: alternatives,
      };

      // Notify user
      sonnerToast.info('Automatic Model Routing', {
        description: decision.reason,
        duration: 5000,
      });

      return decision;
    }

    // No viable alternatives found
    return {
      selectedModelId: preferredModelId, // Fall back to original despite issues
      originalModelId: preferredModelId,
      wasRerouted: false,
      reason: `No healthy alternatives found. Using ${preferredModelId} despite health issues.`,
      healthScore: preferredScore,
      alternativesConsidered: alternatives,
    };
  }, [calculateHealthScore, fullConfig, modelHealth]);

  // Route multiple models intelligently
  const routeModels = useCallback((
    preferredModels: string[],
    requiredCapabilities: string[] = ['text']
  ): Map<string, RoutingDecision> => {
    const decisions = new Map<string, RoutingDecision>();
    const selectedIds = new Set<string>();

    for (const modelId of preferredModels) {
      const decision = selectBestModel(
        modelId,
        requiredCapabilities,
        Array.from(selectedIds) // Avoid selecting same model twice
      );

      decisions.set(modelId, decision);
      selectedIds.add(decision.selectedModelId);

      // Track in history
      setRoutingHistory(prev => [...prev.slice(-19), decision]);
    }

    return decisions;
  }, [selectBestModel]);

  // Get routing statistics
  const getRoutingStats = useCallback(() => {
    const recentDecisions = routingHistory.slice(-100);
    const reroutedCount = recentDecisions.filter(d => d.wasRerouted).length;
    const avgHealthScore = recentDecisions.reduce((sum, d) => sum + d.healthScore, 0) / recentDecisions.length || 0;

    return {
      totalRequests: recentDecisions.length,
      reroutedRequests: reroutedCount,
      rerouteRate: recentDecisions.length > 0 ? (reroutedCount / recentDecisions.length) * 100 : 0,
      avgHealthScore,
      recentDecisions: recentDecisions.slice(-10),
    };
  }, [routingHistory]);

  // Get best models by health
  const getBestModels = useCallback((count: number = 3): string[] => {
    const allModels = MODEL_CAPABILITIES.map(m => m.id);
    const scoredModels = allModels.map(id => ({
      id,
      score: calculateHealthScore(id),
    }));

    scoredModels.sort((a, b) => b.score - a.score);
    return scoredModels.slice(0, count).map(m => m.id);
  }, [calculateHealthScore]);

  return {
    selectBestModel,
    routeModels,
    calculateHealthScore,
    getRoutingStats,
    getBestModels,
    routingHistory,
  };
};
