import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "MagVerse <noreply@magverse.ai>";

    // Get pending welcome emails from campaigns table
    const { data: campaigns, error: campaignsError } = await supabase
      .from('email_campaigns')
      .select('*, profiles!inner(id, display_name)')
      .eq('email_type', 'welcome')
      .eq('status', 'pending')
      .limit(50);

    if (campaignsError) {
      console.error("Error fetching campaigns:", campaignsError);
      throw campaignsError;
    }

    if (!campaigns || campaigns.length === 0) {
      return new Response(
        JSON.stringify({ message: "No pending welcome emails" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let emailsSent = 0;
    const errors: any[] = [];

    // Get user emails from auth
    for (const campaign of campaigns) {
      try {
        // Get user email from auth
        const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(
          campaign.user_id
        );

        if (userError || !user?.email) {
          console.error("Error getting user:", userError);
          errors.push({ campaign_id: campaign.id, error: "User not found" });
          continue;
        }

        // Check if user has welcome emails enabled
        const { data: profile } = await supabase
          .from('profiles')
          .select('email_welcome_enabled')
          .eq('id', campaign.user_id)
          .single();

        if (profile && profile.email_welcome_enabled === false) {
          // Mark as sent but skipped
          await supabase
            .from('email_campaigns')
            .update({ status: 'skipped', sent_at: new Date().toISOString() })
            .eq('id', campaign.id);
          continue;
        }

        const displayName = campaign.metadata?.display_name || 'there';

        // Send email
        const result = await resend.emails.send({
          from: FROM_EMAIL,
          to: [user.email],
          subject: "Welcome to MagVerse AI! 🚀",
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #8B5CF6; margin-bottom: 10px;">Welcome to MagVerse! 🎉</h1>
              </div>
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 2px; border-radius: 12px;">
                <div style="background: white; padding: 30px; border-radius: 10px;">
                  <h2 style="color: #333; margin-top: 0;">Hello ${displayName}!</h2>
                  <p style="color: #666; font-size: 16px; line-height: 1.6;">
                    Thank you for joining MagVerse AI! We're excited to have you as part of our community.
                  </p>
                  <p style="color: #666; font-size: 16px; line-height: 1.6;">
                    Here's what you can do with your account:
                  </p>
                  <ul style="color: #666; font-size: 16px; line-height: 1.8; margin: 20px 0;">
                    <li>🤖 Chat with advanced AI models</li>
                    <li>🎨 Generate stunning images</li>
                    <li>📊 Track your usage statistics</li>
                    <li>⚡ Access premium features with Pro plans</li>
                  </ul>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="https://magverse.ai/chat" 
                       style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                              color: white; 
                              padding: 15px 40px; 
                              text-decoration: none; 
                              border-radius: 8px; 
                              display: inline-block;
                              font-weight: bold;">
                      Start Chatting Now
                    </a>
                  </div>
                  <p style="color: #999; font-size: 14px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
                    If you have any questions, feel free to reach out to our support team. We're here to help!
                  </p>
                </div>
              </div>
            </div>
          `,
        });

        console.log("Welcome email sent:", result);

        // Update campaign status
        await supabase
          .from('email_campaigns')
          .update({ 
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', campaign.id);

        emailsSent++;
      } catch (error: any) {
        console.error("Error sending to campaign:", campaign.id, error);
        errors.push({ campaign_id: campaign.id, error: error.message });
        
        // Mark as failed
        await supabase
          .from('email_campaigns')
          .update({ 
            status: 'failed',
            metadata: { ...campaign.metadata, error: error.message }
          })
          .eq('id', campaign.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
