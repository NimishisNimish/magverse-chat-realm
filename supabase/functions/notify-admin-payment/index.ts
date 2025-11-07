import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transactionId } = await req.json();

    if (!transactionId) {
      throw new Error('Transaction ID is required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get transaction details
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .select('*, profiles(username, display_name)')
      .eq('id', transactionId)
      .single();

    if (txError || !transaction) {
      throw new Error('Transaction not found');
    }

    // Get Resend API key and admin email
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const adminEmail = Deno.env.get('ADMIN_EMAIL') || 'magverse4@gmail.com';

    if (!resendApiKey) {
      throw new Error('Resend API key not configured');
    }

    const resend = new Resend(resendApiKey);

    // Send email to admin
    const profile = transaction.profiles as any;
    const userName = profile?.display_name || profile?.username || 'Unknown User';
    const planName = transaction.plan_type === 'monthly' ? 'Pro Yearly (₹299)' : 'Lifetime Pro (₹799)';

    await resend.emails.send({
      from: 'Magverse Payments <onboarding@resend.dev>',
      to: [adminEmail],
      subject: `🔔 New Payment Received - ${planName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #9333ea;">New Payment Notification</h2>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">User Details</h3>
            <p><strong>Name:</strong> ${userName}</p>
            <p><strong>Username:</strong> @${profile?.username || 'unknown'}</p>
          </div>

          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Payment Details</h3>
            <p><strong>Plan:</strong> ${planName}</p>
            <p><strong>Amount:</strong> ₹${transaction.amount}</p>
            <p><strong>Payment Method:</strong> ${transaction.payment_method.toUpperCase()}</p>
            ${transaction.payment_reference ? `<p><strong>Reference:</strong> ${transaction.payment_reference}</p>` : ''}
            <p><strong>Transaction ID:</strong> ${transaction.id}</p>
          </div>

          <div style="margin: 30px 0;">
            <p><strong>⚠️ Action Required:</strong></p>
            <p>Please log in to the admin panel to verify and approve this payment.</p>
            <a href="https://17ca783c-2f83-4a71-bad0-88eb38887817.lovableproject.com/admin/payment-queue" 
               style="display: inline-block; background: #9333ea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">
              Go to Admin Panel
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #666; font-size: 12px;">
            This is an automated notification from Magverse AI Platform.<br>
            Received at: ${new Date().toLocaleString()}
          </p>
        </div>
      `,
    });

    console.log('✅ Admin notification sent successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Admin notified successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Error in notify-admin-payment:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});