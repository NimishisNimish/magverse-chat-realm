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

    const { campaignType } = await req.json();

    console.log(`📧 Running email campaign: ${campaignType}`);

    let targetUsers: any[] = [];

    // Determine target users based on campaign type
    if (campaignType === 'welcome') {
      // New users in last 1 hour who haven't received welcome email
      const { data } = await supabase
        .from('profiles')
        .select('id, display_name, email:id')
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .not('id', 'in', `(
          SELECT user_id FROM email_campaigns 
          WHERE campaign_type = 'welcome'
        )`);
      
      targetUsers = data || [];
    } else if (campaignType === 're_engagement') {
      // Users who haven't sent messages in 7 days
      const { data } = await supabase
        .rpc('get_inactive_users', { days: 7 });
      
      targetUsers = data || [];
    } else if (campaignType === 'upsell') {
      // Free users with high usage
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('subscription_type', 'free')
        .gte('monthly_credits_used', 3);
      
      targetUsers = data || [];
    }

    console.log(`📬 Found ${targetUsers.length} target users`);

    const results = [];

    for (const user of targetUsers) {
      try {
        // Get user email from auth.users
        const { data: authUser } = await supabase.auth.admin.getUserById(user.id);
        if (!authUser.user?.email) continue;

        const emailContent = getEmailContent(campaignType, user);
        
        const { error: emailError } = await resend.emails.send({
          from: 'Magverse AI <onboarding@resend.dev>',
          to: [authUser.user.email],
          subject: emailContent.subject,
          html: emailContent.html
        });

        if (emailError) throw emailError;

        // Track email send
        await supabase.from('email_campaigns').insert({
          user_id: user.id,
          campaign_type: campaignType,
          email_type: campaignType,
          status: 'sent',
          metadata: { display_name: user.display_name }
        });

        results.push({ user_id: user.id, status: 'sent' });
        console.log(`✅ Email sent to ${authUser.user.email}`);
      } catch (error: any) {
        console.error(`❌ Failed to send to user ${user.id}:`, error);
        results.push({ user_id: user.id, status: 'failed', error: error?.message || 'Unknown error' });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: results.filter(r => r.status === 'sent').length,
        failed: results.filter(r => r.status === 'failed').length,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Email campaign error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getEmailContent(type: string, user: any) {
  const displayName = user.display_name || 'there';

  if (type === 'welcome') {
    return {
      subject: '🎉 Welcome to Magverse AI!',
      html: `
        <!DOCTYPE html>
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #667eea;">Welcome to Magverse AI, ${displayName}! 🚀</h1>
              <p>We're thrilled to have you on board! You now have access to powerful AI models including ChatGPT, Claude, Gemini, and more.</p>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>🎁 Your Free Credits</h3>
                <p>You start with <strong>5 free messages per day</strong>. Try all our models and see which one you like best!</p>
              </div>

              <h3>Quick Start Guide:</h3>
              <ul>
                <li>🤖 <strong>Chat with AI:</strong> Ask anything, from homework help to creative writing</li>
                <li>🔍 <strong>Deep Research:</strong> Get comprehensive answers with web search</li>
                <li>🎨 <strong>Image Generation:</strong> Create stunning images from text</li>
                <li>📎 <strong>File Support:</strong> Upload PDFs, images, and more</li>
              </ul>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://magverseai.com/chat" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Start Chatting
                </a>
              </div>

              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                Need more credits? <a href="https://magverseai.com/upgrade">Upgrade to Pro</a> for unlimited access!
              </p>
            </div>
          </body>
        </html>
      `
    };
  } else if (type === 're_engagement') {
    return {
      subject: '👋 We Miss You at Magverse AI',
      html: `
        <!DOCTYPE html>
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #667eea;">Hey ${displayName}, we miss you! 💙</h1>
              <p>It's been a while since we last saw you. A lot has happened at Magverse AI!</p>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>🆕 What's New:</h3>
                <ul>
                  <li>✨ Improved AI models with better responses</li>
                  <li>🔍 Enhanced web search capabilities</li>
                  <li>🎨 New image generation features</li>
                  <li>📱 Better mobile experience</li>
                </ul>
              </div>

              <p>Your <strong>5 daily free messages</strong> are waiting for you. Come back and chat with our AI!</p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://magverseai.com/chat" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Return to Magverse AI
                </a>
              </div>
            </div>
          </body>
        </html>
      `
    };
  } else if (type === 'upsell') {
    return {
      subject: '🚀 Upgrade to Pro and Get Unlimited AI Access',
      html: `
        <!DOCTYPE html>
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #667eea;">You're a Power User, ${displayName}! 💪</h1>
              <p>We noticed you're getting great value from Magverse AI. You're running out of free credits!</p>
              
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; margin: 20px 0; text-align: center;">
                <h2 style="margin: 0 0 10px 0;">🎉 Upgrade to Pro</h2>
                <p style="font-size: 18px; margin: 10px 0;"><strong>₹199/month</strong> or <strong>₹699 Lifetime</strong></p>
                <ul style="list-style: none; padding: 0; margin: 20px 0;">
                  <li>✓ 500 messages per day</li>
                  <li>✓ All AI models included</li>
                  <li>✓ Priority support</li>
                  <li>✓ Early access to new features</li>
                </ul>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://magverseai.com/upgrade" style="background: #667eea; color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 16px; font-weight: bold;">
                  Upgrade Now
                </a>
              </div>

              <p style="color: #666; font-size: 14px; text-align: center;">
                No commitment. Cancel anytime.
              </p>
            </div>
          </body>
        </html>
      `
    };
  }

  return { subject: '', html: '' };
}