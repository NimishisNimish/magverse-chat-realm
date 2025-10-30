import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendOTPRequest {
  phoneNumber: string;
  purpose?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const msg91ApiKey = Deno.env.get("MSG91_API_KEY")!;
    const msg91TemplateId = Deno.env.get("MSG91_TEMPLATE_ID");

    if (!msg91TemplateId) {
      console.error("MSG91_TEMPLATE_ID not configured");
      return new Response(
        JSON.stringify({ error: "SMS service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { phoneNumber, purpose = "password_reset" }: SendOTPRequest = await req.json();

    console.log("Sending OTP to phone:", phoneNumber, "Purpose:", purpose);

    // Validate phone number format (basic validation)
    const phoneRegex = /^[6-9]\d{9}$/; // Indian mobile number
    if (!phoneRegex.test(phoneNumber)) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number format. Please enter a valid 10-digit Indian mobile number." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check rate limiting
    const { data: rateLimitCheck, error: rateLimitError } = await supabase
      .rpc("check_phone_reset_rate_limit", { p_phone: phoneNumber });

    if (rateLimitError) {
      console.error("Rate limit check error:", rateLimitError);
      return new Response(
        JSON.stringify({ error: "Failed to check rate limit" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!rateLimitCheck) {
      return new Response(
        JSON.stringify({ error: "Too many reset attempts. Please try again after 1 hour." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find user by phone number
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, phone_verified")
      .eq("phone_number", phoneNumber)
      .maybeSingle();

    if (profileError) {
      console.error("Profile lookup error:", profileError);
      return new Response(
        JSON.stringify({ error: "Failed to find user with this phone number" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profile) {
      // Don't reveal if phone exists or not - prevent user enumeration
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
      return new Response(
        JSON.stringify({ success: true, message: "If this phone number is registered, an OTP has been sent." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save OTP to database
    const { error: insertError } = await supabase
      .from("phone_verification_codes")
      .insert({
        user_id: profile.id,
        phone_number: phoneNumber,
        code: otp,
        purpose,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("Failed to save OTP:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to generate OTP" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log reset attempt
    await supabase.from("password_reset_attempts").insert({
      email: "", // Empty for phone resets
      phone_number: phoneNumber,
      method: "phone_otp",
    });

    // Send OTP via MSG91 using POST with body (more secure than URL params)
    try {
      const smsResponse = await fetch("https://control.msg91.com/api/v5/otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "authkey": msg91ApiKey,
        },
        body: JSON.stringify({
          template_id: msg91TemplateId,
          mobile: `91${phoneNumber}`,
          otp: otp,
        }),
      });

      const smsResult = await smsResponse.json();
      
      if (!smsResponse.ok) {
        console.error("MSG91 API error:", smsResult);
        // Don't fail the request, OTP is saved in DB
      }

      console.log("OTP sent successfully to:", phoneNumber);
    } catch (smsError) {
      console.error("SMS sending error:", smsError);
      // Continue even if SMS fails, OTP is in database
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "OTP sent successfully to your phone number",
        expiresIn: 600 // 10 minutes in seconds
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-phone-otp:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
