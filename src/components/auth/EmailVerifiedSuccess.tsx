import { motion } from "framer-motion";
import { CheckCircle2, Sparkles } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const EmailVerifiedSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to chat after animation
    const timer = setTimeout(() => {
      navigate('/chat');
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="text-center py-8"
    >
      {/* Animated checkmark with sparkles */}
      <div className="relative inline-block mb-6">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ 
            type: "spring", 
            stiffness: 200, 
            damping: 15,
            delay: 0.1 
          }}
          className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400/20 to-emerald-500/20 flex items-center justify-center mx-auto"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
          >
            <CheckCircle2 className="w-14 h-14 text-green-500" />
          </motion.div>
        </motion.div>

        {/* Sparkle animations */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0],
              x: [0, (i % 2 === 0 ? 1 : -1) * (20 + i * 10)],
              y: [0, (i < 3 ? -1 : 1) * (15 + i * 5)]
            }}
            transition={{ 
              duration: 0.8, 
              delay: 0.4 + i * 0.1,
              ease: "easeOut"
            }}
            className="absolute top-1/2 left-1/2"
            style={{ marginLeft: -4, marginTop: -4 }}
          >
            <Sparkles className="w-4 h-4 text-primary" />
          </motion.div>
        ))}

        {/* Pulse ring */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0.8 }}
          animate={{ 
            scale: [0.8, 1.5, 1.5],
            opacity: [0.8, 0, 0]
          }}
          transition={{ 
            duration: 1,
            delay: 0.2,
            ease: "easeOut"
          }}
          className="absolute inset-0 rounded-full border-2 border-green-500"
        />
      </div>

      <motion.h3 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-2xl font-bold text-foreground mb-2"
      >
        Email Verified!
      </motion.h3>
      
      <motion.p 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="text-muted-foreground text-sm mb-4"
      >
        Welcome to Magverse AI
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full"
        />
        Redirecting you to chat...
      </motion.div>
    </motion.div>
  );
};

export default EmailVerifiedSuccess;
