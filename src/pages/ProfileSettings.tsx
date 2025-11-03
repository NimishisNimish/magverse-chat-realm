import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Upload, Mail, Lock, Phone, User, Shield } from 'lucide-react';

export default function ProfileSettings() {
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  
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
  
  // Phone State
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number || '');
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [showPhoneOtp, setShowPhoneOtp] = useState(false);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setDisplayName(profile.display_name || '');
      setBio(profile.bio || '');
      setAvatarPreview(profile.avatar_url || null);
      setPhoneNumber(profile.phone_number || '');
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
    if (!user) return;
    
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

  const handleSendPhoneOtp = async () => {
    if (!newPhoneNumber) {
      toast.error('Please enter a phone number');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('change-phone', {
        body: { action: 'send_otp', phoneNumber: newPhoneNumber }
      });

      if (error) throw error;

      setShowPhoneOtp(true);
      toast.success('OTP sent to your phone!');
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      toast.error(error.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (!phoneOtp) {
      toast.error('Please enter the OTP');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('change-phone', {
        body: { 
          action: 'verify_otp', 
          phoneNumber: newPhoneNumber,
          otp: phoneOtp 
        }
      });

      if (error) throw error;

      await refreshProfile();
      toast.success('Phone number updated successfully!');
      setNewPhoneNumber('');
      setPhoneOtp('');
      setShowPhoneOtp(false);
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      toast.error(error.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Profile Settings</h1>
          <p className="text-muted-foreground">Manage your account settings and preferences</p>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone
            </TabsTrigger>
          </TabsList>

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

          {/* Phone Tab */}
          <TabsContent value="phone">
            <Card className="p-6 space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <Phone className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Phone Number</h3>
              </div>

              {phoneNumber && (
                <div className="space-y-2">
                  <Label>Current Phone Number</Label>
                  <Input value={phoneNumber} disabled />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="newPhone">
                  {phoneNumber ? 'New Phone Number' : 'Phone Number'}
                </Label>
                <Input
                  id="newPhone"
                  type="tel"
                  value={newPhoneNumber}
                  onChange={(e) => setNewPhoneNumber(e.target.value)}
                  placeholder="+1234567890"
                />
              </div>

              {!showPhoneOtp ? (
                <Button
                  onClick={handleSendPhoneOtp}
                  disabled={loading || !newPhoneNumber}
                  className="w-full"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send OTP
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="otp">Enter OTP</Label>
                    <Input
                      id="otp"
                      value={phoneOtp}
                      onChange={(e) => setPhoneOtp(e.target.value)}
                      placeholder="Enter 6-digit OTP"
                      maxLength={6}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleVerifyPhoneOtp}
                      disabled={loading || !phoneOtp}
                      className="flex-1"
                    >
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Verify OTP
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowPhoneOtp(false);
                        setPhoneOtp('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
