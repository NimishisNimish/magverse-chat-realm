import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Upload, Mail, Lock, User, Shield, FileText, Download, Bell, Zap, Coins } from 'lucide-react';
import { generateInvoicePDF } from "@/utils/invoiceGenerator";
import { Switch } from "@/components/ui/switch";
import { LoadBalancerSettings } from "@/components/LoadBalancerSettings";

export default function ProfileSettings() {
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  
  // Profile Information State
  const [username, setUsername] = useState(profile?.username || '');
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url || null);
  
  // Security State
  const [currentEmail, setCurrentEmail] = useState(user?.email || '');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Recovery email state
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  
  // Email preferences state
  const [emailPreferences, setEmailPreferences] = useState({
    email_digest_enabled: true,
    email_welcome_enabled: true,
    email_invoices_enabled: true,
    email_marketing_enabled: true,
    email_system_enabled: true,
    email_credit_alerts_enabled: true,
  });

  // React Query for invoices
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['user-invoices', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Error loading invoices:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setDisplayName(profile.display_name || '');
      setBio(profile.bio || '');
      setAvatarPreview(profile.avatar_url || null);
      
      // Load email preferences
      setEmailPreferences({
        email_digest_enabled: (profile as any).email_digest_enabled ?? true,
        email_welcome_enabled: (profile as any).email_welcome_enabled ?? true,
        email_invoices_enabled: (profile as any).email_invoices_enabled ?? true,
        email_marketing_enabled: (profile as any).email_marketing_enabled ?? true,
        email_system_enabled: (profile as any).email_system_enabled ?? true,
        email_credit_alerts_enabled: (profile as any).email_credit_alerts_enabled ?? true,
      });
    }
    if (user) {
      setCurrentEmail(user.email || '');
    }
  }, [profile, user]);


  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image must be less than 2MB');
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user || loading) return;
    
    setLoading(true);
    try {
      // Validate username format
      if (username && !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        toast.error('Username must be 3-20 characters and contain only letters, numbers, and underscores');
        setLoading(false);
        return;
      }

      // Check username uniqueness if changed
      if (username && username !== profile?.username) {
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username)
          .neq('id', user.id)
          .single();

        if (existingUser) {
          toast.error('This username is already taken. Please choose another.');
          setLoading(false);
          return;
        }
      }

      let avatarUrl = profile?.avatar_url;

      // Upload avatar if changed
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user.id}/avatar.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile, { upsert: true });

        if (uploadError) {
          console.error('Avatar upload error:', uploadError);
          toast.error(uploadError.message || 'Failed to upload avatar. Please try again.');
          setLoading(false);
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        avatarUrl = publicUrl;
      }

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({
          username,
          display_name: displayName,
          bio,
          avatar_url: avatarUrl,
        })
        .eq('id', user.id);

      if (error) {
        console.error('Profile update error:', error);
        toast.error(error.message || 'Failed to update profile');
        setLoading(false);
        return;
      }

      await refreshProfile();
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail) {
      toast.error('Please enter a new email address');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('change-email', {
        body: { newEmail }
      });

      if (error) throw error;

      toast.success('Verification email sent! Please check your inbox.');
      setNewEmail('');
    } catch (error: any) {
      console.error('Error changing email:', error);
      toast.error(error.message || 'Failed to change email');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('change-password', {
        body: { newPassword }
      });

      if (error) throw error;

      toast.success('Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const sendRecoveryEmailOTP = async () => {
    if (!recoveryEmail) {
      toast.error('Please enter a recovery email');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recoveryEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setSendingOtp(true);
    try {
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      
      const { error } = await supabase.functions.invoke('send-recovery-email-otp', {
        body: { email: recoveryEmail, otp: newOtp }
      });

      if (error) throw error;

      setOtpSent(true);
      toast.success('OTP sent to your recovery email. Please check your inbox.');
      
      // Store OTP with expiry in sessionStorage
      sessionStorage.setItem('recovery_otp', JSON.stringify({
        otp: newOtp,
        expiry: Date.now() + 10 * 60 * 1000 // 10 minutes
      }));
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      toast.error(error.message || 'Failed to send OTP');
    } finally {
      setSendingOtp(false);
    }
  };

  const verifyAndUpdateRecoveryEmail = async () => {
    if (!otp) {
      toast.error('Please enter the OTP');
      return;
    }

    const stored = sessionStorage.getItem('recovery_otp');
    if (!stored) {
      toast.error('OTP expired. Please request a new one.');
      setOtpSent(false);
      return;
    }
    
    try {
      const { otp: storedOtp, expiry } = JSON.parse(stored);
      
      if (Date.now() > expiry) {
        toast.error('OTP expired. Please request a new one.');
        sessionStorage.removeItem('recovery_otp');
        setOtpSent(false);
        return;
      }
      
      if (otp !== storedOtp) {
        toast.error('Invalid OTP. Please try again.');
        return;
      }
      
      setLoading(true);
      
      // Update recovery email using edge function for encryption
      const { error } = await supabase.functions.invoke('change-email', {
        body: { 
          action: 'update_recovery_email',
          email: recoveryEmail 
        }
      });
      
      if (error) throw error;
      
      // Send confirmation email
      await supabase.functions.invoke('send-recovery-email-confirmation', {
        body: { email: recoveryEmail }
      });
      
      await refreshProfile();
      toast.success('Recovery email updated successfully!');
      
      // Clean up
      sessionStorage.removeItem('recovery_otp');
      setOtpSent(false);
      setOtp('');
    } catch (error: any) {
      console.error('Error updating recovery email:', error);
      toast.error(error.message || 'Failed to update recovery email');
    } finally {
      setLoading(false);
    }
  };

  const downloadInvoice = (invoice: any) => {
    generateInvoicePDF({
      invoice_number: invoice.invoice_number,
      issue_date: invoice.issue_date,
      amount: invoice.amount,
      plan_type: invoice.plan_type,
      status: invoice.status,
      user: {
        name: profile?.display_name || profile?.username || 'User',
        email: user?.email || 'N/A',
        username: profile?.username || 'user',
      },
    });

    toast.success("Invoice downloaded successfully!");
  };

  const handleSendPhoneOtp = async () => {
    // Removed phone functionality
  };

  const handleUpdateEmailPreferences = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(emailPreferences)
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      toast.success('Email preferences updated successfully!');
    } catch (error: any) {
      console.error('Error updating email preferences:', error);
      toast.error(error.message || 'Failed to update email preferences');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[100px]" />
      </div>
      
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-5xl relative z-10">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Settings
          </h1>
          <p className="text-muted-foreground text-lg">Manage your account settings and preferences</p>
        </div>

        <Tabs defaultValue="credits" className="w-full">
          <TabsList className="grid w-full grid-cols-7 mb-8 bg-card/50 border border-border/50 p-1 rounded-xl h-auto">
            <TabsTrigger value="credits" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg py-2.5">
              <Coins className="h-4 w-4" />
              <span className="hidden sm:inline">Credits</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg py-2.5">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg py-2.5">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="emails" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg py-2.5">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Emails</span>
            </TabsTrigger>
            <TabsTrigger value="recovery" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg py-2.5">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Recovery</span>
            </TabsTrigger>
            <TabsTrigger value="ai-performance" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg py-2.5">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">AI</span>
            </TabsTrigger>
            <TabsTrigger value="invoices" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg py-2.5">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Invoices</span>
            </TabsTrigger>
          </TabsList>

          {/* Credits Tab */}
          <TabsContent value="credits">
            <Card className="bg-card/50 backdrop-blur-sm border-border/50 p-6 space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Coins className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Credit Usage</h3>
                  <p className="text-sm text-muted-foreground">Track your AI usage and credits</p>
                </div>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                {/* Current Credits */}
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-5 rounded-2xl border border-primary/20">
                  <div className="text-sm text-muted-foreground mb-2">Credits Remaining Today</div>
                  <div className="text-4xl font-bold text-primary">
                    {profile?.subscription_type === 'lifetime' ? '∞' : profile?.credits_remaining ?? 0}
                  </div>
                  {profile?.subscription_type !== 'lifetime' && (
                    <div className="text-xs text-muted-foreground mt-2">
                      Daily limit: {profile?.subscription_type === 'monthly' ? '50' : '5'} credits
                    </div>
                  )}
                </div>
                
                {/* Subscription Type */}
                <div className="bg-card p-5 rounded-2xl border border-border/50">
                  <div className="text-sm text-muted-foreground mb-2">Your Plan</div>
                  <div className="text-2xl font-bold capitalize">
                    {profile?.subscription_type === 'lifetime' ? 'Lifetime Pro' : 
                     profile?.subscription_type === 'monthly' ? 'Pro Yearly' : 
                     'Free Plan'}
                  </div>
                  {profile?.subscription_type !== 'lifetime' && profile?.subscription_type !== 'monthly' && (
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-primary text-sm mt-2"
                      onClick={() => window.location.href = '/pricing'}
                    >
                      Upgrade for more credits →
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Credit Cost Per Model */}
              <div className="space-y-4">
                <h4 className="text-lg font-medium">Credits Per Message by Model</h4>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-border/50">
                    <span className="text-sm font-medium">Gemini Flash</span>
                    <Badge variant="secondary" className="bg-muted">1 credit</Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-border/50">
                    <span className="text-sm font-medium">GPT-5 Mini</span>
                    <Badge variant="secondary" className="bg-muted">1 credit</Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-border/50">
                    <span className="text-sm font-medium">Perplexity</span>
                    <Badge variant="secondary" className="bg-muted">1 credit</Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-border/50">
                    <span className="text-sm font-medium">Gemini Pro</span>
                    <Badge variant="outline">2 credits</Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-border/50">
                    <span className="text-sm font-medium">ChatGPT</span>
                    <Badge variant="outline">2 credits</Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-border/50">
                    <span className="text-sm font-medium">Claude</span>
                    <Badge variant="outline">2 credits</Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-border/50">
                    <span className="text-sm font-medium">GPT-5</span>
                    <Badge className="bg-primary/20 text-primary border-primary/30">3 credits</Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-border/50">
                    <span className="text-sm font-medium">Deep Research</span>
                    <Badge className="bg-primary/20 text-primary border-primary/30">3 credits</Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-border/50">
                    <span className="text-sm font-medium">Image Gen</span>
                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">5 credits</Badge>
                  </div>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground pt-4 border-t border-border/50">
                <p>Credits reset daily at midnight UTC. Your usage is tracked in real-time.</p>
              </div>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card className="p-6 space-y-6">
              <div className="flex flex-col items-center gap-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={avatarPreview || undefined} />
                  <AvatarFallback>
                    {displayName?.[0] || username?.[0] || user?.email?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex gap-2">
                  <Input
                    id="avatar"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('avatar')?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Change Avatar
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your display name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself"
                    rows={4}
                  />
                </div>

                <div className="pt-4">
                  <Button
                    onClick={handleUpdateProfile}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <div className="space-y-6">
              <Card className="p-6 space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Mail className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Change Email</h3>
                </div>
                
                <div className="space-y-2">
                  <Label>Current Email</Label>
                  <Input value={currentEmail} disabled />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newEmail">New Email</Label>
                  <Input
                    id="newEmail"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Enter new email address"
                  />
                </div>

                <Button
                  onClick={handleChangeEmail}
                  disabled={loading || !newEmail}
                  className="w-full"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Verification Email
                </Button>
              </Card>

              <Card className="p-6 space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Lock className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Change Password</h3>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>

                <Button
                  onClick={handleChangePassword}
                  disabled={loading || !newPassword || !confirmPassword}
                  className="w-full"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Password
                </Button>
              </Card>
            </div>
          </TabsContent>

          {/* Email Preferences Tab */}
          <TabsContent value="emails">
            <Card className="p-6 space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Email Notifications</h3>
              </div>
              
              <p className="text-sm text-muted-foreground mb-6">
                Manage your email notification preferences
              </p>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="credit-alerts">Credit Limit Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when you're running low on credits
                    </p>
                  </div>
                  <Switch
                    id="credit-alerts"
                    checked={emailPreferences.email_credit_alerts_enabled}
                    onCheckedChange={(checked) => 
                      setEmailPreferences({ ...emailPreferences, email_credit_alerts_enabled: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="digest">Weekly Digest</Label>
                    <p className="text-sm text-muted-foreground">
                      Weekly summary of your AI usage and activity
                    </p>
                  </div>
                  <Switch
                    id="digest"
                    checked={emailPreferences.email_digest_enabled}
                    onCheckedChange={(checked) => 
                      setEmailPreferences({ ...emailPreferences, email_digest_enabled: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="invoices">Invoice Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified about payment receipts and invoices
                    </p>
                  </div>
                  <Switch
                    id="invoices"
                    checked={emailPreferences.email_invoices_enabled}
                    onCheckedChange={(checked) => 
                      setEmailPreferences({ ...emailPreferences, email_invoices_enabled: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="marketing">Marketing & Updates</Label>
                    <p className="text-sm text-muted-foreground">
                      Product updates, tips, and promotional offers
                    </p>
                  </div>
                  <Switch
                    id="marketing"
                    checked={emailPreferences.email_marketing_enabled}
                    onCheckedChange={(checked) => 
                      setEmailPreferences({ ...emailPreferences, email_marketing_enabled: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="system">System Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Important system updates and security alerts
                    </p>
                  </div>
                  <Switch
                    id="system"
                    checked={emailPreferences.email_system_enabled}
                    onCheckedChange={(checked) => 
                      setEmailPreferences({ ...emailPreferences, email_system_enabled: checked })
                    }
                  />
                </div>
              </div>

              <div className="pt-4">
                <Button
                  onClick={handleUpdateEmailPreferences}
                  disabled={loading}
                  className="w-full"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Preferences
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* Recovery Tab */}
          <TabsContent value="recovery">
            <Card className="p-6 space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Recovery Email</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recoveryEmail">Recovery Email</Label>
                <Input
                  id="recoveryEmail"
                  type="email"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  placeholder="Enter recovery email"
                  disabled={otpSent}
                />
                <p className="text-xs text-muted-foreground">
                  This email will be used to recover your account if you forget your primary email
                </p>
              </div>

              {otpSent && (
                <div className="space-y-2">
                  <Label htmlFor="otp">Enter OTP</Label>
                  <Input
                    id="otp"
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    Check your email for the verification code (expires in 10 minutes)
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                {!otpSent ? (
                  <Button
                    onClick={sendRecoveryEmailOTP}
                    disabled={sendingOtp || !recoveryEmail}
                    className="w-full"
                  >
                    {sendingOtp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send OTP
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={verifyAndUpdateRecoveryEmail}
                      disabled={loading || !otp}
                      className="flex-1"
                    >
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Verify & Update
                    </Button>
                    <Button
                      onClick={() => {
                        setOtpSent(false);
                        setOtp('');
                        sessionStorage.removeItem('recovery_otp');
                      }}
                      variant="outline"
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* AI Performance Tab */}
          <TabsContent value="ai-performance">
            <LoadBalancerSettings />
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Your Invoices</h3>
              </div>

              {invoicesLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  <p className="text-muted-foreground mt-2">Loading invoices...</p>
                </div>
              ) : invoices.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No invoices found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                        <TableCell>{new Date(invoice.issue_date).toLocaleDateString()}</TableCell>
                        <TableCell className="capitalize">{invoice.plan_type}</TableCell>
                        <TableCell>₹{invoice.amount}</TableCell>
                        <TableCell>
                          <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadInvoice(invoice)}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
