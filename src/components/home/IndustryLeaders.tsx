import { motion } from "framer-motion";

// Import real logos
import perplexityLogo from "@/assets/ai-logos/perplexity-logo.png";
import claudeLogo from "@/assets/ai-logos/claude-logo-clean.png";
import chatgptLogo from "@/assets/ai-logos/chatgpt-logo-clean.png";
import grokLogo from "@/assets/ai-logos/grok-logo.png";
import geminiLogo from "@/assets/ai-logos/gemini-logo.svg";
import mistralLogo from "@/assets/ai-logos/mistral-logo-clean.png";

const leaders = [
  { name: "OpenAI", logo: chatgptLogo },
  { name: "Anthropic", logo: claudeLogo },
  { name: "Google", logo: geminiLogo },
  { name: "xAI", logo: grokLogo },
  { name: "Perplexity", logo: perplexityLogo },
  { name: "Mistral", logo: mistralLogo },
];

export const IndustryLeaders = () => {
  return (
    <section className="py-20 relative z-10 border-t border-border/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground/60 mb-10 font-medium">
            Trusted Companies
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-10 md:gap-16">
            {leaders.map((leader, index) => (
              <motion.div
                key={leader.name}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="flex items-center gap-3 group"
              >
                <div className="w-10 h-10 rounded-lg bg-muted/30 border border-border/50 flex items-center justify-center overflow-hidden group-hover:border-primary/50 transition-colors">
                  <img 
                    src={leader.logo} 
                    alt={leader.name} 
                    className="w-6 h-6 object-contain opacity-70 group-hover:opacity-100 transition-opacity"
                  />
                </div>
                <span className="text-lg font-semibold text-muted-foreground/60 group-hover:text-foreground transition-colors">
                  {leader.name}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};
