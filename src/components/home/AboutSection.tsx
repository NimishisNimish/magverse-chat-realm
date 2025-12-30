import { motion } from "framer-motion";
import { Zap, Shield, Globe, Users, Target, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const AboutSection = () => {
  const values = [
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Optimized for speed with real-time streaming responses from all AI models."
    },
    {
      icon: Shield,
      title: "Privacy First",
      description: "Your data stays yours. We never train on your conversations or sell your information."
    },
    {
      icon: Globe,
      title: "Global Access",
      description: "Available worldwide with models from OpenAI, Google, Anthropic, Perplexity, and more."
    },
    {
      icon: Users,
      title: "Community Driven",
      description: "Built with feedback from real users to solve real problems in AI accessibility."
    }
  ];

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
          <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/5">
            <Sparkles className="w-3 h-3 mr-1" />
            About Us
          </Badge>
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            <span className="text-foreground">Our </span>
            <span className="bg-gradient-to-r from-primary via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Mission
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            MagverseAI was born from a simple belief: everyone deserves access to the world's most powerful AI models without breaking the bank. We're building an AI-powered platform that democratizes access to premium AI through flexible, affordable pricing.
          </p>
        </motion.div>

        {/* Values Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {values.map((value, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 hover:border-primary/50 transition-all duration-300 group"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <value.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{value.title}</h3>
              <p className="text-sm text-muted-foreground">{value.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Mission Statement */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20">
            <Target className="w-5 h-5 text-primary" />
            <span className="text-foreground font-medium">
              Launched October 2025 • Serving users worldwide
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
