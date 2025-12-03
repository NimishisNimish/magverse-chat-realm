import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, Crown, Zap, CreditCard } from "lucide-react";
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
            <div className="bg-card border border-border rounded-2xl p-8 space-y-6">
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
            <div className="bg-card border-2 border-primary rounded-2xl p-8 space-y-6 relative">
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
                <Button size="lg" className="w-full">
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
            <div className="bg-card border border-border rounded-2xl p-8 space-y-6">
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

          {/* Credit Top-Up Section */}
          <div className="bg-card border border-border rounded-2xl p-8">
            <div className="text-center space-y-4 mb-8">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <CreditCard className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Need More Credits?</h2>
              <p className="text-muted-foreground max-w-lg mx-auto">
                Running low on credits? Top up your account instantly with UPI payment.
              </p>
            </div>
            
            <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <div className="bg-muted/30 border border-border rounded-xl p-6 text-center space-y-3">
                <span className="text-3xl font-bold">50</span>
                <p className="text-sm text-muted-foreground">Credits</p>
                <p className="text-xl font-semibold text-primary">₹49</p>
                <Link to={user ? "/payment" : "/auth"}>
                  <Button variant="outline" size="sm" className="w-full mt-2">
                    Buy Now
                  </Button>
                </Link>
              </div>
              
              <div className="bg-primary/5 border-2 border-primary rounded-xl p-6 text-center space-y-3 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-2 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
                    BEST VALUE
                  </span>
                </div>
                <span className="text-3xl font-bold">200</span>
                <p className="text-sm text-muted-foreground">Credits</p>
                <p className="text-xl font-semibold text-primary">₹149</p>
                <Link to={user ? "/payment" : "/auth"}>
                  <Button size="sm" className="w-full mt-2">
                    Buy Now
                  </Button>
                </Link>
              </div>
              
              <div className="bg-muted/30 border border-border rounded-xl p-6 text-center space-y-3">
                <span className="text-3xl font-bold">500</span>
                <p className="text-sm text-muted-foreground">Credits</p>
                <p className="text-xl font-semibold text-primary">₹299</p>
                <Link to={user ? "/payment" : "/auth"}>
                  <Button variant="outline" size="sm" className="w-full mt-2">
                    Buy Now
                  </Button>
                </Link>
              </div>
            </div>
            
            <p className="text-center text-xs text-muted-foreground mt-6">
              UPI payments accepted • Instant credit activation • No expiry
            </p>
          </div>

          {/* Feature Comparison */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
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
                    <td className="text-center p-4 bg-primary/5 font-semibold text-primary">500</td>
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