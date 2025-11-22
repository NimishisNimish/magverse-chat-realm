import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreditAlertRequest {
  userId: string;
  alertType: 'warning_80' | 'warning_90' | 'limit_reached';
  creditsRemaining: number;
  creditsTotal: number;
  subscriptionType: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Get the user from the auth header
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { alertType, creditsRemaining, creditsTotal, subscriptionType }: CreditAlertRequest = await req.json();

    // Get user profile to check email preferences
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("email_credit_alerts_enabled, display_name")
      .eq("id", user.id)
      .single();

    if (profileError) {
      throw profileError;
    }

    // Check if user has email credit alerts enabled
    if (!profile.email_credit_alerts_enabled) {
      console.log(`Credit alerts disabled for user ${user.id}`);
      return new Response(
        JSON.stringify({ message: "Credit alerts disabled" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Get user email
    const userEmail = user.email;
    if (!userEmail) {
      throw new Error("User email not found");
    }

    // Determine email content based on alert type
    let subject = "";
    let htmlContent = "";
    const displayName = profile.display_name || "there";

    if (alertType === 'warning_80') {
      subject = "⚠️ 80% of Daily Credits Used";
      htmlContent = `
        <h1>Credit Usage Alert</h1>
        <p>Hi ${displayName},</p>
        <p>You've used <strong>80%</strong> of your daily credits.</p>
        <p><strong>${creditsRemaining}</strong> credits remaining out of ${creditsTotal} total.</p>
        <p>Consider upgrading your plan for more credits!</p>
        <p><a href="${Deno.env.get("SUPABASE_URL")?.replace('pqdgpxetysqcdcjwormb.supabase.co', 'lovableproject.com')}/upgrade" style="background-color: #8B5CF6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">Upgrade Now</a></p>
        <p style="color: #666; margin-top: 24px;">Best regards,<br>MagVerse AI Team</p>
      `;
    } else if (alertType === 'warning_90') {
      subject = "🚨 90% of Daily Credits Used - Running Low!";
      htmlContent = `
        <h1>Credit Usage Alert</h1>
        <p>Hi ${displayName},</p>
        <p>You're running low on credits! You've used <strong>90%</strong> of your daily limit.</p>
        <p>Only <strong>${creditsRemaining}</strong> credits remaining out of ${creditsTotal} total.</p>
        <p>Upgrade now to avoid interruptions!</p>
        <p><a href="${Deno.env.get("SUPABASE_URL")?.replace('pqdgpxetysqcdcjwormb.supabase.co', 'lovableproject.com')}/upgrade" style="background-color: #8B5CF6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">Upgrade Now</a></p>
        <p style="color: #666; margin-top: 24px;">Best regards,<br>MagVerse AI Team</p>
      `;
    } else if (alertType === 'limit_reached') {
      subject = "❌ Daily Credit Limit Reached";
      htmlContent = `
        <h1>Credit Limit Reached</h1>
        <p>Hi ${displayName},</p>
        <p>You've reached your daily credit limit of <strong>${creditsTotal}</strong> credits.</p>
        <p>Your credits will reset tomorrow, or you can upgrade for more!</p>
        <p><a href="${Deno.env.get("SUPABASE_URL")?.replace('pqdgpxetysqcdcjwormb.supabase.co', 'lovableproject.com')}/upgrade" style="background-color: #8B5CF6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">Upgrade Now</a></p>
        <p style="color: #666; margin-top: 24px;">Best regards,<br>MagVerse AI Team</p>
      `;
    }

    // Send email using Resend
    const emailResponse = await resend.emails.send({
      from: "MagVerse AI <onboarding@resend.dev>",
      to: [userEmail],
      subject: subject,
      html: htmlContent,
    });

    console.log("Credit alert email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-credit-alert-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
