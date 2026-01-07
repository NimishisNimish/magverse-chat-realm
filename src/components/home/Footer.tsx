import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Phone, ArrowUpRight, Github, Linkedin, Twitter } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import magverseLogo from "@/assets/magverse-ai-logo.png";

export const Footer = () => {
  const [email, setEmail] = useState("");
  const [subscribing, setSubscribing] = useState(false);

  const handleSubscribe = async () => {
    if (!email) {
      toast.error("Please enter your email");
      return;
    }

    setSubscribing(true);
    try {
      const { data, error } = await supabase.functions.invoke('subscribe-newsletter', {
        body: { email, source: 'footer' }
      });

      if (error) throw error;
      
      toast.success(data.message || "Successfully subscribed! 🎉");
      setEmail("");
    } catch (error: any) {
      toast.error(error.message || "Failed to subscribe");
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <footer className="border-t border-border/30 bg-card/30 relative z-10">
      <div className="container mx-auto px-4 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand */}
          <div className="lg:col-span-1">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex items-center gap-3 mb-6"
            >
              <img src={magverseLogo} alt="Magverse AI" className="w-10 h-10" />
              <span className="text-xl font-bold">
                Magverse <span className="text-primary">AI</span>
              </span>
            </motion.div>
            <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
              The world's most advanced AI models, unified in one professional workspace. Built for the next generation of intelligence.
            </p>
            
            {/* Social links */}
            <div className="flex items-center gap-3">
              <a 
                href="mailto:magverse4@gmail.com" 
                className="w-10 h-10 rounded-xl bg-muted/30 border border-border flex items-center justify-center hover:bg-primary/10 hover:border-primary/50 transition-all"
              >
                <Mail className="w-4 h-4 text-muted-foreground" />
              </a>
              <a 
                href="https://linkedin.com/in/nimishkalsi" 
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl bg-muted/30 border border-border flex items-center justify-center hover:bg-primary/10 hover:border-primary/50 transition-all"
              >
                <Linkedin className="w-4 h-4 text-muted-foreground" />
              </a>
              <a 
                href="tel:+919872021777" 
                className="w-10 h-10 rounded-xl bg-muted/30 border border-border flex items-center justify-center hover:bg-primary/10 hover:border-primary/50 transition-all"
              >
                <Phone className="w-4 h-4 text-muted-foreground" />
              </a>
            </div>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-foreground mb-6">
              Platform
            </h4>
            <ul className="space-y-4">
              {[
                { label: 'AI Models', to: '/models' },
                { label: 'Pricing', to: '/pricing' },
                { label: 'Chat Interface', to: '/chat' },
                { label: 'Chat History', to: '/history' },
              ].map((item) => (
                <li key={item.label}>
                  <Link 
                    to={item.to} 
                    className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 group"
                  >
                    {item.label}
                    <ArrowUpRight className="w-3 h-3 opacity-0 -translate-y-0.5 translate-x-0.5 group-hover:opacity-100 transition-all" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-foreground mb-6">
              Company
            </h4>
            <ul className="space-y-4">
              {[
                { label: 'About Us', href: '#about' },
                { label: 'Contact', href: '#contact' },
                { label: 'Patches & Updates', to: '/patches' },
                { label: 'Privacy Policy', to: '/privacy-policy' },
                { label: 'Terms of Service', to: '/terms-of-service' },
              ].map((item) => (
                <li key={item.label}>
                  {'to' in item ? (
                    <Link 
                      to={item.to} 
                      className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 group"
                    >
                      {item.label}
                      <ArrowUpRight className="w-3 h-3 opacity-0 -translate-y-0.5 translate-x-0.5 group-hover:opacity-100 transition-all" />
                    </Link>
                  ) : (
                    <a 
                      href={item.href} 
                      className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 group"
                    >
                      {item.label}
                      <ArrowUpRight className="w-3 h-3 opacity-0 -translate-y-0.5 translate-x-0.5 group-hover:opacity-100 transition-all" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-foreground mb-6">
              Subscribe for Newsletter
            </h4>
            <p className="text-muted-foreground text-sm mb-4">
              Stay updated with the latest AI developments and features.
            </p>
            <div className="flex gap-2">
              <input 
                type="email" 
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubscribe()}
                className="flex-1 px-4 py-2.5 rounded-xl bg-muted/30 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors text-sm"
              />
              <button 
                onClick={handleSubscribe}
                disabled={subscribing}
                className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {subscribing ? '...' : 'Subscribe'}
              </button>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-border/30 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © 2026 Magverse AI. Designed for professionals.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border/50 bg-muted/20">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-muted-foreground">
              All Systems Operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
