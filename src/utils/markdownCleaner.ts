/**
 * Cleans markdown formatting from text for cleaner display
 * Removes ** for bold, * for italic, and other common markdown syntax
 */
export const cleanMarkdown = (text: string): string => {
  if (!text) return text;
  
  let cleaned = text;
  
  // Remove bold markdown (**text** or __text__)
  cleaned = cleaned.replace(/\*\*(.+?)\*\*/g, '$1');
  cleaned = cleaned.replace(/__(.+?)__/g, '$1');
  
  // Remove italic markdown (*text* or _text_)
  cleaned = cleaned.replace(/\*(.+?)\*/g, '$1');
  cleaned = cleaned.replace(/_(.+?)_/g, '$1');
  
  // Remove code blocks (```code```)
  cleaned = cleaned.replace(/```[\s\S]*?```/g, (match) => {
    // Keep the code content but remove the backticks
    return match.replace(/```/g, '');
  });
  
  // Remove inline code (`code`)
  cleaned = cleaned.replace(/`(.+?)`/g, '$1');
  
  // Remove headers (# ## ### etc)
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');
  
  // Remove strikethrough (~~text~~)
  cleaned = cleaned.replace(/~~(.+?)~~/g, '$1');
  
  return cleaned;
};

/**
 * Preserves important formatting while cleaning distracting markdown
 * Use this for a balance between readability and structure
 */
export const softCleanMarkdown = (text: string): string => {
  if (!text) return text;
  
  let cleaned = text;
  
  // Only remove excessive markdown like ** and __
  cleaned = cleaned.replace(/\*\*(.+?)\*\*/g, '$1');
  cleaned = cleaned.replace(/__(.+?)__/g, '$1');
  
  return cleaned;
};

