import chatgptLogo from "@/assets/ai-logos/chatgpt-logo-clean.png";
import geminiLogo from "@/assets/ai-logos/gemini-logo.svg";
import claudeLogo from "@/assets/ai-logos/claude-logo-clean.png";
import perplexityLogo from "@/assets/ai-logos/perplexity-logo.svg";
import grokLogo from "@/assets/ai-logos/grok-logo.svg";

interface AIModelLogoProps {
  modelId: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const logoMap: Record<string, string> = {
  'chatgpt': chatgptLogo,
  'gemini': geminiLogo,
  'gemini-flash-image': geminiLogo,
  'claude': claudeLogo,
  'perplexity': perplexityLogo,
  'grok': grokLogo,
  // Lovable AI models use real brand logos
  'lovable-gemini-flash': geminiLogo,
  'lovable-gemini-pro': geminiLogo,
  'lovable-gpt5': chatgptLogo,
  'lovable-gpt5-mini': chatgptLogo,
  'lovable-gemini-flash-image': geminiLogo,
  'lovable-gpt5-image': chatgptLogo,
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

  return (
    <img 
      src={logoSrc} 
      alt={`${modelId} logo`} 
      className={`${sizeClasses[size]} ${className} object-contain`}
    />
  );
};