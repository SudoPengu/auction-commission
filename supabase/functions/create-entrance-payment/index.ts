
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('=== CREATE ENTRANCE PAYMENT FUNCTION START ===');
  console.log('Method:', req.method);
  console.log('Headers:', Object.fromEntries(req.headers.entries()));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      throw new Error('Server configuration error');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Validate and get user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      throw new Error('Authorization header required');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      console.error('User authentication failed:', userError);
      throw new Error('Unauthorized');
    }

    console.log('Authenticated user:', user.id);

    // Parse and validate request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      throw new Error('Invalid request body');
    }

    const { auction_id } = requestBody;
    
    if (!auction_id) {
      console.error('Missing auction_id in request body');
      throw new Error('auction_id is required');
    }

    // Validate auction_id is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(auction_id)) {
      console.error('Invalid auction_id format:', auction_id);
      throw new Error('auction_id must be a valid UUID');
    }

    console.log('Creating entrance payment for auction:', auction_id, 'user:', user.id);

    // Check if user already has a paid entrance for this auction
    const { data: existingEntrance, error: checkError } = await supabaseClient
      .from('auction_entrance_fees')
      .select('*')
      .eq('auction_id', auction_id)
      .eq('bidder_id', user.id)
      .eq('payment_status', 'paid')
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing entrance:', checkError);
      throw new Error('Database error');
    }

    if (existingEntrance) {
      return new Response(JSON.stringify({ 
        error: 'Already have paid access to this auction',
        has_access: true 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get auction details
    const { data: auction, error: auctionError } = await supabaseClient
      .from('auction_events')
      .select('title, end_date')
      .eq('id', auction_id)
      .single();

    if (auctionError || !auction) {
      console.error('Error fetching auction:', auctionError);
      throw new Error('Auction not found');
    }

    // Get PayMongo secret key
    const paymongoSecretKey = Deno.env.get('SECRET_KEY');
    if (!paymongoSecretKey) {
      console.error('PayMongo SECRET_KEY environment variable not found');
      throw new Error('Payment provider not configured');
    }

    console.log('PayMongo secret key found, creating payment intent...');

    const paymentIntentData = {
      amount: 300000, // 3000 PHP in centavos
      currency: 'PHP',
      description: `Auction Entrance Fee - ${auction.title}`,
      statement_descriptor: 'Auction Access',
      payment_method_options: {
        card: { request_three_d_secure: 'automatic' },
        gcash: {},
        paymaya: {},
        grab_pay: {}
      },
      payment_method_types: ['card', 'gcash', 'paymaya', 'grab_pay'],
      metadata: {
        auction_id: auction_id,
        user_id: user.id,
        type: 'auction_entrance'
      }
    };

    console.log('Sending request to PayMongo API...');
    console.log('PayMongo request data:', JSON.stringify(paymentIntentData, null, 2));

    const paymongoResponse = await fetch('https://api.paymongo.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(paymongoSecretKey + ':')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: { attributes: paymentIntentData } }),
    });

    console.log('PayMongo response status:', paymongoResponse.status);

    if (!paymongoResponse.ok) {
      const errorData = await paymongoResponse.text();
      console.error('PayMongo API error response:', errorData);
      console.error('PayMongo response status:', paymongoResponse.status);
      throw new Error(`Payment provider error: ${paymongoResponse.status} - ${errorData}`);
    }

    const paymentIntent = await paymongoResponse.json();
    console.log('Successfully created PayMongo payment intent:', paymentIntent.data.id);
    console.log('Payment intent details:', JSON.stringify(paymentIntent.data, null, 2));

    // Store the entrance fee record
    const { data: entranceRecord, error: insertError } = await supabaseClient
      .from('auction_entrance_fees')
      .insert({
        auction_id: auction_id,
        bidder_id: user.id,
        fee_amount: 3000,
        currency: 'PHP',
        provider: 'paymongo',
        provider_payment_id: paymentIntent.data.id,
        payment_status: 'pending',
        checkout_url: paymentIntent.data.attributes.next_action?.redirect?.url,
        access_expires_at: auction.end_date
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error storing entrance record:', insertError);
      throw new Error('Failed to create entrance record');
    }

    const responseData = {
      payment_intent_id: paymentIntent.data.id,
      checkout_url: paymentIntent.data.attributes.next_action?.redirect?.url,
      client_key: paymentIntent.data.attributes.client_key,
      entrance_record_id: entranceRecord.id
    };

    console.log('Successfully created entrance payment record:', entranceRecord.id);
    console.log('Returning response data:', JSON.stringify(responseData, null, 2));
    console.log('=== CREATE ENTRANCE PAYMENT FUNCTION END (SUCCESS) ===');

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('=== CREATE ENTRANCE PAYMENT FUNCTION ERROR ===');
    console.error('Error details:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('=== CREATE ENTRANCE PAYMENT FUNCTION END (ERROR) ===');
    
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error',
      details: error.toString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
