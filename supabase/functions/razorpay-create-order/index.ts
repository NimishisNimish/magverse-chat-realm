import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ERROR_MESSAGES = {
  AUTH_REQUIRED: 'Authentication required',
  SERVER_ERROR: 'An error occurred processing your request',
  INVALID_PLAN: 'Invalid plan type',
};

// Hardcoded prices - never trust client input for payment amounts
const PLAN_PRICES = {
  monthly: 299, // Yearly Pro Plan
  lifetime: 799, // Lifetime Pro Plan
};

const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { planType } = await req.json();
    
    if (!planType || !PLAN_PRICES[planType as keyof typeof PLAN_PRICES]) {
      return new Response(
        JSON.stringify({ error: ERROR_MESSAGES.INVALID_PLAN }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: ERROR_MESSAGES.AUTH_REQUIRED }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Authentication error:', userError);
      return new Response(
        JSON.stringify({ error: ERROR_MESSAGES.AUTH_REQUIRED }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const amount = PLAN_PRICES[planType as keyof typeof PLAN_PRICES];
    
    console.log('Creating Razorpay order:', { user: user.id, planType, amount });

    // Create Razorpay order
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`,
      },
      body: JSON.stringify({
        amount: amount * 100, // Convert to paise
        currency: 'INR',
        receipt: `order_${Date.now()}`,
        notes: {
          user_id: user.id,
          plan_type: planType,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Razorpay API error:', errorData);
      throw new Error('Failed to create Razorpay order');
    }

    const order = await response.json();

    console.log('Razorpay order created:', order.id);

    // Save transaction as pending
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        amount: amount,
        order_id: order.id,
        gateway_order_id: order.id,
        status: 'pending',
        verification_status: 'pending_verification',
        plan_type: planType,
        payment_method: 'razorpay',
      })
      .select()
      .single();

    if (txError) {
      console.error('Error creating transaction:', txError);
      throw new Error('Failed to create transaction record');
    }

    console.log('Transaction created:', transaction.id);

    return new Response(
      JSON.stringify({
        success: true,
        orderId: order.id,
        amount: amount,
        currency: 'INR',
        keyId: razorpayKeyId,
        transactionId: transaction.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error creating Razorpay order:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || ERROR_MESSAGES.SERVER_ERROR 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});