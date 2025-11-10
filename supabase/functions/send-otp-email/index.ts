import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

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

    // Send OTP email using Resend
    try {
      const { error: emailError } = await resend.emails.send({
        from: 'Magverse AI <onboarding@resend.dev>',
        to: [email],
        subject: 'Your Password Reset Code - Magverse AI',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
                .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; color: white; }
                .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
                .content { padding: 40px 30px; }
                .otp-box { background: #f8f9fa; border: 2px solid #667eea; border-radius: 8px; padding: 30px; margin: 30px 0; text-align: center; }
                .otp-code { font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #667eea; font-family: 'Courier New', monospace; }
                .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
                .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
                .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🔐 Password Reset Code</h1>
                </div>
                <div class="content">
                  <p>Hello,</p>
                  <p>You requested to reset your password for your Magverse AI account. Use the verification code below:</p>
                  
                  <div class="otp-box">
                    <div style="font-size: 14px; color: #666; margin-bottom: 10px;">Your 6-digit code:</div>
                    <div class="otp-code">${otp}</div>
                    <div style="font-size: 12px; color: #666; margin-top: 15px;">Valid for 10 minutes</div>
                  </div>
                  
                  <div class="warning">
                    <strong>⏰ Important:</strong> This code will expire in <strong>10 minutes</strong> for security reasons.
                  </div>
                  
                  <p style="margin-top: 30px;">Enter this code on the password reset page to continue.</p>
                  
                  <div style="margin-top: 30px; padding-top: 30px; border-top: 1px solid #e0e0e0;">
                    <p style="font-size: 14px; color: #666; margin: 5px 0;">
                      <strong>🔒 Security Notice:</strong>
                    </p>
                    <ul style="font-size: 13px; color: #666; padding-left: 20px;">
                      <li>Never share this code with anyone</li>
                      <li>Our support team will never ask for this code</li>
                      <li>If you didn't request this reset, please ignore this email</li>
                    </ul>
                  </div>
                </div>
                <div class="footer">
                  <p>This is an automated message from <strong>Magverse AI</strong></p>
                  <p style="color: #999; margin-top: 10px;">© ${new Date().getFullYear()} Magverse AI. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      });

      if (emailError) {
        console.error('Resend email error:', emailError);
        throw new Error('Failed to send email: ' + emailError.message);
      }

      console.log(`✅ OTP email sent to ${email}: ${otp} (expires in 10 minutes)`);
    } catch (emailSendError: any) {
      console.error('Failed to send OTP email:', emailSendError);
      // Delete the OTP from database if email failed
      await supabase
        .from('verification_codes')
        .delete()
        .eq('user_id', user.id)
        .eq('code', otp);
      
      throw new Error('Failed to send OTP email. Please check your email configuration.');
    }

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
