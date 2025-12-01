import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Zap, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CreditTopUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreditTopUpDialog = ({ open, onOpenChange }: CreditTopUpDialogProps) => {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    onOpenChange(false);
    navigate('/pricing');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl">Out of Credits</DialogTitle>
          <DialogDescription>
            You've used all your available credits. Upgrade to continue using AI models.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Pro Plan */}
          <div className="glass-card p-6 rounded-xl space-y-4 border-primary relative">
            <div className="absolute top-3 right-3">
              <div className="px-2 py-1 rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                POPULAR
              </div>
            </div>
            
            <div>
              <h3 className="text-xl font-bold">Pro</h3>
              <p className="text-sm text-muted-foreground">500 messages/day</p>
            </div>
            
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-primary">₹199</span>
              <span className="text-sm line-through text-muted-foreground">₹299</span>
              <span className="text-sm text-muted-foreground">/year</span>
            </div>
            
            <Button onClick={handleUpgrade} className="w-full" size="lg">
              <Zap className="w-4 h-4 mr-2" />
              Get Pro Access
            </Button>
            
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary" />
                <span>All 7+ premium AI models</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary" />
                <span>Deep research & image generation</span>
              </li>
            </ul>
          </div>

          {/* Lifetime Plan */}
          <div className="glass-card p-6 rounded-xl space-y-4 border-border">
            <div>
              <h3 className="text-xl font-bold">Lifetime</h3>
              <p className="text-sm text-muted-foreground">Unlimited messages forever</p>
            </div>
            
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">₹699</span>
              <span className="text-sm text-muted-foreground">/forever</span>
            </div>
            
            <Button onClick={handleUpgrade} variant="outline" className="w-full" size="lg">
              <Crown className="w-4 h-4 mr-2" />
              Get Lifetime Access
            </Button>
            
            <p className="text-xs text-muted-foreground">
              Pay once, use forever. All future updates included.
            </p>
          </div>
        </div>

        <div className="text-center text-xs text-muted-foreground">
          UPI payments accepted • Instant activation
        </div>
      </DialogContent>
    </Dialog>
  );
};