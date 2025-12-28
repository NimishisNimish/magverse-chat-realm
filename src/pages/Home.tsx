import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, Shield, Infinity, Mail, MapPin, Phone, Users, Target, Rocket, Check, X, Crown } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import magverseLogo from "@/assets/magverse-ai-logo.png";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useParallax } from "@/hooks/useParallax";
import { motion } from "framer-motion";
import { AIModelsShowcase } from "@/components/AIModelsShowcase";

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
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  // Track mouse for parallax particles
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ 
        x: (e.clientX - window.innerWidth / 2) / window.innerWidth,
        y: (e.clientY - window.innerHeight / 2) / window.innerHeight
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Prefetch Chat page (most likely next destination)
  useEffect(() => {
    const timer = setTimeout(() => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = '/chat';
      document.head.appendChild(link);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);
  
  // Scroll animations for different sections
  const heroAnimation = useScrollAnimation({ threshold: 0.2 });
  const pricingAnimation = useScrollAnimation({ threshold: 0.1 });
  const featuresAnimation = useScrollAnimation({ threshold: 0.15 });
  
  // Parallax effects with multiple layers
  const heroParallax = useParallax({ speed: 0.3 });
  const bgParallax = useParallax({ speed: 0.2 });
  const parallaxLayer1 = useParallax({ speed: 0.2, mouseInfluence: true, depth: 0.3 });
  const parallaxLayer2 = useParallax({ speed: 0.4, mouseInfluence: true, depth: 0.5 });
  const parallaxLayer3 = useParallax({ speed: 0.6, mouseInfluence: true, depth: 0.7 });
  
  return <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated gradient background with aurora effect */}
      <div className="absolute inset-0 animated-gradient opacity-20 pointer-events-none" />
      
      {/* Aurora/Northern Lights Layers */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 aurora-layer" style={{
          background: 'linear-gradient(120deg, hsl(var(--primary) / 0.15), transparent 50%, hsl(var(--accent) / 0.12))',
        }} />
        <div className="absolute inset-0 aurora-layer" style={{
          background: 'linear-gradient(240deg, hsl(var(--secondary) / 0.1), transparent 60%, hsl(var(--primary) / 0.15))',
          animationDelay: '4s',
          animationDuration: '15s',
        }} />
      </div>
      
      {/* Mesh Gradient Blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 left-1/4 w-96 h-96 mesh-blob opacity-20 blur-3xl" style={{
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.4), hsl(var(--primary) / 0.1) 60%, transparent)',
        }} />
        <div className="absolute bottom-20 right-1/3 w-80 h-80 mesh-blob opacity-15 blur-3xl" style={{
          background: 'radial-gradient(circle, hsl(var(--accent) / 0.35), hsl(var(--accent) / 0.08) 60%, transparent)',
          animationDelay: '5s',
          animationDuration: '18s',
        }} />
        <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] mesh-blob opacity-10 blur-3xl" style={{
          background: 'radial-gradient(circle, hsl(var(--secondary) / 0.3), transparent)',
          animationDelay: '8s',
          animationDuration: '20s',
        }} />
      </div>
      
      {/* Floating orbs and particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Large floating orbs - Layer 1 (background) */}
        <motion.div 
          className="absolute top-20 left-10 w-64 h-64 rounded-full glass-card opacity-30 blur-2xl"
          style={parallaxLayer1.style}
          animate={{
            y: [0, -30, 0],
            x: [0, 20, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 10,
            repeat: 999999,
            ease: "easeInOut"
          }}
        >
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(circle, hsl(var(--primary) / 0.4), transparent)'
          }} />
        </motion.div>
        
        {/* Glowing Particles */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute w-2 h-2 rounded-full particle-glow"
            style={{
              left: `${15 + i * 12}%`,
              top: `${20 + i * 8}%`,
              background: i % 3 === 0 
                ? 'radial-gradient(circle, hsl(var(--primary) / 0.6), transparent)'
                : i % 3 === 1
                ? 'radial-gradient(circle, hsl(var(--accent) / 0.6), transparent)'
                : 'radial-gradient(circle, hsl(var(--secondary) / 0.6), transparent)',
              boxShadow: `0 0 ${10 + i * 2}px currentColor`,
              animationDelay: `${i * 1.2}s`,
              animationDuration: `${8 + i * 0.5}s`,
            }}
          />
        ))}
        
        <motion.div 
          className="absolute top-1/3 right-20 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={parallaxLayer1.style}
          animate={{
            y: [0, 40, 0],
            x: [0, -30, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 12,
            repeat: 999999,
            ease: "easeInOut"
          }}
        >
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(circle, hsl(var(--secondary) / 0.4), transparent)'
          }} />
        </motion.div>
        
        <motion.div 
          className="absolute bottom-20 left-1/3 w-80 h-80 rounded-full opacity-25 blur-2xl"
          style={parallaxLayer2.style}
          animate={{
            y: [0, -25, 0],
            x: [0, 25, 0],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 15,
            repeat: 999999,
            ease: "easeInOut"
          }}
        >
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(circle, hsl(var(--accent) / 0.3), transparent)'
          }} />
        </motion.div>
        
        {/* Small particles that follow mouse */}
        {Array.from({ length: 20 }, (_, i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute w-2 h-2 rounded-full bg-primary/40"
            style={{
              left: `${10 + (i * 5)}%`,
              top: `${10 + (i * 3)}%`,
            }}
            animate={{
              x: mousePosition.x * (50 + i * 10),
              y: mousePosition.y * (50 + i * 10),
              opacity: [0.2, 0.6, 0.2],
            }}
            transition={{
              x: { type: "spring", stiffness: 50, damping: 20 },
              y: { type: "spring", stiffness: 50, damping: 20 },
              opacity: { duration: 2, repeat: 999999, ease: "easeInOut" }
            }}
          />
        ))}
      </div>
      
      <Navbar />
      
      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-32 pb-20 relative z-10">
        <div 
          ref={heroAnimation.ref}
          className={`max-w-4xl mx-auto text-center space-y-8 animate-on-scroll fade-in-up ${heroAnimation.isVisible ? 'is-visible' : ''}`}
          style={heroParallax}
        >
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
            <Link to={user ? "/chat" : "/auth"}>
              <Button magnetic variant="hero" size="lg" className="w-full sm:w-auto text-lg px-8">
                <Zap className="w-5 h-5" />
                Start Chatting
              </Button>
            </Link>
            {/* Hide View Pricing for all Pro users (lifetime and monthly) */}
            {profile?.subscription_type !== 'lifetime' && profile?.subscription_type !== 'monthly' && <Button magnetic variant="outline" size="lg" className="w-full sm:w-auto text-lg px-8" onClick={() => document.getElementById('pricing-section')?.scrollIntoView({
            behavior: 'smooth'
          })}>
                <Sparkles className="w-5 h-5" />
                View Pricing
              </Button>}
            {/* Show current plan for Pro users */}
            {(profile?.subscription_type === 'lifetime' || profile?.subscription_type === 'monthly') && <div className="flex items-center gap-2 px-6 py-3 rounded-full glass-card border-primary/30">
                {profile?.subscription_type === 'lifetime' ? <>
                    <Crown className="w-5 h-5 text-amber-500" />
                    <span className="text-sm font-semibold text-amber-500">Your Plan: Lifetime Pro</span>
                  </> : <>
                    <Zap className="w-5 h-5 text-purple-500" />
                    <span className="text-sm font-semibold text-purple-500">Your Plan: Pro Yearly</span>
                  </>}
              </div>}
          </div>
        </div>
      </section>

      {/* AI Models Showcase */}
      <AIModelsShowcase />
      
      {/* Features Section */}
      <section className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold">
              Why Choose <span className="text-primary">Magverse AI?</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Access the best AI models in one platform with simple pricing
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="glass-card p-6 rounded-xl space-y-4">
              <Zap className="w-10 h-10 text-primary" />
              <h3 className="text-xl font-bold">Multiple AI Models</h3>
              <p className="text-muted-foreground">
                Access GPT-5, Gemini, Claude, Perplexity, and more in one place
              </p>
            </div>

            <div className="glass-card p-6 rounded-xl space-y-4">
              <Shield className="w-10 h-10 text-primary" />
              <h3 className="text-xl font-bold">Simple Pricing</h3>
              <p className="text-muted-foreground">
                One subscription, unlimited access. Save 50% vs individual subscriptions
              </p>
            </div>

            <div className="glass-card p-6 rounded-xl space-y-4">
              <Sparkles className="w-10 h-10 text-primary" />
              <h3 className="text-xl font-bold">Advanced Features</h3>
              <p className="text-muted-foreground">
                Deep research, image generation, and chat history included
              </p>
            </div>
          </div>

          <div className="text-center pt-8">
            <Link to="/pricing">
              <Button size="lg" className="bg-primary hover:bg-primary/90">
                <Sparkles className="w-5 h-5 mr-2" />
                View Pricing Plans
              </Button>
            </Link>
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