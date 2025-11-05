import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';
import { createHmac } from "https://deno.land/std@0.160.0/node/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ERROR_MESSAGES = {
  AUTH_REQUIRED: 'Authentication required',
  INVALID_REQUEST: 'Invalid request',
  INVALID_SIGNATURE: 'Invalid payment signature',
  SERVER_ERROR: 'An error occurred processing your request',
};

const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();
    
    console.log('Verifying Razorpay payment:', { razorpay_order_id, razorpay_payment_id });

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return new Response(
        JSON.stringify({ error: ERROR_MESSAGES.INVALID_REQUEST }),
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

    // Verify Razorpay signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = createHmac("sha256", razorpayKeySecret)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      console.error('Invalid Razorpay signature');
      return new Response(
        JSON.stringify({ error: ERROR_MESSAGES.INVALID_SIGNATURE }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Razorpay signature verified successfully');

    // Get transaction
    const { data: transaction, error: txFetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('gateway_order_id', razorpay_order_id)
      .eq('user_id', user.id)
      .single();

    if (txFetchError || !transaction) {
      console.error('Transaction not found:', txFetchError);
      return new Response(
        JSON.stringify({ error: 'Transaction not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update transaction status
    const { error: updateTxError } = await supabase
      .from('transactions')
      .update({
        gateway_payment_id: razorpay_payment_id,
        status: 'completed',
        verification_status: 'verified',
        verified_at: new Date().toISOString(),
        auto_verified: true,
      })
      .eq('id', transaction.id);

    if (updateTxError) {
      console.error('Error updating transaction:', updateTxError);
      throw new Error('Failed to update transaction');
    }

    console.log('Transaction updated successfully');

    // Grant subscription access based on plan type
    const planType = transaction.plan_type || 'lifetime';
    
    if (planType === 'monthly') {
      // Grant yearly subscription (50 credits/month equivalent)
      const subscriptionEnd = new Date();
      subscriptionEnd.setFullYear(subscriptionEnd.getFullYear() + 1); // 1 year
      
      const { error: updateProfileError } = await supabase
        .from('profiles')
        .update({
          subscription_type: 'monthly',
          subscription_expires_at: subscriptionEnd.toISOString(),
          monthly_credits: 999999,
          monthly_credits_used: 0,
          is_pro: true,
        })
        .eq('id', user.id);

      if (updateProfileError) {
        console.error('Error granting yearly subscription:', updateProfileError);
        throw new Error('Failed to grant subscription');
      }

      console.log('Yearly subscription granted to user:', user.id);
    } else {
      // Grant lifetime Pro access
      const { error: updateProfileError } = await supabase
        .from('profiles')
        .update({
          is_pro: true,
          subscription_type: 'lifetime',
          credits_remaining: 999999,
        })
        .eq('id', user.id);

      if (updateProfileError) {
        console.error('Error granting lifetime access:', updateProfileError);
        throw new Error('Failed to grant lifetime access');
      }

      console.log('Lifetime Pro access granted to user:', user.id);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Payment verified and subscription activated',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error verifying Razorpay payment:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || ERROR_MESSAGES.SERVER_ERROR 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});