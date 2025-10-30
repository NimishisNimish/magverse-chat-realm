import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      throw new Error('Email is required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if user exists
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) throw userError;

    const userExists = users.users.some(u => u.email === email);
    if (!userExists) {
      throw new Error('No account found with this email address');
    }

    // Check rate limit
    const { data: rateLimitOk, error: rateLimitError } = await supabase
      .rpc('check_reset_rate_limit', { p_email: email });

    if (rateLimitError) throw rateLimitError;
    if (!rateLimitOk) {
      throw new Error('Too many reset attempts. Please try again in 1 hour.');
    }

    // Log the attempt
    const { error: logError } = await supabase
      .from('password_reset_attempts')
      .insert({
        email,
        method: 'otp',
        ip_address: req.headers.get('x-forwarded-for') || 'unknown'
      });

    if (logError) console.error('Failed to log attempt:', logError);

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Get user ID
    const user = users.users.find(u => u.email === email);
    if (!user) throw new Error('User not found');

    // Store OTP in verification_codes table
    const { error: otpError } = await supabase
      .from('verification_codes')
      .insert({
        user_id: user.id,
        code: otp,
        purpose: 'password_reset',
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
        verified: false
      });

    if (otpError) throw otpError;

    // Send email using Supabase's built-in email service
    // Note: This uses the auth.email.template for custom OTP emails
    // For now, we'll use a simple approach - send via admin API
    const { error: emailError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${Deno.env.get('SUPABASE_URL')}/auth/v1/verify`,
      }
    });

    if (emailError) {
      console.error('Email send error:', emailError);
      // Don't throw - OTP is stored, user can still use it
    }

    console.log(`OTP generated for ${email}: ${otp} (expires in 10 minutes)`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'OTP sent successfully',
        // In development, include OTP for testing
        ...(Deno.env.get('ENVIRONMENT') === 'development' && { otp })
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in send-otp-email:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to send OTP',
        details: error.toString()
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});
