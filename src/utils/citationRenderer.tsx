/**
 * Renders text with inline citation links that scroll to corresponding sources
 */
export const renderWithCitations = (text: string, sources?: Array<{url: string, title: string, snippet?: string}>): string => {
  if (!sources || sources.length === 0) return text;

  // Replace [1], [2], [3] etc with clickable links
  return text.replace(/\[(\d+)\]/g, (match, number) => {
    const index = parseInt(number) - 1;
    if (index >= 0 && index < sources.length) {
      const source = sources[index];
      return `<a 
        href="#source-${index}" 
        class="inline-citation" 
        title="${source.title || source.url}"
        onclick="event.preventDefault(); document.getElementById('source-${index}')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });"
      >[${number}]</a>`;
    }
    return match;
  });
};

/**
 * Gets the estimated response time for a model based on historical data
 */
export const getEstimatedResponseTime = (modelId: string, responseTimes: Map<string, number[]>): number => {
  const times = responseTimes.get(modelId);
  if (!times || times.length === 0) {
    // Default estimates per model (in seconds)
    const defaults: Record<string, number> = {
      'gemini-flash': 8,
      'gemini-lite': 6,
      'gpt-5-nano': 7,
      'gpt-5-mini': 10,
      'gemini-pro': 15,
      'gpt-5': 18,
      'claude': 20,
      'perplexity': 12,
      'grok': 15,
    };
    return defaults[modelId] || 10;
  }

  // Calculate average from last 5 responses
  const recent = times.slice(-5);
  const average = recent.reduce((sum, time) => sum + time, 0) / recent.length;
  return Math.ceil(average / 1000); // Convert to seconds
};

/**
 * Records a response time for a model
 */
export const recordResponseTime = (
  modelId: string, 
  responseTime: number,
  setModelResponseTimes: React.Dispatch<React.SetStateAction<Map<string, number[]>>>
) => {
  setModelResponseTimes(prev => {
    const newMap = new Map(prev);
    const times = newMap.get(modelId) || [];
    // Keep last 10 response times
    const updated = [...times, responseTime].slice(-10);
    newMap.set(modelId, updated);
    return newMap;
  });
};
