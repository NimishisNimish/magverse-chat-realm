import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Zap, Infinity, Crown, Copy, CheckCircle2, XCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import upiQrCode from "@/assets/upi-qr-code.jpg";

const Upgrade = () => {
  const [loading, setLoading] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'lifetime'>('lifetime');
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const handleOpenPaymentDialog = (planType: 'monthly' | 'lifetime') => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to upgrade",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    if (profile?.subscription_type === 'lifetime' || profile?.is_pro) {
      toast({
        title: "Already a Pro Member",
        description: "You already have lifetime Pro access",
      });
      return;
    }

    if (planType === 'monthly' && profile?.subscription_type === 'monthly') {
      toast({
        title: "Already Subscribed",
        description: "You already have an active monthly subscription",
      });
      return;
    }

    setSelectedPlan(planType);
    setShowPaymentDialog(true);
    setPaymentStatus('idle');
    setPaymentReference("");
  };

  const handleConfirmPayment = async () => {
    try {
      setLoading(true);
      setPaymentStatus('pending');

      const { data, error } = await supabase.functions.invoke('confirm-upi-payment', {
        body: { 
          paymentReference,
          planType: selectedPlan 
        },
      });

      if (error) throw error;

      if (data.success) {
        setPaymentStatus('success');
        toast({
          title: "Payment Confirmation Received",
          description: "Your payment is being verified. You'll receive Pro access once verified.",
        });
        
        // Refresh profile to get updated transaction status
        await refreshProfile();
        
        // Close dialog after 3 seconds
        setTimeout(() => {
          setShowPaymentDialog(false);
          navigate("/chat");
        }, 3000);
      } else {
        throw new Error(data.message || "Failed to confirm payment");
      }
    } catch (error: any) {
      console.error("Payment confirmation error:", error);
      setPaymentStatus('error');
      toast({
        title: "Confirmation Failed",
        description: error.message || "Failed to confirm payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-32 pb-20">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-4 animate-fade-in">
            <div className="inline-block">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full glass-card border-accent/30 mb-4">
                <Crown className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">Upgrade Your Experience</span>
              </div>
            </div>
            <h1 className="text-5xl font-bold">
              <span className="gradient-text">Choose Your Plan</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose the perfect plan for your needs - start free, go monthly, or unlock lifetime access
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 animate-slide-up">
            <div className="glass-card-hover p-8 rounded-2xl space-y-6 border-accent/20">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-bold">Free Plan</h2>
                </div>
                <p className="text-muted-foreground">Perfect for getting started</p>
              </div>
              
              <div className="space-y-1">
                <div className="text-4xl font-bold">₹0</div>
                <p className="text-sm text-muted-foreground">No credit card required</p>
              </div>
              
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">10 credits per day</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">Access to all 6 AI models</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">1 chat = 1 credit</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">Credits reset daily</span>
                </li>
              </ul>
              
              <Button variant="glass" size="lg" className="w-full" disabled>
                <Zap className="w-5 h-5" />
                Current Plan
              </Button>
            </div>

            {/* Monthly Plan */}
            <div className="glass-card-hover p-8 rounded-2xl space-y-6 border-primary/30 relative">
              <div className="absolute top-4 right-4">
                <div className="px-3 py-1 rounded-full bg-primary/20 text-xs font-semibold text-primary">
                  POPULAR
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-bold">Monthly Plan</h2>
                </div>
                <p className="text-muted-foreground">Affordable subscription</p>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">₹1</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="text-sm text-muted-foreground">Renews every 30 days</p>
              </div>
              
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground font-semibold">50 credits per month</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">Access to all 6 AI models</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">No daily limits</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">Cancel anytime</span>
                </li>
              </ul>
              
              <Button 
                variant="outline" 
                size="lg" 
                className="w-full"
                onClick={() => handleOpenPaymentDialog('monthly')}
                disabled={loading || profile?.subscription_type === 'monthly'}
              >
                <Zap className="w-5 h-5" />
                {loading ? "Processing..." : profile?.subscription_type === 'monthly' ? "Current Plan" : "Subscribe Monthly"}
              </Button>
            </div>
            
            {/* Lifetime Pro Plan */}
            <div className="glass-card p-8 rounded-2xl space-y-6 border-accent relative overflow-hidden animate-glow-pulse">
              <div className="absolute top-4 right-4">
                <div className="px-3 py-1 rounded-full bg-gradient-to-r from-primary to-secondary text-xs font-semibold">
                  BEST VALUE
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Crown className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-bold">Pro Plan</h2>
                </div>
                <p className="text-muted-foreground">Lifetime unlimited access</p>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold gradient-text">₹199</span>
                  <span className="text-muted-foreground line-through">₹999</span>
                </div>
                <p className="text-sm text-muted-foreground">One-time payment • Lifetime access</p>
              </div>
              
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground font-semibold">Unlimited credits forever</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">Access to all 6 AI models</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">No daily limits</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">Priority support</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">Early access to new models</span>
                </li>
              </ul>
              
              <Button 
                variant="hero" 
                size="lg" 
                className="w-full text-lg"
                onClick={() => handleOpenPaymentDialog('lifetime')}
                disabled={loading || profile?.subscription_type === 'lifetime' || profile?.is_pro}
              >
                <Infinity className="w-5 h-5" />
                {loading ? "Processing..." : (profile?.subscription_type === 'lifetime' || profile?.is_pro) ? "Current Plan" : "Pay with UPI"}
              </Button>
            </div>
          </div>
          
          <div className="glass-card p-8 rounded-2xl space-y-6 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <h2 className="text-2xl font-bold text-center">Frequently Asked Questions</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h3 className="font-semibold">What happens after I use my free credits?</h3>
                <p className="text-sm text-muted-foreground">
                  Your free credits reset daily. If you need more, upgrade to Pro for unlimited access.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Is the Pro plan really lifetime?</h3>
                <p className="text-sm text-muted-foreground">
                  Yes! Pay once and enjoy unlimited access to all AI models forever.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Which AI models are included?</h3>
                <p className="text-sm text-muted-foreground">
                  ChatGPT, Gemini, Claude, Llama, Mistral, and Grok - all in one platform.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Can I switch between models?</h3>
                <p className="text-sm text-muted-foreground">
                  Absolutely! Select one or multiple models to get different perspectives on your query.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* UPI Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pay with UPI</DialogTitle>
            <DialogDescription>
              {selectedPlan === 'monthly' 
                ? "Complete your payment of ₹1 for monthly subscription"
                : "Complete your payment of ₹199 for lifetime Pro access"
              }
            </DialogDescription>
          </DialogHeader>

          {paymentStatus === 'idle' && (
            <div className="space-y-6">
              {/* QR Code */}
              <div className="flex flex-col items-center space-y-4">
                <img
                  src={upiQrCode}
                  alt="UPI QR Code"
                  className="w-64 h-64 object-contain border-2 border-border rounded-lg"
                />
                <p className="text-sm text-muted-foreground text-center">
                  Scan this QR code with any UPI app
                </p>
              </div>

              {/* UPI ID */}
              <div className="space-y-2">
                <Label>Or pay directly to this UPI ID:</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    value="987202177@fam"
                    readOnly
                    className="font-mono"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard("987202177@fam", "UPI ID")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Payment Reference (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="reference">
                  Transaction ID / UTR (Optional)
                </Label>
                <Input
                  id="reference"
                  placeholder="Enter UTR number if available"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  This helps us verify your payment faster
                </p>
              </div>

              {/* Confirm Button */}
              <Button
                onClick={handleConfirmPayment}
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? "Confirming..." : "I've Completed Payment"}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                After confirmation, your payment will be verified by our team within 24 hours.
                {selectedPlan === 'monthly' && " Your subscription will renew automatically every 30 days."}
              </p>
            </div>
          )}

          {paymentStatus === 'success' && (
            <div className="flex flex-col items-center space-y-4 py-8">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <h3 className="text-xl font-semibold">Payment Confirmation Received!</h3>
              <p className="text-center text-muted-foreground">
                Your payment is being verified. You'll receive {selectedPlan === 'monthly' ? '50 credits for your monthly subscription' : 'unlimited Pro access'} once our team confirms the payment.
              </p>
            </div>
          )}

          {paymentStatus === 'error' && (
            <div className="flex flex-col items-center space-y-4 py-8">
              <XCircle className="h-16 w-16 text-destructive" />
              <h3 className="text-xl font-semibold">Confirmation Failed</h3>
              <p className="text-center text-muted-foreground">
                There was an error confirming your payment. Please try again or contact support.
              </p>
              <Button onClick={() => setPaymentStatus('idle')} variant="outline">
                Try Again
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Upgrade;
