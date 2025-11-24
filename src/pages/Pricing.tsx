import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, Crown, Zap } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";

const Pricing = () => {
  const { user, profile } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto space-y-16">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold">
              Simple, <span className="text-primary">Transparent Pricing</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Save up to 50% compared to subscribing to each AI service separately.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-8">
            {/* Free Plan */}
            <div className="glass-card p-8 rounded-2xl space-y-6 border-border">
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
              
              {user ? (
                <Link to="/chat">
                  <Button variant="outline" size="lg" className="w-full">
                    Start Chatting
                  </Button>
                </Link>
              ) : (
                <Link to="/auth">
                  <Button variant="outline" size="lg" className="w-full">
                    Get Started
                  </Button>
                </Link>
              )}
              
              <ul className="space-y-3 pt-4">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>5 messages per day</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>Access to GPT-5 Mini</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>Basic support</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>Standard response time</span>
                </li>
              </ul>
            </div>

            {/* Pro Plan */}
            <div className="glass-card p-8 rounded-2xl space-y-6 border-primary relative">
              <div className="absolute top-4 right-4">
                <div className="px-3 py-1 rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  MOST POPULAR
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-bold">Pro</h3>
                <p className="text-muted-foreground">Full access to all premium AI models</p>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-primary">₹199</span>
                  <span className="text-sm line-through text-muted-foreground">₹299</span>
                  <span className="text-muted-foreground">/year</span>
                </div>
                <p className="text-xs text-green-500 font-semibold">Limited Time Offer - Save ₹100!</p>
              </div>
              
              <Link to={user ? "/payment" : "/auth"}>
                <Button size="lg" className="w-full bg-primary hover:bg-primary/90">
                  <Zap className="w-4 h-4 mr-2" />
                  Get Pro Access
                </Button>
              </Link>
              
              <ul className="space-y-3 pt-4">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>500 messages/day</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>All 7+ premium AI models</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>Deep research mode</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>Image generation</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>Priority support</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>Chat history & export</span>
                </li>
              </ul>
            </div>

            {/* Lifetime Plan */}
            <div className="glass-card p-8 rounded-2xl space-y-6 border-border">
              <div className="space-y-2">
                <h3 className="text-2xl font-bold">Lifetime</h3>
                <p className="text-muted-foreground">For individuals and professionals</p>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">₹699</span>
                  <span className="text-muted-foreground">/forever</span>
                </div>
              </div>
              
              <Link to={user ? "/payment" : "/auth"}>
                <Button variant="outline" size="lg" className="w-full">
                  <Crown className="w-4 h-4 mr-2" />
                  Get Lifetime Access
                </Button>
              </Link>
              
              <ul className="space-y-3 pt-4">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="font-semibold">Everything in Pro</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>Lifetime access - pay once</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>All future model updates</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>Priority feature requests</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Feature Comparison */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 font-semibold">Features</th>
                    <th className="text-center p-4 font-semibold">Free</th>
                    <th className="text-center p-4 font-semibold bg-primary/5">Pro</th>
                    <th className="text-center p-4 font-semibold">Lifetime</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="p-4 text-muted-foreground">Messages per day</td>
                    <td className="text-center p-4">5</td>
                    <td className="text-center p-4 bg-primary/5 font-semibold text-primary">Unlimited</td>
                    <td className="text-center p-4 font-semibold text-primary">Unlimited</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="p-4 text-muted-foreground">AI Models</td>
                    <td className="text-center p-4">GPT-5 Mini</td>
                    <td className="text-center p-4 bg-primary/5 font-semibold">All 7+ models</td>
                    <td className="text-center p-4 font-semibold">All 7+ models</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="p-4 text-muted-foreground">Deep Research</td>
                    <td className="text-center p-4">✗</td>
                    <td className="text-center p-4 bg-primary/5 font-semibold">✓</td>
                    <td className="text-center p-4 font-semibold">✓</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="p-4 text-muted-foreground">Image Generation</td>
                    <td className="text-center p-4">✗</td>
                    <td className="text-center p-4 bg-primary/5 font-semibold">✓</td>
                    <td className="text-center p-4 font-semibold">✓</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="p-4 text-muted-foreground">Support</td>
                    <td className="text-center p-4">Basic</td>
                    <td className="text-center p-4 bg-primary/5 font-semibold">Priority</td>
                    <td className="text-center p-4 font-semibold">Priority</td>
                  </tr>
                  <tr>
                    <td className="p-4 text-muted-foreground">Duration</td>
                    <td className="text-center p-4">Forever</td>
                    <td className="text-center p-4 bg-primary/5 font-semibold">1 Year</td>
                    <td className="text-center p-4 font-semibold">Forever</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
