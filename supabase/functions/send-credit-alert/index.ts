import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AlertRequest {
  userId: string;
  alertType: 'low_credits' | 'subscription_expiring';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { userId, alertType }: AlertRequest = await req.json();

    // Fetch user profile and auth data
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      throw new Error('User profile not found');
    }

    const { data: authUser, error: authError } = await supabaseClient.auth.admin.getUserById(userId);
    
    if (authError || !authUser?.user?.email) {
      throw new Error('User email not found');
    }

    const userEmail = authUser.user.email;
    let subject = '';
    let message = '';

    if (alertType === 'low_credits') {
      const creditsRemaining = profile.subscription_type === 'monthly' 
        ? (profile.monthly_credits || 0) - (profile.monthly_credits_used || 0)
        : profile.credits_remaining || 0;

      subject = '⚠️ Your Magverse AI Credits are Running Low';
      message = `Low Credits Alert for ${profile.display_name || profile.username || userEmail}. ${creditsRemaining} credits remaining. Consider upgrading.`;
    } else if (alertType === 'subscription_expiring') {
      const daysUntilExpiry = profile.subscription_expires_at 
        ? Math.floor((new Date(profile.subscription_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : 0;

      subject = '⏰ Your Magverse AI Subscription is Expiring Soon';
      message = `Subscription Expiring for ${profile.display_name || profile.username || userEmail}. Expires in ${daysUntilExpiry} days.`;
    }

    console.log(`[ALERT EMAIL] To: ${userEmail}`);
    console.log(`[ALERT EMAIL] Subject: ${subject}`);
    console.log(`[ALERT EMAIL] Message: ${message}`);

    // TODO: Integrate with Resend or your email service
    // For now, we're just logging. To send actual emails:
    // 1. Set up Resend at https://resend.com
    // 2. Add RESEND_API_KEY to Supabase secrets
    // 3. Import Resend: import { Resend } from "npm:resend@2.0.0";
    // 4. Send email using resend.emails.send()

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Alert logged (email sending not configured yet)',
      userEmail,
      subject 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error processing alert:", error);
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
