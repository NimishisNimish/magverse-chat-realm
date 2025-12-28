import { useState, useEffect, useCallback } from 'react';

const GUEST_MESSAGE_LIMIT = 3;
const GUEST_MESSAGES_KEY = 'guest_chat_messages_count';
const GUEST_MESSAGES_TIMESTAMP_KEY = 'guest_chat_messages_timestamp';

// Reset guest messages after 24 hours
const RESET_INTERVAL_MS = 24 * 60 * 60 * 1000;

export const useGuestChat = () => {
  const [messageCount, setMessageCount] = useState<number>(() => {
    const stored = localStorage.getItem(GUEST_MESSAGES_KEY);
    const timestamp = localStorage.getItem(GUEST_MESSAGES_TIMESTAMP_KEY);
    
    // Check if we should reset (24 hours passed)
    if (timestamp) {
      const lastReset = parseInt(timestamp, 10);
      if (Date.now() - lastReset > RESET_INTERVAL_MS) {
        localStorage.setItem(GUEST_MESSAGES_KEY, '0');
        localStorage.setItem(GUEST_MESSAGES_TIMESTAMP_KEY, Date.now().toString());
        return 0;
      }
    } else {
      localStorage.setItem(GUEST_MESSAGES_TIMESTAMP_KEY, Date.now().toString());
    }
    
    return stored ? parseInt(stored, 10) : 0;
  });

  const incrementMessageCount = useCallback(() => {
    setMessageCount(prev => {
      const newCount = prev + 1;
      localStorage.setItem(GUEST_MESSAGES_KEY, newCount.toString());
      return newCount;
    });
  }, []);

  const getRemainingMessages = useCallback(() => {
    return Math.max(0, GUEST_MESSAGE_LIMIT - messageCount);
  }, [messageCount]);

  const hasReachedLimit = useCallback(() => {
    return messageCount >= GUEST_MESSAGE_LIMIT;
  }, [messageCount]);

  const resetGuestMessages = useCallback(() => {
    setMessageCount(0);
    localStorage.setItem(GUEST_MESSAGES_KEY, '0');
    localStorage.setItem(GUEST_MESSAGES_TIMESTAMP_KEY, Date.now().toString());
  }, []);

  return {
    messageCount,
    messageLimit: GUEST_MESSAGE_LIMIT,
    incrementMessageCount,
    getRemainingMessages,
    hasReachedLimit,
    resetGuestMessages,
  };
};
