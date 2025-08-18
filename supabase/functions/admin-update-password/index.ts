
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.29.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestData {
  userId: string;
  newPassword: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create user-scoped client to validate the caller's permissions
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      }
    );

    // Verify the caller has admin privileges
    const { data: callerData, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !callerData.user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if caller has admin role
    const { data: hasAdminRole, error: roleError } = await supabaseUser.rpc('has_any_role', {
      required_roles: ['admin', 'super-admin']
    });

    if (roleError || !hasAdminRole) {
      console.error("Authorization check failed:", roleError);
      return new Response(
        JSON.stringify({ error: "Insufficient privileges. Admin role required." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get caller's role for privilege escalation check
    const { data: callerRole, error: callerRoleError } = await supabaseUser.rpc('get_current_user_role');
    if (callerRoleError) {
      console.error("Failed to get caller role:", callerRoleError);
      return new Response(
        JSON.stringify({ error: "Failed to verify caller permissions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create service role client for actual password update
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the request data
    const { userId, newPassword }: RequestData = await req.json();

    // Verify required data
    if (!userId || !newPassword) {
      return new Response(
        JSON.stringify({ error: "User ID and new password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify password length
    if (newPassword.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get target user's role to prevent privilege escalation
    const { data: targetUserProfile, error: targetUserError } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (targetUserError) {
      console.error("Failed to get target user profile:", targetUserError);
      return new Response(
        JSON.stringify({ error: "Target user not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Privilege escalation protection: only super-admins can reset super-admin passwords
    if (targetUserProfile.role === 'super-admin' && callerRole !== 'super-admin') {
      return new Response(
        JSON.stringify({ error: "Only super-admins can reset super-admin passwords" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Regular admins cannot reset other admin passwords
    if (targetUserProfile.role === 'admin' && callerRole === 'admin') {
      return new Response(
        JSON.stringify({ error: "Admins cannot reset other admin passwords" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update the user's password
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (error) {
      console.error("Error updating password:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log activity with improved details
    try {
      await supabaseAdmin.rpc('log_activity', {
        action: 'admin_password_reset',
        resource: 'auth',
        details: { 
          target_user_id: userId,
          actor_id: callerData.user.id,
          actor_role: callerRole,
          target_role: targetUserProfile.role
        },
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
      });
    } catch (err) {
      // Don't block the response if activity logging fails
      console.error("Error logging activity:", err);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
