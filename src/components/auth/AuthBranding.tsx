import { motion } from "framer-motion";
import { Sparkles, Zap, Shield, Brain } from "lucide-react";

const AuthBranding = () => {
  const features = [
    { icon: Brain, text: "10+ AI Models" },
    { icon: Zap, text: "Lightning Fast" },
    { icon: Shield, text: "Secure & Private" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="hidden lg:flex flex-col justify-center items-center p-12 relative"
    >
      {/* Logo and title */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
        className="text-center mb-12"
      >
        <motion.div
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="inline-block mb-6"
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
            <Sparkles className="w-10 h-10 text-primary-foreground" />
          </div>
        </motion.div>
        
        <h1 className="text-4xl font-bold gradient-text mb-3">Magverse AI</h1>
        <p className="text-lg text-muted-foreground max-w-xs">
          Your gateway to the future of AI-powered conversations
        </p>
      </motion.div>

      {/* Feature list */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-4"
      >
        {features.map((feature, index) => (
          <motion.div
            key={feature.text}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + index * 0.1 }}
            className="flex items-center gap-3 text-muted-foreground"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <feature.icon className="w-5 h-5 text-primary" />
            </div>
            <span className="text-foreground">{feature.text}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* Decorative elements */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-12 left-12 w-16 h-16 rounded-full bg-primary/5 blur-xl"
      />
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-12 right-12 w-20 h-20 rounded-full bg-accent/5 blur-xl"
      />
    </motion.div>
  );
};

export default AuthBranding;
