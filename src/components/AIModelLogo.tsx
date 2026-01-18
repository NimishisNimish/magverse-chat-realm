import chatgptLogo from "@/assets/ai-logos/chatgpt-logo.png";
import geminiLogo from "@/assets/ai-logos/gemini-logo.svg";
import claudeLogo from "@/assets/ai-logos/claude-logo.svg";
import perplexityLogo from "@/assets/ai-logos/perplexity-logo.svg";
import grokLogo from "@/assets/ai-logos/grok-logo.svg";
import uncensoredLogo from "@/assets/ai-logos/uncensored-logo.png";
import mistralLogo from "@/assets/ai-logos/mistral-logo.png";

interface AIModelLogoProps {
  modelId: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

// Define logo types for proper dark mode handling
type LogoType = 'svg-colorful' | 'png-dark' | 'png-light' | 'png-colorful' | 'needs-invert';

interface LogoConfig {
  src: string;
  type: LogoType;
}

const logoMap: Record<string, LogoConfig> = {
  // OpenAI / ChatGPT models - dark logo, needs white background or inversion
  'chatgpt': { src: chatgptLogo, type: 'needs-invert' },
  'lovable-gpt5': { src: chatgptLogo, type: 'needs-invert' },
  'lovable-gpt5-mini': { src: chatgptLogo, type: 'needs-invert' },
  'lovable-gpt5-image': { src: chatgptLogo, type: 'needs-invert' },

  // Google Gemini models - colorful SVG, works in both modes
  'gemini': { src: geminiLogo, type: 'svg-colorful' },
  'gemini-flash-image': { src: geminiLogo, type: 'svg-colorful' },
  'lovable-gemini-flash': { src: geminiLogo, type: 'svg-colorful' },
  'lovable-gemini-pro': { src: geminiLogo, type: 'svg-colorful' },
  'lovable-gemini-flash-image': { src: geminiLogo, type: 'svg-colorful' },

  // Anthropic Claude - colorful SVG
  'claude': { src: claudeLogo, type: 'svg-colorful' },

  // Perplexity models - dark SVG, needs inversion in dark mode
  'perplexity': { src: perplexityLogo, type: 'needs-invert' },
  'perplexity-pro': { src: perplexityLogo, type: 'needs-invert' },
  'perplexity-reasoning': { src: perplexityLogo, type: 'needs-invert' },

  // Grok - works as is
  'grok': { src: grokLogo, type: 'needs-invert' },

  // Mistral
  'mistral': { src: mistralLogo, type: 'needs-invert' },

  // Uncensored.chat - PNG with dark background
  'uncensored-chat': { src: uncensoredLogo, type: 'png-colorful' },
};

const sizeClasses = {
  sm: 'w-5 h-5',
  md: 'w-7 h-7',
  lg: 'w-9 h-9',
  xl: 'w-14 h-14',
};

// Dark mode filter classes based on logo type
const getDarkModeClass = (type: LogoType): string => {
  switch (type) {
    case 'needs-invert':
      // For logos that need inversion in dark mode
      return 'dark:invert dark:brightness-100';
    case 'svg-colorful':
    case 'png-colorful':
    case 'png-light':
      // Colorful SVGs/PNGs are fine as-is
      return '';
    case 'png-dark':
      // Dark PNGs need brightness adjustment
      return 'dark:brightness-[1.5]';
    default:
      return '';
  }
};

export const AIModelLogo = ({ modelId, size = 'md', className = '' }: AIModelLogoProps) => {
  const logoConfig = logoMap[modelId];
  
  if (!logoConfig) {
    // Fallback to generic AI icon if logo not found
    return (
      <div className={`${sizeClasses[size]} ${className} rounded-full bg-muted flex items-center justify-center`}>
        <span className="text-xs font-bold text-foreground">AI</span>
      </div>
    );
  }

  const darkModeClass = getDarkModeClass(logoConfig.type);

  return (
    <img 
      src={logoConfig.src} 
      alt={`${modelId} logo`} 
      className={`${sizeClasses[size]} ${className} object-contain transition-all ${darkModeClass}`}
    />
  );
};