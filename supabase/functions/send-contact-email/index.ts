import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContactRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📧 Contact Form Email Request');

    // Parse request body
    const { name, email, subject, message }: ContactRequest = await req.json();

    // Validate input
    if (!name || !email || !subject || !message) {
      throw new Error('All fields are required');
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email address');
    }

    // Length validation
    if (name.length > 100 || subject.length > 200 || message.length > 2000) {
      throw new Error('Input exceeds maximum length');
    }

    console.log(`📝 Processing contact form from: ${name} (${email})`);

    // Get Resend API key and admin email
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const adminEmail = Deno.env.get('ADMIN_EMAIL');

    console.log('🔑 Checking environment variables:', {
      hasResendKey: !!resendApiKey,
      hasAdminEmail: !!adminEmail,
      adminEmailValue: adminEmail || 'NOT SET'
    });

    if (!resendApiKey) {
      console.error('❌ RESEND_API_KEY is not configured in Supabase secrets');
      throw new Error('Email service not configured - RESEND_API_KEY missing');
    }

    if (!adminEmail) {
      console.error('❌ ADMIN_EMAIL is not configured in Supabase secrets');
      throw new Error('Email service not configured - ADMIN_EMAIL missing');
    }

    const resend = new Resend(resendApiKey);

    // Send email to admin
    console.log(`📨 Sending notification to admin: ${adminEmail}`);
    const adminEmailResponse = await resend.emails.send({
      from: 'Magverse Contact Form <onboarding@resend.dev>',
      to: [adminEmail],
      replyTo: email,
      subject: `New Contact Form: ${subject}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>From:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <hr>
        <h3>Message:</h3>
        <p style="white-space: pre-wrap;">${message}</p>
        <hr>
        <p style="color: #666; font-size: 12px;">Sent via Magverse Contact Form</p>
      `,
    });

    if (adminEmailResponse.error) {
      console.error('❌ Error sending admin email:', adminEmailResponse.error);
      throw new Error('Failed to send notification email');
    }

    console.log('✅ Admin notification sent');

    // Send confirmation email to user
    console.log(`📨 Sending confirmation to user: ${email}`);
    const userEmailResponse = await resend.emails.send({
      from: 'Magverse <onboarding@resend.dev>',
      to: [email],
      subject: 'We received your message!',
      html: `
        <h2>Thank you for contacting Magverse!</h2>
        <p>Hi ${name},</p>
        <p>We've received your message and will get back to you as soon as possible.</p>
        <hr>
        <p><strong>Your message:</strong></p>
        <p style="white-space: pre-wrap; background: #f5f5f5; padding: 15px; border-radius: 5px;">${message}</p>
        <hr>
        <p>Best regards,<br><strong>The Magverse Team</strong></p>
        <p style="color: #666; font-size: 12px;">This is an automated confirmation email. Please do not reply to this email.</p>
      `,
    });

    if (userEmailResponse.error) {
      console.error('⚠️ Error sending user confirmation:', userEmailResponse.error);
      // Don't throw error here - admin email was sent successfully
    } else {
      console.log('✅ User confirmation sent');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Your message has been sent successfully!',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('❌ Error in send-contact-email:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to send message',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
