import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Service role client for encrypted data operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { action, newEmail, email } = await req.json();

    // Handle recovery email update
    if (action === 'update_recovery_email') {
      const recoveryEmail = email;
      
      if (!recoveryEmail || !recoveryEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        throw new Error('Invalid email format');
      }

      // Encrypt and update recovery email
      const { data: encryptResult } = await supabaseAdmin.rpc('encrypt_sensitive_data', {
        data: recoveryEmail,
        user_id: user.id
      });

      await supabaseAdmin
        .from('profiles')
        .update({
          recovery_email_encrypted: encryptResult || null
        })
        .eq('id', user.id);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Recovery email updated successfully'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Handle primary email change
    if (!newEmail || !newEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      throw new Error('Invalid email format');
    }

    // Check rate limiting (max 1 email change per 24 hours)
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('last_email_change')
      .eq('id', user.id)
      .single();

    if (profile?.last_email_change) {
      const lastChange = new Date(profile.last_email_change);
      const hoursSinceLastChange = (Date.now() - lastChange.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastChange < 24) {
        throw new Error('You can only change your email once per 24 hours');
      }
    }

    // Update email in Supabase Auth
    const { error: updateError } = await supabaseClient.auth.updateUser({
      email: newEmail
    });

    if (updateError) {
      throw updateError;
    }

    // Update last_email_change timestamp
    await supabaseClient
      .from('profiles')
      .update({ last_email_change: new Date().toISOString() })
      .eq('id', user.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Verification email sent to new address. Please check your inbox.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('Error changing email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
