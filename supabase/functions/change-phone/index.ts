import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MSG91_API_KEY = Deno.env.get('MSG91_API_KEY');
const MSG91_TEMPLATE_ID = '66a2c56ad6fc0544d0755ef5';

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

    const { action, phoneNumber: rawPhoneNumber, otp } = await req.json();

    // Normalize phone number to E.164 format
    let phoneNumber = rawPhoneNumber?.replace(/\s+/g, '').replace(/-/g, '') || '';
    if (phoneNumber && !phoneNumber.startsWith('+')) {
      if (phoneNumber.length === 10) {
        phoneNumber = `+91${phoneNumber}`;
      } else if (!phoneNumber.startsWith('91') && phoneNumber.length === 12) {
        phoneNumber = `+${phoneNumber}`;
      }
    }

    if (action === 'send_otp') {
      // Validate phone number format (E.164)
      if (!phoneNumber || !phoneNumber.match(/^\+[1-9]\d{1,14}$/)) {
        throw new Error('Invalid phone number format. Use E.164 format (e.g., +919876543210)');
      }

      // Check rate limiting
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('last_phone_change')
        .eq('id', user.id)
        .single();

      if (profile?.last_phone_change) {
        const lastChange = new Date(profile.last_phone_change);
        const hoursSinceLastChange = (Date.now() - lastChange.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceLastChange < 24) {
          throw new Error('You can only change your phone number once per 24 hours');
        }
      }

      // Generate OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Save OTP to database
      await supabaseClient
        .from('phone_verification_codes')
        .insert({
          user_id: user.id,
          phone_number: phoneNumber,
          code: otpCode,
          expires_at: expiresAt.toISOString(),
          purpose: 'phone_change'
        });

      // Send OTP via MSG91
      if (MSG91_API_KEY) {
        const msg91Url = `https://control.msg91.com/api/v5/otp?template_id=${MSG91_TEMPLATE_ID}&mobile=${phoneNumber.replace(/\+/g, '')}&authkey=${MSG91_API_KEY}&otp=${otpCode}`;
        
        try {
          const response = await fetch(msg91Url, { method: 'POST' });
          const data = await response.json();
          
          if (!response.ok) {
            console.error('MSG91 Error:', data);
            throw new Error('Failed to send OTP');
          }
        } catch (error) {
          console.error('Error sending OTP:', error);
          throw new Error('Failed to send OTP. Please try again.');
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: 'OTP sent to your phone number' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );

    } else if (action === 'verify_otp') {
      // Verify OTP
      const { data: codes, error: fetchError } = await supabaseClient
        .from('phone_verification_codes')
        .select('*')
        .eq('user_id', user.id)
        .eq('code', otp)
        .eq('verified', false)
        .order('created_at', { ascending: false })
        .limit(1);

      if (fetchError || !codes || codes.length === 0) {
        console.error('OTP fetch error:', fetchError);
        throw new Error('Invalid OTP code. Please check and try again.');
      }

      const verificationCode = codes[0];

      // Check if OTP expired
      if (new Date(verificationCode.expires_at) < new Date()) {
        throw new Error('OTP has expired. Please request a new code.');
      }

      // Check if phone number matches
      const normalizedStoredPhone = verificationCode.phone_number.replace(/\s+/g, '').replace(/-/g, '');
      const normalizedInputPhone = phoneNumber.replace(/\s+/g, '').replace(/-/g, '');
      
      if (normalizedStoredPhone !== normalizedInputPhone) {
        throw new Error('Phone number does not match OTP. Please try again.');
      }

      // Mark OTP as verified
      await supabaseClient
        .from('phone_verification_codes')
        .update({ verified: true })
        .eq('id', verificationCode.id);

      // Use service role to update encrypted phone number
      // Call the encrypt function and update the encrypted column
      const { data: encryptResult } = await supabaseAdmin.rpc('encrypt_sensitive_data', {
        data: phoneNumber,
        user_id: user.id
      });

      await supabaseAdmin
        .from('profiles')
        .update({
          phone_number_encrypted: encryptResult || null,
          phone_verified: true,
          phone_verified_at: new Date().toISOString(),
          last_phone_change: new Date().toISOString()
        })
        .eq('id', user.id);

      return new Response(
        JSON.stringify({ success: true, message: 'Phone number updated successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );

    } else if (action === 'update_directly') {
      // Direct update (used by AuthContext.linkPhoneNumber)
      if (!phoneNumber || !phoneNumber.match(/^\+[1-9]\d{1,14}$/)) {
        throw new Error('Invalid phone number format');
      }

      // Check rate limiting
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('last_phone_change')
        .eq('id', user.id)
        .single();

      if (profile?.last_phone_change) {
        const lastChange = new Date(profile.last_phone_change);
        const hoursSinceLastChange = (Date.now() - lastChange.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceLastChange < 24) {
          throw new Error('You can only change your phone number once per 24 hours');
        }
      }

      // Encrypt and update
      const { data: encryptResult } = await supabaseAdmin.rpc('encrypt_sensitive_data', {
        data: phoneNumber,
        user_id: user.id
      });

      await supabaseAdmin
        .from('profiles')
        .update({
          phone_number_encrypted: encryptResult || null,
          last_phone_change: new Date().toISOString()
        })
        .eq('id', user.id);

      return new Response(
        JSON.stringify({ success: true, message: 'Phone number linked successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );

    } else {
      throw new Error('Invalid action');
    }

  } catch (error: any) {
    console.error('Error changing phone:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
