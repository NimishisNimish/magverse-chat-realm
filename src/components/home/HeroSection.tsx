import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import { motion } from "framer-motion";

interface HeroSectionProps {
  user: any;
}

export const HeroSection = ({ user }: HeroSectionProps) => {
  return (
    <section className="min-h-[90vh] flex flex-col items-center justify-center relative z-10 px-4">
      {/* Badge */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border/50 backdrop-blur-sm">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm text-muted-foreground uppercase tracking-widest font-medium">
            Next Generation AI Platform
          </span>
        </div>
      </motion.div>

      {/* Main headline */}
      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="text-5xl md:text-7xl lg:text-8xl font-bold text-center leading-tight mb-6"
      >
        <span className="text-foreground">The Ultimate</span>
        <br />
        <span className="text-foreground">AI </span>
        <span className="bg-gradient-to-r from-primary via-purple-400 to-muted-foreground bg-clip-text text-transparent">
          Multiverse
        </span>
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-lg md:text-xl text-muted-foreground text-center max-w-2xl mb-10"
      >
        Experience the world's most powerful AI models in one seamless interface. 
        Designed for professionals, built for everyone.
      </motion.p>

      {/* CTA Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex flex-col sm:flex-row items-center gap-4"
      >
        <Link to={user ? "/chat" : "/auth"}>
          <Button 
            size="lg" 
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg font-semibold rounded-xl"
          >
            Get Started Free
            <Zap className="w-5 h-5 ml-2" />
          </Button>
        </Link>
        <Link to="/pricing">
          <Button 
            variant="outline" 
            size="lg" 
            className="px-8 py-6 text-lg font-semibold rounded-xl border-border/50 bg-background/50 backdrop-blur-sm hover:bg-muted/50"
          >
            Explore Pricing
          </Button>
        </Link>
      </motion.div>
    </section>
  );
};
