import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, Shield, Infinity } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";

const Home = () => {
  const { user, profile } = useAuth();
  
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-32 pb-20">
        <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
          <div className="inline-block">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full glass-card border-accent/30 mb-6">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">6 Powerful AI Models in One Platform</span>
            </div>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold leading-tight">
            <span className="gradient-text">Magverse AI</span>
            <br />
            <span className="text-foreground">Access 6 AI Models</span>
            <br />
            <span className="text-foreground">for Just </span>
            <span className="text-primary">₹199</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Unlock lifetime access to ChatGPT, Gemini, Claude, and more. 
            All in one sleek, futuristic interface.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/chat">
              <Button variant="hero" size="lg" className="w-full sm:w-auto text-lg px-8">
                <Zap className="w-5 h-5" />
                Start Chatting
              </Button>
            </Link>
            {(!user || !profile?.is_pro) && (
              <Link to="/upgrade">
                <Button variant="glass" size="lg" className="w-full sm:w-auto text-lg px-8">
                  <Infinity className="w-5 h-5" />
                  Upgrade to Pro
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="glass-card-hover p-8 rounded-2xl space-y-4 animate-slide-up">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">6 AI Models</h3>
            <p className="text-muted-foreground">
              Access ChatGPT, Gemini, Claude, Llama, Mistral, and more in one place.
            </p>
          </div>
          
          <div className="glass-card-hover p-8 rounded-2xl space-y-4 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-secondary" />
            </div>
            <h3 className="text-xl font-semibold">Free Plan</h3>
            <p className="text-muted-foreground">
              Get 10 credits daily. Perfect for trying out the platform.
            </p>
          </div>
          
          <div className="glass-card-hover p-8 rounded-2xl space-y-4 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
              <Infinity className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-xl font-semibold">Lifetime Pro</h3>
            <p className="text-muted-foreground">
              One-time payment of ₹199 for unlimited access forever.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
