import { Link } from "react-router-dom";
import { Mail, Phone } from "lucide-react";
import magverseLogo from "@/assets/magverse-ai-logo.png";

export const Footer = () => {
  return (
    <footer className="border-t border-border/50 bg-background/50 backdrop-blur-sm relative z-10">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <img src={magverseLogo} alt="Magverse AI" className="w-10 h-10" />
              <span className="text-xl font-bold">
                Magverse <span className="text-primary">AI</span>
              </span>
            </div>
            <p className="text-muted-foreground text-sm mb-6">
              The world's most advanced AI models, unified in one professional workspace. Built for the next generation of intelligence.
            </p>
            <div className="flex items-center gap-3">
              <a 
                href="mailto:magverse4@gmail.com" 
                className="w-10 h-10 rounded-lg bg-muted/50 border border-border/50 flex items-center justify-center hover:bg-muted transition-colors"
              >
                <Mail className="w-5 h-5 text-muted-foreground" />
              </a>
              <a 
                href="tel:+919872021777" 
                className="w-10 h-10 rounded-lg bg-muted/50 border border-border/50 flex items-center justify-center hover:bg-muted transition-colors"
              >
                <Phone className="w-5 h-5 text-muted-foreground" />
              </a>
            </div>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Platform
            </h4>
            <ul className="space-y-3">
              <li>
                <Link to="/ai-models" className="text-foreground hover:text-primary transition-colors">
                  AI Models
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-foreground hover:text-primary transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/chat" className="text-foreground hover:text-primary transition-colors">
                  Chat Interface
                </Link>
              </li>
              <li>
                <Link to="/history" className="text-foreground hover:text-primary transition-colors">
                  Chat History
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Company
            </h4>
            <ul className="space-y-3">
              <li>
                <a href="#about" className="text-foreground hover:text-primary transition-colors">
                  About Us
                </a>
              </li>
              <li>
                <a href="#contact" className="text-foreground hover:text-primary transition-colors">
                  Contact
                </a>
              </li>
              <li>
                <Link to="/privacy-policy" className="text-foreground hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms-of-service" className="text-foreground hover:text-primary transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Empty column for spacing on desktop */}
          <div className="hidden md:block" />
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © 2025 Magverse AI. Designed for professionals.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border/50 bg-muted/30">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              All Systems Operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
