import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyRequest {
  orderId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔔 Verify UPI Payment Request');

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from JWT
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);

    if (userError || !user) {
      console.error('❌ Authentication failed:', userError);
      throw new Error('Unauthorized');
    }

    console.log('✅ User authenticated:', user.id);

    // Parse request body
    const { orderId }: VerifyRequest = await req.json();

    if (!orderId) {
      throw new Error('Order ID is required');
    }

    // Get transaction from database
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', user.id)
      .single();

    if (transactionError || !transaction) {
      console.error('❌ Transaction not found:', transactionError);
      throw new Error('Transaction not found');
    }

    console.log('📝 Found transaction:', transaction.id, 'Status:', transaction.status);

    // If already completed, return success
    if (transaction.status === 'completed') {
      console.log('✅ Transaction already completed');
      return new Response(
        JSON.stringify({
          success: true,
          status: 'completed',
          message: 'Payment already verified',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Get UPI Gateway API key
    const upiGatewayKey = Deno.env.get('UPI_GATEWAY_API_KEY');
    if (!upiGatewayKey) {
      throw new Error('UPI Gateway API key not configured');
    }

    // Check payment status with UPI Gateway
    console.log('📡 Checking payment status with UPI Gateway...');
    const gatewayOrderId = transaction.gateway_order_id;

    // Call UPI Gateway API to check status
    // Note: Adjust this URL and parameters based on your actual UPI Gateway API
    const gatewayResponse = await fetch(`https://api.upigateway.com/api/check_order_status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${upiGatewayKey}`,
      },
      body: JSON.stringify({
        order_id: gatewayOrderId,
      }),
    });

    if (!gatewayResponse.ok) {
      const errorText = await gatewayResponse.text();
      console.error('❌ Gateway API error:', errorText);
      throw new Error('Failed to check payment status');
    }

    const statusData = await gatewayResponse.json();
    console.log('📊 Gateway status:', JSON.stringify(statusData));

    // Check if payment is successful
    // Note: Adjust this condition based on your UPI Gateway's response format
    const isPaymentSuccessful = statusData.status === 'success' || 
                                statusData.status === 'paid' ||
                                statusData.payment_status === 'success';

    if (!isPaymentSuccessful) {
      console.log('⏳ Payment not yet completed');
      return new Response(
        JSON.stringify({
          success: true,
          status: 'pending',
          message: 'Payment is still pending',
        }),
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
        payment_id: statusData.payment_id || statusData.transaction_id,
        gateway_payment_id: statusData.payment_id || statusData.transaction_id,
        gateway_response: statusData,
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
      .eq('id', user.id);

    if (profileError) {
      console.error('❌ Error updating profile:', profileError);
      throw new Error('Failed to activate subscription');
    }

    console.log('✅ Subscription activated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        status: 'completed',
        planType: planType,
        message: 'Payment verified and subscription activated',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('❌ Error in verify-upi-payment:', error);
    return new Response(
      JSON.stringify({
        success: false,
        status: 'error',
        error: error.message || 'Failed to verify payment',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
