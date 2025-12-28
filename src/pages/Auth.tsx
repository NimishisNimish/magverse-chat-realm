import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  Sparkles, Mail, Lock, Upload, Loader2, Eye, EyeOff, 
  ArrowRight, User, KeyRound, MessageSquare
} from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import AnimatedBackground from "@/components/auth/AnimatedBackground";
import AuthBranding from "@/components/auth/AuthBranding";
import AuthSuccessAnimation from "@/components/auth/AuthSuccessAnimation";
import EmailVerificationPending from "@/components/auth/EmailVerificationPending";
import EmailVerifiedSuccess from "@/components/auth/EmailVerifiedSuccess";

const emailSchema = z.string().email("Invalid email address").max(255);
const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password must be less than 100 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

const usernameSchema = z.string()
  .min(3, "Username must be at least 3 characters")
  .max(20, "Username must be less than 20 characters")
  .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores");

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [signupStep, setSignupStep] = useState<1 | 2 | 'verification' | 'verified'>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [usernameError, setUsernameError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  
  const { signUp, signIn, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check for email verification success
  useEffect(() => {
    const verified = searchParams.get('verified');
    if (verified === 'true') {
      setSignupStep('verified');
    }
  }, [searchParams]);

  // Load remember me preference
  useEffect(() => {
    const remembered = localStorage.getItem('magverse_remember_me');
    if (remembered === 'true') {
      setRememberMe(true);
    }
  }, []);

  const checkUsernameAvailability = async (usernameToCheck: string) => {
    try {
      usernameSchema.parse(usernameToCheck);
      setUsernameError("");
    } catch (err) {
      if (err instanceof z.ZodError) {
        setUsernameError(err.errors[0].message);
        return false;
      }
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', usernameToCheck)
      .maybeSingle();

    if (error) {
      console.error('Error checking username:', error);
      return false;
    }

    if (data) {
      setUsernameError("Username already taken");
      return false;
    }

    setUsernameError("");
    return true;
  };

  // PRESERVED: Exact Google OAuth logic - DO NOT MODIFY
  const handleGoogleSignIn = async () => {
    setLoading(true);
    
    // Apply remember me setting for Google sign-in
    if (rememberMe) {
      localStorage.setItem('magverse_remember_me', 'true');
    } else {
      localStorage.removeItem('magverse_remember_me');
      sessionStorage.setItem('magverse_session_only', 'true');
    }
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/chat`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        toast({
          title: "Sign in failed",
          description: error.message,
          variant: "destructive",
        });
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      toast({
        title: "Sign in failed",
        description: err.message || "Failed to sign in with Google",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleCompleteProfile = async () => {
    if (!await checkUsernameAvailability(username)) return;
    if (!user) return;

    setLoading(true);
    try {
      let avatarUrl = null;

      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const filePath = `${user.id}/avatar.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, { upsert: true });

        if (!uploadError) {
          const { data } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);
          avatarUrl = data.publicUrl;
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          username,
          display_name: displayName || username,
          avatar_url: avatarUrl,
          bio: bio || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      setSuccessMessage("Profile updated!");
      setShowSuccess(true);
      setTimeout(() => navigate('/chat'), 1500);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);

      if (!isLogin && password !== confirmPassword) {
        toast({
          title: "Passwords don't match",
          description: "Please make sure your passwords match",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Apply remember me setting
      if (rememberMe) {
        localStorage.setItem('magverse_remember_me', 'true');
      } else {
        localStorage.removeItem('magverse_remember_me');
        sessionStorage.setItem('magverse_session_only', 'true');
      }

      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          // Check for unverified email error
          if (error.message?.includes('Email not confirmed')) {
            toast({
              title: "Email not verified",
              description: "Please check your inbox and verify your email first.",
              variant: "destructive",
            });
            setSignupStep('verification');
          } else {
            toast({
              title: "Error",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          setSuccessMessage("Welcome back!");
          setShowSuccess(true);
          setTimeout(() => navigate("/chat"), 1500);
        }
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        } else {
          // Show email verification pending screen
          setSignupStep('verification');
          toast({
            title: "Check your email",
            description: "We've sent you a verification link.",
          });
        }
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: err.errors[0].message,
          variant: "destructive",
        });
      }
    } finally {
      if (!(!isLogin && !user)) {
        setLoading(false);
      }
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-background flex relative overflow-hidden">
      <AnimatedBackground />
      
      {/* Left side - Branding (Desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 relative z-10">
        <AuthBranding />
      </div>

      {/* Right side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 relative z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <motion.div 
            variants={itemVariants}
            className="lg:hidden text-center mb-8"
          >
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="inline-block mb-4"
            >
              <img src="/magverse-ai-logo.png" alt="Magverse AI" className="w-16 h-16 rounded-2xl shadow-lg shadow-primary/30 mx-auto" />
            </motion.div>
            <h1 className="text-3xl font-bold gradient-text">Magverse AI</h1>
          </motion.div>

          {/* Auth Card */}
          <motion.div
            variants={itemVariants}
            className="glass-card rounded-2xl p-6 sm:p-8 shadow-2xl shadow-primary/5 border border-glass-border"
          >
            <AnimatePresence mode="wait">
              {signupStep === 'verified' ? (
                <EmailVerifiedSuccess />
              ) : signupStep === 'verification' ? (
                <EmailVerificationPending 
                  email={email}
                  onBack={() => {
                    setSignupStep(1);
                    setIsLogin(true);
                  }}
                />
              ) : showSuccess ? (
                <AuthSuccessAnimation 
                  message={successMessage} 
                  subMessage="Redirecting you now..."
                />
              ) : signupStep === 1 ? (
                <motion.div
                  key="auth-form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Header */}
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-foreground mb-2">
                      {isLogin ? "Welcome back" : "Create account"}
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      {isLogin 
                        ? "Sign in to continue your AI journey" 
                        : "Start your AI-powered adventure"}
                    </p>
                  </div>

                  {/* Google Sign-In - PRESERVED EXACT LOGIC */}
                  <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-12 border-border/50 bg-card/50 hover:bg-card hover:border-primary/30 transition-all duration-300"
                      onClick={handleGoogleSignIn}
                      disabled={loading}
                    >
                      {loading ? (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                      )}
                      Continue with Google
                    </Button>
                  </motion.div>

                  {/* Continue as Guest */}
                  <motion.div 
                    whileHover={{ scale: 1.01 }} 
                    whileTap={{ scale: 0.99 }}
                    className="mt-3"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full h-12 border border-dashed border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all duration-300"
                      onClick={() => navigate('/chat')}
                    >
                      <MessageSquare className="w-5 h-5 mr-2 text-muted-foreground" />
                      <span className="text-muted-foreground">Continue as Guest</span>
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        3 free messages
                      </span>
                    </Button>
                  </motion.div>

                  {/* Divider */}
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border/50" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card/40 backdrop-blur-sm px-3 text-muted-foreground">
                        or continue with email
                      </span>
                    </div>
                  </div>

                  {/* Email/Password Form */}
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Email Input */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        Email
                      </Label>
                      <motion.div whileFocus={{ scale: 1.01 }}>
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="h-12 bg-input/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300"
                        />
                      </motion.div>
                    </div>

                    {/* Password Input */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Lock className="w-4 h-4 text-muted-foreground" />
                        Password
                      </Label>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="h-12 bg-input/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 pr-12 transition-all duration-300"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password (Signup only) */}
                    {!isLogin && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2"
                      >
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <KeyRound className="w-4 h-4 text-muted-foreground" />
                          Confirm Password
                        </Label>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            className="h-12 bg-input/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 pr-12 transition-all duration-300"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {/* Remember Me & Forgot Password */}
                    {isLogin && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="remember"
                            checked={rememberMe}
                            onCheckedChange={(checked) => setRememberMe(checked === true)}
                            className="border-border/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                          <label
                            htmlFor="remember"
                            className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                          >
                            Remember me
                          </label>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate('/reset-password')}
                          className="text-sm text-primary hover:text-primary/80 transition-colors"
                        >
                          Forgot password?
                        </button>
                      </div>
                    )}

                    {/* Submit Button */}
                    <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                      <Button
                        type="submit"
                        className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground font-medium shadow-lg shadow-primary/20 transition-all duration-300"
                        disabled={loading}
                      >
                        {loading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            {isLogin ? "Sign In" : "Create Account"}
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </motion.div>
                  </form>

                  {/* Toggle Login/Signup */}
                  <div className="mt-6 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setIsLogin(!isLogin);
                        setShowSuccess(false);
                      }}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {isLogin ? (
                        <>Don't have an account? <span className="text-primary font-medium">Sign up</span></>
                      ) : (
                        <>Already have an account? <span className="text-primary font-medium">Sign in</span></>
                      )}
                    </button>
                  </div>
                </motion.div>
              ) : (
                /* Step 2: Profile Setup */
                <motion.div
                  key="profile-form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-foreground mb-2">Complete Your Profile</h2>
                    <p className="text-muted-foreground text-sm">Set up your profile to get started</p>
                  </div>
                  
                  {/* Avatar Upload */}
                  <div className="flex flex-col items-center gap-4">
                    <motion.div 
                      className="relative"
                      whileHover={{ scale: 1.05 }}
                    >
                      <Avatar className="w-24 h-24 border-2 border-primary/20">
                        <AvatarImage src={avatarPreview} />
                        <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                          {username[0]?.toUpperCase() || <User className="w-8 h-8" />}
                        </AvatarFallback>
                      </Avatar>
                      <Button
                        type="button"
                        size="sm"
                        className="absolute bottom-0 right-0 rounded-full w-8 h-8 p-0 bg-primary hover:bg-primary/90"
                        onClick={() => document.getElementById('avatar-upload')?.click()}
                      >
                        <Upload className="w-4 h-4" />
                      </Button>
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setAvatarFile(file);
                            setAvatarPreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </motion.div>
                    <p className="text-sm text-muted-foreground">Upload profile picture (optional)</p>
                  </div>

                  {/* Username */}
                  <div className="space-y-2">
                    <Label>Username *</Label>
                    <Input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onBlur={() => checkUsernameAvailability(username)}
                      placeholder="johndoe"
                      className="h-12 bg-input/50 border-border/50"
                    />
                    {usernameError && <p className="text-sm text-destructive">{usernameError}</p>}
                  </div>

                  {/* Display Name */}
                  <div className="space-y-2">
                    <Label>Display Name</Label>
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="John Doe"
                      className="h-12 bg-input/50 border-border/50"
                    />
                  </div>

                  {/* Bio */}
                  <div className="space-y-2">
                    <Label>Bio</Label>
                    <Textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell us about yourself..."
                      maxLength={200}
                      className="bg-input/50 border-border/50 resize-none"
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground text-right">{bio.length}/200</p>
                  </div>

                  <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                    <Button 
                      type="button"
                      onClick={handleCompleteProfile} 
                      className="w-full h-12 bg-gradient-to-r from-primary to-accent" 
                      disabled={loading || !username}
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Complete Setup"}
                    </Button>
                  </motion.div>
                  
                  <Button 
                    type="button"
                    variant="ghost" 
                    onClick={() => navigate('/chat')} 
                    className="w-full"
                  >
                    Skip for now
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Footer */}
          <motion.p 
            variants={itemVariants}
            className="text-center text-xs text-muted-foreground mt-6"
          >
            By continuing, you agree to our{" "}
            <a href="/terms" className="text-primary hover:underline">Terms</a>
            {" "}and{" "}
            <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
