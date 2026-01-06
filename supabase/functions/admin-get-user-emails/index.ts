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
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Create client with user's auth token (for RLS-protected queries)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Validate the token explicitly (avoids relying on global headers for auth)
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      console.error('Auth failed:', userError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify admin role using RLS-protected query
    const { data: adminRole, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !adminRole) {
      console.log('Admin check failed for user:', user.id, roleError?.message);
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request for user IDs
    const { userIds } = await req.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return new Response(
        JSON.stringify({ userEmails: {} }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limit batch size to prevent abuse
    if (userIds.length > 50) {
      return new Response(
        JSON.stringify({ error: 'Maximum 50 user IDs per request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client with service role for admin operations
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch only specific users by ID - don't expose all users
    const userEmails: Record<string, string> = {};
    
    for (const userId of userIds) {
      try {
        const { data: userData, error: fetchError } = await adminClient.auth.admin.getUserById(userId);
        if (!fetchError && userData?.user?.email) {
          userEmails[userId] = userData.user.email;
        }
      } catch (err) {
        console.error(`Error fetching user ${userId}:`, err);
      }
    }

    console.log(`Admin ${user.id} fetched ${Object.keys(userEmails).length} user emails`);
    
    return new Response(
      JSON.stringify({ userEmails }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Admin get user emails error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});