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
    const { email, otp } = await req.json();

    console.log("Recovery OTP request received for:", email);

    if (!email || !otp) {
      console.error("Missing email or OTP");
      return new Response(
        JSON.stringify({ error: "Email and OTP are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Attempting to send recovery OTP email...");

    const result = await resend.emails.send({
      from: "MagVerse <onboarding@resend.dev>",
      to: [email],
      subject: "Recovery Email Verification - OTP",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #333; margin-bottom: 10px;">MagVerse</h1>
          </div>
          <div style="background: #f8f9fa; padding: 30px; border-radius: 10px;">
            <h2 style="color: #333; margin-top: 0;">Recovery Email Verification</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.5;">
              You requested to set or update your recovery email address. Please use the following OTP code to verify:
            </p>
            <div style="background: white; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <h1 style="color: #333; letter-spacing: 8px; font-size: 32px; margin: 0;">
                ${otp}
              </h1>
            </div>
            <p style="color: #666; font-size: 14px;">
              This code will expire in 10 minutes.
            </p>
            <p style="color: #999; font-size: 12px; margin-top: 20px;">
              If you didn't request this, please ignore this email.
            </p>
          </div>
        </div>
      `,
    });

    console.log("Email send result:", JSON.stringify(result));

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending recovery email OTP:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send OTP" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
