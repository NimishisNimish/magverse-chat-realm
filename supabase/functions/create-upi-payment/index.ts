import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LIFETIME_PRICE = 199;
const MONTHLY_PRICE = 1;

interface PaymentRequest {
  planType: 'monthly' | 'lifetime';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔔 Create UPI Payment Request');

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
    const { planType }: PaymentRequest = await req.json();

    if (!planType || !['monthly', 'lifetime'].includes(planType)) {
      throw new Error('Invalid plan type');
    }

    // Determine amount based on plan
    const amount = planType === 'monthly' ? MONTHLY_PRICE : LIFETIME_PRICE;
    console.log(`💰 Creating ${planType} payment for ₹${amount}`);

    // Check for existing pending transactions
    const { data: pendingTransactions, error: pendingError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1);

    if (pendingError) {
      console.error('Error checking pending transactions:', pendingError);
    }

    // If there's a recent pending transaction (less than 10 minutes old), return it
    if (pendingTransactions && pendingTransactions.length > 0) {
      const recentTransaction = pendingTransactions[0];
      const transactionAge = Date.now() - new Date(recentTransaction.created_at).getTime();
      
      if (transactionAge < 10 * 60 * 1000) { // 10 minutes
        console.log('⚠️ User has a recent pending transaction, returning existing order');
        
        return new Response(
          JSON.stringify({
            success: true,
            orderId: recentTransaction.id,
            gatewayOrderId: recentTransaction.gateway_order_id,
            amount: recentTransaction.amount,
            planType: recentTransaction.plan_type,
            message: 'Using existing pending transaction'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }
    }

    // Get UPI Gateway API key
    const upiGatewayKey = Deno.env.get('UPI_GATEWAY_API_KEY');
    if (!upiGatewayKey) {
      throw new Error('UPI Gateway API key not configured');
    }

    // Create order with UPI Gateway
    console.log('📡 Calling UPI Gateway API...');
    
    // Generate unique order ID
    const orderId = `ORDER_${Date.now()}_${user.id.substring(0, 8)}`;
    
    // Call UPI Gateway API to create payment
    // Note: This is a generic implementation. Adjust based on your actual UPI Gateway API
    const gatewayResponse = await fetch('https://api.upigateway.com/api/create_order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${upiGatewayKey}`,
      },
      body: JSON.stringify({
        order_id: orderId,
        amount: amount,
        currency: 'INR',
        customer_name: user.email?.split('@')[0] || 'Customer',
        customer_email: user.email,
        callback_url: `${supabaseUrl}/functions/v1/upi-gateway-webhook`,
        redirect_url: `${supabaseUrl.replace('https://', 'https://app.')}/upgrade`,
      }),
    });

    if (!gatewayResponse.ok) {
      const errorText = await gatewayResponse.text();
      console.error('❌ UPI Gateway API error:', errorText);
      throw new Error(`Gateway API failed: ${errorText}`);
    }

    const gatewayData = await gatewayResponse.json();
    console.log('✅ UPI Gateway response:', JSON.stringify(gatewayData));

    // Calculate subscription period for monthly plans
    const subscriptionStart = new Date();
    const subscriptionEnd = planType === 'monthly' 
      ? new Date(subscriptionStart.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days
      : null;

    // Create transaction record
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        amount: amount,
        status: 'pending',
        plan_type: planType,
        payment_method: 'upi',
        gateway_order_id: gatewayData.order_id || orderId,
        gateway_response: gatewayData,
        subscription_period_start: subscriptionStart.toISOString(),
        subscription_period_end: subscriptionEnd?.toISOString(),
        verification_status: 'pending_verification',
      })
      .select()
      .single();

    if (transactionError) {
      console.error('❌ Error creating transaction:', transactionError);
      throw new Error('Failed to create transaction record');
    }

    console.log('✅ Transaction created:', transaction.id);

    return new Response(
      JSON.stringify({
        success: true,
        orderId: transaction.id,
        gatewayOrderId: gatewayData.order_id || orderId,
        paymentLink: gatewayData.payment_url || gatewayData.upi_intent || null,
        amount: amount,
        planType: planType,
        message: 'Payment order created successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('❌ Error in create-upi-payment:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to create payment',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
