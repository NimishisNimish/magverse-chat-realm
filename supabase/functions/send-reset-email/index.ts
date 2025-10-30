import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { Resend } from 'npm:resend@4.0.0';
import React from 'npm:react@18.3.1';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { ResetEmail } from './_templates/reset-email.tsx';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, method } = await req.json();

    console.log(`Password reset requested for ${email} using ${method}`);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Check if user exists
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userError) {
      console.error('Error checking user:', userError);
      return new Response(
        JSON.stringify({ error: 'Failed to process request' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const user = userData.users.find(u => u.email === email);
    
    if (!user) {
      // Return success even if user not found (security best practice)
      console.log(`User not found for email: ${email}`);
      return new Response(
        JSON.stringify({ success: true, message: 'If the email exists, a reset link will be sent.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check rate limit
    const { data: canReset } = await supabaseAdmin.rpc('check_reset_rate_limit', { p_email: email });
    
    if (!canReset) {
      return new Response(
        JSON.stringify({ error: 'Too many reset attempts. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the attempt
    const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
    await supabaseAdmin.from('password_reset_attempts').insert({
      email,
      ip_address: clientIp,
      method
    });

    let resetLink = '';
    let otpCode = '';
    let expiresIn = '';

    if (method === 'link') {
      // Generate magic link using Supabase
      const redirectUrl = `${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app') || 'https://magverse-chat-realm.lovable.app'}/reset-password-confirm`;
      
      const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        options: {
          redirectTo: redirectUrl
        }
      });

      if (resetError) {
        console.error('Error generating reset link:', resetError);
        return new Response(
          JSON.stringify({ error: 'Failed to generate reset link' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      resetLink = resetData.properties?.action_link || '';
      expiresIn = '1 hour';
    } else {
      // Generate OTP
      otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      expiresIn = '10 minutes';

      // Store OTP in verification_codes table
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      
      await supabaseAdmin.from('verification_codes').insert({
        user_id: user.id,
        code: otpCode,
        expires_at: expiresAt.toISOString(),
        purpose: 'password_reset'
      });
    }

    // Render email template
    const html = await renderAsync(
      React.createElement(ResetEmail, {
        method,
        resetLink: method === 'link' ? resetLink : undefined,
        otpCode: method === 'otp' ? otpCode : undefined,
        expiresIn
      })
    );

    // Send email
    const { error: emailError } = await resend.emails.send({
      from: 'Magverse AI <onboarding@resend.dev>',
      to: [email],
      subject: 'Reset Your Magverse AI Password',
      html,
    });

    if (emailError) {
      console.error('Error sending email:', emailError);
      
      // Handle Resend validation errors (testing mode)
      if ((emailError as any).statusCode === 403 && (emailError as any).name === 'validation_error') {
        return new Response(
          JSON.stringify({ 
            error: 'Email sending is in test mode. Please verify your domain at resend.com/domains to send emails to any address.',
            details: 'Currently, emails can only be sent to the verified account email (magverse4@gmail.com).'
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to send reset email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Password reset email sent successfully to ${email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: method === 'link' 
          ? 'Password reset link sent to your email' 
          : 'Verification code sent to your email'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in send-reset-email function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
