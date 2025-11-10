import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface Profile {
  id: string;
  is_pro: boolean;
  credits_remaining: number;
  phone_number?: string;
  phone_verified?: boolean;
  phone_verified_at?: string;
  subscription_type?: 'free' | 'monthly' | 'lifetime';
  subscription_expires_at?: string;
  monthly_credits?: number;
  monthly_credits_used?: number;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  resetPassword: (email: string, method: 'link' | 'otp') => Promise<{ error: any }>;
  verifyOTP: (email: string, otp: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
  sendPhoneOTP: (phoneNumber: string) => Promise<{ error: any }>;
  verifyPhoneOTP: (phoneNumber: string, otp: string, newPassword: string) => Promise<{ error: any }>;
  linkPhoneNumber: (phoneNumber: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const refreshProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (data) {
      setProfile(data as Profile);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          await refreshProfile();
        } else {
          setProfile(null);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        refreshProfile().finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [user?.id]);

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    try {
      // Clear local state first
      setUser(null);
      setSession(null);
      setProfile(null);
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
      }
      
      // Navigate to home
      navigate('/');
    } catch (error) {
      console.error('Sign out error:', error);
      // Force navigation even if there's an error
      navigate('/');
    }
  };

  const resetPassword = async (email: string, method: 'link' | 'otp') => {
    try {
      if (method === 'link') {
        // Use Supabase's built-in password reset email
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password-confirm`,
        });
        if (error) throw error;
      } else {
        // OTP method - use edge function to generate and send OTP
        const { error } = await supabase.functions.invoke('send-otp-email', {
          body: { email }
        });
        if (error) throw error;
      }
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const verifyOTP = async (email: string, otp: string) => {
    try {
      // Verify OTP by checking verification_codes table
      const { data: codes, error: fetchError } = await supabase
        .from('verification_codes')
        .select('*')
        .eq('code', otp)
        .eq('purpose', 'password_reset')
        .gt('expires_at', new Date().toISOString())
        .eq('verified', false)
        .limit(1);

      if (fetchError) throw fetchError;
      
      if (!codes || codes.length === 0) {
        return { error: { message: 'Invalid or expired code' } };
      }

      // Mark as verified
      const { error: updateError } = await supabase
        .from('verification_codes')
        .update({ verified: true })
        .eq('id', codes[0].id);

      if (updateError) throw updateError;

      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const sendPhoneOTP = async (phoneNumber: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-phone-otp', {
        body: { phoneNumber }
      });
      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const verifyPhoneOTP = async (phoneNumber: string, otp: string, newPassword: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-phone-otp', {
        body: { phoneNumber, otp, newPassword }
      });
      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const linkPhoneNumber = async (phoneNumber: string) => {
    try {
      if (!user) {
        return { error: { message: 'You must be logged in to link a phone number' } };
      }

      // Normalize to E.164 format
      let normalizedPhone = phoneNumber.replace(/\s+/g, '').replace(/-/g, '');
      if (!normalizedPhone.startsWith('+')) {
        if (normalizedPhone.length === 10) {
          normalizedPhone = `+91${normalizedPhone}`;
        } else if (!normalizedPhone.startsWith('91') && normalizedPhone.length === 12) {
          normalizedPhone = `+${normalizedPhone}`;
        }
      }

      // Validate E.164 format
      if (!normalizedPhone.match(/^\+[1-9]\d{1,14}$/)) {
        return { error: { message: 'Invalid phone number format. Use E.164 format (e.g., +919876543210)' } };
      }

      const { error } = await supabase
        .from('profiles')
        .update({ phone_number: normalizedPhone })
        .eq('id', user.id);

      if (error) throw error;
      await refreshProfile();
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile, 
      loading, 
      signUp, 
      signIn, 
      signOut, 
      refreshProfile,
      resetPassword,
      verifyOTP,
      updatePassword,
      sendPhoneOTP,
      verifyPhoneOTP,
      linkPhoneNumber
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
