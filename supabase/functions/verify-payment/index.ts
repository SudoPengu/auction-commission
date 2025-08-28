
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('=== VERIFY PAYMENT FUNCTION START ===');
  console.log('Method:', req.method);

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

    const { payment_intent_id } = requestBody;
    
    if (!payment_intent_id) {
      console.error('Missing payment_intent_id in request body');
      throw new Error('payment_intent_id is required');
    }

    console.log('Verifying payment intent:', payment_intent_id, 'for user:', user.id);

    // Get PayMongo secret key
    const paymongoSecretKey = Deno.env.get('SECRET_KEY');
    if (!paymongoSecretKey) {
      console.error('PayMongo SECRET_KEY environment variable not found');
      throw new Error('Payment provider not configured');
    }

    console.log('Fetching payment status from PayMongo...');

    const paymongoResponse = await fetch(`https://api.paymongo.com/v1/payment_intents/${payment_intent_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${btoa(paymongoSecretKey + ':')}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('PayMongo verification response status:', paymongoResponse.status);

    if (!paymongoResponse.ok) {
      const errorData = await paymongoResponse.text();
      console.error('PayMongo verification API error:', errorData);
      console.error('PayMongo response status:', paymongoResponse.status);
      throw new Error(`Payment verification failed: ${paymongoResponse.status} - ${errorData}`);
    }

    const paymentIntent = await paymongoResponse.json();
    const status = paymentIntent.data.attributes.status;
    console.log('PayMongo payment status:', status);
    console.log('PayMongo payment intent details:', JSON.stringify(paymentIntent.data.attributes, null, 2));

    // Find the entrance record
    const { data: entranceRecord, error: findError } = await supabaseClient
      .from('auction_entrance_fees')
      .select('*')
      .eq('provider_payment_id', payment_intent_id)
      .eq('bidder_id', user.id)
      .single();

    if (findError || !entranceRecord) {
      console.error('Error finding entrance record:', findError);
      throw new Error('Entrance record not found');
    }

    // Update the record based on payment status
    let updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (status === 'succeeded') {
      updateData.payment_status = 'paid';
      updateData.paid_at = new Date().toISOString();
    } else if (status === 'processing') {
      updateData.payment_status = 'processing';
    } else if (status === 'requires_payment_method' || status === 'canceled') {
      updateData.payment_status = 'failed';
    }

    const { data: updatedRecord, error: updateError } = await supabaseClient
      .from('auction_entrance_fees')
      .update(updateData)
      .eq('id', entranceRecord.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating entrance record:', updateError);
      throw new Error('Failed to update entrance record');
    }

    const responseData = {
      payment_status: updatedRecord.payment_status,
      has_access: updatedRecord.payment_status === 'paid',
      payment_intent_status: status,
      entrance_record: updatedRecord
    };

    console.log('Successfully verified payment and updated record');
    console.log('Returning response data:', JSON.stringify(responseData, null, 2));
    console.log('=== VERIFY PAYMENT FUNCTION END (SUCCESS) ===');

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('=== VERIFY PAYMENT FUNCTION ERROR ===');
    console.error('Error details:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('=== VERIFY PAYMENT FUNCTION END (ERROR) ===');
    
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error',
      details: error.toString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
