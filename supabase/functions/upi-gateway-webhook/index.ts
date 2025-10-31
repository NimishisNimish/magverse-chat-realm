import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔔 UPI Gateway Webhook Received');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse webhook payload
    const payload = await req.json();
    console.log('📦 Webhook payload:', JSON.stringify(payload));

    // Extract order ID and payment status
    // Note: Adjust these field names based on your UPI Gateway's webhook format
    const orderId = payload.order_id || payload.orderId;
    const paymentStatus = payload.status || payload.payment_status;
    const paymentId = payload.payment_id || payload.transaction_id;

    if (!orderId) {
      console.error('❌ No order ID in webhook payload');
      throw new Error('Invalid webhook payload: missing order_id');
    }

    console.log(`📝 Processing webhook for order: ${orderId}, status: ${paymentStatus}`);

    // Find transaction by gateway_order_id
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select('*')
      .eq('gateway_order_id', orderId)
      .single();

    if (transactionError || !transaction) {
      console.error('❌ Transaction not found:', transactionError);
      throw new Error('Transaction not found');
    }

    console.log('✅ Found transaction:', transaction.id);

    // Check if payment is successful
    const isPaymentSuccessful = paymentStatus === 'success' || 
                                paymentStatus === 'paid' ||
                                paymentStatus === 'completed';

    if (!isPaymentSuccessful) {
      console.log('⚠️ Payment not successful, status:', paymentStatus);
      
      // Update transaction status to failed if explicitly failed
      if (paymentStatus === 'failed' || paymentStatus === 'cancelled') {
        await supabase
          .from('transactions')
          .update({
            status: 'failed',
            gateway_response: payload,
          })
          .eq('id', transaction.id);
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Webhook received, payment not successful' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    console.log('💰 Payment successful! Activating subscription...');

    // Update transaction to completed
    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        status: 'completed',
        payment_id: paymentId,
        gateway_payment_id: paymentId,
        gateway_response: payload,
        auto_verified: true,
        verified_at: new Date().toISOString(),
      })
      .eq('id', transaction.id);

    if (updateError) {
      console.error('❌ Error updating transaction:', updateError);
      throw new Error('Failed to update transaction');
    }

    // Activate subscription based on plan type
    const planType = transaction.plan_type;
    const updateData: any = {};

    if (planType === 'lifetime') {
      updateData.is_pro = true;
      updateData.subscription_type = 'lifetime';
      console.log('🎉 Activating lifetime subscription');
    } else if (planType === 'monthly') {
      updateData.subscription_type = 'monthly';
      updateData.subscription_expires_at = transaction.subscription_period_end;
      updateData.monthly_credits = 50;
      updateData.monthly_credits_used = 0;
      console.log('🎉 Activating monthly subscription (50 credits)');
    }

    // Update user profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', transaction.user_id);

    if (profileError) {
      console.error('❌ Error updating profile:', profileError);
      throw new Error('Failed to activate subscription');
    }

    console.log('✅ Subscription activated successfully via webhook');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment verified and subscription activated',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('❌ Error in upi-gateway-webhook:', error);
    
    // Always return 200 to the gateway to acknowledge receipt
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Webhook processing failed',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }
});
