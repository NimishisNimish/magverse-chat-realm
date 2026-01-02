import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Shield, Infinity, Target, ArrowRight } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Unified Intelligence",
    description: "Access GPT-4o, Claude 3.5, Gemini Pro, and more through a single interface. No switching accounts, no multiple bills.",
    link: "/chat",
    linkText: "Try Multiverse Chat",
    size: "large" as const,
    emoji: "⚡",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Your data is encrypted and never used for training. Built for professional privacy.",
    size: "medium" as const,
    emoji: "🛡️",
  },
  {
    icon: Infinity,
    title: "Unlimited Chats",
    description: "No daily limits for Pro users. Continuous innovation.",
    size: "small" as const,
    emoji: "♾️",
  },
  {
    icon: Target,
    title: "Deep Research",
    description: "Advanced reasoning models for complex problem solving.",
    size: "small" as const,
    emoji: "🎯",
  },
];

export const SuperchargeWorkflow = () => {
  return (
    <section className="py-28 relative z-10">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            <span className="text-foreground">About our </span>
            <span className="bg-gradient-to-r from-primary via-purple-400 to-pink-400 bg-clip-text text-transparent">
              apps
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to master AI, unified in one professional workspace.
          </p>
        </motion.div>

        {/* Grid Layout - Agentix style */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`
                ${feature.size === 'large' ? 'lg:col-span-2 lg:row-span-2' : ''}
                ${feature.size === 'medium' ? 'lg:col-span-2' : ''}
              `}
            >
              <div className={`
                h-full bg-card border border-border rounded-2xl p-6 relative overflow-hidden 
                card-hover-effect group
                ${feature.size === 'large' ? 'p-8' : ''}
              `}>
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                
                {/* Emoji icon */}
                <div className="text-3xl mb-4 relative z-10">
                  {feature.emoji}
                </div>
                
                {/* Content */}
                <div className="relative z-10">
                  <h3 className={`font-bold text-foreground mb-3 ${feature.size === 'large' ? 'text-2xl' : 'text-lg'}`}>
                    {feature.title}
                  </h3>
                  <p className={`text-muted-foreground ${feature.size === 'large' ? 'text-base mb-6' : 'text-sm'}`}>
                    {feature.description}
                  </p>
                  
                  {feature.link && (
                    <Link 
                      to={feature.link} 
                      className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium group/link"
                    >
                      {feature.linkText}
                      <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                    </Link>
                  )}
                </div>
                
                {/* Decorative icon for large cards */}
                {feature.size === 'large' && (
                  <div className="absolute bottom-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <feature.icon className="w-24 h-24 text-primary" />
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
