import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    console.log('🔐 Admin Payment Verification Request');

    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      throw new Error('Unauthorized');
    }

    // Check if user has admin role
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !userRole) {
      console.error('❌ User is not an admin');
      throw new Error('Unauthorized: Admin access required');
    }

    console.log('✅ Admin authenticated:', user.id);

    // Parse request body
    const { transactionId, action, rejectionReason } = await req.json();

    if (!transactionId || !action) {
      throw new Error('Missing required fields: transactionId, action');
    }

    if (!['approve', 'reject'].includes(action)) {
      throw new Error('Invalid action. Must be "approve" or "reject"');
    }

    console.log(`🔍 Processing ${action} for transaction:`, transactionId);

    // Get transaction details
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (txError || !transaction) {
      console.error('❌ Transaction not found:', txError);
      throw new Error('Transaction not found');
    }

    if (transaction.verification_status !== 'pending_verification') {
      throw new Error(`Transaction already ${transaction.verification_status}`);
    }

    console.log('📋 Transaction details:', {
      user_id: transaction.user_id,
      amount: transaction.amount,
      payment_method: transaction.payment_method,
    });

    if (action === 'approve') {
      // Approve the payment
      console.log('✅ Approving payment...');

      // Update transaction status
      const { error: updateTxError } = await supabase
        .from('transactions')
        .update({
          status: 'completed',
          verification_status: 'verified',
          verified_at: new Date().toISOString(),
          verified_by: user.id,
        })
        .eq('id', transactionId);

      if (updateTxError) {
        console.error('❌ Failed to update transaction:', updateTxError);
        throw new Error('Failed to update transaction');
      }

      // Determine plan type and grant appropriate access
      const planType = transaction.plan_type || 'lifetime';
      
      // Get user email for notification
      const { data: userProfile } = await supabase.auth.admin.getUserById(transaction.user_id);
      const userEmail = userProfile?.user?.email;
      
      if (planType === 'monthly') {
        // Grant monthly subscription (50 credits/month)
        const subscriptionEnd = new Date();
        subscriptionEnd.setDate(subscriptionEnd.getDate() + 30);
        
        const { error: updateProfileError } = await supabase
          .from('profiles')
          .update({
            subscription_type: 'monthly',
            subscription_expires_at: subscriptionEnd.toISOString(),
            monthly_credits: 50,
            monthly_credits_used: 0,
          })
          .eq('id', transaction.user_id);

        if (updateProfileError) {
          console.error('❌ Failed to grant monthly subscription:', updateProfileError);
          throw new Error('Failed to grant monthly subscription');
        }

        console.log('✅ Monthly subscription granted to user:', transaction.user_id);
      } else {
        // Grant lifetime Pro access
        const { error: updateProfileError } = await supabase
          .from('profiles')
          .update({
            is_pro: true,
            subscription_type: 'lifetime',
            credits_remaining: -1, // Unlimited credits for Pro users
          })
          .eq('id', transaction.user_id);

        if (updateProfileError) {
          console.error('❌ Failed to grant Pro access:', updateProfileError);
          throw new Error('Failed to grant Pro access');
        }

        console.log('✅ Lifetime Pro access granted to user:', transaction.user_id);
      }

      // Send email notification
      if (userEmail) {
        try {
          await supabase.functions.invoke('payment-verification-email', {
            body: {
              userEmail,
              planType,
              verified: true,
            },
          });
          console.log('✅ Verification email sent to:', userEmail);
        } catch (emailError) {
          console.error('⚠️ Failed to send email, but payment was verified:', emailError);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Payment verified and Pro access granted',
          transaction: { ...transaction, status: 'completed', verification_status: 'verified' },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } else {
      // Reject the payment
      console.log('❌ Rejecting payment...');

      // Update transaction status
      const { error: updateTxError } = await supabase
        .from('transactions')
        .update({
          status: 'failed',
          verification_status: 'rejected',
          verified_at: new Date().toISOString(),
          verified_by: user.id,
          payment_reference: rejectionReason || 'Payment verification failed',
        })
        .eq('id', transactionId);

      if (updateTxError) {
        console.error('❌ Failed to update transaction:', updateTxError);
        throw new Error('Failed to update transaction');
      }

      console.log('✅ Payment rejected for transaction:', transactionId);

      // Send rejection email
      const { data: userProfile } = await supabase.auth.admin.getUserById(transaction.user_id);
      const userEmail = userProfile?.user?.email;
      
      if (userEmail) {
        try {
          await supabase.functions.invoke('payment-verification-email', {
            body: {
              userEmail,
              planType: transaction.plan_type || 'lifetime',
              verified: false,
              rejectionReason,
            },
          });
          console.log('✅ Rejection email sent to:', userEmail);
        } catch (emailError) {
          console.error('⚠️ Failed to send email:', emailError);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Payment rejected',
          transaction: { ...transaction, status: 'failed', verification_status: 'rejected' },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }
  } catch (error) {
    console.error('❌ Error in admin payment verification:', error);
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
