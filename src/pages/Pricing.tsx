import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, Crown, Zap, CreditCard, Sparkles, Shield, Clock, Users, Globe, Star, ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

const Pricing = () => {
  const { user, profile } = useAuth();
  const [isYearly, setIsYearly] = useState(true);

  const plans = [
    {
      name: "Free",
      description: "Try out MagverseAI with basic features",
      monthlyPrice: 0,
      yearlyPrice: 0,
      popular: false,
      features: [
        { text: "5 messages per day", included: true },
        { text: "Access to GPT-5 Mini only", included: true },
        { text: "Basic support", included: true },
        { text: "Standard response time", included: true },
        { text: "All premium AI models", included: false },
        { text: "Deep research mode", included: false },
        { text: "Image generation", included: false },
        { text: "Web search (Perplexity)", included: false },
        { text: "Sources & citations", included: false },
        { text: "File upload", included: false },
        { text: "Chat export", included: false },
      ],
      cta: user ? "Start Chatting" : "Get Started",
      ctaLink: user ? "/chat" : "/auth",
      variant: "outline" as const,
    },
    {
      name: "Student",
      description: "Perfect for students - First month FREE!",
      monthlyPrice: 29,
      yearlyPrice: 149,
      popular: false,
      badge: "STUDENTS",
      badgeColor: "bg-gradient-to-r from-purple-500 to-pink-500",
      features: [
        { text: "First month completely FREE", included: true, highlight: true },
        { text: "200 messages per day", included: true },
        { text: "All 7+ premium AI models", included: true },
        { text: "Deep research mode", included: true },
        { text: "Image generation", included: true },
        { text: "Web search (Perplexity)", included: true },
        { text: "Sources & citations", included: true },
        { text: "File upload & export", included: true },
      ],
      cta: "Start Free Trial",
      ctaLink: user ? "/payment?plan=student" : "/auth",
      variant: "outline" as const,
      icon: Users,
    },
    {
      name: "Pro",
      description: "Full access to all premium AI models",
      monthlyPrice: 29,
      yearlyPrice: 199,
      popular: true,
      badge: "MOST POPULAR",
      features: [
        { text: "500 messages per day", included: true },
        { text: "All 7+ premium AI models", included: true },
        { text: "Deep research mode", included: true },
        { text: "Image generation", included: true },
        { text: "Priority support", included: true },
        { text: "Chat history & export", included: true },
        { text: "Web search (Perplexity)", included: true },
        { text: "Sources & citations", included: true },
      ],
      cta: "Get Pro Access",
      ctaLink: user ? "/payment" : "/auth",
      variant: "default" as const,
    },
    {
      name: "Lifetime",
      description: "One-time payment, forever access",
      monthlyPrice: 699,
      yearlyPrice: 699,
      isOneTime: true,
      popular: false,
      features: [
        { text: "Everything in Pro", included: true, highlight: true },
        { text: "Lifetime access - pay once", included: true },
        { text: "All future model updates", included: true },
        { text: "Priority feature requests", included: true },
        { text: "Early access to new features", included: true },
        { text: "Dedicated support", included: true },
        { text: "No recurring charges", included: true },
        { text: "Future proofed", included: true },
      ],
      cta: "Get Lifetime Access",
      ctaLink: user ? "/payment" : "/auth",
      variant: "outline" as const,
      icon: Crown,
    },
  ];

  const creditPackages = [
    { credits: 50, price: 25, perCredit: "₹0.50" },
    { credits: 200, price: 75, perCredit: "₹0.38", popular: true },
    { credits: 500, price: 150, perCredit: "₹0.30", bestValue: true },
  ];

  const features = [
    { icon: Globe, title: "Web Search", description: "Real-time search with Perplexity" },
    { icon: Sparkles, title: "Image Generation", description: "Create stunning AI images" },
    { icon: Shield, title: "Secure & Private", description: "Your data is encrypted" },
    { icon: Clock, title: "Fast Response", description: "Lightning-fast AI responses" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="container relative mx-auto px-4 py-24">
        <div className="max-w-7xl mx-auto space-y-20">
          
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6"
          >
            <Badge variant="outline" className="px-4 py-2 text-sm border-primary/30 bg-primary/5">
              <Sparkles className="w-4 h-4 mr-2 text-primary" />
              Save up to 50% with yearly billing
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold">
              Simple, <span className="gradient-text">Transparent Pricing</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose the perfect plan for your AI needs. No hidden fees, no surprises.
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4 pt-4">
              <span className={`text-sm font-medium transition-colors ${!isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
                Monthly
              </span>
              <Switch
                checked={isYearly}
                onCheckedChange={setIsYearly}
                className="data-[state=checked]:bg-primary"
              />
              <span className={`text-sm font-medium transition-colors ${isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
                Yearly
                <Badge variant="secondary" className="ml-2 bg-green-500/20 text-green-400 border-0">
                  Save 40%
                </Badge>
              </span>
            </div>
          </motion.div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan, index) => {
              const price = plan.isOneTime ? plan.yearlyPrice : (isYearly ? plan.yearlyPrice : plan.monthlyPrice);
              const period = plan.isOneTime ? "forever" : (isYearly ? "/year" : "/month");
              const isStudent = plan.name === "Student";
              
              return (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`relative rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] ${
                    plan.popular 
                      ? 'bg-gradient-to-b from-primary/20 to-background border-2 border-primary shadow-[0_0_40px_rgba(168,85,247,0.2)]' 
                      : isStudent
                        ? 'bg-gradient-to-b from-purple-500/10 to-pink-500/10 border-2 border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.15)]'
                        : 'bg-card/50 backdrop-blur-sm border border-border/50 hover:border-border'
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className={`${(plan as any).badgeColor || 'bg-primary'} text-primary-foreground shadow-lg px-4`}>
                        {plan.badge}
                      </Badge>
                    </div>
                  )}
                  
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {plan.icon && <plan.icon className="w-5 h-5 text-primary" />}
                        <h3 className="text-2xl font-bold">{plan.name}</h3>
                      </div>
                      <p className="text-muted-foreground text-sm">{plan.description}</p>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-bold">
                          {price === 0 ? "Free" : `₹${price}`}
                        </span>
                        {price > 0 && (
                          <span className="text-muted-foreground">{period}</span>
                        )}
                      </div>
                      {plan.name === "Pro" && isYearly && (
                        <p className="text-sm text-green-400 font-medium">
                          Save ₹149 compared to monthly
                        </p>
                      )}
                    </div>
                    
                    <Link to={plan.ctaLink} className="block">
                      <Button 
                        variant={plan.variant} 
                        size="lg" 
                        className={`w-full group ${plan.popular ? 'shadow-lg shadow-primary/25' : ''}`}
                      >
                        {plan.icon && <plan.icon className="w-4 h-4 mr-2" />}
                        {!plan.icon && plan.popular && <Zap className="w-4 h-4 mr-2" />}
                        {plan.cta}
                        <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                      </Button>
                    </Link>
                    
                    <ul className="space-y-3 pt-4">
                      {plan.features.map((feature, i) => (
                        <motion.li 
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + i * 0.05 }}
                          className={`flex items-start gap-3 ${!feature.included ? 'opacity-50' : ''}`}
                        >
                          <div className={`rounded-full p-0.5 mt-0.5 ${feature.included ? 'bg-primary/20' : 'bg-muted'}`}>
                            <Check className={`w-4 h-4 ${feature.included ? 'text-primary' : 'text-muted-foreground'}`} />
                          </div>
                          <span className={feature.highlight ? 'font-semibold text-primary' : ''}>
                            {feature.text}
                          </span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Feature Highlights */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {features.map((feature, index) => (
              <div 
                key={index}
                className="p-6 rounded-xl bg-card/30 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-all group"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h4 className="font-semibold mb-1">{feature.title}</h4>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </motion.div>

          {/* Credit Top-Up Section */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="rounded-2xl p-8 bg-card/50 backdrop-blur-sm border border-border/50"
          >
            <div className="text-center space-y-4 mb-10">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto">
                <CreditCard className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-3xl font-bold">Need More Credits?</h2>
              <p className="text-muted-foreground max-w-lg mx-auto">
                Top up your account instantly. Credits never expire.
              </p>
            </div>
            
            <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
              {creditPackages.map((pkg, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className={`relative p-6 rounded-xl text-center transition-all hover:scale-105 ${
                    pkg.popular 
                      ? 'bg-primary/10 border-2 border-primary' 
                      : pkg.bestValue 
                        ? 'bg-accent/10 border-2 border-accent'
                        : 'bg-muted/30 border border-border'
                  }`}
                >
                  {pkg.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                      Popular
                    </Badge>
                  )}
                  {pkg.bestValue && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground">
                      Best Value
                    </Badge>
                  )}
                  <div className="space-y-3 pt-2">
                    <span className="text-4xl font-bold">{pkg.credits}</span>
                    <p className="text-sm text-muted-foreground">Credits</p>
                    <p className="text-2xl font-bold text-primary">₹{pkg.price}</p>
                    <p className="text-xs text-muted-foreground">{pkg.perCredit}/credit</p>
                    <Link to={user ? "/payment" : "/auth"}>
                      <Button 
                        variant={pkg.popular || pkg.bestValue ? "default" : "outline"} 
                        size="sm" 
                        className="w-full mt-4"
                      >
                        Buy Now
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
            
            <p className="text-center text-xs text-muted-foreground mt-8 flex items-center justify-center gap-2">
              <Shield className="w-4 h-4" />
              Secure payment • Instant activation • No expiry
            </p>
          </motion.div>

          {/* Animated Feature Comparison Table */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="rounded-2xl overflow-hidden bg-card/50 backdrop-blur-sm border border-border/50"
          >
            <div className="p-6 border-b border-border/50 bg-muted/20">
              <h2 className="text-2xl font-bold text-center">Feature Comparison</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left p-4 font-semibold">Features</th>
                    <th className="text-center p-4 font-semibold w-28">Free</th>
                    <th className="text-center p-4 font-semibold w-28 bg-purple-500/5">Student</th>
                    <th className="text-center p-4 font-semibold w-28 bg-primary/5">Pro</th>
                    <th className="text-center p-4 font-semibold w-28">Lifetime</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { feature: "Daily messages", free: "5", student: "200", pro: "500", lifetime: "Unlimited" },
                    { feature: "AI Models", free: "GPT-5 Mini", student: "All 7+", pro: "All 7+", lifetime: "All 7+" },
                    { feature: "Web Search (Perplexity)", free: false, student: true, pro: true, lifetime: true },
                    { feature: "Deep Research", free: false, student: true, pro: true, lifetime: true },
                    { feature: "Image Generation", free: false, student: true, pro: true, lifetime: true },
                    { feature: "Sources & Citations", free: false, student: true, pro: true, lifetime: true },
                    { feature: "File Upload", free: false, student: true, pro: true, lifetime: true },
                    { feature: "Chat Export", free: false, student: true, pro: true, lifetime: true },
                    { feature: "Support", free: "Basic", student: "Standard", pro: "Priority", lifetime: "Priority" },
                    { feature: "Free Trial", free: "N/A", student: "1 Month", pro: "N/A", lifetime: "N/A" },
                  ].map((row, index) => (
                    <motion.tr 
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 + index * 0.03 }}
                      className="border-b border-border/30 hover:bg-muted/10 transition-colors"
                    >
                      <td className="p-4 text-muted-foreground">{row.feature}</td>
                      <td className="text-center p-4">
                        {typeof row.free === 'boolean' ? (
                          row.free ? <Check className="w-5 h-5 text-primary mx-auto" /> : <span className="text-muted-foreground">—</span>
                        ) : (
                          <span className="text-sm">{row.free}</span>
                        )}
                      </td>
                      <td className="text-center p-4 bg-purple-500/5">
                        {typeof row.student === 'boolean' ? (
                          row.student ? <Check className="w-5 h-5 text-purple-500 mx-auto" /> : <span className="text-muted-foreground">—</span>
                        ) : (
                          <span className="text-sm font-medium text-purple-500">{row.student}</span>
                        )}
                      </td>
                      <td className="text-center p-4 bg-primary/5">
                        {typeof row.pro === 'boolean' ? (
                          row.pro ? <Check className="w-5 h-5 text-primary mx-auto" /> : <span className="text-muted-foreground">—</span>
                        ) : (
                          <span className="text-sm font-medium text-primary">{row.pro}</span>
                        )}
                      </td>
                      <td className="text-center p-4">
                        {typeof row.lifetime === 'boolean' ? (
                          row.lifetime ? <Check className="w-5 h-5 text-primary mx-auto" /> : <span className="text-muted-foreground">—</span>
                        ) : (
                          <span className="text-sm font-medium">{row.lifetime}</span>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Refund Policy Section */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="rounded-2xl p-8 bg-gradient-to-br from-accent/10 to-primary/10 border border-border/50"
          >
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center mx-auto">
                <Shield className="w-7 h-7 text-accent" />
              </div>
              <h2 className="text-2xl font-bold">100% Satisfaction Guarantee</h2>
              <p className="text-muted-foreground">
                Not satisfied with your purchase? Request a refund within 7 days of payment. 
                We'll process it within 3-5 business days, no questions asked.
              </p>
              <Link to="/refund-request">
                <Button variant="outline" className="mt-4">
                  Request Refund
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
};

export default Pricing;