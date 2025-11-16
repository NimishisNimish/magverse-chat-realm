import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    console.log("Starting weekly digest email job...");

    // Get all users with email_digest_enabled = true
    const { data: users, error: usersError } = await supabase
      .from("profiles")
      .select("id, display_name, email_digest_enabled, last_digest_sent")
      .eq("email_digest_enabled", true);

    if (usersError) {
      throw usersError;
    }

    console.log(`Found ${users?.length || 0} users with email digest enabled`);

    // Get user emails from auth.users
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      throw authError;
    }

    const emailMap = new Map(authUsers.map(u => [u.id, u.email]));

    let successCount = 0;
    let errorCount = 0;

    // Process each user
    for (const profile of users || []) {
      try {
        const userEmail = emailMap.get(profile.id);
        if (!userEmail) continue;

        // Check if digest was sent in the last 7 days
        if (profile.last_digest_sent) {
          const lastSent = new Date(profile.last_digest_sent);
          const daysSince = (Date.now() - lastSent.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSince < 7) {
            console.log(`Skipping ${userEmail} - digest sent ${daysSince.toFixed(1)} days ago`);
            continue;
          }
        }

        // Get user's weekly statistics
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        // Messages this week
        const { count: messageCount } = await supabase
          .from("chat_messages")
          .select("*", { count: "exact", head: true })
          .eq("user_id", profile.id)
          .gte("created_at", sevenDaysAgo);

        // Chats this week
        const { count: chatCount } = await supabase
          .from("chat_history")
          .select("*", { count: "exact", head: true })
          .eq("user_id", profile.id)
          .gte("created_at", sevenDaysAgo);

        // Favorite model this week
        const { data: messages } = await supabase
          .from("chat_messages")
          .select("model")
          .eq("user_id", profile.id)
          .eq("role", "assistant")
          .gte("created_at", sevenDaysAgo)
          .not("model", "is", null);

        const modelCount: Record<string, number> = {};
        messages?.forEach(m => {
          if (m.model) {
            modelCount[m.model] = (modelCount[m.model] || 0) + 1;
          }
        });

        const favoriteModel = Object.keys(modelCount).length > 0
          ? Object.entries(modelCount).sort((a, b) => b[1] - a[1])[0][0].split('/').pop()
          : "None";

        // Get credits remaining
        const { data: profileData } = await supabase
          .from("profiles")
          .select("credits_remaining, subscription_type, monthly_credits_used")
          .eq("id", profile.id)
          .single();

        let creditsInfo = "";
        if (profileData?.subscription_type === "lifetime") {
          creditsInfo = "Unlimited credits";
        } else if (profileData?.subscription_type === "monthly") {
          const remaining = 500 - (profileData.monthly_credits_used || 0);
          creditsInfo = `${remaining} credits remaining today`;
        } else {
          creditsInfo = `${profileData?.credits_remaining || 0} credits remaining`;
        }

        // Skip if no activity this week
        if ((messageCount || 0) === 0 && (chatCount || 0) === 0) {
          console.log(`Skipping ${userEmail} - no activity this week`);
          continue;
        }

        // Generate personalized insights
        let insight = "";
        if ((messageCount || 0) > 50) {
          insight = "You're on fire! 🔥 Your engagement this week was exceptional. Keep up the great work!";
        } else if ((messageCount || 0) > 20) {
          insight = "Great job staying active! Try exploring different AI models to get even better responses.";
        } else if ((messageCount || 0) > 0) {
          insight = "Thanks for using Magverse! Consider trying our Pro features for unlimited access.";
        } else {
          insight = "We noticed you haven't been as active. Come back and continue your AI journey!";
        }

        // Send email
        const displayName = profile.display_name || userEmail.split('@')[0];
        
        await resend.emails.send({
          from: "MagVerse <onboarding@resend.dev>",
          to: [userEmail],
          subject: `Your MagVerse Weekly Summary 📊`,
          html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(to bottom, #f8f9fa, #ffffff); border-radius: 16px; overflow: hidden;">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
                <h1 style="color: white; margin: 0 0 10px 0; font-size: 32px;">MagVerse AI</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 18px;">Your Week in Review</p>
              </div>

              <!-- Greeting -->
              <div style="padding: 30px 20px 20px;">
                <h2 style="color: #333; margin: 0 0 15px 0;">Hi ${displayName}! 👋</h2>
                <p style="color: #666; line-height: 1.6; margin: 0;">
                  Here's a summary of your activity on MagVerse over the past week.
                </p>
              </div>

              <!-- Stats Cards -->
              <div style="padding: 0 20px 20px;">
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                  <!-- Messages Card -->
                  <div style="background: white; border: 2px solid #e9ecef; border-radius: 12px; padding: 20px; text-align: center;">
                    <div style="font-size: 36px; font-weight: bold; color: #667eea; margin-bottom: 5px;">
                      ${messageCount || 0}
                    </div>
                    <div style="color: #666; font-size: 14px;">Messages Sent</div>
                  </div>

                  <!-- Chats Card -->
                  <div style="background: white; border: 2px solid #e9ecef; border-radius: 12px; padding: 20px; text-align: center;">
                    <div style="font-size: 36px; font-weight: bold; color: #764ba2; margin-bottom: 5px;">
                      ${chatCount || 0}
                    </div>
                    <div style="color: #666; font-size: 14px;">Chats Started</div>
                  </div>
                </div>
              </div>

              <!-- Favorite Model -->
              <div style="padding: 0 20px 20px;">
                <div style="background: linear-gradient(135deg, #667eea20, #764ba220); border-radius: 12px; padding: 20px;">
                  <div style="color: #333; font-weight: 600; margin-bottom: 8px; font-size: 14px;">
                    🤖 YOUR FAVORITE MODEL
                  </div>
                  <div style="color: #667eea; font-size: 20px; font-weight: bold;">
                    ${favoriteModel}
                  </div>
                </div>
              </div>

              <!-- Credits -->
              <div style="padding: 0 20px 20px;">
                <div style="background: #fff3cd; border-radius: 12px; padding: 20px; border: 2px solid #ffc107;">
                  <div style="color: #856404; font-weight: 600; margin-bottom: 8px;">
                    ⚡ ${creditsInfo}
                  </div>
                </div>
              </div>

              <!-- Insight -->
              <div style="padding: 0 20px 20px;">
                <div style="background: #e7f3ff; border-left: 4px solid #2196F3; border-radius: 8px; padding: 20px;">
                  <div style="color: #0d47a1; font-weight: 600; margin-bottom: 8px;">💡 PERSONALIZED INSIGHT</div>
                  <p style="color: #1565c0; margin: 0; line-height: 1.5;">
                    ${insight}
                  </p>
                </div>
              </div>

              <!-- CTA Button -->
              <div style="padding: 10px 20px 30px; text-align: center;">
                <a href="${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app') || 'https://magverse.lovable.app'}/dashboard" 
                   style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  View Full Dashboard
                </a>
              </div>

              <!-- Footer -->
              <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
                <p style="color: #6c757d; font-size: 12px; margin: 0 0 10px 0;">
                  You're receiving this because you have email digests enabled.
                </p>
                <p style="color: #6c757d; font-size: 12px; margin: 0;">
                  <a href="${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app') || 'https://magverse.lovable.app'}/profile" style="color: #667eea; text-decoration: none;">
                    Manage email preferences
                  </a>
                </p>
              </div>
            </div>
          `,
        });

        // Update last_digest_sent
        await supabase
          .from("profiles")
          .update({ last_digest_sent: new Date().toISOString() })
          .eq("id", profile.id);

        console.log(`✓ Sent digest to ${userEmail}`);
        successCount++;
      } catch (error) {
        console.error(`✗ Error processing ${profile.id}:`, error);
        errorCount++;
      }
    }

    console.log(`Weekly digest job complete: ${successCount} sent, ${errorCount} errors`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        errors: errorCount,
        totalUsers: users?.length || 0
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in weekly digest job:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
