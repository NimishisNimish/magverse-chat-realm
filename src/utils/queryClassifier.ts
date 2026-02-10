/**
 * Classify user queries to automatically select optimal AI models
 */

export type QueryType = 'code' | 'research' | 'creative' | 'math' | 'general';

/**
 * Analyze query text and determine its type
 */
export const classifyQuery = (query: string): QueryType => {
  const lowerQuery = query.toLowerCase();
  
  // Code-related patterns
  const codePatterns = /\b(code|function|api|debug|error|programming|javascript|python|react|typescript|sql|html|css|component|import|export|class|interface|async|await)\b/i;
  if (codePatterns.test(lowerQuery)) return 'code';
  
  // Research patterns (web search needed)
  const researchPatterns = /\b(latest|news|current|search|find|what is|when did|who is|where is|how many|statistics|data|report|study)\b/i;
  if (researchPatterns.test(lowerQuery)) return 'research';
  
  // Creative writing patterns
  const creativePatterns = /\b(write|create|story|poem|essay|imagine|design|draft|compose|generate|creative|narrative|blog|article)\b/i;
  if (creativePatterns.test(lowerQuery)) return 'creative';
  
  // Math/calculation patterns
  const mathPatterns = /\b(calculate|solve|equation|math|mathematics|percentage|formula|compute|integrate|derive|algebra|geometry)\b/i;
  if (mathPatterns.test(lowerQuery)) return 'math';
  
  return 'general';
};

/**
 * Get optimal model selection based on query type
 */
export const getOptimalModels = (queryType: QueryType): string[] => {
  switch (queryType) {
    case 'code':
      return ['chatgpt', 'claude']; // Best for code generation and debugging
    case 'research':
      return ['perplexity']; // Web search enabled
    case 'creative':
      return ['claude', 'lovable-gemini-pro']; // Best for creative writing
    case 'math':
      return ['lovable-gpt5', 'chatgpt']; // Strong math reasoning
    default:
      return ['lovable-gemini-flash']; // Fast, balanced for general queries
  }
};

/**
 * Get query type display information
 */
export const getQueryTypeInfo = (queryType: QueryType): { label: string; color: string; icon: string } => {
  switch (queryType) {
    case 'code':
      return { label: 'Code', color: 'text-blue-400', icon: '💻' };
    case 'research':
      return { label: 'Research', color: 'text-orange-400', icon: '🔍' };
    case 'creative':
      return { label: 'Creative', color: 'text-purple-400', icon: '✨' };
    case 'math':
      return { label: 'Math', color: 'text-green-400', icon: '🔢' };
    default:
      return { label: 'General', color: 'text-gray-400', icon: '💬' };
  }
};
