import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { triggerSuccessConfetti } from '@/utils/confetti';
import { toast } from '@/hooks/use-toast';

interface Milestone {
  id: string;
  title: string;
  description: string;
  target: number;
  icon: string;
  type: 'chats' | 'messages' | 'images';
}

const MILESTONES: Milestone[] = [
  { id: 'first_chat', title: 'First Steps', description: 'Sent your first message', target: 1, icon: '🎯', type: 'messages' },
  { id: 'chat_10', title: 'Getting Started', description: 'Started 10 conversations', target: 10, icon: '🚀', type: 'chats' },
  { id: 'messages_50', title: 'Chatty Cathy', description: 'Sent 50 messages', target: 50, icon: '💬', type: 'messages' },
  { id: 'messages_100', title: 'Conversation Master', description: 'Sent 100 messages', target: 100, icon: '⭐', type: 'messages' },
  { id: 'images_50', title: 'Creative Mind', description: 'Generated 50 images', target: 50, icon: '🎨', type: 'images' },
];

export const useMilestoneTracker = () => {
  const { user } = useAuth();
  const [achievedMilestones, setAchievedMilestones] = useState<Set<string>>(new Set());
  const [currentProgress, setCurrentProgress] = useState({ chats: 0, messages: 0, images: 0 });

  useEffect(() => {
    if (!user) return;
    loadProgress();
    
    // Real-time subscription
    const channel = supabase
      .channel('milestone-tracking')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_messages',
        filter: `user_id=eq.${user.id}`
      }, () => {
        loadProgress();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const loadProgress = async () => {
    if (!user) return;

    // Get message count
    const { count: messageCount } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Get chat count
    const { count: chatCount } = await supabase
      .from('chat_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Get image count (from chat_messages where response contains image)
    const { count: imageCount } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('role', 'assistant')
      .like('content', '%![image]%');

    const newProgress = {
      messages: messageCount || 0,
      chats: chatCount || 0,
      images: imageCount || 0
    };

    setCurrentProgress(newProgress);
    checkMilestones(newProgress);
  };

  const checkMilestones = (progress: typeof currentProgress) => {
    MILESTONES.forEach(milestone => {
      const currentValue = progress[milestone.type];
      
      if (currentValue >= milestone.target && !achievedMilestones.has(milestone.id)) {
        // Milestone achieved!
        setAchievedMilestones(prev => new Set(prev).add(milestone.id));
        celebrateMilestone(milestone);
      }
    });
  };

  const celebrateMilestone = (milestone: Milestone) => {
    // Trigger confetti
    triggerSuccessConfetti();
    
    // Show celebration toast
    toast({
      title: `${milestone.icon} Achievement Unlocked!`,
      description: `${milestone.title}: ${milestone.description}`,
      duration: 8000,
    });
  };

  const getNextMilestone = (type: 'chats' | 'messages' | 'images') => {
    const relevantMilestones = MILESTONES
      .filter(m => m.type === type && !achievedMilestones.has(m.id))
      .sort((a, b) => a.target - b.target);
    
    return relevantMilestones[0] || null;
  };

  const getProgress = (type: 'chats' | 'messages' | 'images') => {
    const next = getNextMilestone(type);
    if (!next) return { current: currentProgress[type], target: 0, percentage: 100 };
    
    return {
      current: currentProgress[type],
      target: next.target,
      percentage: Math.min((currentProgress[type] / next.target) * 100, 100)
    };
  };

  return {
    achievedMilestones: Array.from(achievedMilestones),
    currentProgress,
    getNextMilestone,
    getProgress,
    allMilestones: MILESTONES
  };
};
