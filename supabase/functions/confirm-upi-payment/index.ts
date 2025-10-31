import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PRO_SUBSCRIPTION_PRICE = 199; // ₹199 for Pro subscription

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔔 UPI Payment Confirmation Request');

    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      throw new Error('Unauthorized');
    }

    console.log('✅ User authenticated:', user.id);

    // Check if user already has a pending transaction
    const { data: existingTransaction } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .eq('verification_status', 'pending_verification')
      .single();

    if (existingTransaction) {
      console.log('⚠️ User already has a pending transaction');
      return new Response(
        JSON.stringify({
          success: false,
          message: 'You already have a pending payment verification. Please wait for admin approval.',
          transaction: existingTransaction,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Parse request body for optional payment reference
    const { paymentReference } = await req.json().catch(() => ({}));

    console.log('💳 Creating UPI transaction record');

    // Create transaction record
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        amount: PRO_SUBSCRIPTION_PRICE,
        status: 'pending',
        payment_method: 'upi',
        verification_status: 'pending_verification',
        payment_reference: paymentReference || null,
      })
      .select()
      .single();

    if (txError) {
      console.error('❌ Transaction creation failed:', txError);
      throw new Error('Failed to create transaction record');
    }

    console.log('✅ Transaction created:', transaction.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment confirmation received. Your payment is pending verification by our team.',
        transaction,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Error in UPI payment confirmation:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
