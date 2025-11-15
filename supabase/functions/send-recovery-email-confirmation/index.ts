import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await resend.emails.send({
      from: "MagVerse <onboarding@resend.dev>",
      to: [email],
      subject: "Recovery Email Updated Successfully",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #333; margin-bottom: 10px;">MagVerse</h1>
          </div>
          <div style="background: #f8f9fa; padding: 30px; border-radius: 10px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <div style="display: inline-block; background: #22c55e; color: white; width: 60px; height: 60px; border-radius: 50%; line-height: 60px; font-size: 30px;">
                ✓
              </div>
            </div>
            <h2 style="color: #333; margin-top: 0; text-align: center;">Recovery Email Updated</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.5; text-align: center;">
              Your recovery email has been successfully updated to:
            </p>
            <div style="background: white; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <strong style="color: #333; font-size: 18px;">${email}</strong>
            </div>
            <p style="color: #666; font-size: 14px; text-align: center;">
              You can now use this email to recover your account if needed.
            </p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
                If you didn't make this change, please contact support immediately.
              </p>
            </div>
          </div>
        </div>
      `,
    });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending recovery email confirmation:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send confirmation" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
