import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { email, source = 'footer' } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already subscribed
    const { data: existing } = await supabase
      .from('newsletter_subscribers')
      .select('id, is_active')
      .eq('email', email)
      .single();

    if (existing) {
      if (existing.is_active) {
        return new Response(
          JSON.stringify({ success: true, message: 'Already subscribed!' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        // Reactivate subscription
        await supabase
          .from('newsletter_subscribers')
          .update({ is_active: true, unsubscribed_at: null })
          .eq('id', existing.id);

        return new Response(
          JSON.stringify({ success: true, message: 'Welcome back! Subscription reactivated.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get user_id if authenticated
    let userId = null;
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      const userClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user } } = await userClient.auth.getUser();
      userId = user?.id || null;
    }

    // Insert new subscriber
    const { error: insertError } = await supabase
      .from('newsletter_subscribers')
      .insert({
        email,
        user_id: userId,
        source,
      });

    if (insertError) {
      throw insertError;
    }

    // Send welcome email
    try {
      await resend.emails.send({
        from: 'Magverse AI <welcome@resend.dev>',
        to: [email],
        subject: '🎉 Welcome to Magverse AI Newsletter!',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden; border: 1px solid rgba(168, 85, 247, 0.2);">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); padding: 40px 24px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">🎉 You're In!</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">Welcome to the Magverse AI community</p>
              </div>
              
              <!-- Content -->
              <div style="padding: 30px 24px;">
                <h2 style="color: #f0f0f0; margin: 0 0 16px; font-size: 20px;">Thanks for subscribing! 💜</h2>
                
                <p style="color: #a0a0a0; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
                  You'll be the first to know about:
                </p>
                
                <ul style="color: #a0a0a0; font-size: 14px; line-height: 2; margin: 0 0 24px; padding-left: 20px;">
                  <li>🚀 New AI features and models</li>
                  <li>⚡ Performance improvements</li>
                  <li>🎁 Exclusive offers and early access</li>
                  <li>📚 Tips and tutorials</li>
                </ul>
                
                <div style="text-align: center; margin-top: 24px;">
                  <a href="https://magverseai.com/chat" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600;">
                    Start Chatting →
                  </a>
                </div>
              </div>
              
              <!-- Footer -->
              <div style="padding: 20px 24px; background: rgba(0,0,0,0.2); text-align: center; border-top: 1px solid rgba(255,255,255,0.05);">
                <p style="color: #666; font-size: 12px; margin: 0;">
                  Made with 💜 by Magverse AI Team
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      });
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail the subscription if email fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Successfully subscribed! Check your email for a welcome message.' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Newsletter subscription error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Subscription failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});