import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, Shield, Infinity, Mail, MapPin, Phone, Users, Target, Rocket, Check, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import magverseLogo from "@/assets/magverse-logo.png";
import upiQrCode from "@/assets/upi-qr-code.jpg";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
const Home = () => {
  const {
    user,
    profile
  } = useAuth();
  const {
    toast
  } = useToast();
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  return <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-32 pb-20">
        <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
          <div className="inline-block">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full glass-card border-accent/30 mb-6">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Access Premium AI Models</span>
            </div>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold leading-tight">
            <span className="gradient-text">Magverse AI</span>
            <br />
            <span className="text-foreground">Access </span>
            <span className="text-primary">Premium AI Models</span>
            <br />
            <span className="text-foreground">In One Platform</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose from the world's best AI models, all in one subscription. 
            No more paying for multiple services.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button variant="hero" size="lg" className="w-full sm:w-auto text-lg px-8" onClick={() => document.getElementById('pricing-section')?.scrollIntoView({
            behavior: 'smooth'
          })}>
              <Zap className="w-5 h-5" />
              Start Chatting
            </Button>
            <Button variant="outline" size="lg" className="w-full sm:w-auto text-lg px-8" onClick={() => document.getElementById('pricing-section')?.scrollIntoView({
            behavior: 'smooth'
          })}>
              <Sparkles className="w-5 h-5" />
              View Pricing
            </Button>
          </div>
        </div>
      </section>

      {/* Payment Section */}
      {user && <section id="payment-section" className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12 animate-fade-in">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Complete Your <span className="text-primary">Payment</span>
              </h2>
              <p className="text-xl text-muted-foreground">
                Scan the QR code or use the UPI ID to complete your payment
              </p>
            </div>

            <div className="glass-card p-8 rounded-2xl space-y-8">
              <div className="grid md:grid-cols-2 gap-8">
                {/* QR Code Section */}
                <div className="space-y-4">
                  <h3 className="text-2xl font-semibold text-center">Scan QR Code</h3>
                  <div className="flex justify-center">
                    <img src={upiQrCode} alt="UPI Payment QR Code" className="w-64 h-64 rounded-xl border-2 border-primary/30" />
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    Use any UPI app to scan and pay
                  </p>
                </div>

                {/* UPI ID Section */}
                <div className="space-y-6 flex flex-col justify-center">
                  <div className="space-y-4">
                    <h3 className="text-2xl font-semibold">Or Pay via UPI ID</h3>
                    <div className="glass-card p-6 rounded-xl space-y-3">
                      <p className="text-sm text-muted-foreground">UPI ID</p>
                      <p className="text-2xl font-mono font-bold text-primary">9872021777@fam</p>
                      <Button variant="outline" size="sm" className="w-full" onClick={() => {
                    navigator.clipboard.writeText('9872021777@fam');
                    toast({
                      title: "UPI ID copied to clipboard!"
                    });
                  }}>
                        Copy UPI ID
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Shield className="w-4 h-4" />
                      <span>Secure payment gateway</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Zap className="w-4 h-4" />
                      <span>Instant activation after payment</span>
                    </div>
                  </div>

                  <div className="pt-4">
                    <p className="text-sm text-muted-foreground mb-4">
                      After payment, please send a screenshot to our support for verification:
                    </p>
                    <Button variant="outline" className="w-full" asChild>
                      <a href="mailto:support@magverse.ai">
                        <Mail className="w-4 h-4 mr-2" />
                        Send Payment Proof
                      </a>
                    </Button>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-border">
                <p className="text-center text-sm text-muted-foreground">
                  <strong>Note:</strong> Your subscription will be activated within 24 hours after payment verification.
                  For immediate activation, please contact support with your transaction ID.
                </p>
              </div>
            </div>
          </div>
        </section>}
      
      {/* Pricing Section */}
      <section id="pricing-section" className="container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-4 animate-fade-in">
            <h2 className="text-4xl md:text-5xl font-bold">
              Simple, <span className="text-primary">Transparent Pricing</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Save up to 50% compared to subscribing to each AI service separately.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Free Plan */}
            <div className="glass-card-hover p-8 rounded-2xl space-y-6 border-accent/20">
              <div className="space-y-2">
                <h3 className="text-2xl font-bold">Free</h3>
                <p className="text-muted-foreground">Try out MagverseAI with basic features</p>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">₹0</span>
                  <span className="text-muted-foreground">/forever</span>
                </div>
              </div>
              
              {user ? <Link to="/chat">
                  <Button variant="outline" size="lg" className="w-full">
                    Start Chatting
                  </Button>
                </Link> : <Link to="/auth">
                  <Button variant="outline" size="lg" className="w-full">
                    Get Started
                  </Button>
                </Link>}
              
              <ul className="space-y-3 pt-4">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">5 messages per day</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">Access to GPT-5 Mini</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">Basic support</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">Standard response time</span>
                </li>
              </ul>
            </div>

            {/* Yearly Plan */}
            <div className="glass-card p-8 rounded-2xl space-y-6 border-primary relative">
              <div className="absolute top-4 right-4">
                <div className="px-3 py-1 rounded-full bg-primary text-xs font-semibold text-white">
                  MOST POPULAR
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-bold">Pro</h3>
                <p className="text-muted-foreground">Full access to all premium AI models</p>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold gradient-text">₹299</span>
                  <span className="text-muted-foreground">/per year</span>
                </div>
              </div>
              
              <Link to={user ? "/payment" : "/auth"}>
                <Button variant="hero" size="lg" className="w-full">
                  Start Free Trial
                </Button>
              </Link>
              
              <ul className="space-y-3 pt-4">
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
            </div>

            {/* Lifetime Plan */}
            <div className="glass-card-hover p-8 rounded-2xl space-y-6 border-accent/20">
              <div className="space-y-2">
                <h3 className="text-2xl font-bold">Lifetime</h3>
                <p className="text-muted-foreground">For individuals and professionals</p>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">₹799</span>
                  <span className="text-muted-foreground">/forever</span>
                </div>
              </div>
              
              <Link to={user ? "/payment" : "/auth"}>
                <Button variant="outline" size="lg" className="w-full">
                  Get Lifetime Access
                </Button>
              </Link>
              
              <ul className="space-y-3 pt-4">
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
            </div>
          </div>

          {/* Feature Comparison Table */}
          <div className="mt-16 animate-slide-up" style={{
          animationDelay: "0.3s"
        }}>
            <h3 className="text-2xl font-bold text-center mb-8">Compare Plans</h3>
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-glass-border">
                      <th className="text-left p-4 font-semibold">Features</th>
                      <th className="text-center p-4 font-semibold">Free</th>
                      <th className="text-center p-4 font-semibold bg-primary/5">Pro</th>
                      <th className="text-center p-4 font-semibold">Lifetime</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-glass-border/50">
                      <td className="p-4 text-muted-foreground">Messages per day</td>
                      <td className="text-center p-4">5</td>
                      <td className="text-center p-4 bg-primary/5 font-semibold text-primary">Unlimited</td>
                      <td className="text-center p-4 font-semibold text-primary">Unlimited</td>
                    </tr>
                    <tr className="border-b border-glass-border/50">
                      <td className="p-4 text-muted-foreground">AI Models</td>
                      <td className="text-center p-4">GPT-5 Mini</td>
                      <td className="text-center p-4 bg-primary/5 font-semibold">All 6+ models</td>
                      <td className="text-center p-4 font-semibold">All 6+ models</td>
                    </tr>
                    <tr className="border-b border-glass-border/50">
                      <td className="p-4 text-muted-foreground">GPT-5, Claude, Gemini Pro</td>
                      <td className="text-center p-4">
                        <X className="w-5 h-5 text-muted-foreground mx-auto" />
                      </td>
                      <td className="text-center p-4 bg-primary/5">
                        <Check className="w-5 h-5 text-primary mx-auto" />
                      </td>
                      <td className="text-center p-4">
                        <Check className="w-5 h-5 text-primary mx-auto" />
                      </td>
                    </tr>
                    <tr className="border-b border-glass-border/50">
                      <td className="p-4 text-muted-foreground">Image generation</td>
                      <td className="text-center p-4">
                        <X className="w-5 h-5 text-muted-foreground mx-auto" />
                      </td>
                      <td className="text-center p-4 bg-primary/5">
                        <Check className="w-5 h-5 text-primary mx-auto" />
                      </td>
                      <td className="text-center p-4">
                        <Check className="w-5 h-5 text-primary mx-auto" />
                      </td>
                    </tr>
                    <tr className="border-b border-glass-border/50">
                      <td className="p-4 text-muted-foreground">Image editing & upscaling</td>
                      <td className="text-center p-4">
                        <X className="w-5 h-5 text-muted-foreground mx-auto" />
                      </td>
                      <td className="text-center p-4 bg-primary/5">
                        <Check className="w-5 h-5 text-primary mx-auto" />
                      </td>
                      <td className="text-center p-4">
                        <Check className="w-5 h-5 text-primary mx-auto" />
                      </td>
                    </tr>
                    <tr className="border-b border-glass-border/50">
                      <td className="p-4 text-muted-foreground">PDF & document upload</td>
                      <td className="text-center p-4">
                        <Check className="w-5 h-5 text-primary mx-auto" />
                      </td>
                      <td className="text-center p-4 bg-primary/5">
                        <Check className="w-5 h-5 text-primary mx-auto" />
                      </td>
                      <td className="text-center p-4">
                        <Check className="w-5 h-5 text-primary mx-auto" />
                      </td>
                    </tr>
                    <tr className="border-b border-glass-border/50">
                      <td className="p-4 text-muted-foreground">Chat history</td>
                      <td className="text-center p-4">7 days</td>
                      <td className="text-center p-4 bg-primary/5 font-semibold">Unlimited</td>
                      <td className="text-center p-4 font-semibold">Unlimited</td>
                    </tr>
                    <tr className="border-b border-glass-border/50">
                      <td className="p-4 text-muted-foreground">Export to PDF</td>
                      <td className="text-center p-4">
                        <X className="w-5 h-5 text-muted-foreground mx-auto" />
                      </td>
                      <td className="text-center p-4 bg-primary/5">
                        <Check className="w-5 h-5 text-primary mx-auto" />
                      </td>
                      <td className="text-center p-4">
                        <Check className="w-5 h-5 text-primary mx-auto" />
                      </td>
                    </tr>
                    <tr className="border-b border-glass-border/50">
                      <td className="p-4 text-muted-foreground">Team collaboration</td>
                      <td className="text-center p-4">
                        <X className="w-5 h-5 text-muted-foreground mx-auto" />
                      </td>
                      <td className="text-center p-4 bg-primary/5">Up to 3</td>
                      <td className="text-center p-4">Up to 3</td>
                    </tr>
                    <tr className="border-b border-glass-border/50">
                      <td className="p-4 text-muted-foreground">API access</td>
                      <td className="text-center p-4">
                        <X className="w-5 h-5 text-muted-foreground mx-auto" />
                      </td>
                      <td className="text-center p-4 bg-primary/5">
                        <Check className="w-5 h-5 text-primary mx-auto" />
                      </td>
                      <td className="text-center p-4">
                        <Check className="w-5 h-5 text-primary mx-auto" />
                      </td>
                    </tr>
                    <tr className="border-b border-glass-border/50">
                      <td className="p-4 text-muted-foreground">Priority support</td>
                      <td className="text-center p-4">
                        <X className="w-5 h-5 text-muted-foreground mx-auto" />
                      </td>
                      <td className="text-center p-4 bg-primary/5">
                        <Check className="w-5 h-5 text-primary mx-auto" />
                      </td>
                      <td className="text-center p-4">
                        <Check className="w-5 h-5 text-primary mx-auto" />
                      </td>
                    </tr>
                    <tr className="border-b border-glass-border/50">
                      <td className="p-4 text-muted-foreground">Response time</td>
                      <td className="text-center p-4">Standard</td>
                      <td className="text-center p-4 bg-primary/5 font-semibold">Fastest</td>
                      <td className="text-center p-4 font-semibold">Fastest</td>
                    </tr>
                    <tr className="border-b border-glass-border/50">
                      <td className="p-4 text-muted-foreground">Duration</td>
                      <td className="text-center p-4">Forever</td>
                      <td className="text-center p-4 bg-primary/5">1 Year</td>
                      <td className="text-center p-4 font-semibold text-primary">Forever</td>
                    </tr>
                    <tr>
                      <td className="p-4 text-muted-foreground font-semibold">Price</td>
                      <td className="text-center p-4 font-bold">₹0</td>
                      <td className="text-center p-4 bg-primary/5 font-bold text-primary">₹299/year</td>
                      <td className="text-center p-4 font-bold">₹799</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Billing FAQ Section */}
          <div className="mt-16 animate-slide-up" style={{
          animationDelay: "0.4s"
        }}>
            <h3 className="text-2xl font-bold text-center mb-8">Billing & Payment FAQ</h3>
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="glass-card-hover p-6 rounded-xl space-y-3">
                <h4 className="font-semibold flex items-start gap-2">
                  <span className="text-primary">Q:</span>
                  <span>What payment methods do you accept?</span>
                </h4>
                <p className="text-sm text-muted-foreground pl-6">
                  We accept all major UPI apps (Google Pay, PhonePe, Paytm, etc.) and UPI-enabled bank accounts. Payment is quick, secure, and instant.
                </p>
              </div>

              <div className="glass-card-hover p-6 rounded-xl space-y-3">
                <h4 className="font-semibold flex items-start gap-2">
                  <span className="text-primary">Q:</span>
                  <span>Is my payment information secure?</span>
                </h4>
                <p className="text-sm text-muted-foreground pl-6">
                  Yes! All payments are processed through secure UPI gateways. We never store your payment information on our servers.
                </p>
              </div>

              <div className="glass-card-hover p-6 rounded-xl space-y-3">
                <h4 className="font-semibold flex items-start gap-2">
                  <span className="text-primary">Q:</span>
                  <span>What is your refund policy?</span>
                </h4>
                <p className="text-sm text-muted-foreground pl-6">
                  We offer a 7-day money-back guarantee for Pro and Lifetime plans. If you're not satisfied, contact us at magverse4@gmail.com for a full refund.
                </p>
              </div>

              <div className="glass-card-hover p-6 rounded-xl space-y-3">
                <h4 className="font-semibold flex items-start gap-2">
                  <span className="text-primary">Q:</span>
                  <span>When does my Pro subscription renew?</span>
                </h4>
                <p className="text-sm text-muted-foreground pl-6">
                  Pro subscriptions renew automatically after 1 year. You'll receive an email reminder 7 days before renewal. You can cancel anytime from your account settings.
                </p>
              </div>

              <div className="glass-card-hover p-6 rounded-xl space-y-3">
                <h4 className="font-semibold flex items-start gap-2">
                  <span className="text-primary">Q:</span>
                  <span>Can I upgrade from Pro to Lifetime?</span>
                </h4>
                <p className="text-sm text-muted-foreground pl-6">
                  Yes! The remaining amount will be credited when you upgrade. For example, if you have 6 months left on Pro, we'll adjust the Lifetime price accordingly.
                </p>
              </div>

              <div className="glass-card-hover p-6 rounded-xl space-y-3">
                <h4 className="font-semibold flex items-start gap-2">
                  <span className="text-primary">Q:</span>
                  <span>Do you offer discounts or promotions?</span>
                </h4>
                <p className="text-sm text-muted-foreground pl-6">
                  Yes! Students get 20% off with valid ID. We also run seasonal promotions. Follow us on social media or subscribe to our newsletter for updates.
                </p>
              </div>

              <div className="glass-card-hover p-6 rounded-xl space-y-3">
                <h4 className="font-semibold flex items-start gap-2">
                  <span className="text-primary">Q:</span>
                  <span>What happens when my Pro plan expires?</span>
                </h4>
                <p className="text-sm text-muted-foreground pl-6">
                  Your account will automatically downgrade to the Free plan. You'll keep all your chat history but will be limited to 5 messages per day with GPT-5 Mini only.
                </p>
              </div>

              <div className="glass-card-hover p-6 rounded-xl space-y-3">
                <h4 className="font-semibold flex items-start gap-2">
                  <span className="text-primary">Q:</span>
                  <span>Can I get an invoice for my purchase?</span>
                </h4>
                <p className="text-sm text-muted-foreground pl-6">
                  Yes! Invoices are automatically sent to your registered email after payment. You can also download them anytime from your account settings.
                </p>
              </div>
            </div>

            <div className="mt-8 text-center">
              <p className="text-muted-foreground mb-4">Still have questions?</p>
              <a href="#contact">
                <Button variant="outline" size="lg">
                  <Mail className="w-5 h-5" />
                  Contact Support
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>
      
      {/* About Us Section */}
      <section id="about" className="container mx-auto px-4 py-20 bg-gradient-to-b from-background to-background/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 animate-fade-in">
            <img src={magverseLogo} alt="Magverse AI Logo" className="w-32 h-32 mx-auto mb-6 animate-glow-pulse" />
            <h2 className="text-4xl md:text-5xl font-bold gradient-text mb-4">About Magverse AI</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Empowering everyone with access to the world's most advanced AI models
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="glass-card-hover p-8 rounded-2xl space-y-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold">Our Mission</h3>
              <p className="text-muted-foreground leading-relaxed">
                To democratize access to cutting-edge AI technology by providing an affordable, 
                unified platform where anyone can harness the power of multiple AI models 
                without breaking the bank.
              </p>
            </div>

            <div className="glass-card-hover p-8 rounded-2xl space-y-4">
              <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center">
                <Rocket className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="text-2xl font-semibold">Our Vision</h3>
              <p className="text-muted-foreground leading-relaxed">
                To become the world's most accessible AI platform, enabling millions to 
                leverage artificial intelligence for learning, creativity, productivity, 
                and innovation.
              </p>
            </div>
          </div>

          <div className="glass-card p-8 rounded-2xl">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold mb-4">Why Choose Magverse AI?</h3>
                <div className="grid sm:grid-cols-2 gap-4 text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <span className="text-primary">✓</span>
                    <span>Access to 6+ premium AI models in one place</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-primary">✓</span>
                    <span>Affordable pricing starting at ₹299/year</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-primary">✓</span>
                    <span>Lifetime access option available</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-primary">✓</span>
                    <span>Beautiful, futuristic interface</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-primary">✓</span>
                    <span>Support for images, PDFs, and documents</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-primary">✓</span>
                    <span>Chat history and organization</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Contact Us Section */}
      <section id="contact" className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="text-4xl md:text-5xl font-bold gradient-text mb-4">Get In Touch</h2>
            <p className="text-xl text-muted-foreground">
              Have questions? We'd love to hear from you.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <a href="mailto:magverse4@gmail.com" className="glass-card-hover p-6 rounded-xl text-center space-y-3 group">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold">Email Us</h3>
              <p className="text-sm text-muted-foreground">magverse4@gmail.com</p>
            </a>

            <a href="tel:+919872021777" className="glass-card-hover p-6 rounded-xl text-center space-y-3 group">
              <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                <Phone className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="font-semibold">Call Us</h3>
              <p className="text-sm text-muted-foreground">+91 9872021777</p>
            </a>

            <div className="glass-card-hover p-6 rounded-xl text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center mx-auto">
                <MapPin className="w-6 h-6 text-accent" />
              </div>
              <h3 className="font-semibold">Location</h3>
              <p className="text-sm text-muted-foreground">Chitkara University, Rajpura</p>
            </div>
          </div>

          <div className="glass-card p-8 rounded-2xl">
            <h3 className="text-2xl font-semibold mb-6 text-center">Send Us a Message</h3>
            <form className="space-y-4" onSubmit={async e => {
            e.preventDefault();
            setIsSubmitting(true);
            try {
              const {
                data,
                error
              } = await supabase.functions.invoke('send-contact-email', {
                body: contactForm
              });
              if (error) throw error;
              if (data.success) {
                toast({
                  title: "Message Sent!",
                  description: "Thank you for contacting us. We'll get back to you soon!"
                });
                // Clear form
                setContactForm({
                  name: "",
                  email: "",
                  subject: "",
                  message: ""
                });
              } else {
                throw new Error(data.error || "Failed to send message");
              }
            } catch (error: any) {
              console.error("Error sending message:", error);
              toast({
                title: "Error",
                description: error.message || "Failed to send message. Please try again.",
                variant: "destructive"
              });
            } finally {
              setIsSubmitting(false);
            }
          }}>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Name</label>
                  <input type="text" required value={contactForm.name} onChange={e => setContactForm({
                  ...contactForm,
                  name: e.target.value
                })} className="w-full px-4 py-2 rounded-lg bg-background/50 border border-glass-border focus:border-primary focus:outline-none" placeholder="Your name" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Email</label>
                  <input type="email" required value={contactForm.email} onChange={e => setContactForm({
                  ...contactForm,
                  email: e.target.value
                })} className="w-full px-4 py-2 rounded-lg bg-background/50 border border-glass-border focus:border-primary focus:outline-none" placeholder="your@email.com" />
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Subject</label>
                <input type="text" required value={contactForm.subject} onChange={e => setContactForm({
                ...contactForm,
                subject: e.target.value
              })} className="w-full px-4 py-2 rounded-lg bg-background/50 border border-glass-border focus:border-primary focus:outline-none" placeholder="How can we help?" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Message</label>
                <textarea required rows={5} value={contactForm.message} onChange={e => setContactForm({
                ...contactForm,
                message: e.target.value
              })} className="w-full px-4 py-2 rounded-lg bg-background/50 border border-glass-border focus:border-primary focus:outline-none resize-none" placeholder="Tell us more..." />
              </div>
              <Button type="submit" variant="hero" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Send Message"}
              </Button>
            </form>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t border-glass-border">
        <div className="flex flex-col items-center gap-6">
          {/* Logo and Copyright */}
          <div className="flex items-center gap-2">
            <img src={magverseLogo} alt="Magverse AI" className="w-8 h-8" />
            <span className="text-sm text-muted-foreground">© 2025 Magverse AI. All rights reserved.</span>
          </div>
          
          {/* Navigation Links */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <a href="#about" className="hover:text-primary transition-colors">About</a>
            <a href="#contact" className="hover:text-primary transition-colors">Contact</a>
            <Link to="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link to="/terms-of-service" className="hover:text-primary transition-colors">Terms of Service</Link>
            <Link to="/auth" className="hover:text-primary transition-colors">Login</Link>
          </div>
        </div>
      </footer>
    </div>;
};
export default Home;