import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Shield, Infinity, Target } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Unified Intelligence",
    description: "Access GPT-4o, Claude 3.5 Sonnet, Gemini Pro, and more through a single interface. No switching accounts, no multiple bills.",
    link: "/chat",
    linkText: "Try Multiverse Chat",
    size: "large" as const,
    showDecorative: true,
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Your data is encrypted and never used for training. Built for professional privacy.",
    size: "medium" as const,
  },
  {
    icon: Infinity,
    title: "Unlimited Chats",
    description: "No daily limits for Pro users. Continuous innovation.",
    size: "small" as const,
  },
  {
    icon: Target,
    title: "Deep Research",
    description: "Advanced reasoning models for complex problem solving.",
    size: "small" as const,
  },
];

export const SuperchargeWorkflow = () => {
  return (
    <section className="py-24 relative z-10">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            <span className="text-foreground italic">Supercharge your </span>
            <span className="bg-gradient-to-r from-primary via-purple-400 to-muted-foreground bg-clip-text text-transparent italic">
              Workflow
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to master AI, unified in one professional workspace.
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* Large card - Unified Intelligence */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="md:col-span-1 lg:row-span-2"
          >
            <div className="h-full bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 relative overflow-hidden group hover:border-primary/50 transition-colors">
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-6">
                <Zap className="w-6 h-6 text-primary" />
              </div>

              {/* Decorative element */}
              <div className="absolute top-8 right-8 opacity-20 group-hover:opacity-30 transition-opacity">
                <Zap className="w-32 h-32 text-primary" />
              </div>

              <h3 className="text-2xl font-bold text-foreground mb-4">
                {features[0].title}
              </h3>
              <p className="text-muted-foreground mb-6 relative z-10">
                {features[0].description}
              </p>

              <Link 
                to={features[0].link!} 
                className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
              >
                {features[0].linkText}
                <Zap className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>

          {/* Medium card - Enterprise Security */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="md:col-span-1 lg:col-span-2"
          >
            <div className="h-full bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 group hover:border-primary/50 transition-colors">
              <div className="flex items-start gap-6">
                <div className="w-12 h-12 rounded-full bg-muted/50 border border-border/50 flex items-center justify-center shrink-0">
                  <Shield className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    {features[1].title}
                  </h3>
                  <p className="text-muted-foreground">
                    {features[1].description}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Small cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="h-full bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 text-center group hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 rounded-full bg-muted/50 border border-border/50 flex items-center justify-center mx-auto mb-4">
                <Infinity className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">
                {features[2].title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {features[2].description}
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="h-full bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 text-center group hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 rounded-full bg-muted/50 border border-border/50 flex items-center justify-center mx-auto mb-4">
                <Target className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">
                {features[3].title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {features[3].description}
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
