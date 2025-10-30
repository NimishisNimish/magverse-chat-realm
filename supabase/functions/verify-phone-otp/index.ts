import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyOTPRequest {
  phoneNumber: string;
  otp: string;
  newPassword: string;
}

// Password validation schema
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must be less than 100 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

// Standard error response with timing masking to prevent user enumeration
async function safeErrorResponse(message: string = "Invalid verification code. Please check and try again."): Promise<Response> {
  // Add random delay (100-300ms) to mask timing differences
  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
  return new Response(
    JSON.stringify({ error: message }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { phoneNumber, otp, newPassword }: VerifyOTPRequest = await req.json();

    // Validate password strength
    try {
      passwordSchema.parse(newPassword);
    } catch (error: any) {
      const errorMessage = error.errors?.[0]?.message || 'Password does not meet security requirements';
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Verifying OTP for phone:", phoneNumber);

    // Check phone-level rate limiting (10 attempts in 15 minutes)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count: recentAttempts } = await supabase
      .from("phone_verification_codes")
      .select("*", { count: 'exact', head: true })
      .eq("phone_number", phoneNumber)
      .gte("created_at", fifteenMinutesAgo);

    if (recentAttempts && recentAttempts >= 10) {
      console.log(`Rate limit exceeded for phone: ${phoneNumber}`);
      return new Response(
        JSON.stringify({ error: "Too many verification attempts. Please wait 15 minutes and try again." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clean up expired codes first
    await supabase.rpc("cleanup_expired_phone_codes");

    // Find valid OTP
    const { data: verification, error: verifyError } = await supabase
      .from("phone_verification_codes")
      .select("*")
      .eq("phone_number", phoneNumber)
      .eq("code", otp)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (verifyError) {
      console.error("Verification lookup error:", verifyError);
      return new Response(
        JSON.stringify({ error: "Failed to verify OTP" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!verification) {
      return await safeErrorResponse();
    }

    // Check attempts limit for this specific OTP code
    if (verification.attempts >= 3) {
      console.log(`OTP attempts exceeded for code: ${verification.id}`);
      return await safeErrorResponse();
    }

    // Verify the OTP code matches
    if (verification.code !== otp) {
      // Increment attempt counter on failed verification
      await supabase
        .from("phone_verification_codes")
        .update({ attempts: verification.attempts + 1 })
        .eq("id", verification.id);
      
      return await safeErrorResponse();
    }

    // Mark as verified
    const { error: updateError } = await supabase
      .from("phone_verification_codes")
      .update({ verified: true })
      .eq("id", verification.id);

    if (updateError) {
      console.error("Failed to mark OTP as verified:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to verify OTP" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("phone_number", phoneNumber)
      .single();

    if (profileError || !profile) {
      console.error("Profile not found:", profileError);
      return await safeErrorResponse();
    }

    // Update user password using admin API
    const { error: passwordError } = await supabase.auth.admin.updateUserById(
      profile.id,
      { password: newPassword }
    );

    if (passwordError) {
      console.error("Failed to update password:", passwordError);
      return new Response(
        JSON.stringify({ error: "Failed to update password" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark phone as verified if not already
    await supabase
      .from("profiles")
      .update({ 
        phone_verified: true, 
        phone_verified_at: new Date().toISOString() 
      })
      .eq("id", profile.id);

    console.log("Password reset successful for user:", profile.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Password reset successfully. You can now login with your new password." 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in verify-phone-otp:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
