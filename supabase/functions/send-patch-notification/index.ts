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

    const { updateId } = await req.json();

    if (!updateId) {
      return new Response(
        JSON.stringify({ error: 'Update ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the feature update
    const { data: update, error: updateError } = await supabase
      .from('feature_updates')
      .select('*')
      .eq('id', updateId)
      .single();

    if (updateError || !update) {
      return new Response(
        JSON.stringify({ error: 'Update not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all active newsletter subscribers
    const { data: subscribers, error: subError } = await supabase
      .from('newsletter_subscribers')
      .select('email')
      .eq('is_active', true);

    if (subError) {
      throw subError;
    }

    if (!subscribers || subscribers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No subscribers to notify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📧 Sending patch notification to ${subscribers.length} subscribers`);

    const categoryEmoji: Record<string, string> = {
      feature: '🚀',
      improvement: '⚡',
      bugfix: '🔧',
      announcement: '📢',
    };

    const emoji = categoryEmoji[update.category] || '✨';

    // Send emails in batches
    const batchSize = 50;
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize);
      
      const emailPromises = batch.map(async (subscriber) => {
        try {
          await resend.emails.send({
            from: 'Magverse AI <updates@resend.dev>',
            to: [subscriber.email],
            subject: `${emoji} ${update.title} - Magverse AI Update`,
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
                  <div style="background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); padding: 30px 24px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">${emoji} New Update!</h1>
                  </div>
                  
                  <!-- Content -->
                  <div style="padding: 30px 24px;">
                    <h2 style="color: #f0f0f0; margin: 0 0 16px; font-size: 20px;">${update.title}</h2>
                    
                    ${update.image_url ? `
                      <img src="${update.image_url}" alt="${update.title}" style="width: 100%; max-height: 200px; object-fit: cover; border-radius: 8px; margin-bottom: 16px;" />
                    ` : ''}
                    
                    <p style="color: #a0a0a0; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
                      ${update.summary || update.content.substring(0, 200)}...
                    </p>
                    
                    <div style="display: inline-block; background: rgba(139, 92, 246, 0.2); padding: 6px 12px; border-radius: 20px; font-size: 12px; color: #a78bfa; text-transform: capitalize; margin-bottom: 20px;">
                      ${update.category}
                    </div>
                    
                    <div style="text-align: center; margin-top: 24px;">
                      <a href="https://magverseai.com/patches" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600;">
                        Read More →
                      </a>
                    </div>
                  </div>
                  
                  <!-- Footer -->
                  <div style="padding: 20px 24px; background: rgba(0,0,0,0.2); text-align: center; border-top: 1px solid rgba(255,255,255,0.05);">
                    <p style="color: #666; font-size: 12px; margin: 0;">
                      You're receiving this because you subscribed to Magverse AI updates.
                    </p>
                  </div>
                </div>
              </body>
              </html>
            `,
          });
          sent++;
        } catch (e) {
          console.error(`Failed to send to ${subscriber.email}:`, e);
          failed++;
        }
      });

      await Promise.allSettled(emailPromises);
    }

    console.log(`✅ Sent ${sent} emails, ${failed} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent, 
        failed,
        total: subscribers.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error sending patch notifications:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});