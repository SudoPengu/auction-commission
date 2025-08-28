
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    const { auction_id } = await req.json();
    console.log('Creating entrance payment for auction:', auction_id);

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

    // Create PayMongo Payment Intent
    const paymongoSecretKey = Deno.env.get('SECRET_KEY');
    if (!paymongoSecretKey) {
      throw new Error('PayMongo secret key not configured');
    }

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

    const paymongoResponse = await fetch('https://api.paymongo.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(paymongoSecretKey + ':')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: { attributes: paymentIntentData } }),
    });

    if (!paymongoResponse.ok) {
      const errorData = await paymongoResponse.text();
      console.error('PayMongo API error:', errorData);
      throw new Error('Payment provider error');
    }

    const paymentIntent = await paymongoResponse.json();
    console.log('Created PayMongo payment intent:', paymentIntent.data.id);

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

    return new Response(JSON.stringify({
      payment_intent_id: paymentIntent.data.id,
      checkout_url: paymentIntent.data.attributes.next_action?.redirect?.url,
      client_key: paymentIntent.data.attributes.client_key,
      entrance_record_id: entranceRecord.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in create-entrance-payment:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
