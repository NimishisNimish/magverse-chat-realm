import chatgptLogo from "@/assets/ai-logos/chatgpt-logo.png";
import geminiLogo from "@/assets/ai-logos/gemini-logo.svg";
import claudeLogo from "@/assets/ai-logos/claude-logo.png";
import perplexityLogo from "@/assets/ai-logos/perplexity-logo.svg";
import grokLogo from "@/assets/ai-logos/grok-logo.svg";
import qwenLogo from "@/assets/ai-logos/qwen-logo.png";
import phi3Logo from "@/assets/ai-logos/phi3-logo.png";
import mistralLogo from "@/assets/ai-logos/mistral-logo.png";

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
  'bytez-qwen': qwenLogo,
  'bytez-phi3': phi3Logo,
  'bytez-mistral': mistralLogo,
};

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

export const AIModelLogo = ({ modelId, size = 'md', className = '' }: AIModelLogoProps) => {
  const logoSrc = logoMap[modelId];
  
  if (!logoSrc) {
    // Fallback to generic AI icon if logo not found
    return (
      <div className={`${sizeClasses[size]} ${className} rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center`}>
        <span className="text-xs font-bold text-white">AI</span>
      </div>
    );
  }

  return (
    <img 
      src={logoSrc} 
      alt={`${modelId} logo`} 
      className={`${sizeClasses[size]} ${className} object-contain rounded-lg`}
    />
  );
};
