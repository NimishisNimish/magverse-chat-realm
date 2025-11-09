import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Zap, Infinity, Crown, Loader2, CheckCircle2, XCircle, CreditCard, QrCode } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePaymentStatus } from "@/hooks/usePaymentStatus";
import upiQrCode from "@/assets/upi-qr-code.jpg";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const Upgrade = () => {
  const [loading, setLoading] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'lifetime'>('lifetime');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'upi'>('razorpay');
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

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

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
    setPaymentMethod('razorpay');
  };

  const handleRazorpayPayment = async () => {
    try {
      setLoading(true);

      // Load Razorpay script
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        throw new Error('Failed to load Razorpay SDK');
      }

      // Create order
      const { data, error } = await supabase.functions.invoke('razorpay-create-order', {
        body: { planType: selectedPlan },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to create order');
      }

      const options = {
        key: data.keyId,
        amount: data.amount * 100,
        currency: data.currency,
        name: 'Magverse AI',
        description: selectedPlan === 'monthly' ? 'Yearly Pro Subscription' : 'Lifetime Pro Access',
        order_id: data.orderId,
        handler: async function (response: any) {
          try {
            setLoading(true);
            // Verify payment
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke('razorpay-verify-payment', {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
            });

            if (verifyError) throw verifyError;

            if (verifyData.success) {
              toast({
                title: "Payment Successful!",
                description: "Your subscription has been activated",
              });
              await refreshProfile();
              setShowPaymentDialog(false);
              navigate("/chat");
            } else {
              throw new Error(verifyData.error || 'Payment verification failed');
            }
          } catch (error: any) {
            console.error('Payment verification error:', error);
            toast({
              title: "Verification Failed",
              description: error.message || "Please contact support",
              variant: "destructive",
            });
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          email: user?.email || '',
        },
        theme: {
          color: '#6366f1',
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      console.error('Razorpay error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to initiate payment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUPIPayment = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('create-upi-payment', {
        body: { planType: selectedPlan },
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
      console.error("Error creating UPI payment:", error);
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
              Choose the perfect plan for your needs - start free, go yearly, or unlock lifetime access
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
                  <span className="text-foreground">Access to all 7+ AI models</span>
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

            {/* Yearly Plan */}
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
                  <span className="text-4xl font-bold gradient-text">₹199</span>
                  <span className="text-sm line-through text-muted-foreground">₹299</span>
                  <span className="text-muted-foreground">/per year</span>
                </div>
                <p className="text-xs text-green-500 font-semibold">Limited Time Offer - Save ₹100!</p>
              </div>
              
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">500 messages/day</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">All 7+ premium AI models</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">Deep research mode</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">Image generation</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">Priority support</span>
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
                  <span className="text-4xl font-bold">₹699</span>
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
                  Yes! The Lifetime plan is a one-time payment for unlimited access forever.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Which AI models are included?</h3>
                <p className="text-sm text-muted-foreground">
                  ChatGPT, Gemini, Claude, Llama, Perplexity, DeepSeek, and Grok - all in one platform.
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

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Choose Payment Method</DialogTitle>
            <DialogDescription>
              {selectedPlan === 'monthly' 
                ? "Pay ₹199 for yearly subscription (500 messages/day for 1 year) - Limited Offer!"
                : "Pay ₹699 for lifetime Pro access (unlimited forever)"
              }
            </DialogDescription>
          </DialogHeader>

          <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as 'razorpay' | 'upi')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="razorpay">
                <CreditCard className="w-4 h-4 mr-2" />
                Card/UPI/Net Banking
              </TabsTrigger>
              <TabsTrigger value="upi">
                <QrCode className="w-4 h-4 mr-2" />
                Direct UPI
              </TabsTrigger>
            </TabsList>

            <TabsContent value="razorpay" className="space-y-4">
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Secure payment via Razorpay. Supports Credit/Debit Cards, UPI, Net Banking, and Wallets.
                </p>
                <Button
                  onClick={handleRazorpayPayment}
                  disabled={loading}
                  className="w-full"
                  size="lg"
                  variant="hero"
                >
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
                  Pay ₹{selectedPlan === 'monthly' ? '299' : '799'}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="upi" className="space-y-4">
              {!paymentLink ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Pay directly via UPI to our merchant UPI ID. Instant activation after verification.
                  </p>
                  <div className="mb-4">
                    <img src={upiQrCode} alt="UPI QR Code" className="w-48 h-48 mx-auto rounded-xl border-2 border-primary/30" />
                    <p className="text-sm font-mono text-primary mt-2">9872021777@fam</p>
                  </div>
                  <Button
                    onClick={handleUPIPayment}
                    disabled={loading}
                    className="w-full"
                    size="lg"
                    variant="hero"
                  >
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <QrCode className="w-4 h-4 mr-2" />}
                    Pay ₹{selectedPlan === 'monthly' ? '299' : '799'} via UPI
                  </Button>
                </div>
              ) : paymentStatus.status === 'pending' ? (
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
                    After paying, we'll automatically verify your payment and activate your subscription.
                  </p>
                </div>
              ) : paymentStatus.status === 'completed' ? (
                <div className="flex flex-col items-center space-y-4 py-8">
                  <CheckCircle2 className="h-16 w-16 text-green-500" />
                  <h3 className="text-xl font-semibold">Payment Successful!</h3>
                  <p className="text-center text-muted-foreground">
                    Your subscription has been activated.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-4 py-8">
                  <XCircle className="h-16 w-16 text-destructive" />
                  <h3 className="text-xl font-semibold">Payment Failed</h3>
                  <p className="text-center text-muted-foreground">
                    {paymentStatus.error || "Please try again or contact support."}
                  </p>
                  <Button onClick={() => setShowPaymentDialog(false)} variant="outline">
                    Close
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Upgrade;