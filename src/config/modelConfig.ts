import { Bot, Zap, Brain, Globe, Sparkles, Image } from "lucide-react";

export interface ModelConfig {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  category: 'fast' | 'reasoning' | 'research' | 'image';
  available?: boolean;
  isLovable?: boolean; // Whether it routes through Lovable AI Gateway
  creditsPerMessage: number; // Credits consumed per message
}

// These IDs MUST match the backend exactly (chat-with-ai edge function)
// Gemini Direct has been REMOVED - use Lovable AI models instead
export const MODEL_CONFIG: ModelConfig[] = [
  // Fast Models (Lovable AI - Recommended)
  { 
    id: 'lovable-gemini-flash', 
    name: 'Gemini Flash', 
    description: 'Fast & efficient responses', 
    icon: Zap, 
    color: 'text-blue-400',
    category: 'fast',
    isLovable: true,
    creditsPerMessage: 1
  },
  { 
    id: 'lovable-gpt5-mini', 
    name: 'GPT-5 Mini', 
    description: 'Quick & lightweight model', 
    icon: Sparkles, 
    color: 'text-emerald-400',
    category: 'fast',
    isLovable: true,
    creditsPerMessage: 1
  },
  
  // Reasoning Models (Lovable AI)
  { 
    id: 'lovable-gemini-pro', 
    name: 'Gemini Pro', 
    description: 'Advanced reasoning & analysis', 
    icon: Brain, 
    color: 'text-purple-400',
    category: 'reasoning',
    isLovable: true,
    creditsPerMessage: 2
  },
  { 
    id: 'lovable-gpt5', 
    name: 'GPT-5', 
    description: 'Most capable reasoning model', 
    icon: Bot, 
    color: 'text-green-400',
    category: 'reasoning',
    isLovable: true,
    creditsPerMessage: 3
  },
  
  // Direct API models
  { 
    id: 'chatgpt', 
    name: 'ChatGPT (GPT-4o)', 
    description: 'OpenAI flagship model', 
    icon: Bot, 
    color: 'text-green-500',
    category: 'reasoning',
    creditsPerMessage: 2
  },
  { 
    id: 'claude', 
    name: 'Claude Sonnet', 
    description: 'Anthropic thoughtful AI', 
    icon: Bot, 
    color: 'text-orange-400',
    category: 'reasoning',
    creditsPerMessage: 2
  },
  
  // Perplexity models (user-selectable)
  { 
    id: 'perplexity', 
    name: 'Perplexity (Sonar)', 
    description: 'Fast web search AI', 
    icon: Globe, 
    color: 'text-cyan-400',
    category: 'research',
    creditsPerMessage: 1
  },
  { 
    id: 'perplexity-pro', 
    name: 'Perplexity Pro', 
    description: 'Multi-step reasoning with sources', 
    icon: Globe, 
    color: 'text-cyan-500',
    category: 'research',
    creditsPerMessage: 2
  },
  { 
    id: 'perplexity-reasoning', 
    name: 'Perplexity Deep Research', 
    description: 'Expert multi-query analysis', 
    icon: Brain, 
    color: 'text-cyan-600',
    category: 'research',
    creditsPerMessage: 3
  },
  { 
    id: 'grok', 
    name: 'Grok', 
    description: 'Real-time knowledge model', 
    icon: Zap, 
    color: 'text-white',
    category: 'research',
    creditsPerMessage: 2
  },
  
  // Uncensored.chat
  { 
    id: 'uncensored-chat', 
    name: 'Uncensored AI', 
    description: 'Unfiltered AI responses', 
    icon: Bot, 
    color: 'text-red-500',
    category: 'reasoning',
    creditsPerMessage: 1
  },
  
  // Image generation
  { 
    id: 'gemini-flash-image', 
    name: 'Gemini Image', 
    description: 'AI image generation', 
    icon: Image, 
    color: 'text-pink-400',
    category: 'image',
    creditsPerMessage: 5
  },
  { 
    id: 'lovable-gemini-flash-image', 
    name: 'Lovable Image', 
    description: 'AI image generation via Lovable', 
    icon: Image, 
    color: 'text-pink-500',
    category: 'image',
    isLovable: true,
    creditsPerMessage: 5
  },
];

// Extract valid model IDs for validation
export const VALID_MODEL_IDS = MODEL_CONFIG.map(m => m.id);

// Default model to use when none selected or invalid ID provided
export const DEFAULT_MODEL_ID = 'lovable-gemini-flash';

// Helper to get model config by ID
export const getModelConfig = (modelId: string): ModelConfig | undefined => {
  return MODEL_CONFIG.find(m => m.id === modelId);
};

// Helper to validate model ID
export const isValidModelId = (modelId: string): boolean => {
  return VALID_MODEL_IDS.includes(modelId);
};

// Helper to sanitize model IDs (replace invalid with default)
export const sanitizeModelIds = (modelIds: string[]): string[] => {
  const validIds = modelIds.filter(isValidModelId);
  return validIds.length > 0 ? validIds : [DEFAULT_MODEL_ID];
};

// Check if model uses Lovable AI Gateway
export const isLovableModel = (modelId: string): boolean => {
  const config = getModelConfig(modelId);
  return config?.isLovable === true;
};

// Get credits per message for a model
export const getCreditsPerMessage = (modelId: string): number => {
  const config = getModelConfig(modelId);
  return config?.creditsPerMessage ?? 1;
};

// Get all Perplexity model variants
export const getPerplexityModels = (): ModelConfig[] => {
  return MODEL_CONFIG.filter(m => m.id.startsWith('perplexity'));
};
