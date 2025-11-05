import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Copy, CreditCard, Smartphone, Shield, CheckCircle } from "lucide-react";
import upiQrCode from "@/assets/upi-qr-code.jpg";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const Payment = () => {
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "lifetime">("lifetime");
  const [paymentMethod, setPaymentMethod] = useState<"razorpay" | "upi">("razorpay");
  const [isProcessing, setIsProcessing] = useState(false);
  const [upiId, setUpiId] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const plans = {
    monthly: { name: "Pro Yearly", amount: 299, description: "50 messages/day for 1 year" },
    lifetime: { name: "Lifetime Pro", amount: 799, description: "Unlimited access forever" }
  };

  const handleRazorpayPayment = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    try {
      setIsProcessing(true);

      // Load Razorpay SDK
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);

      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
      });

      // Create order
      const { data: orderData, error: orderError } = await supabase.functions.invoke(
        "razorpay-create-order",
        {
          body: {
            amount: plans[selectedPlan].amount,
            planType: selectedPlan,
          },
        }
      );

      if (orderError || !orderData?.success) {
        throw new Error(orderData?.error || "Failed to create order");
      }

      // Initialize Razorpay
      const options = {
        key: orderData.razorpayKeyId,
        amount: orderData.order.amount,
        currency: "INR",
        name: "MagVerse AI",
        description: plans[selectedPlan].name,
        order_id: orderData.order.id,
        handler: async function (response: any) {
          try {
            // Verify payment
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
              "razorpay-verify-payment",
              {
                body: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  transactionId: orderData.transactionId,
                },
              }
            );

            if (verifyError || !verifyData?.success) {
              throw new Error(verifyData?.error || "Payment verification failed");
            }

            toast({
              title: "Payment Successful!",
              description: `Your ${plans[selectedPlan].name} subscription is now active.`,
            });

            setTimeout(() => navigate("/chat"), 2000);
          } catch (error: any) {
            console.error("Payment verification error:", error);
            toast({
              title: "Payment Verification Failed",
              description: error.message,
              variant: "destructive",
            });
          }
        },
        prefill: {
          email: user.email,
        },
        theme: {
          color: "#9333ea",
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      console.error("Payment error:", error);
      toast({
        title: "Payment Failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
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
        variant: "destructive",
      });
      return;
    }

    try {
      setIsProcessing(true);

      const { data, error } = await supabase.from("transactions").insert({
        user_id: user.id,
        amount: plans[selectedPlan].amount,
        status: "pending",
        plan_type: selectedPlan,
        payment_method: "upi",
        payment_reference: `UPI ID: ${upiId}${paymentNote ? ` - Note: ${paymentNote}` : ""}`,
        verification_status: "pending_verification",
      });

      if (error) throw error;

      toast({
        title: "Payment Request Submitted",
        description: "Please complete the payment and send proof to magverse4@gmail.com",
      });

      setUpiId("");
      setPaymentNote("");
    } catch (error: any) {
      console.error("Error submitting payment:", error);
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 pb-12 flex items-center justify-center">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Authentication Required</CardTitle>
              <CardDescription>Please sign in to continue with payment</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/auth")} className="w-full">
                Sign In
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
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold gradient-text">Complete Your Payment</h1>
            <p className="text-muted-foreground">
              Choose your preferred payment method to unlock premium features
            </p>
          </div>

          {/* Plan Selection */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Select Your Plan</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <button
                onClick={() => setSelectedPlan("monthly")}
                className={`p-6 rounded-lg border-2 transition-all text-left ${
                  selectedPlan === "monthly"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">Pro Yearly</h3>
                  <div className="text-3xl font-bold">₹299</div>
                  <p className="text-sm text-muted-foreground">50 messages/day for 1 year</p>
                </div>
              </button>

              <button
                onClick={() => setSelectedPlan("lifetime")}
                className={`p-6 rounded-lg border-2 transition-all text-left ${
                  selectedPlan === "lifetime"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="space-y-2">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    Lifetime Pro
                    <span className="text-xs bg-accent text-accent-foreground px-2 py-1 rounded">
                      Best Value
                    </span>
                  </h3>
                  <div className="text-3xl font-bold">₹799</div>
                  <p className="text-sm text-muted-foreground">Unlimited access forever</p>
                </div>
              </button>
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="razorpay" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Razorpay
              </TabsTrigger>
              <TabsTrigger value="upi" className="flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                Direct UPI
              </TabsTrigger>
            </TabsList>

            <TabsContent value="razorpay" className="space-y-4">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Pay with Razorpay
                  </CardTitle>
                  <CardDescription>
                    Instant activation • Cards, UPI, Wallets & Net Banking
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Shield className="w-4 h-4 text-green-500" />
                    Secured by Razorpay • PCI DSS Compliant
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <span className="text-muted-foreground">Amount to Pay</span>
                      <span className="text-2xl font-bold">₹{plans[selectedPlan].amount}</span>
                    </div>
                  </div>

                  <Button
                    onClick={handleRazorpayPayment}
                    disabled={isProcessing}
                    className="w-full"
                    size="lg"
                  >
                    {isProcessing ? "Processing..." : "Pay Now"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="upi" className="space-y-4">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5" />
                    Pay via UPI
                  </CardTitle>
                  <CardDescription>
                    Manual verification • Activation within 24 hours
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Scan QR Code</Label>
                        <img
                          src={upiQrCode}
                          alt="UPI QR Code"
                          className="w-full max-w-xs rounded-lg border"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Or Pay to UPI ID</Label>
                        <div className="flex gap-2">
                          <Input value="9872021777@fam" readOnly className="font-mono" />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => copyToClipboard("9872021777@fam", "UPI ID")}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Amount to Pay</Label>
                        <Input
                          value={`₹${plans[selectedPlan].amount}`}
                          readOnly
                          className="text-xl font-bold"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Your UPI ID (Required)</Label>
                        <Input
                          placeholder="yourname@upi"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Payment Note (Optional)</Label>
                        <Input
                          placeholder="Transaction reference or note"
                          value={paymentNote}
                          onChange={(e) => setPaymentNote(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-medium">After Payment:</p>
                        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                          <li>Take a screenshot of payment confirmation</li>
                          <li>
                            Send it to{" "}
                            <button
                              onClick={() => copyToClipboard("magverse4@gmail.com", "Email")}
                              className="text-primary hover:underline"
                            >
                              magverse4@gmail.com
                            </button>
                          </li>
                          <li>Include your UPI ID in the email</li>
                          <li>We'll activate your account within 24 hours</li>
                        </ol>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleUpiSubmit}
                    disabled={isProcessing || !upiId.trim()}
                    className="w-full"
                    size="lg"
                  >
                    {isProcessing ? "Submitting..." : "I've Completed Payment"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Security Notice */}
          <Card className="glass-card border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium">Secure Payment</p>
                  <p className="text-sm text-muted-foreground">
                    Your payment information is encrypted and secure. We never store your card
                    details or UPI credentials.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Payment;
