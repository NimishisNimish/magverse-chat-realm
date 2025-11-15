import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface NotificationBadgeProps {
  count: number;
  variant?: "credits" | "subscription" | "achievement";
  className?: string;
  animate?: boolean;
}

export const NotificationBadge = ({ 
  count, 
  variant = "credits",
  className,
  animate = true 
}: NotificationBadgeProps) => {
  if (count === 0) return null;

  const variantStyles = {
    credits: "bg-gradient-to-r from-green-500 to-emerald-600",
    subscription: "bg-gradient-to-r from-blue-500 to-cyan-600",
    achievement: "bg-gradient-to-r from-purple-500 to-pink-600"
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={count}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ 
          scale: [0, 1.3, 1],
          opacity: 1,
        }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 15,
          duration: 0.6
        }}
      >
        <Badge 
          className={cn(
            variantStyles[variant],
            "text-white border-0 font-bold shadow-lg",
            "animate-bounce-subtle",
            className
          )}
        >
          +{count}
        </Badge>
      </motion.div>
    </AnimatePresence>
  );
};
