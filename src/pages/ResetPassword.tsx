import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, ArrowLeft, Lock, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { z } from "zod";
import AnimatedBackground from "@/components/auth/AnimatedBackground";
import AuthSuccessAnimation from "@/components/auth/AuthSuccessAnimation";

const emailSchema = z.string().email("Invalid email address");
const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password must be less than 100 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

const ResetPassword = () => {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { resetPassword, verifyOTP } = useAuth();

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      emailSchema.parse(email);
      const { error } = await resetPassword(email, 'otp');
      if (error) throw error;

      setOtpSent(true);
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      toast({
        title: "OTP Sent!",
        description: "Check your email for the verification code",
      });
    } catch (error: any) {
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
          description: error.message || "Failed to send OTP",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (otp.length !== 6) {
        toast({
          variant: "destructive",
          title: "Invalid OTP",
          description: "Please enter a 6-digit code",
        });
        setLoading(false);
        return;
      }

      try {
        passwordSchema.parse(newPassword);
      } catch (err) {
        if (err instanceof z.ZodError) {
          toast({
            variant: "destructive",
            title: "Invalid Password",
            description: err.errors[0].message,
          });
          setLoading(false);
          return;
        }
      }

      const { error } = await verifyOTP(email, otp);
      if (error) throw error;
      
      setShowSuccess(true);
      setTimeout(() => {
        navigate('/reset-password-confirm?verified=true');
      }, 1500);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.message || "Failed to verify OTP",
      });
    } finally {
      setLoading(false);
    }
  };

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
            Reset Password
          </h1>
          <p className="text-muted-foreground">
            {!otpSent 
              ? "Enter your email to receive a reset code"
              : "Enter the code and your new password"}
          </p>
        </motion.div>

        {/* Form Card */}
        <motion.div
          variants={itemVariants}
          className="glass-card rounded-2xl p-6 sm:p-8 shadow-2xl shadow-primary/5 border border-glass-border"
        >
          <AnimatePresence mode="wait">
            {showSuccess ? (
              <AuthSuccessAnimation 
                message="Verified!" 
                subMessage="Redirecting to set new password..."
              />
            ) : !otpSent ? (
              <motion.form
                key="email-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleSendOTP}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    Email Address
                  </label>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 bg-input/50 border-border/50 focus:border-primary/50"
                    required
                  />
                </div>

                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-gradient-to-r from-primary to-accent" 
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      "Send Reset Code"
                    )}
                  </Button>
                </motion.div>
              </motion.form>
            ) : (
              <motion.form
                key="otp-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleVerifyOTP}
                className="space-y-6"
              >
                {/* OTP Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Verification Code</label>
                  <div className="flex justify-center">
                    <Input
                      type="text"
                      placeholder="000000"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="h-14 text-center text-2xl tracking-[0.5em] font-mono max-w-[200px] bg-input/50 border-border/50"
                      maxLength={6}
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Enter the 6-digit code sent to your email
                  </p>
                </div>

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
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
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
                  <div className="space-y-1 mt-2">
                    {[
                      { label: "8+ characters", valid: newPassword.length >= 8 },
                      { label: "Uppercase letter", valid: /[A-Z]/.test(newPassword) },
                      { label: "Lowercase letter", valid: /[a-z]/.test(newPassword) },
                      { label: "Number", valid: /[0-9]/.test(newPassword) },
                    ].map((req) => (
                      <div key={req.label} className="flex items-center gap-2 text-xs">
                        <CheckCircle2 
                          className={`w-3 h-3 ${req.valid ? 'text-green-500' : 'text-muted-foreground/40'}`} 
                        />
                        <span className={req.valid ? 'text-green-500' : 'text-muted-foreground'}>
                          {req.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-gradient-to-r from-primary to-accent" 
                    disabled={loading || otp.length !== 6 || !newPassword}
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      "Reset Password"
                    )}
                  </Button>
                </motion.div>

                {/* Resend */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (countdown === 0) {
                        setOtpSent(false);
                        setOtp("");
                        setNewPassword("");
                      }
                    }}
                    disabled={countdown > 0}
                    className="text-sm text-primary hover:underline disabled:text-muted-foreground disabled:no-underline transition-colors"
                  >
                    {countdown > 0 ? `Resend code in ${countdown}s` : "Resend code"}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
