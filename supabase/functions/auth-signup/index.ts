import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SignupRequest {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Initialize Supabase client with service role for user creation
    const supabaseServiceRole = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Initialize regular client for querying
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Parse and validate request body
    const body: SignupRequest = await req.json();
    const { fullName, email, password, confirmPassword, phoneNumber } = body;

    // Input validation
    if (!fullName?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Full name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Valid email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!password || password.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 8 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (password !== confirmPassword) {
      return new Response(
        JSON.stringify({ error: 'Passwords do not match' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize inputs
    const trimmedFullName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    
    // Format phone number if provided
    let formattedPhone = phoneNumber?.trim();
    if (formattedPhone && formattedPhone.startsWith("09")) {
      formattedPhone = "+63" + formattedPhone.substring(1);
    }

    // Check if email already exists in Auth
    const { data: existingUser } = await supabaseServiceRole.auth.admin.getUserByEmail(trimmedEmail);
    if (existingUser.user) {
      return new Response(
        JSON.stringify({ error: 'Email already registered' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if email already exists in bidders table (case-insensitive)
    const { data: existingBidder, error: checkError } = await supabase
      .from('bidders')
      .select('id')
      .ilike('email', trimmedEmail)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found, which is what we want
      console.error('Error checking existing bidder:', checkError);
      return new Response(
        JSON.stringify({ error: 'Database error occurred' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingBidder) {
      return new Response(
        JSON.stringify({ error: 'Email already registered' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseServiceRole.auth.admin.createUser({
      email: trimmedEmail,
      password: password,
      email_confirm: true, // Auto-confirm email for bidders
      user_metadata: {
        full_name: trimmedFullName,
        phone_number: formattedPhone
      }
    });

    if (authError) {
      console.error('Auth error:', authError);
      
      // Handle specific Auth errors
      if (authError.message.includes('already registered')) {
        return new Response(
          JSON.stringify({ error: 'Email already registered' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to create account' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ error: 'Failed to create user account' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create bidder profile (using service role to bypass RLS)
    const { error: profileError } = await supabaseServiceRole
      .from('bidders')
      .insert([
        {
          id: authData.user.id,
          full_name: trimmedFullName,
          email: trimmedEmail,
          phone_number: formattedPhone,
          role: 'bidder', // Always set to bidder - enforced by DB constraint
          loyalty_points: 0
        }
      ]);

    if (profileError) {
      console.error('Profile creation error:', profileError);
      
      // If profile creation fails, we should clean up the auth user
      await supabaseServiceRole.auth.admin.deleteUser(authData.user.id);
      
      return new Response(
        JSON.stringify({ error: 'Failed to create bidder profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully created bidder account for: ${trimmedEmail}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Account created successfully! Please log in.',
        email: trimmedEmail 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Signup error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});