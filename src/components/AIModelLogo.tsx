import openaiLogo from "@/assets/ai-logos/openai-logo.svg";
import geminiLogo from "@/assets/ai-logos/gemini-logo.svg";
import claudeLogo from "@/assets/ai-logos/claude-logo.svg";
import perplexityLogo from "@/assets/ai-logos/perplexity-logo.svg";
import grokLogo from "@/assets/ai-logos/grok-logo.svg";

interface AIModelLogoProps {
  modelId: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const logoMap: Record<string, string> = {
  // OpenAI / ChatGPT models
  'chatgpt': openaiLogo,
  'lovable-gpt5': openaiLogo,
  'lovable-gpt5-mini': openaiLogo,
  'lovable-gpt5-image': openaiLogo,
  
  // Google Gemini models
  'gemini': geminiLogo,
  'gemini-flash-image': geminiLogo,
  'lovable-gemini-flash': geminiLogo,
  'lovable-gemini-pro': geminiLogo,
  'lovable-gemini-flash-image': geminiLogo,
  
  // Anthropic Claude
  'claude': claudeLogo,
  
  // Perplexity models (including variants)
  'perplexity': perplexityLogo,
  'perplexity-pro': perplexityLogo,
  'perplexity-reasoning': perplexityLogo,
  
  // Grok
  'grok': grokLogo,
};

const sizeClasses = {
  sm: 'w-5 h-5',
  md: 'w-7 h-7',
  lg: 'w-9 h-9',
  xl: 'w-14 h-14',
};

export const AIModelLogo = ({ modelId, size = 'md', className = '' }: AIModelLogoProps) => {
  const logoSrc = logoMap[modelId];
  
  if (!logoSrc) {
    // Fallback to generic AI icon if logo not found
    return (
      <div className={`${sizeClasses[size]} ${className} rounded-full bg-muted flex items-center justify-center`}>
        <span className="text-xs font-bold text-foreground">AI</span>
      </div>
    );
  }

  // Add brightness filter for dark logos in dark mode
  const needsBrightness = modelId === 'perplexity' || modelId === 'perplexity-pro' || modelId === 'perplexity-reasoning' || modelId === 'grok';

  return (
    <img 
      src={logoSrc} 
      alt={`${modelId} logo`} 
      className={`${sizeClasses[size]} ${className} object-contain ${needsBrightness ? 'dark:brightness-150 dark:contrast-125' : ''}`}
    />
  );
};
