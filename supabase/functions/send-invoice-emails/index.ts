import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  plan_type: string;
  issue_date: string;
  status: string;
  user_id: string;
}

interface Profile {
  id: string;
  display_name: string | null;
  username: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const resend = new Resend(resendApiKey);

    console.log('Fetching invoices and users...');

    // Get all invoices for users with paid plans
    const { data: invoices, error: invoicesError } = await supabaseClient
      .from('invoices')
      .select('*')
      .eq('status', 'paid')
      .order('created_at', { ascending: false });

    if (invoicesError) {
      console.error('Error fetching invoices:', invoicesError);
      throw invoicesError;
    }

    if (!invoices || invoices.length === 0) {
      console.log('No invoices found');
      return new Response(
        JSON.stringify({ message: 'No invoices to send', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Get unique user IDs
    const userIds = [...new Set(invoices.map((inv: Invoice) => inv.user_id))];

    // Get profiles for all users
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('id, display_name, username')
      .in('id', userIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }

    // Get auth users to get emails
    const { data: { users }, error: usersError } = await supabaseClient.auth.admin.listUsers();

    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw usersError;
    }

    const profileMap = new Map(profiles?.map((p: Profile) => [p.id, p]) || []);
    const emailMap = new Map(users.map(u => [u.id, u.email]));

    let sentCount = 0;
    const errors: string[] = [];

    // Group invoices by user
    const userInvoices = new Map<string, Invoice[]>();
    invoices.forEach((invoice: Invoice) => {
      if (!userInvoices.has(invoice.user_id)) {
        userInvoices.set(invoice.user_id, []);
      }
      userInvoices.get(invoice.user_id)?.push(invoice);
    });

    // Send email to each user with their invoices
    for (const [userId, userInvoiceList] of userInvoices) {
      const email = emailMap.get(userId);
      const profile = profileMap.get(userId);

      if (!email) {
        errors.push(`No email found for user ${userId}`);
        continue;
      }

      const displayName = profile?.display_name || profile?.username || 'Valued Customer';
      const latestInvoice = userInvoiceList[0];

      try {
        const invoiceRows = userInvoiceList.map(inv => `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${inv.invoice_number}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${new Date(inv.issue_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${inv.plan_type}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${inv.amount.toFixed(2)}</td>
          </tr>
        `).join('');

        const totalAmount = userInvoiceList.reduce((sum, inv) => sum + inv.amount, 0);

        await resend.emails.send({
          from: 'MagVerse AI <onboarding@resend.dev>',
          to: [email],
          subject: `Your MagVerse AI Invoice${userInvoiceList.length > 1 ? 's' : ''} - Payment Confirmation`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Invoice - MagVerse AI</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">MagVerse AI</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Invoice Confirmation</p>
              </div>
              
              <div style="background: white; padding: 40px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <p style="font-size: 16px; margin-bottom: 24px;">Dear ${displayName},</p>
                
                <p style="font-size: 16px; margin-bottom: 24px;">
                  Thank you for your continued trust in MagVerse AI. This email confirms your payment${userInvoiceList.length > 1 ? 's' : ''} and provides your invoice details for our premium AI services.
                </p>

                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 30px 0;">
                  <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #111827;">Invoice Details</h2>
                  
                  <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 6px; overflow: hidden;">
                    <thead>
                      <tr style="background-color: #667eea; color: white;">
                        <th style="padding: 12px; text-align: left; font-weight: 600;">Invoice Number</th>
                        <th style="padding: 12px; text-align: left; font-weight: 600;">Date</th>
                        <th style="padding: 12px; text-align: left; font-weight: 600;">Plan</th>
                        <th style="padding: 12px; text-align: right; font-weight: 600;">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${invoiceRows}
                      ${userInvoiceList.length > 1 ? `
                      <tr style="background-color: #f9fafb; font-weight: 600;">
                        <td colspan="3" style="padding: 12px; text-align: right;">Total:</td>
                        <td style="padding: 12px; text-align: right;">₹${totalAmount.toFixed(2)}</td>
                      </tr>
                      ` : ''}
                    </tbody>
                  </table>
                </div>

                <p style="font-size: 16px; margin-bottom: 16px;">
                  Your payment has been successfully processed and your ${latestInvoice.plan_type} subscription is now active.
                </p>

                <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 20px; border-left: 4px solid #0ea5e9; border-radius: 6px; margin: 24px 0;">
                  <p style="margin: 0; font-size: 15px; color: #0c4a6e;">
                    <strong>What's Next?</strong><br>
                    Start exploring our advanced AI models and enjoy unlimited conversations, faster response times, and exclusive features.
                  </p>
                </div>

                <div style="text-align: center; margin: 32px 0;">
                  <a href="https://pqdgpxetysqcdcjwormb.supabase.co" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                    Go to Dashboard
                  </a>
                </div>

                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

                <p style="font-size: 14px; color: #6b7280; margin-bottom: 8px;">
                  If you have any questions about your invoice or subscription, please don't hesitate to contact our support team.
                </p>

                <p style="font-size: 16px; margin-top: 24px;">
                  Best regards,<br>
                  <strong>The MagVerse AI Team</strong>
                </p>
              </div>

              <div style="text-align: center; margin-top: 30px; padding: 20px; color: #6b7280; font-size: 13px;">
                <p style="margin: 0 0 10px 0;">© ${new Date().getFullYear()} MagVerse AI. All rights reserved.</p>
                <p style="margin: 0;">This is an automated message. Please do not reply directly to this email.</p>
              </div>
            </body>
            </html>
          `,
        });

        sentCount++;
        console.log(`Invoice email sent to ${email}`);
      } catch (emailError) {
        const errorMessage = emailError instanceof Error ? emailError.message : 'Unknown error';
        console.error(`Failed to send email to ${email}:`, emailError);
        errors.push(`Failed to send to ${email}: ${errorMessage}`);
      }
    }

    console.log(`Invoice emails sent: ${sentCount}/${userInvoices.size}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${sentCount} invoice emails`,
        sent: sentCount,
        total: userInvoices.size,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('Error in send-invoice-emails function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
