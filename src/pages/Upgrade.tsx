import { Button } from "@/components/ui/button";
import { Check, Sparkles, Zap, Infinity, Crown } from "lucide-react";
import Navbar from "@/components/Navbar";

const Upgrade = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-32 pb-20">
        <div className="max-w-5xl mx-auto space-y-12">
          {/* Header */}
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
              Start free or unlock unlimited access with our lifetime Pro plan
            </p>
          </div>
          
          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 gap-8 animate-slide-up">
            {/* Free Plan */}
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
              
              <Button variant="glass" size="lg" className="w-full">
                <Zap className="w-5 h-5" />
                Get Started Free
              </Button>
            </div>
            
            {/* Pro Plan */}
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
              
              <Button variant="hero" size="lg" className="w-full text-lg">
                <Infinity className="w-5 h-5" />
                Upgrade Now
              </Button>
            </div>
          </div>
          
          {/* FAQ Section */}
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
    </div>
  );
};

export default Upgrade;
