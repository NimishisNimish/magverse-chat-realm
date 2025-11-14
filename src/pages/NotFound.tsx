import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, MessageSquare, Search, ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const NotFound = () => {
  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center px-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute top-20 left-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: 999999,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-20 right-20 w-96 h-96 bg-secondary/20 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 5,
            repeat: 999999,
            ease: "easeInOut"
          }}
        />
      </div>

      <div className="max-w-4xl w-full relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-8"
        >
          {/* Animated 404 */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative"
          >
            <motion.h1
              className="text-9xl md:text-[200px] font-bold gradient-text"
              animate={{
                textShadow: [
                  "0 0 20px hsl(var(--primary) / 0.3)",
                  "0 0 40px hsl(var(--primary) / 0.5)",
                  "0 0 20px hsl(var(--primary) / 0.3)",
                ]
              }}
              transition={{
                duration: 2,
                repeat: 999999,
                ease: "easeInOut"
              }}
            >
              404
            </motion.h1>
            
            {/* Floating sparkles around 404 */}
            {Array.from({ length: 6 }, (_, i) => (
              <motion.div
                key={`sparkle-${i}`}
                className="absolute"
                style={{
                  left: `${20 + i * 15}%`,
                  top: `${20 + (i % 2) * 40}%`,
                }}
                animate={{
                  y: [0, -20, 0],
                  opacity: [0.3, 1, 0.3],
                  scale: [0.8, 1.2, 0.8],
                }}
                transition={{
                  duration: 2 + i * 0.3,
                  repeat: 999999,
                  ease: "easeInOut",
                  delay: i * 0.2,
                }}
              >
                <Sparkles className="w-6 h-6 text-primary" />
              </motion.div>
            ))}
          </motion.div>

          {/* Message */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="space-y-4"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Oops! Page Not Found
            </h2>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              The page you're looking for seems to have vanished into the digital void. 
              Let's get you back on track!
            </p>
          </motion.div>

          {/* Quick Navigation Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12"
          >
            <Link to="/" className="block">
              <Card className="glass-card-hover p-6 text-center group">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Home className="w-12 h-12 mx-auto mb-3 text-primary" />
                </motion.div>
                <h3 className="font-semibold mb-2">Home</h3>
                <p className="text-sm text-muted-foreground">
                  Return to the homepage
                </p>
              </Card>
            </Link>

            <Link to="/chat" className="block">
              <Card className="glass-card-hover p-6 text-center group">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: -5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 text-secondary" />
                </motion.div>
                <h3 className="font-semibold mb-2">Chat</h3>
                <p className="text-sm text-muted-foreground">
                  Start a new AI conversation
                </p>
              </Card>
            </Link>

            <Link to="/dashboard" className="block">
              <Card className="glass-card-hover p-6 text-center group">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Search className="w-12 h-12 mx-auto mb-3 text-accent" />
                </motion.div>
                <h3 className="font-semibold mb-2">Dashboard</h3>
                <p className="text-sm text-muted-foreground">
                  View your activity stats
                </p>
              </Card>
            </Link>
          </motion.div>

          {/* Back Button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="pt-8"
          >
            <Button
              magnetic
              variant="hero"
              size="lg"
              onClick={() => window.history.back()}
              className="group"
            >
              <motion.div
                animate={{ x: [-2, 0, -2] }}
                transition={{ duration: 1.5, repeat: 999999 }}
              >
                <ArrowLeft className="w-5 h-5" />
              </motion.div>
              Go Back
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default NotFound;
