import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Zap, Crown, Coins } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CreditTopUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const creditPackages = [
  { id: 'credits_50', credits: 50, amount: 49, description: '50 Credits' },
  { id: 'credits_200', credits: 200, amount: 149, description: '200 Credits', popular: true },
  { id: 'credits_500', credits: 500, amount: 299, description: '500 Credits', bestValue: true },
];

export const CreditTopUpDialog = ({ open, onOpenChange }: CreditTopUpDialogProps) => {
  const navigate = useNavigate();

  const handleBuyCredits = () => {
    onOpenChange(false);
    navigate('/payment');
  };

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
            You've used all your available credits. Buy a credit package or upgrade for unlimited access.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Credit Packages */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Coins className="w-4 h-4" />
              Quick Top-Up
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {creditPackages.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`relative p-3 rounded-lg border text-center cursor-pointer transition-all hover:border-primary/50 ${
                    pkg.popular ? 'border-accent bg-accent/5' : 'border-border'
                  }`}
                  onClick={handleBuyCredits}
                >
                  {pkg.popular && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] bg-accent text-accent-foreground px-1.5 py-0.5 rounded-full">
                      Popular
                    </span>
                  )}
                  <div className="text-lg font-bold">{pkg.credits}</div>
                  <div className="text-xs text-muted-foreground">Credits</div>
                  <div className="text-sm font-semibold text-primary mt-1">₹{pkg.amount}</div>
                </div>
              ))}
            </div>
            <Button onClick={handleBuyCredits} variant="outline" className="w-full mt-2">
              <Coins className="w-4 h-4 mr-2" />
              Buy Credits via UPI
            </Button>
          </div>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or upgrade</span>
            </div>
          </div>

          {/* Pro Plan */}
          <div className="glass-card p-4 rounded-xl space-y-3 border-primary relative">
            <div className="absolute top-2 right-2">
              <div className="px-2 py-0.5 rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                POPULAR
              </div>
            </div>
            
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-primary">₹199</span>
              <span className="text-sm line-through text-muted-foreground">₹299</span>
              <span className="text-sm text-muted-foreground">/year</span>
            </div>
            
            <Button onClick={handleUpgrade} className="w-full" size="sm">
              <Zap className="w-4 h-4 mr-2" />
              Get Pro (500/day)
            </Button>
          </div>

          {/* Lifetime Plan */}
          <div className="glass-card p-4 rounded-xl space-y-3 border-border">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">₹699</span>
              <span className="text-sm text-muted-foreground">/forever</span>
            </div>
            
            <Button onClick={handleUpgrade} variant="outline" className="w-full" size="sm">
              <Crown className="w-4 h-4 mr-2" />
              Get Lifetime (Unlimited)
            </Button>
          </div>
        </div>

        <div className="text-center text-xs text-muted-foreground">
          UPI payments accepted • Instant activation
        </div>
      </DialogContent>
    </Dialog>
  );
};