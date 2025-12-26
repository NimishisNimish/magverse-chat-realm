import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CREDIT_PACKAGES: Record<string, number> = {
  credits_50: 50,
  credits_200: 200,
  credits_500: 500,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transactionId, action, adminId } = await req.json();

    if (!transactionId || !action || !adminId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action !== 'approve' && action !== 'reject') {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authenticate admin
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify admin role
    const { data: adminRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', adminId)
      .eq('role', 'admin')
      .single();

    if (roleError || !adminRole) {
      console.error('Admin verification failed:', roleError);
      return new Response(
        JSON.stringify({ success: false, error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the transaction
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (txError || !transaction) {
      return new Response(
        JSON.stringify({ success: false, error: 'Transaction not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already processed
    if (transaction.verification_status !== 'pending_verification' && transaction.status !== 'pending') {
      return new Response(
        JSON.stringify({ success: false, error: 'Transaction already processed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate plan type is a credit package
    if (!transaction.plan_type?.startsWith('credits_')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Not a credit purchase transaction' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const creditsToAdd = CREDIT_PACKAGES[transaction.plan_type] || 0;

    if (action === 'approve') {
      if (creditsToAdd === 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid credit package' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get current user credits
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('credits_remaining')
        .eq('id', transaction.user_id)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        return new Response(
          JSON.stringify({ success: false, error: 'User profile not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const currentCredits = profile?.credits_remaining || 0;
      const newCredits = currentCredits + creditsToAdd;

      // Atomically update credits and transaction status
      const { error: updateProfileError } = await supabase
        .from('profiles')
        .update({ credits_remaining: newCredits })
        .eq('id', transaction.user_id);

      if (updateProfileError) {
        console.error('Profile update error:', updateProfileError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to update credits' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: updateTxError } = await supabase
        .from('transactions')
        .update({
          status: 'completed',
          verification_status: 'verified',
          verified_at: new Date().toISOString(),
          verified_by: adminId,
        })
        .eq('id', transactionId);

      if (updateTxError) {
        console.error('Transaction update error:', updateTxError);
        // Rollback credits
        await supabase
          .from('profiles')
          .update({ credits_remaining: currentCredits })
          .eq('id', transaction.user_id);

        return new Response(
          JSON.stringify({ success: false, error: 'Failed to update transaction' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log admin action
      await supabase.from('admin_activity_logs').insert({
        admin_id: adminId,
        activity_type: 'credit_purchase_approved',
        page_path: '/admin',
        metadata: {
          transaction_id: transactionId,
          user_id: transaction.user_id,
          credits_added: creditsToAdd,
          new_balance: newCredits,
        },
      });

      console.log(`✅ Approved ${creditsToAdd} credits for user ${transaction.user_id}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Added ${creditsToAdd} credits. New balance: ${newCredits}`,
          creditsAdded: creditsToAdd,
          newBalance: newCredits,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      // Reject
      const { error: updateTxError } = await supabase
        .from('transactions')
        .update({
          status: 'failed',
          verification_status: 'rejected',
          verified_at: new Date().toISOString(),
          verified_by: adminId,
        })
        .eq('id', transactionId);

      if (updateTxError) {
        console.error('Transaction update error:', updateTxError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to update transaction' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log admin action
      await supabase.from('admin_activity_logs').insert({
        admin_id: adminId,
        activity_type: 'credit_purchase_rejected',
        page_path: '/admin',
        metadata: {
          transaction_id: transactionId,
          user_id: transaction.user_id,
          plan_type: transaction.plan_type,
        },
      });

      console.log(`❌ Rejected credit purchase for user ${transaction.user_id}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Credit purchase rejected',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error('Error in admin-approve-credits:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
