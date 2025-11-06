import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  userEmail: string;
  userName?: string;
  planType: string;
  verified: boolean;
  rejectionReason?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userEmail, userName, planType, verified, rejectionReason }: EmailRequest = await req.json();

    if (!userEmail || !planType) {
      throw new Error("Missing required fields");
    }

    const planName = planType === "monthly" ? "Pro Yearly" : "Lifetime Pro";
    const greeting = userName || "there";

    let subject: string;
    let htmlContent: string;

    if (verified) {
      subject = `Payment Verified - Welcome to ${planName}!`;
      htmlContent = `<h1>Payment Verified!</h1><p>Hi ${greeting}, your ${planName} subscription is now active. Contact us at magverse4@gmail.com for support.</p>`;
    } else {
      subject = "Payment Verification Issue";
      htmlContent = `<h1>Payment Verification Update</h1><p>Hi ${greeting}, we couldn't verify your ${planName} payment. ${rejectionReason ? `Reason: ${rejectionReason}` : ''} Contact magverse4@gmail.com for help.</p>`;
    }

    console.log("Email notification:", { userEmail, verified, planType });

    return new Response(JSON.stringify({ success: true, message: "Email notification logged" }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in payment verification email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
