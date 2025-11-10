import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;
    const adminEmail = Deno.env.get('ADMIN_EMAIL') || 'admin@magverse.ai';

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { type, data } = await req.json();

    let subject = '';
    let html = '';

    if (type === 'new_signup') {
      subject = `🎉 New User Signup - ${data.email}`;
      html = `
        <h2>New User Registration</h2>
        <p>A new user has signed up for Magverse AI:</p>
        <ul>
          <li><strong>Email:</strong> ${data.email}</li>
          <li><strong>Username:</strong> ${data.username || 'Not set'}</li>
          <li><strong>Display Name:</strong> ${data.display_name || 'Not set'}</li>
          <li><strong>Timestamp:</strong> ${new Date().toLocaleString()}</li>
        </ul>
      `;
    } else if (type === 'dau_threshold') {
      subject = `📊 Daily Active Users Alert - ${data.count} users`;
      html = `
        <h2>DAU Threshold Reached</h2>
        <p>Daily active users have reached ${data.count}!</p>
        <ul>
          <li><strong>Threshold:</strong> ${data.threshold}</li>
          <li><strong>Current DAU:</strong> ${data.count}</li>
          <li><strong>Date:</strong> ${new Date().toLocaleDateString()}</li>
        </ul>
      `;
    }

    // Send email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Magverse AI <notifications@magverse.ai>',
        to: [adminEmail],
        subject,
        html,
      }),
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.text();
      throw new Error(`Failed to send email: ${error}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error sending admin notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
