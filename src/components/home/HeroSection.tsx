import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface HeroSectionProps {
  user: any;
}

export const HeroSection = ({ user }: HeroSectionProps) => {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center relative z-10 px-4 pt-20">
      {/* Spotlight effect */}
      <div className="absolute inset-0 spotlight pointer-events-none" />
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 grid-pattern opacity-30 pointer-events-none" />
      
      {/* Floating orbs */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-primary/20 rounded-full blur-[150px] mesh-blob pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-purple-600/15 rounded-full blur-[120px] mesh-blob pointer-events-none" style={{ animationDelay: '-5s' }} />
      
      {/* Badge */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8 relative z-10"
      >
        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm text-foreground font-medium">
            Start your AI journey today
          </span>
        </div>
      </motion.div>

      {/* Main headline */}
      <motion.h1
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1 }}
        className="text-5xl md:text-7xl lg:text-8xl font-bold text-center leading-[1.1] mb-8 relative z-10"
      >
        <span className="text-foreground">Let's build </span>
        <span className="bg-gradient-to-r from-primary via-purple-400 to-pink-400 bg-clip-text text-transparent">
          AI agents
        </span>
        <br />
        <span className="text-foreground">together</span>
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="text-lg md:text-xl text-muted-foreground text-center max-w-2xl mb-12 relative z-10"
      >
        Access the world's most powerful AI models through one unified platform. 
        ChatGPT, Claude, Gemini, Perplexity, and more — all in one place.
      </motion.p>

      {/* CTA Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="flex flex-col sm:flex-row items-center gap-4 relative z-10"
      >
        <Link to={user ? "/chat" : "/auth"}>
          <Button 
            size="lg" 
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg font-semibold rounded-full glow-effect-subtle button-hover-glow group"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
        <Link to="/pricing">
          <Button 
            variant="outline" 
            size="lg" 
            className="px-8 py-6 text-lg font-semibold rounded-full border-border/50 bg-transparent hover:bg-muted/30 hover:border-primary/50 transition-all"
          >
            View Pricing
          </Button>
        </Link>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2"
      >
        <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2">
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-1.5 h-1.5 rounded-full bg-primary"
          />
        </div>
      </motion.div>
    </section>
  );
};
