import { Bot, Zap, Brain, Globe, Sparkles, Cpu, Image } from "lucide-react";

export interface ModelConfig {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  category: 'fast' | 'reasoning' | 'research' | 'image';
  available?: boolean;
  isLovable?: boolean; // Whether it routes through Lovable AI Gateway
}

// These IDs MUST match the backend exactly (chat-with-ai edge function)
export const MODEL_CONFIG: ModelConfig[] = [
  // Fast Models (Lovable AI Gateway - Recommended)
  { 
    id: 'lovable-gemini-flash', 
    name: 'Gemini Flash', 
    description: 'Fast & efficient via Lovable AI', 
    icon: Zap, 
    color: 'text-blue-400',
    category: 'fast',
    isLovable: true
  },
  { 
    id: 'lovable-gpt5-mini', 
    name: 'GPT-5 Mini', 
    description: 'Lightweight GPT-5 via Lovable AI', 
    icon: Sparkles, 
    color: 'text-emerald-400',
    category: 'fast',
    isLovable: true
  },
  
  // Reasoning Models (Lovable AI Gateway)
  { 
    id: 'lovable-gemini-pro', 
    name: 'Gemini Pro', 
    description: 'Most capable Gemini via Lovable AI', 
    icon: Brain, 
    color: 'text-purple-400',
    category: 'reasoning',
    isLovable: true
  },
  { 
    id: 'lovable-gpt5', 
    name: 'GPT-5', 
    description: 'OpenAI\'s latest via Lovable AI', 
    icon: Bot, 
    color: 'text-green-400',
    category: 'reasoning',
    isLovable: true
  },
  
  // Direct API models (use user's API keys)
  { 
    id: 'chatgpt', 
    name: 'ChatGPT (GPT-4o)', 
    description: 'OpenAI Direct API', 
    icon: Bot, 
    color: 'text-green-500',
    category: 'reasoning'
  },
  { 
    id: 'gemini', 
    name: 'Gemini Flash', 
    description: 'Google Direct API', 
    icon: Zap, 
    color: 'text-blue-500',
    category: 'fast'
  },
  { 
    id: 'claude', 
    name: 'Claude Sonnet', 
    description: 'Anthropic Direct API', 
    icon: Bot, 
    color: 'text-orange-400',
    category: 'reasoning'
  },
  { 
    id: 'perplexity', 
    name: 'Perplexity', 
    description: 'Web-enhanced AI search', 
    icon: Globe, 
    color: 'text-cyan-400',
    category: 'research'
  },
  { 
    id: 'grok', 
    name: 'Grok', 
    description: 'Real-time knowledge model', 
    icon: Zap, 
    color: 'text-white',
    category: 'research'
  },
  
  // Image generation
  { 
    id: 'gemini-flash-image', 
    name: 'Gemini Image', 
    description: 'Google image generation', 
    icon: Image, 
    color: 'text-pink-400',
    category: 'image'
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
