import { useAuth } from "@/contexts/AuthContext";
import { Coins, AlertCircle, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";

export const CreditBalanceIndicator = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  
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

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-sm">
        <Coins className="w-4 h-4 text-primary" />
        <span className="text-muted-foreground">
          Credits today: <span className="font-medium text-foreground">{creditsToday}</span>
          {!isLifetime && <span className="text-muted-foreground">/{dailyLimit}</span>}
        </span>
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
