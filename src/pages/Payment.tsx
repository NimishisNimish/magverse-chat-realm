import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Copy, 
  CreditCard, 
  Smartphone, 
  Shield, 
  CheckCircle, 
  X, 
  Zap, 
  Crown, 
  ArrowRight,
  Clock,
  Sparkles,
  AlertCircle
} from "lucide-react";
import upiQrCode from "@/assets/phonepe-qr-code.png";
import { triggerUpgradeConfetti } from "@/utils/confetti";
import { motion } from "framer-motion";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const Payment = () => {
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "lifetime">("lifetime");
  const [paymentMethod, setPaymentMethod] = useState<"razorpay" | "upi">("upi");
  const [isProcessing, setIsProcessing] = useState(false);
  const [upiId, setUpiId] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [selectedCreditPackage, setSelectedCreditPackage] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const { data: transactions = [] } = useQuery({
    queryKey: ['user-transactions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  const plans = {
    monthly: {
      name: "Pro Yearly",
      amount: 199,
      description: "500 messages/day for 1 year",
      features: ["All 7+ AI models", "Image generation", "Deep research mode"]
    },
    lifetime: {
      name: "Lifetime Pro",
      amount: 699,
      description: "Unlimited access forever",
      features: ["Everything in yearly", "Priority support", "Future updates"]
    }
  };

  const creditPackages = [
    { id: 'credits_50', credits: 50, amount: 49, perCredit: "₹0.98" },
    { id: 'credits_200', credits: 200, amount: 149, perCredit: "₹0.75", popular: true },
    { id: 'credits_500', credits: 500, amount: 299, perCredit: "₹0.60", bestValue: true },
  ];

  const handleRazorpayPayment = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    try {
      setIsProcessing(true);

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
      });

      const { data: orderData, error: orderError } = await supabase.functions.invoke("razorpay-create-order", {
        body: {
          amount: plans[selectedPlan].amount,
          planType: selectedPlan
        }
      });
      
      if (orderError || !orderData?.success) {
        throw new Error(orderData?.error || "Failed to create order");
      }

      const options = {
        key: orderData.razorpayKeyId,
        amount: orderData.order.amount,
        currency: "INR",
        name: "MagVerse AI",
        description: plans[selectedPlan].name,
        order_id: orderData.order.id,
        handler: async function (response: any) {
          try {
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke("razorpay-verify-payment", {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                transactionId: orderData.transactionId
              }
            });
            
            if (verifyError || !verifyData?.success) {
              throw new Error(verifyData?.error || "Payment verification failed");
            }
            
            triggerUpgradeConfetti();
            
            toast({
              title: "Payment Successful!",
              description: `Your ${plans[selectedPlan].name} subscription is now active.`
            });
            setTimeout(() => navigate("/chat"), 2000);
          } catch (error: any) {
            console.error("Payment verification error:", error);
            toast({
              title: "Payment Verification Failed",
              description: error.message,
              variant: "destructive"
            });
          }
        },
        prefill: { email: user.email },
        theme: { color: "#9333ea" }
      };
      
      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      console.error("Payment error:", error);
      toast({
        title: "Payment Failed",
        description: error.message || "Something went wrong",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpiSubmit = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!upiId.trim()) {
      toast({
        title: "UPI ID Required",
        description: "Please enter your UPI ID",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsProcessing(true);

      let proofUrl = "";
      if (paymentProof) {
        setUploadingProof(true);
        const fileExt = paymentProof.name.split('.').pop();
        const filePath = `${user.id}/payment-proofs/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('chat-attachments').upload(filePath, paymentProof);
        if (uploadError) throw uploadError;
        const { data: urlData } = await supabase.storage.from('chat-attachments').createSignedUrl(filePath, 31536000);
        if (urlData) proofUrl = urlData.signedUrl;
        setUploadingProof(false);
      }
      
      const paymentAmount = selectedCreditPackage 
        ? creditPackages.find(p => p.id === selectedCreditPackage)?.amount || 0
        : plans[selectedPlan].amount;
      
      const planType = selectedCreditPackage || selectedPlan;
      
      const { data: txData, error } = await supabase.from("transactions").insert({
        user_id: user.id,
        amount: paymentAmount,
        status: "pending",
        plan_type: planType,
        payment_method: "upi",
        payment_reference: `UPI ID: ${upiId}${paymentNote ? ` - Note: ${paymentNote}` : ""}${proofUrl ? ` - Proof: ${proofUrl}` : ""}`,
        verification_status: "pending_verification"
      }).select();
      
      if (error) throw error;

      if (txData && txData.length > 0) {
        try {
          await supabase.functions.invoke('notify-admin-payment', {
            body: { transactionId: txData[0].id }
          });
        } catch (notifyError) {
          console.error('Failed to notify admin:', notifyError);
        }
      }
      
      toast({
        title: "Payment Request Submitted",
        description: paymentProof ? "Payment proof uploaded! We'll verify and activate your account within 24 hours." : "Please complete payment and wait for verification."
      });
      
      setUpiId("");
      setPaymentNote("");
      setPaymentProof(null);
    } catch (error: any) {
      console.error("Error submitting payment:", error);
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setUploadingProof(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 pb-12 flex items-center justify-center">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <CardTitle>Authentication Required</CardTitle>
              <CardDescription>Please sign in to continue with payment</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/auth")} className="w-full" size="lg">
                Sign In to Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="container relative mx-auto px-4 pt-24 pb-12">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <Badge variant="outline" className="px-4 py-2 bg-primary/5">
              <Shield className="w-4 h-4 mr-2 text-primary" />
              Secure Payment
            </Badge>
            <h1 className="text-4xl font-bold">Complete Your Payment</h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Choose your preferred payment method to unlock premium features
            </p>
          </motion.div>

          {/* Credit Top-Up Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  Credit Top-Up
                </CardTitle>
                <CardDescription>
                  Buy credits for pay-as-you-go usage. Credits never expire.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  {creditPackages.map((pkg) => (
                    <button
                      key={pkg.id}
                      onClick={() => {
                        setSelectedCreditPackage(pkg.id);
                        setSelectedPlan("monthly");
                      }}
                      className={`relative p-5 rounded-xl border-2 transition-all text-left hover:scale-[1.02] ${
                        selectedCreditPackage === pkg.id
                          ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                          : "border-border/50 hover:border-primary/50"
                      }`}
                    >
                      {pkg.popular && (
                        <Badge className="absolute -top-2.5 right-3 bg-primary">Popular</Badge>
                      )}
                      {pkg.bestValue && (
                        <Badge className="absolute -top-2.5 right-3 bg-green-500">Best Value</Badge>
                      )}
                      <div className="text-3xl font-bold">{pkg.credits}</div>
                      <div className="text-sm text-muted-foreground mb-2">Credits</div>
                      <div className="text-2xl font-bold text-primary">₹{pkg.amount}</div>
                      <div className="text-xs text-muted-foreground">{pkg.perCredit}/credit</div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Plan Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Select Your Plan</CardTitle>
                <CardDescription>Choose a subscription plan for unlimited access</CardDescription>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4">
                <button 
                  onClick={() => { setSelectedPlan("monthly"); setSelectedCreditPackage(null); }} 
                  className={`relative p-6 rounded-xl border-2 transition-all text-left hover:scale-[1.02] ${
                    selectedPlan === "monthly" && !selectedCreditPackage 
                      ? "border-primary bg-primary/10" 
                      : "border-border/50 hover:border-primary/50"
                  }`}
                >
                  <Badge className="absolute top-4 right-4 bg-green-500">Limited Offer</Badge>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Pro Yearly</h3>
                      <p className="text-sm text-muted-foreground">500 messages/day</p>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-4xl font-bold">₹199</span>
                    <span className="text-muted-foreground line-through">₹299</span>
                    <span className="text-muted-foreground">/year</span>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {plans.monthly.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-primary" /> {f}
                      </li>
                    ))}
                  </ul>
                </button>

                <button 
                  onClick={() => { setSelectedPlan("lifetime"); setSelectedCreditPackage(null); }} 
                  className={`relative p-6 rounded-xl border-2 transition-all text-left hover:scale-[1.02] ${
                    selectedPlan === "lifetime" && !selectedCreditPackage 
                      ? "border-primary bg-primary/10" 
                      : "border-border/50 hover:border-primary/50"
                  }`}
                >
                  <Badge className="absolute top-4 right-4 bg-accent">Best Value</Badge>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                      <Crown className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Lifetime Pro</h3>
                      <p className="text-sm text-muted-foreground">Unlimited forever</p>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-4xl font-bold">₹699</span>
                    <span className="text-muted-foreground">/forever</span>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {plans.lifetime.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-accent" /> {f}
                      </li>
                    ))}
                  </ul>
                </button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Payment Summary & Method */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Payment Details</CardTitle>
                      <CardDescription>Complete your purchase via UPI</CardDescription>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Amount to Pay</p>
                    <p className="text-3xl font-bold text-primary">
                      ₹{selectedCreditPackage 
                        ? creditPackages.find(p => p.id === selectedCreditPackage)?.amount 
                        : plans[selectedPlan].amount}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* QR Code */}
                  <div className="space-y-4">
                    <Label className="text-base font-medium">Scan QR Code to Pay</Label>
                    <div className="relative w-full max-w-[250px] mx-auto">
                      <img 
                        src={upiQrCode} 
                        alt="UPI QR Code" 
                        className="w-full rounded-xl border-2 border-border shadow-lg"
                      />
                      <Badge className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-background border">
                        PhonePe / Google Pay / Paytm
                      </Badge>
                    </div>
                  </div>

                  {/* UPI Details */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Or Pay to UPI ID</Label>
                      <div className="flex gap-2">
                        <Input value="9627318010@ibl" readOnly className="font-mono bg-muted/50" />
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => copyToClipboard("9627318010@ibl", "UPI ID")}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Your UPI ID (Required)</Label>
                      <Input 
                        placeholder="yourname@upi" 
                        value={upiId} 
                        onChange={e => setUpiId(e.target.value)} 
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Payment Note (Optional)</Label>
                      <Input 
                        placeholder="Transaction reference" 
                        value={paymentNote} 
                        onChange={e => setPaymentNote(e.target.value)} 
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Upload Payment Proof (Optional)</Label>
                      <div className="flex gap-2">
                        <Input 
                          type="file" 
                          accept="image/*,.pdf" 
                          onChange={e => setPaymentProof(e.target.files?.[0] || null)} 
                          disabled={uploadingProof}
                          className="flex-1"
                        />
                        {paymentProof && (
                          <Button variant="ghost" size="icon" onClick={() => setPaymentProof(null)}>
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info Box */}
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Verification within 24 hours</p>
                      <p className="text-sm text-muted-foreground">
                        After payment, your account will be activated once verified by our team.
                      </p>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleUpiSubmit} 
                  disabled={isProcessing || !upiId.trim()}
                  className="w-full h-12 text-lg"
                  size="lg"
                >
                  {isProcessing ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <Shield className="w-5 h-5 mr-2" />
                      Submit Payment Request
                    </>
                  )}
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  By proceeding, you agree to our Terms of Service and Privacy Policy
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Refund Policy */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-gradient-to-br from-accent/10 to-primary/10 border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                    <Shield className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">7-Day Refund Guarantee</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Not satisfied? Request a full refund within 7 days of payment. No questions asked.
                    </p>
                    <Link to="/refund-request">
                      <Button variant="outline" size="sm">
                        Request Refund
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

        </div>
      </div>
    </div>
  );
};

export default Payment;