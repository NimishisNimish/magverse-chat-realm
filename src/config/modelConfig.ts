import { Bot, Zap, Brain, Globe, Sparkles, Cpu, Image } from "lucide-react";

export interface ModelConfig {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  available?: boolean; // Indicates if model is currently working
}

// These IDs MUST match the backend exactly (chat-with-ai edge function)
export const MODEL_CONFIG: ModelConfig[] = [
  { 
    id: 'chatgpt', 
    name: 'ChatGPT (GPT-4o)', 
    description: 'Most capable OpenAI model', 
    icon: Bot, 
    color: 'text-accent'
  },
  { 
    id: 'gemini', 
    name: 'Gemini Flash', 
    description: 'Google\'s fastest AI model', 
    icon: Zap, 
    color: 'text-primary' 
  },
  { 
    id: 'claude', 
    name: 'Claude 3.5 Sonnet', 
    description: 'Anthropic\'s latest model', 
    icon: Bot, 
    color: 'text-orange-400' 
  },
  { 
    id: 'perplexity', 
    name: 'Perplexity', 
    description: 'Web-enhanced AI search', 
    icon: Globe, 
    color: 'text-green-400'
  },
  { 
    id: 'grok', 
    name: 'Grok 3.1', 
    description: 'Real-time knowledge model', 
    icon: Zap, 
    color: 'text-cyan-400' 
  },
  { 
    id: 'gemini-flash-image', 
    name: 'Gemini Image', 
    description: 'Image generation model', 
    icon: Image, 
    color: 'text-pink-400' 
  },
];

// Extract valid model IDs for validation
export const VALID_MODEL_IDS = MODEL_CONFIG.map(m => m.id);

// Default model to use when none selected or invalid ID provided
export const DEFAULT_MODEL_ID = 'gemini';

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
