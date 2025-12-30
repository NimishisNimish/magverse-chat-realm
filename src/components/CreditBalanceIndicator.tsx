import { useAuth } from "@/contexts/AuthContext";
import { Coins, AlertCircle, TrendingUp, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CreditBalanceIndicatorProps {
  compact?: boolean;
  showRefresh?: boolean;
}

export const CreditBalanceIndicator = ({ compact = false, showRefresh = false }: CreditBalanceIndicatorProps) => {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  if (!profile) return null;

  const credits = profile.credits_remaining ?? 0;
  const subscriptionType = profile.subscription_type || 'free';
  const isLifetime = subscriptionType === 'lifetime';
  const isMonthly = subscriptionType === 'monthly';
  
  // Determine credit display
  const creditsToday = isLifetime ? '∞' : credits;
  const dailyLimit = isMonthly ? 50 : 5;

  // Show warning for low credits
  const isLowCredits = !isLifetime && credits <= 2 && credits > 0;
  const isOutOfCredits = !isLifetime && credits <= 0;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshProfile();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Coins className="w-4 h-4 text-primary" />
        <AnimatePresence mode="wait">
          <motion.span
            key={credits}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="font-medium text-foreground"
          >
            {creditsToday}
          </motion.span>
        </AnimatePresence>
        {!isLifetime && <span className="text-muted-foreground">/{dailyLimit}</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-sm">
        <Coins className="w-4 h-4 text-primary" />
        <span className="text-muted-foreground">
          Credits today:{" "}
          <AnimatePresence mode="wait">
            <motion.span
              key={credits}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="font-medium text-foreground inline-block"
            >
              {creditsToday}
            </motion.span>
          </AnimatePresence>
          {!isLifetime && <span className="text-muted-foreground">/{dailyLimit}</span>}
        </span>
        {showRefresh && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 ml-1"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>
      
      {isOutOfCredits && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Out of credits!</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/pricing')}
              className="ml-2"
            >
              <TrendingUp className="w-3 h-3 mr-1" />
              Upgrade
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {isLowCredits && (
        <Alert className="py-2 border-yellow-500/50 bg-yellow-500/10">
          <AlertCircle className="h-4 w-4 text-yellow-500" />
          <AlertDescription className="text-yellow-600 dark:text-yellow-400">
            Only {credits} credit{credits !== 1 ? 's' : ''} remaining today
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
