import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Lock, Eye, EyeOff, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import { z } from "zod";
import AnimatedBackground from "@/components/auth/AnimatedBackground";
import AuthSuccessAnimation from "@/components/auth/AuthSuccessAnimation";

const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password must be less than 100 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

const ResetPasswordConfirm = () => {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { updatePassword } = useAuth();

  const hasToken = searchParams.get('token') || searchParams.get('type') === 'recovery';
  const isVerified = searchParams.get('verified') === 'true';

  useEffect(() => {
    if (!hasToken && !isVerified) {
      toast({
        variant: "destructive",
        title: "Invalid Link",
        description: "This password reset link is invalid or expired.",
      });
      navigate('/reset-password');
    }
  }, [hasToken, isVerified, navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      passwordSchema.parse(password);

      if (password !== confirmPassword) {
        toast({
          variant: "destructive",
          title: "Passwords Don't Match",
          description: "Please make sure both passwords are identical.",
        });
        setLoading(false);
        return;
      }

      const { error } = await updatePassword(password);

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to update password",
        });
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => navigate('/auth'), 2000);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: error.errors[0].message,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "An unexpected error occurred",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const passwordRequirements = [
    { label: "8+ characters", valid: password.length >= 8 },
    { label: "Uppercase letter", valid: /[A-Z]/.test(password) },
    { label: "Lowercase letter", valid: /[a-z]/.test(password) },
    { label: "Number", valid: /[0-9]/.test(password) },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <AnimatedBackground />
      
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md relative z-10"
      >
        {/* Back Button */}
        <motion.div variants={itemVariants}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/auth')}
            className="mb-6 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Login
          </Button>
        </motion.div>

        {/* Header */}
        <motion.div variants={itemVariants} className="text-center mb-8">
          <h1 className="text-3xl font-bold gradient-text mb-2">
            Create New Password
          </h1>
          <p className="text-muted-foreground">
            Enter your new password below
          </p>
        </motion.div>

        {/* Form Card */}
        <motion.div
          variants={itemVariants}
          className="glass-card rounded-2xl p-6 sm:p-8 shadow-2xl shadow-primary/5 border border-glass-border"
        >
          <AnimatePresence mode="wait">
            {success ? (
              <AuthSuccessAnimation 
                message="Password Updated!" 
                subMessage="Redirecting to login..."
              />
            ) : (
              <motion.form
                key="password-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleSubmit}
                className="space-y-6"
              >
                {/* New Password */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                    New Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 bg-input/50 border-border/50 pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  
                  {/* Password requirements */}
                  <div className="grid grid-cols-2 gap-1 mt-2">
                    {passwordRequirements.map((req) => (
                      <motion.div 
                        key={req.label} 
                        className="flex items-center gap-2 text-xs"
                        initial={{ opacity: 0.5 }}
                        animate={{ opacity: req.valid ? 1 : 0.5 }}
                      >
                        <CheckCircle2 
                          className={`w-3 h-3 transition-colors ${req.valid ? 'text-green-500' : 'text-muted-foreground/40'}`} 
                        />
                        <span className={`transition-colors ${req.valid ? 'text-green-500' : 'text-muted-foreground'}`}>
                          {req.label}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-12 bg-input/50 border-border/50 pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Match indicator */}
                {password && confirmPassword && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-center gap-2 text-sm ${
                      password === confirmPassword ? 'text-green-500' : 'text-destructive'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                  </motion.div>
                )}

                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-gradient-to-r from-primary to-accent" 
                    disabled={loading || password !== confirmPassword || password.length < 8}
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      "Update Password"
                    )}
                  </Button>
                </motion.div>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ResetPasswordConfirm;
