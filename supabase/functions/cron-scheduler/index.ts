import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { task } = await req.json();
    
    console.log(`🕐 Cron task triggered: ${task}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (task === 'welcome_emails') {
      // Call email-campaigns function for welcome emails
      const { data, error } = await supabase.functions.invoke('email-campaigns', {
        body: { campaignType: 'welcome' }
      });
      
      if (error) throw error;
      console.log(`✅ Welcome emails processed:`, data);
      
      return new Response(
        JSON.stringify({ success: true, task: 'welcome_emails', result: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } 
    
    else if (task === 're_engagement_emails') {
      // Call email-campaigns function for re-engagement emails
      const { data, error } = await supabase.functions.invoke('email-campaigns', {
        body: { campaignType: 're_engagement' }
      });
      
      if (error) throw error;
      console.log(`✅ Re-engagement emails processed:`, data);
      
      return new Response(
        JSON.stringify({ success: true, task: 're_engagement_emails', result: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } 
    
    else if (task === 'upsell_emails') {
      // Call email-campaigns function for upsell emails
      const { data, error } = await supabase.functions.invoke('email-campaigns', {
        body: { campaignType: 'upsell' }
      });
      
      if (error) throw error;
      console.log(`✅ Upsell emails processed:`, data);
      
      return new Response(
        JSON.stringify({ success: true, task: 'upsell_emails', result: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } 
    
    else if (task === 'update_segments') {
      // Update user segments for all users
      const { error } = await supabase.rpc('update_all_user_segments');
      
      if (error) throw error;
      console.log(`✅ User segments updated`);
      
      return new Response(
        JSON.stringify({ success: true, task: 'update_segments' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    else {
      throw new Error(`Unknown task: ${task}`);
    }

  } catch (error: any) {
    console.error('Cron scheduler error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});