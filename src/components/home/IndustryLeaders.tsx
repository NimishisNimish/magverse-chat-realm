import { motion } from "framer-motion";

// Bold text names for companies (no logos as per request)
const leaders = [
  { name: "OpenAI" },
  { name: "Anthropic" },
  { name: "Google" },
  { name: "xAI" },
  { name: "Perplexity" },
  { name: "Mistral" },
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
          
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
            {leaders.map((leader, index) => (
              <motion.div
                key={leader.name}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="group"
              >
                <span className="text-xl md:text-2xl font-bold text-muted-foreground/70 group-hover:text-foreground transition-colors cursor-default">
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
