import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Zap, Infinity, Crown, Loader2, CheckCircle2, XCircle } from "lucide-react";
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
import { usePaymentStatus } from "@/hooks/usePaymentStatus";

const Upgrade = () => {
  const [loading, setLoading] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'lifetime'>('lifetime');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Use payment status polling hook
  const paymentStatus = usePaymentStatus(orderId, async () => {
    toast({
      title: "Payment Verified!",
      description: `Your ${selectedPlan === 'monthly' ? 'yearly Pro subscription' : 'lifetime Pro access'} has been activated.`,
    });
    await refreshProfile();
    setTimeout(() => {
      setShowPaymentDialog(false);
      navigate("/chat");
    }, 2000);
  });

  const handleOpenPaymentDialog = async (planType: 'monthly' | 'lifetime') => {
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
        description: "You already have an active yearly subscription",
      });
      return;
    }

    setSelectedPlan(planType);
    setShowPaymentDialog(true);
    setOrderId(null);
    setPaymentLink(null);
    
    // Create payment order
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('create-upi-payment', {
        body: { planType },
      });

      if (error) throw error;

      if (data.success) {
        setOrderId(data.orderId);
        setPaymentLink(data.paymentLink);
        toast({
          title: "Payment Ready",
          description: "Click the button below to pay with UPI",
        });
      } else {
        throw new Error(data.error || "Failed to create payment");
      }
    } catch (error: any) {
      console.error("Error creating payment:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create payment. Please try again.",
        variant: "destructive",
      });
      setShowPaymentDialog(false);
    } finally {
      setLoading(false);
    }
  };

  const handlePayWithUPI = () => {
    if (paymentLink) {
      // Open UPI link in new tab (will open UPI app on mobile)
      window.open(paymentLink, '_blank');
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

            {/* Yearly Plan (Using monthly in backend) */}
            <div className="glass-card p-8 rounded-2xl space-y-6 border-primary relative">
              <div className="absolute top-4 right-4">
                <div className="px-3 py-1 rounded-full bg-primary text-xs font-semibold text-white">
                  MOST POPULAR
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-bold">Pro Plan</h2>
                </div>
                <p className="text-muted-foreground">Full access to all premium AI models</p>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold gradient-text">₹299</span>
                  <span className="text-muted-foreground">/per year</span>
                </div>
              </div>
              
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">Unlimited messages</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">All 6+ premium AI models</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">Priority support</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">Fastest response times</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">Advanced features</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">Team collaboration (up to 3)</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">Chat history & export</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">API access</span>
                </li>
              </ul>
              
              <Button 
                variant="hero" 
                size="lg" 
                className="w-full"
                onClick={() => handleOpenPaymentDialog('monthly')}
                disabled={loading || profile?.subscription_type === 'monthly'}
              >
                <Zap className="w-5 h-5" />
                {loading ? "Processing..." : profile?.subscription_type === 'monthly' ? "Current Plan" : "Subscribe Yearly"}
              </Button>
            </div>
            
            {/* Lifetime Plan */}
            <div className="glass-card-hover p-8 rounded-2xl space-y-6 border-accent/20">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Crown className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-bold">Lifetime</h2>
                </div>
                <p className="text-muted-foreground">For individuals and professionals</p>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">₹799</span>
                  <span className="text-muted-foreground">/forever</span>
                </div>
              </div>
              
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground font-semibold">Everything in Pro</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">Lifetime access - pay once</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">All future model updates</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">Priority feature requests</span>
                </li>
              </ul>
              
              <Button 
                variant="outline" 
                size="lg" 
                className="w-full"
                onClick={() => handleOpenPaymentDialog('lifetime')}
                disabled={loading || profile?.subscription_type === 'lifetime' || profile?.is_pro}
              >
                <Infinity className="w-5 h-5" />
                {loading ? "Processing..." : (profile?.subscription_type === 'lifetime' || profile?.is_pro) ? "Current Plan" : "Get Lifetime Access"}
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
                ? "Pay ₹299 for yearly subscription (unlimited for 1 year)"
                : "Pay ₹799 for lifetime Pro access (unlimited forever)"
              }
            </DialogDescription>
          </DialogHeader>

          {loading && (
            <div className="flex flex-col items-center space-y-4 py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-center text-muted-foreground">
                Creating payment order...
              </p>
            </div>
          )}

          {!loading && paymentLink && paymentStatus.status === 'pending' && (
            <div className="space-y-6">
              <div className="flex flex-col items-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Waiting for Payment</h3>
                <p className="text-center text-sm text-muted-foreground">
                  Complete the payment in your UPI app
                </p>
              </div>

              <Button
                onClick={handlePayWithUPI}
                className="w-full"
                size="lg"
                variant="hero"
              >
                Pay ₹{selectedPlan === 'monthly' ? '299' : '799'} with UPI
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                After paying, we'll automatically verify your payment and activate your {selectedPlan === 'monthly' ? 'yearly subscription' : 'lifetime Pro access'}.
              </p>
            </div>
          )}

          {paymentStatus.status === 'completed' && (
            <div className="flex flex-col items-center space-y-4 py-8">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <h3 className="text-xl font-semibold">Payment Successful!</h3>
              <p className="text-center text-muted-foreground">
                Your {selectedPlan === 'monthly' ? 'yearly Pro subscription with unlimited access' : 'lifetime Pro access with unlimited access'} has been activated.
              </p>
            </div>
          )}

          {paymentStatus.status === 'error' && (
            <div className="flex flex-col items-center space-y-4 py-8">
              <XCircle className="h-16 w-16 text-destructive" />
              <h3 className="text-xl font-semibold">Payment Failed</h3>
              <p className="text-center text-muted-foreground">
                {paymentStatus.error || "There was an error processing your payment. Please try again or contact support."}
              </p>
              <Button onClick={() => setShowPaymentDialog(false)} variant="outline">
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Upgrade;
