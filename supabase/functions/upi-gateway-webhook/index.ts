import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature, x-webhook-timestamp',
};

// Allowed IP ranges for payment gateway (configure based on your payment provider)
// Set these in environment variables for production
const ALLOWED_IPS = Deno.env.get('UPI_GATEWAY_ALLOWED_IPS')?.split(',') || [];

// Verify HMAC signature from webhook
async function verifySignature(payload: string, signature: string | null, timestamp: string | null): Promise<boolean> {
  const webhookSecret = Deno.env.get('UPI_GATEWAY_WEBHOOK_SECRET');
  
  // If no secret configured, require manual verification
  if (!webhookSecret) {
    console.warn('⚠️ UPI_GATEWAY_WEBHOOK_SECRET not configured - webhook will require manual verification');
    return false;
  }

  if (!signature || !timestamp) {
    console.error('❌ Missing signature or timestamp headers');
    return false;
  }

  // Check timestamp to prevent replay attacks (allow 5 minute window)
  const webhookTime = parseInt(timestamp, 10);
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - webhookTime) > 300) {
    console.error('❌ Webhook timestamp too old - possible replay attack');
    return false;
  }

  try {
    // Compute expected signature using Web Crypto API
    const encoder = new TextEncoder();
    const key = encoder.encode(webhookSecret);
    const message = encoder.encode(`${timestamp}.${payload}`);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    
    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, message);
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Constant-time comparison to prevent timing attacks
    if (signature.length !== expectedSignature.length) return false;
    let result = 0;
    for (let i = 0; i < signature.length; i++) {
      result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
    }
    return result === 0;
  } catch (error) {
    console.error('❌ Signature verification error:', error);
    return false;
  }
}

// Check if request IP is in allowlist
function isAllowedIP(req: Request): boolean {
  // If no IPs configured, skip IP check (rely on signature verification)
  if (ALLOWED_IPS.length === 0) return true;
  
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  const clientIP = forwardedFor?.split(',')[0]?.trim() || realIP || 'unknown';
  
  const isAllowed = ALLOWED_IPS.includes(clientIP);
  if (!isAllowed) {
    console.warn(`⚠️ Webhook request from non-whitelisted IP: ${clientIP}`);
  }
  return isAllowed;
}

// Log webhook attempt for audit trail
async function logWebhookAttempt(
  supabase: any,
  orderId: string | null,
  success: boolean,
  reason: string,
  payload: any,
  clientIP: string
) {
  try {
    await supabase.from('admin_notifications').insert({
      notification_type: 'webhook_audit',
      title: success ? 'Webhook Processed' : 'Webhook Rejected',
      message: `Order: ${orderId || 'unknown'} - ${reason}`,
      metadata: {
        order_id: orderId,
        success,
        reason,
        client_ip: clientIP,
        timestamp: new Date().toISOString(),
        // Sanitize payload to avoid storing sensitive data
        payload_keys: payload ? Object.keys(payload) : [],
      },
    });
  } catch (error) {
    console.error('Failed to log webhook attempt:', error);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize Supabase client early for logging
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get client IP for logging
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  const clientIP = forwardedFor?.split(',')[0]?.trim() || realIP || 'unknown';

  try {
    console.log('🔔 UPI Gateway Webhook Received');

    // Security Check 1: IP Whitelist
    if (!isAllowedIP(req)) {
      await logWebhookAttempt(supabase, null, false, 'IP not in allowlist', null, clientIP);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Read raw payload for signature verification
    const rawPayload = await req.text();
    const signature = req.headers.get('x-webhook-signature');
    const timestamp = req.headers.get('x-webhook-timestamp');

    // Security Check 2: Signature Verification
    const webhookSecretConfigured = !!Deno.env.get('UPI_GATEWAY_WEBHOOK_SECRET');
    let signatureValid = false;
    
    if (webhookSecretConfigured) {
      signatureValid = await verifySignature(rawPayload, signature, timestamp);
      if (!signatureValid) {
        console.error('❌ Invalid webhook signature');
        await logWebhookAttempt(supabase, null, false, 'Invalid signature', null, clientIP);
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        );
      }
      console.log('✅ Webhook signature verified');
    } else {
      console.warn('⚠️ Webhook secret not configured - using manual verification mode');
    }

    // Parse webhook payload
    const payload = JSON.parse(rawPayload);
    console.log('📦 Webhook payload received for order:', payload.order_id || payload.orderId);

    // Extract order ID and payment status
    const orderId = payload.order_id || payload.orderId;
    const paymentStatus = payload.status || payload.payment_status;
    const paymentId = payload.payment_id || payload.transaction_id;

    if (!orderId) {
      console.error('❌ No order ID in webhook payload');
      await logWebhookAttempt(supabase, null, false, 'Missing order_id', payload, clientIP);
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
      await logWebhookAttempt(supabase, orderId, false, 'Transaction not found', payload, clientIP);
      throw new Error('Transaction not found');
    }

    // Security Check 3: Idempotency - Check if already processed
    if (transaction.status === 'completed') {
      console.log('ℹ️ Transaction already completed - ignoring duplicate webhook');
      await logWebhookAttempt(supabase, orderId, true, 'Duplicate webhook - already processed', payload, clientIP);
      return new Response(
        JSON.stringify({ success: true, message: 'Transaction already processed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
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
            gateway_response: { status: paymentStatus, processed_at: new Date().toISOString() },
          })
          .eq('id', transaction.id);
        
        await logWebhookAttempt(supabase, orderId, true, `Payment ${paymentStatus}`, payload, clientIP);
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Webhook received, payment not successful' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log('💰 Payment successful! Processing...');

    // Determine if this should be auto-verified or require manual review
    // If signature was verified, auto-verify. Otherwise, flag for manual review.
    const shouldAutoVerify = signatureValid;
    const verificationStatus = shouldAutoVerify ? 'auto_verified' : 'pending_manual_review';

    // Update transaction to completed (or pending review)
    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        status: shouldAutoVerify ? 'completed' : 'pending_verification',
        payment_id: paymentId,
        gateway_payment_id: paymentId ? `****${paymentId.slice(-4)}` : null, // Mask payment ID
        gateway_response: { 
          status: 'success', 
          processed_at: new Date().toISOString(),
          verification_method: shouldAutoVerify ? 'signature' : 'manual_required'
        },
        auto_verified: shouldAutoVerify,
        verification_status: verificationStatus,
        verified_at: shouldAutoVerify ? new Date().toISOString() : null,
      })
      .eq('id', transaction.id);

    if (updateError) {
      console.error('❌ Error updating transaction:', updateError);
      await logWebhookAttempt(supabase, orderId, false, 'Failed to update transaction', payload, clientIP);
      throw new Error('Failed to update transaction');
    }

    // Only activate subscription if signature was verified
    if (shouldAutoVerify) {
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
        await logWebhookAttempt(supabase, orderId, false, 'Failed to update profile', payload, clientIP);
        throw new Error('Failed to activate subscription');
      }

      await logWebhookAttempt(supabase, orderId, true, 'Payment verified and subscription activated', payload, clientIP);
      console.log('✅ Subscription activated for user:', transaction.user_id);
    } else {
      // Notify admin for manual review
      await supabase.from('admin_notifications').insert({
        notification_type: 'payment_review',
        title: 'Payment Requires Manual Verification',
        message: `Order ${orderId} payment received but webhook signature could not be verified. Please manually verify this payment.`,
        metadata: {
          transaction_id: transaction.id,
          order_id: orderId,
          user_id: transaction.user_id,
          amount: transaction.amount,
          plan_type: transaction.plan_type,
        },
      });

      await logWebhookAttempt(supabase, orderId, true, 'Payment pending manual review', payload, clientIP);
      console.log('⚠️ Payment flagged for manual review - no signature verification');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: shouldAutoVerify ? 'Payment verified and subscription activated' : 'Payment pending manual verification'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('💥 Webhook processing error:', error);
    
    // Always return 200 to acknowledge receipt (prevent retries that could cause issues)
    // But log the error for investigation
    return new Response(
      JSON.stringify({ success: false, error: 'Processing error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});
