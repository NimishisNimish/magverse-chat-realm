import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useMilestoneTracker } from "@/hooks/useMilestoneTracker";
import { Trophy, Star, Lock } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import ScrollProgressIndicator from "@/components/ScrollProgressIndicator";

const Achievements = () => {
  const { allMilestones, achievedMilestones, currentProgress, getProgress } = useMilestoneTracker();
  
  const totalAchievements = allMilestones.length;
  const unlockedCount = achievedMilestones.length;
  const overallProgress = (unlockedCount / totalAchievements) * 100;

  return (
    <div className="min-h-screen bg-background">
      <ScrollProgressIndicator />
      <Navbar />
      
      <div className="container mx-auto px-4 pt-24 pb-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Trophy className="w-12 h-12 text-primary" />
            <h1 className="text-5xl font-bold gradient-text">Achievements</h1>
          </div>
          <p className="text-xl text-muted-foreground mb-6">
            Track your progress and unlock new milestones
          </p>
          
          {/* Overall Progress */}
          <Card className="max-w-2xl mx-auto card-hover-effect">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-primary" />
                  Overall Progress
                </CardTitle>
                <Badge variant="secondary" className="text-lg">
                  {unlockedCount} / {totalAchievements}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Progress value={overallProgress} className="h-4 mb-2" />
              <p className="text-sm text-muted-foreground text-center">
                {overallProgress.toFixed(0)}% Complete
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Achievements Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {allMilestones.map((milestone, index) => {
            const isUnlocked = achievedMilestones.includes(milestone.id);
            const progress = getProgress(milestone.type);
            const progressPercentage = progress.target > 0 
              ? (progress.current / progress.target) * 100 
              : 0;

            return (
              <motion.div
                key={milestone.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  className={`card-hover-effect relative overflow-hidden ${
                    isUnlocked ? 'border-primary shadow-lg' : 'opacity-60'
                  }`}
                >
                  {/* Unlock Animation Effect */}
                  {isUnlocked && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 0.5, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}

                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <motion.div
                          className="text-5xl"
                          animate={isUnlocked ? { 
                            rotate: [0, -10, 10, -10, 0],
                            scale: [1, 1.1, 1]
                          } : {}}
                          transition={{ 
                            duration: 0.5,
                            repeat: isUnlocked ? Infinity : 0,
                            repeatDelay: 3
                          }}
                        >
                          {isUnlocked ? milestone.icon : <Lock className="w-12 h-12 text-muted" />}
                        </motion.div>
                        <div>
                          <CardTitle className="text-lg">
                            {milestone.title}
                          </CardTitle>
                          <CardDescription className="text-sm">
                            {milestone.description}
                          </CardDescription>
                        </div>
                      </div>
                      {isUnlocked && (
                        <Badge variant="default" className="bg-primary">
                          <Trophy className="w-3 h-3 mr-1" />
                          Unlocked
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent>
                    {!isUnlocked && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">
                            {progress.current} / {milestone.target}
                          </span>
                        </div>
                        <Progress 
                          value={progressPercentage} 
                          className="h-2"
                        />
                        <p className="text-xs text-muted-foreground text-center">
                          {(progressPercentage).toFixed(0)}% Complete
                        </p>
                      </div>
                    )}
                    
                    {isUnlocked && (
                      <div className="text-center">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="inline-flex items-center gap-2 text-primary font-semibold"
                        >
                          <Star className="w-4 h-4 fill-primary" />
                          Achievement Unlocked!
                          <Star className="w-4 h-4 fill-primary" />
                        </motion.div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Motivation Message */}
        {unlockedCount < totalAchievements && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-12 text-center"
          >
            <Card className="max-w-md mx-auto bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20">
              <CardContent className="pt-6">
                <p className="text-lg font-medium mb-2">Keep Going! 🚀</p>
                <p className="text-sm text-muted-foreground">
                  You have {totalAchievements - unlockedCount} more achievement{totalAchievements - unlockedCount !== 1 ? 's' : ''} to unlock.
                  Keep using MagVerse AI to reach new milestones!
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Perfect Score */}
        {unlockedCount === totalAchievements && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-12 text-center"
          >
            <Card className="max-w-md mx-auto bg-gradient-to-br from-primary via-secondary to-accent border-primary shadow-2xl">
              <CardContent className="pt-8 pb-8">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="text-6xl mb-4"
                >
                  🏆
                </motion.div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  Perfect Score!
                </h3>
                <p className="text-white/80">
                  Congratulations! You've unlocked all achievements!
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Achievements;
