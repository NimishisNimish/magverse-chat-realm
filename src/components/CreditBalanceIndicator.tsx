import { useAuth } from "@/contexts/AuthContext";
import { AlertCircle, Zap } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

export const CreditBalanceIndicator = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  if (!profile) return null;

  const credits = profile.credits_remaining || 0;
  const subscriptionType = profile.subscription_type || 'free';
  const isLifetime = subscriptionType === 'lifetime';
  const isMonthly = subscriptionType === 'monthly';
  const monthlyCreditsUsed = profile.monthly_credits_used || 0;
  const dailyLimit = isMonthly ? 500 : 5;
  const remainingToday = isMonthly ? Math.max(0, dailyLimit - monthlyCreditsUsed) : credits;

  // Show warning if credits are low
  const showWarning = !isLifetime && remainingToday <= 2;
  const showCritical = !isLifetime && remainingToday === 0;

  return (
    <div className="space-y-2">
      {/* Credit Balance Badge */}
      <div className="flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-yellow-500" />
          <span className="text-sm text-muted-foreground">
            {isLifetime ? (
              <Badge variant="default" className="bg-gradient-to-r from-yellow-500 to-orange-500">
                ∞ Unlimited Credits
              </Badge>
            ) : (
              <>
                <span className="font-medium text-foreground">{remainingToday}</span>
                <span className="text-xs"> / {dailyLimit} credits {isMonthly ? 'today' : 'remaining'}</span>
              </>
            )}
          </span>
        </div>
        
        {!isLifetime && (
          <button
            onClick={() => navigate('/pricing')}
            className="text-xs text-primary hover:underline"
          >
            Upgrade
          </button>
        )}
      </div>

      {/* Warning Alerts */}
      {showCritical && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Out of credits! Upgrade to continue using AI models.
          </AlertDescription>
        </Alert>
      )}

      {showWarning && !showCritical && (
        <Alert className="py-2 bg-amber-500/10 border-amber-500/20">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-xs text-amber-500">
            Running low on credits. Consider upgrading to avoid interruptions.
          </AlertDescription>
        </Alert>
      )}

      {/* Provider Note */}
      <p className="text-xs text-muted-foreground">
        Credits apply to Lovable AI models. Direct API models (ChatGPT, Claude, etc.) use your own API keys.
      </p>
    </div>
  );
};
