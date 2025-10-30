import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { Resend } from 'https://esm.sh/resend@4.0.0';

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

    // Generate HTML email
    const html = generateEmailHTML(method, resetLink, otpCode, expiresIn);

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

// HTML email template generator
function generateEmailHTML(
  method: string,
  resetLink: string,
  otpCode: string,
  expiresIn: string
): string {
  const isLink = method === 'link';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Magverse AI Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif; background-color: #f6f9fc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f6f9fc; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); margin: 0 auto;">
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center;">
              <h1 style="color: #1a1a1a; font-size: 32px; font-weight: bold; margin: 0 0 10px 0;">✨ Magverse AI</h1>
              <h2 style="color: #1a1a1a; font-size: 24px; font-weight: 600; margin: 0;">Reset Your Password</h2>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px;">
              <p style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 0;">
                We received a request to reset your password.
                ${isLink ? ' Click the button below to reset your password.' : ' Use the code below to reset your password.'}
              </p>
            </td>
          </tr>
          ${isLink ? `
          <tr>
            <td style="padding: 27px 40px;">
              <a href="${resetLink}" style="background-color: #5046e4; border-radius: 8px; color: #fff; font-size: 18px; font-weight: bold; text-decoration: none; text-align: center; display: block; padding: 16px 32px;">
                🔐 Reset Password
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px;">
              <p style="color: #333; font-size: 16px; line-height: 26px; margin: 8px 0;">
                Or copy and paste this link in your browser:
              </p>
              <p style="color: #5046e4; font-size: 14px; word-break: break-all; margin: 8px 0;">
                ${resetLink}
              </p>
            </td>
          </tr>
          ` : `
          <tr>
            <td style="padding: 0 40px;">
              <p style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 0;">
                Your verification code is:
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px;">
              <div style="background-color: #f4f4f4; border-radius: 8px; border: 2px solid #e1e1e1; padding: 24px; margin: 24px 0; text-align: center;">
                <p style="color: #1a1a1a; font-size: 36px; font-weight: bold; letter-spacing: 8px; margin: 0; font-family: monospace;">
                  ${otpCode}
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px;">
              <p style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 0;">
                Enter this code on the reset page to continue.
              </p>
            </td>
          </tr>
          `}
          <tr>
            <td style="padding: 24px 40px 0 40px;">
              <p style="color: #666; font-size: 14px; text-align: center; margin: 0;">
                This ${isLink ? 'link' : 'code'} expires in ${expiresIn}.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid #e1e1e1; margin-top: 24px;">
              <p style="color: #666; font-size: 14px; line-height: 22px; margin: 0;">
                If you didn't request this password reset, you can safely ignore this email.
                Your password will not be changed.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 40px 40px 40px; text-align: center;">
              <p style="color: #898989; font-size: 12px; line-height: 22px; margin: 0;">
                <a href="https://magverse-chat-realm.lovable.app" style="color: #5046e4; text-decoration: underline;">Magverse AI</a>
                - Your AI Chat Companion
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
