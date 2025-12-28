import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sparkles, UserPlus } from "lucide-react";
import { motion } from "framer-motion";

interface GuestChatLimitBannerProps {
  remainingMessages: number;
  messageLimit: number;
  messageCount: number;
}

export const GuestChatLimitBanner = ({
  remainingMessages,
  messageLimit,
  messageCount,
}: GuestChatLimitBannerProps) => {
  const progressValue = (messageCount / messageLimit) * 100;
  const isLowMessages = remainingMessages <= 1;
  const isExhausted = remainingMessages === 0;

  if (isExhausted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mx-4 mb-4"
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-destructive/20 rounded-full">
              <Sparkles className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="font-medium text-foreground">Free messages used up</p>
              <p className="text-sm text-muted-foreground">
                Sign up to continue chatting with AI
              </p>
            </div>
          </div>
          <Link to="/auth">
            <Button className="gap-2 bg-primary hover:bg-primary/90">
              <UserPlus className="w-4 h-4" />
              Sign Up Free
            </Button>
          </Link>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border rounded-lg p-3 mx-4 mb-4 ${
        isLowMessages
          ? "bg-orange-500/10 border-orange-500/20"
          : "bg-primary/5 border-primary/20"
      }`}
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div
            className={`p-2 rounded-full ${
              isLowMessages ? "bg-orange-500/20" : "bg-primary/20"
            }`}
          >
            <Sparkles
              className={`w-4 h-4 ${
                isLowMessages ? "text-orange-500" : "text-primary"
              }`}
            />
          </div>
          <div className="flex-1 sm:flex-initial">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium">Guest Mode</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  isLowMessages
                    ? "bg-orange-500/20 text-orange-600 dark:text-orange-400"
                    : "bg-primary/20 text-primary"
                }`}
              >
                {remainingMessages} of {messageLimit} free messages left
              </span>
            </div>
            <Progress
              value={progressValue}
              className={`h-1.5 w-full sm:w-32 ${
                isLowMessages ? "[&>div]:bg-orange-500" : ""
              }`}
            />
          </div>
        </div>
        <Link to="/auth" className="w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 w-full sm:w-auto border-primary/30 hover:bg-primary/10"
          >
            <UserPlus className="w-4 h-4" />
            Sign up for unlimited
          </Button>
        </Link>
      </div>
    </motion.div>
  );
};
