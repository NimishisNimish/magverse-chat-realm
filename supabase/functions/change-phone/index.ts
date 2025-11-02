import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MSG91_API_KEY = Deno.env.get('MSG91_API_KEY');
const MSG91_SENDER_ID = 'TXTIND';
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

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { action, phoneNumber, otp } = await req.json();

    if (action === 'send_otp') {
      // Validate phone number format
      if (!phoneNumber || !phoneNumber.match(/^\+?[1-9]\d{9,14}$/)) {
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
        JSON.stringify({
          success: true,
          message: 'OTP sent to your phone number'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );

    } else if (action === 'verify_otp') {
      // Verify OTP
      const { data: codes, error: fetchError } = await supabaseClient
        .from('phone_verification_codes')
        .select('*')
        .eq('user_id', user.id)
        .eq('phone_number', phoneNumber)
        .eq('code', otp)
        .eq('purpose', 'phone_change')
        .eq('verified', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (fetchError || !codes || codes.length === 0) {
        throw new Error('Invalid or expired OTP');
      }

      // Mark OTP as verified
      await supabaseClient
        .from('phone_verification_codes')
        .update({ verified: true })
        .eq('id', codes[0].id);

      // Update phone number in profile
      await supabaseClient
        .from('profiles')
        .update({
          phone_number: phoneNumber,
          phone_verified: true,
          phone_verified_at: new Date().toISOString(),
          last_phone_change: new Date().toISOString()
        })
        .eq('id', user.id);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Phone number updated successfully'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    } else {
      throw new Error('Invalid action');
    }

  } catch (error: any) {
    console.error('Error changing phone:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
