import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, ArrowLeft, Smartphone, Lock } from "lucide-react";
import { z } from "zod";

const emailSchema = z.string().email("Invalid email address");
const phoneSchema = z.string().regex(/^[6-9]\d{9}$/, "Invalid phone number. Must be 10 digits.");
const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password must be less than 100 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

const ResetPassword = () => {
  const [resetType, setResetType] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(0);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { resetPassword, sendPhoneOTP, verifyPhoneOTP, verifyOTP } = useAuth();

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (resetType === 'email') {
        emailSchema.parse(email);
        const { error } = await resetPassword(email, 'otp');
        if (error) throw error;
      } else {
        phoneSchema.parse(phoneNumber);
        const { error } = await sendPhoneOTP(phoneNumber);
        if (error) throw error;
      }

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
        title: "Success",
        description: `OTP sent to your ${resetType === 'email' ? 'email' : 'phone number'}`,
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
          return;
        }
      }

      if (resetType === 'phone') {
        const { error } = await verifyPhoneOTP(phoneNumber, otp, newPassword);
        if (error) throw error;

        toast({
          title: "Success",
          description: "Password reset successfully! You can now login.",
        });
        navigate('/auth');
      } else {
        const { error } = await verifyOTP(email, otp);
        if (error) throw error;
        navigate('/reset-password-confirm?verified=true');
      }
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
            {!otpSent 
              ? "Choose your preferred reset method"
              : "Enter OTP and new password"}
          </p>
        </div>

        {!otpSent ? (
          <form onSubmit={handleSendOTP} className="space-y-6 bg-card p-8 rounded-lg border shadow-lg">
            <div className="space-y-2">
              <label className="text-sm font-medium">Reset Method</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setResetType('email')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    resetType === 'email'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Mail className="h-6 w-6 mx-auto mb-2" />
                  <div className="text-sm font-medium">Email</div>
                </button>
                
                <button
                  type="button"
                  onClick={() => setResetType('phone')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    resetType === 'phone'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Smartphone className="h-6 w-6 mx-auto mb-2" />
                  <div className="text-sm font-medium">Phone</div>
                </button>
              </div>
            </div>

            {resetType === 'email' ? (
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
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone Number</label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="pl-10"
                    maxLength={10}
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Make sure your phone number is linked to your account
                </p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending..." : "Send OTP"}
            </Button>
          </form>
        ) : (
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
                Enter the 6-digit code sent to your {resetType}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-10"
                  minLength={6}
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Must be 8+ characters with uppercase, lowercase, and number
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading || otp.length !== 6 || !newPassword}>
              {loading ? "Verifying..." : "Reset Password"}
            </Button>

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
                className="text-sm text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
              >
                {countdown > 0 ? `Resend code in ${countdown}s` : "Resend code"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
