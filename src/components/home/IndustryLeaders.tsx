import { motion } from "framer-motion";

const leaders = [
  { name: "OpenAI", color: "text-muted-foreground/70" },
  { name: "Anthropic", color: "text-muted-foreground/70" },
  { name: "Google", color: "text-muted-foreground/70" },
  { name: "Meta", color: "text-muted-foreground/70" },
  { name: "Mistral", color: "text-muted-foreground/70" },
];

export const IndustryLeaders = () => {
  return (
    <section className="py-16 relative z-10">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground/60 mb-8 font-medium">
            Powered by Industry Leaders
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            {leaders.map((leader, index) => (
              <motion.span
                key={leader.name}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`text-xl md:text-2xl font-semibold ${leader.color} hover:text-foreground transition-colors cursor-default`}
              >
                {leader.name}
              </motion.span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};
