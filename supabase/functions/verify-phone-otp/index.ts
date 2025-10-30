import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyOTPRequest {
  phoneNumber: string;
  otp: string;
  newPassword: string;
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

    console.log("Verifying OTP for phone:", phoneNumber);

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
      return new Response(
        JSON.stringify({ error: "Invalid or expired OTP. Please request a new one." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check attempts limit
    if (verification.attempts >= 3) {
      return new Response(
        JSON.stringify({ error: "Too many failed attempts. Please request a new OTP." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
