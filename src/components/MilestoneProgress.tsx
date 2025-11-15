import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useMilestoneTracker } from "@/hooks/useMilestoneTracker";

export const MilestoneProgress = () => {
  const { getProgress, getNextMilestone, achievedMilestones } = useMilestoneTracker();
  
  const types = [
    { type: 'messages' as const, label: 'Messages', icon: '💬' },
    { type: 'chats' as const, label: 'Conversations', icon: '🗨️' },
    { type: 'images' as const, label: 'Images', icon: '🎨' }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🏆 Your Achievements
          <Badge variant="secondary">
            {achievedMilestones.length} Unlocked
          </Badge>
        </CardTitle>
        <CardDescription>
          Keep going to unlock more milestones!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {types.map(({ type, label, icon }) => {
          const progress = getProgress(type);
          const nextMilestone = getNextMilestone(type);
          
          if (!nextMilestone) return null;
          
          return (
            <motion.div 
              key={type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  {icon} {label}
                </span>
                <span className="text-sm text-muted-foreground">
                  {progress.current} / {progress.target}
                </span>
              </div>
              <Progress value={progress.percentage} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Next: {nextMilestone.title}
              </p>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
};
