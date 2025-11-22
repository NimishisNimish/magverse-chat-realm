import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { AlertTriangle, XCircle, Info } from "lucide-react";

export const useCreditLimitNotifications = () => {
  const { profile } = useAuth();
  const notificationShownRef = useRef<{
    date: string;
    thresholds: Set<number>;
  }>({
    date: new Date().toDateString(),
    thresholds: new Set()
  });

  useEffect(() => {
    if (!profile) return;

    // Reset notifications if it's a new day
    const today = new Date().toDateString();
    if (notificationShownRef.current.date !== today) {
      notificationShownRef.current = {
        date: today,
        thresholds: new Set()
      };
    }

    const subscriptionType = profile.subscription_type || 'free';
    
    // Lifetime users have unlimited credits, no need for notifications
    if (subscriptionType === 'lifetime') {
      return;
    }

    let creditsUsed = 0;
    let creditsTotal = 0;

    if (subscriptionType === 'free') {
      // Free users: 5 daily credits
      creditsTotal = 5;
      creditsUsed = 5 - (profile.credits_remaining || 0);
    } else if (subscriptionType === 'monthly') {
      // Monthly users: 500 daily credits
      creditsTotal = 500;
      creditsUsed = profile.monthly_credits_used || 0;
    }

    if (creditsTotal === 0) return;

    const usagePercentage = (creditsUsed / creditsTotal) * 100;
    const creditsRemaining = creditsTotal - creditsUsed;

    // Define notification thresholds
    const thresholds = [
      { percent: 80, message: `You've used 80% of your daily credits. ${creditsRemaining} remaining.`, icon: Info },
      { percent: 90, message: `Running low! You've used 90% of your daily credits. Only ${creditsRemaining} left.`, icon: AlertTriangle },
      { percent: 100, message: "You've reached your daily credit limit. Upgrade for more!", icon: XCircle }
    ];

    // Check each threshold and show notification if not already shown
    thresholds.forEach(({ percent, message, icon: Icon }) => {
      if (usagePercentage >= percent && !notificationShownRef.current.thresholds.has(percent)) {
        notificationShownRef.current.thresholds.add(percent);
        
        toast(message, {
          icon: <Icon className="w-5 h-5" />,
          duration: 6000,
          action: percent === 100 ? {
            label: "Upgrade",
            onClick: () => window.location.href = "/upgrade"
          } : undefined,
          className: percent === 100 ? 'border-destructive' : percent === 90 ? 'border-yellow-500' : ''
        });
      }
    });

  }, [profile]);
};
