import { motion } from "framer-motion";
import { Mail, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EmailVerificationPendingProps {
  email: string;
  onBack: () => void;
}

const EmailVerificationPending = ({ email, onBack }: EmailVerificationPendingProps) => {
  const [resending, setResending] = useState(false);
  const { toast } = useToast();

  const handleResendEmail = async () => {
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth?verified=true`,
        }
      });

      if (error) throw error;

      toast({
        title: "Email sent!",
        description: "Check your inbox for the verification link.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to resend verification email",
        variant: "destructive",
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="text-center py-8"
    >
      {/* Animated Email Icon */}
      <motion.div
        initial={{ y: -20 }}
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="inline-block mb-6"
      >
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Mail className="w-10 h-10 text-primary" />
          </div>
          {/* Sparkle effects */}
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full"
          />
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.3, 1] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            className="absolute -bottom-1 -left-1 w-2 h-2 bg-accent rounded-full"
          />
        </div>
      </motion.div>

      <h3 className="text-xl font-bold text-foreground mb-2">
        Check your email
      </h3>
      
      <p className="text-muted-foreground text-sm mb-6">
        We've sent a verification link to<br />
        <span className="font-medium text-foreground">{email}</span>
      </p>

      <div className="space-y-3">
        <Button
          variant="outline"
          className="w-full h-11"
          onClick={handleResendEmail}
          disabled={resending}
        >
          {resending ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Resend verification email
        </Button>

        <Button
          variant="ghost"
          className="w-full"
          onClick={onBack}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to login
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mt-6">
        Didn't receive the email? Check your spam folder or try resending.
      </p>
    </motion.div>
  );
};

export default EmailVerificationPending;
