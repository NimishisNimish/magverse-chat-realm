import { useMemo } from 'react';

const taskKeywords = {
  coding: [
    'code', 'debug', 'function', 'error', 'bug', 'compile', 'syntax',
    'algorithm', 'program', 'script', 'javascript', 'python', 'java',
    'typescript', 'react', 'api', 'database', 'sql'
  ],
  creative: [
    'write', 'story', 'poem', 'creative', 'imagine', 'describe',
    'narrative', 'character', 'plot', 'fiction', 'essay', 'blog',
    'article', 'content'
  ],
  research: [
    'search', 'find', 'research', 'what is', 'who is', 'when did',
    'where is', 'how to', 'latest', 'current', 'news', 'information'
  ],
  analysis: [
    'analyze', 'analysis', 'compare', 'evaluate', 'interpret',
    'statistics', 'data', 'trends', 'insights', 'metrics'
  ],
};

export const usePresetDetection = (message: string) => {
  const detectedTaskType = useMemo(() => {
    if (!message || message.trim().length < 10) return null;

    const lowerMessage = message.toLowerCase();
    const scores: Record<string, number> = {};

    for (const [taskType, keywords] of Object.entries(taskKeywords)) {
      scores[taskType] = keywords.filter(keyword =>
        lowerMessage.includes(keyword)
      ).length;
    }

    const maxScore = Math.max(...Object.values(scores));
    if (maxScore === 0) return null;

    const detectedType = Object.entries(scores).find(
      ([, score]) => score === maxScore
    )?.[0];

    return detectedType || null;
  }, [message]);

  const getPresetSuggestion = () => {
    switch (detectedTaskType) {
      case 'coding':
        return { id: 'coding', name: '🖥️ Coding Assistant', description: 'Optimized for code generation and debugging' };
      case 'creative':
        return { id: 'creative', name: '✍️ Creative Writing', description: 'Best for creative and storytelling tasks' };
      case 'research':
        return { id: 'research', name: '🔍 Research Mode', description: 'Web-enabled for current information' };
      case 'analysis':
        return { id: 'analysis', name: '📊 Data Analysis', description: 'Best for analytical tasks' };
      default:
        return null;
    }
  };

  return {
    detectedTaskType,
    presetSuggestion: getPresetSuggestion(),
  };
};
