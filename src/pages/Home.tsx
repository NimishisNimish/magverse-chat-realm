import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, Shield, Infinity, Mail, MapPin, Phone, Users, Target, Rocket } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import magverseLogo from "@/assets/magverse-logo.png";
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
              <span className="text-sm text-muted-foreground">6 Powerful AI Models in One Platform</span>
            </div>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold leading-tight">
            <span className="gradient-text">Magverse AI</span>
            <br />
            <span className="text-foreground">Access 6 AI Models</span>
            <br />
            <span className="text-foreground">Completely </span>
            <span className="text-primary">Free</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Unlimited access to ChatGPT, Gemini, Claude, and more. 
            All in one sleek, futuristic interface.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/chat">
              <Button variant="hero" size="lg" className="w-full sm:w-auto text-lg px-8">
                <Zap className="w-5 h-5" />
                Start Chatting
              </Button>
            </Link>
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
            <p className="text-muted-foreground">Access ChatGPT, Gemini, Claude, Llama, Deepseek, and more in one place.</p>
          </div>
          
          <div className="glass-card-hover p-8 rounded-2xl space-y-4 animate-slide-up" style={{
          animationDelay: "0.1s"
        }}>
            <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-secondary" />
            </div>
            <h3 className="text-xl font-semibold">Unlimited Access</h3>
            <p className="text-muted-foreground">
              All AI models, unlimited chats, completely free. No credit limits!
            </p>
          </div>
          
          <div className="glass-card-hover p-8 rounded-2xl space-y-4 animate-slide-up" style={{
          animationDelay: "0.2s"
        }}>
            <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
              <Infinity className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-xl font-semibold">No Limits</h3>
            <p className="text-muted-foreground">
              Unlimited chats with all models. No restrictions, no hidden costs.
            </p>
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
                    <span>Access to 6 premium AI models in one place</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-primary">✓</span>
                    <span>Completely free unlimited access</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-primary">✓</span>
                    <span>No credit limits or hidden costs</span>
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