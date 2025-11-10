import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

    const planName = planType === "monthly" ? "Pro Yearly (₹299)" : "Lifetime Pro (₹799)";
    const greeting = userName || "there";

    let subject: string;
    let htmlContent: string;

    if (verified) {
      subject = `🎉 Payment Verified - Welcome to ${planName}!`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Payment Verified</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">🎉 Payment Verified!</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px;">Hi <strong>${greeting}</strong>,</p>
            <p style="font-size: 16px;">Great news! Your payment has been verified and your <strong>${planName}</strong> subscription is now active.</p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <h3 style="margin-top: 0; color: #667eea;">What's included:</h3>
              <ul style="padding-left: 20px;">
                <li>Access to all 6+ premium AI models</li>
                <li>${planType === 'lifetime' ? 'Unlimited messages forever' : '500 messages per day'}</li>
                <li>Image generation & editing</li>
                <li>Deep research capabilities</li>
                <li>Priority support</li>
                <li>Chat history & export to PDF</li>
              </ul>
            </div>
            <p style="font-size: 16px;">Start using your premium features at <a href="https://magverseai.com/chat" style="color: #667eea;">magverseai.com/chat</a></p>
            <p style="font-size: 14px; color: #666; margin-top: 30px;">Need help? Contact us at <a href="mailto:magverse4@gmail.com" style="color: #667eea;">magverse4@gmail.com</a> or call <strong>+91 9872021777</strong></p>
            <p style="font-size: 14px; color: #666;">Best regards,<br><strong>The Magverse AI Team</strong></p>
          </div>
        </body>
        </html>
      `;
    } else {
      subject = "⚠️ Payment Verification Issue";
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Payment Verification Issue</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #f44336; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">⚠️ Payment Verification Update</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px;">Hi <strong>${greeting}</strong>,</p>
            <p style="font-size: 16px;">We were unable to verify your <strong>${planName}</strong> payment.</p>
            ${rejectionReason ? `<div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;"><p style="margin: 0; color: #856404;"><strong>Reason:</strong> ${rejectionReason}</p></div>` : ''}
            <p style="font-size: 16px;">Please contact our support team to resolve this issue:</p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Email:</strong> <a href="mailto:magverse4@gmail.com" style="color: #667eea;">magverse4@gmail.com</a></p>
              <p style="margin: 5px 0;"><strong>Phone:</strong> +91 9872021777</p>
            </div>
            <p style="font-size: 14px; color: #666;">Best regards,<br><strong>The Magverse AI Team</strong></p>
          </div>
        </body>
        </html>
      `;
    }

    console.log("Sending email to:", userEmail);

    const emailResponse = await resend.emails.send({
      from: "Magverse AI <onboarding@resend.dev>",
      to: [userEmail],
      subject: subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, message: "Email sent successfully" }), {
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
