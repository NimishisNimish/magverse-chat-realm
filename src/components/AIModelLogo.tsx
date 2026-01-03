import openaiLogo from "@/assets/ai-logos/chatgpt-reference.png";
import geminiLogo from "@/assets/ai-logos/gemini-reference.png";
import claudeLogo from "@/assets/ai-logos/claude-reference.png";
import perplexityLogo from "@/assets/ai-logos/perplexity-reference.png";
import grokLogo from "@/assets/ai-logos/grok-reference.png";
import uncensoredLogo from "@/assets/ai-logos/uncensored-logo.png";


interface AIModelLogoProps {
  modelId: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

// Define logo types for proper dark mode handling
type LogoType = 'svg-dark' | 'svg-colorful' | 'png-dark' | 'png-light' | 'png-colorful';

interface LogoConfig {
  src: string;
  type: LogoType;
}

const logoMap: Record<string, LogoConfig> = {
  // OpenAI / ChatGPT models - dark SVG, needs inversion in dark mode
  'chatgpt': { src: openaiLogo, type: 'png-dark' },
  'lovable-gpt5': { src: openaiLogo, type: 'png-dark' },
  'lovable-gpt5-mini': { src: openaiLogo, type: 'png-dark' },
  'lovable-gpt5-image': { src: openaiLogo, type: 'png-dark' },

  // Google Gemini models - colorful SVG, works in both modes
  'gemini': { src: geminiLogo, type: 'png-colorful' },
  'gemini-flash-image': { src: geminiLogo, type: 'png-colorful' },
  'lovable-gemini-flash': { src: geminiLogo, type: 'png-colorful' },
  'lovable-gemini-pro': { src: geminiLogo, type: 'png-colorful' },
  'lovable-gemini-flash-image': { src: geminiLogo, type: 'png-colorful' },

  // Anthropic Claude - dark SVG, needs inversion in dark mode
  'claude': { src: claudeLogo, type: 'png-dark' },

  // Perplexity models - dark SVG, needs inversion in dark mode
  'perplexity': { src: perplexityLogo, type: 'png-dark' },
  'perplexity-pro': { src: perplexityLogo, type: 'png-dark' },
  'perplexity-reasoning': { src: perplexityLogo, type: 'png-dark' },

  // Grok - dark SVG, needs inversion in dark mode
  'grok': { src: grokLogo, type: 'png-dark' },

  // Uncensored.chat - PNG with dark background
  'uncensored-chat': { src: uncensoredLogo, type: 'png-light' },
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
    case 'svg-dark':
      // Invert dark SVGs to white in dark mode
      return 'dark:invert dark:brightness-100';
    case 'png-dark':
      // For dark PNGs, use strong inversion and brightness
      return 'dark:invert dark:brightness-[1.8] dark:contrast-[1.2]';
    case 'svg-colorful':
    case 'png-colorful':
    case 'png-light':
      // Colorful SVGs/PNGs and light PNGs are fine as-is
      return '';
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
