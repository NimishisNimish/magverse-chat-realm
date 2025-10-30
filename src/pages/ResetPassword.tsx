import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, ArrowLeft, Link as LinkIcon, Lock } from "lucide-react";
import { z } from "zod";

const emailSchema = z.string().email("Invalid email address");

const ResetPassword = () => {
  const [email, setEmail] = useState("");
  const [method, setMethod] = useState<'link' | 'otp'>('link');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { resetPassword, verifyOTP } = useAuth();

  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate email
      emailSchema.parse(email);

      const { error } = await resetPassword(email, method);

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to send reset email",
        });
        return;
      }

      setEmailSent(true);
      if (method === 'otp') {
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
      }

      toast({
        title: "Success",
        description: method === 'link' 
          ? "Password reset link sent! Check your email."
          : "Verification code sent! Check your email.",
      });
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
        return;
      }

      const { error } = await verifyOTP(email, otp);

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Invalid or expired code",
        });
        return;
      }

      // Navigate to password reset confirmation
      navigate('/reset-password-confirm?verified=true');
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to verify code",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/auth')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Login
          </Button>
          
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Reset Password
          </h1>
          <p className="text-muted-foreground">
            {!emailSent 
              ? "Enter your email to receive reset instructions"
              : otpSent
              ? "Enter the 6-digit code sent to your email"
              : "Check your email for reset link"}
          </p>
        </div>

        {!emailSent ? (
          <form onSubmit={handleSendReset} className="space-y-6 bg-card p-8 rounded-lg border shadow-lg">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Reset Method</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setMethod('link')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    method === 'link'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <LinkIcon className="h-6 w-6 mx-auto mb-2" />
                  <div className="text-sm font-medium">Email Link</div>
                  <div className="text-xs text-muted-foreground">Click to reset</div>
                </button>
                
                <button
                  type="button"
                  onClick={() => setMethod('otp')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    method === 'otp'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Lock className="h-6 w-6 mx-auto mb-2" />
                  <div className="text-sm font-medium">OTP Code</div>
                  <div className="text-xs text-muted-foreground">6-digit code</div>
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending..." : method === 'link' ? "Send Reset Link" : "Send OTP Code"}
            </Button>
          </form>
        ) : otpSent ? (
          <form onSubmit={handleVerifyOTP} className="space-y-6 bg-card p-8 rounded-lg border shadow-lg">
            <div className="space-y-2">
              <label className="text-sm font-medium">Verification Code</label>
              <Input
                type="text"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="text-center text-2xl tracking-widest font-mono"
                maxLength={6}
                required
              />
              <p className="text-xs text-muted-foreground text-center">
                Enter the 6-digit code sent to {email}
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
              {loading ? "Verifying..." : "Verify Code"}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  if (countdown === 0) {
                    setOtpSent(false);
                    setEmailSent(false);
                    setOtp("");
                  }
                }}
                disabled={countdown > 0}
                className="text-sm text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
              >
                {countdown > 0 ? `Resend code in ${countdown}s` : "Resend code"}
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-card p-8 rounded-lg border shadow-lg text-center space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Check Your Email</h3>
            <p className="text-muted-foreground">
              We've sent a password reset link to <strong>{email}</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              The link will expire in 1 hour.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setEmailSent(false);
                setEmail("");
              }}
              className="mt-4"
            >
              Try Different Email
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
