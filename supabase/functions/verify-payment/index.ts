
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

    const { payment_intent_id } = await req.json();
    console.log('Verifying payment intent:', payment_intent_id);

    // Get the PayMongo payment intent status
    const paymongoSecretKey = Deno.env.get('SECRET_KEY');
    if (!paymongoSecretKey) {
      throw new Error('PayMongo secret key not configured');
    }

    const paymongoResponse = await fetch(`https://api.paymongo.com/v1/payment_intents/${payment_intent_id}`, {
      headers: {
        'Authorization': `Basic ${btoa(paymongoSecretKey + ':')}`,
      },
    });

    if (!paymongoResponse.ok) {
      const errorData = await paymongoResponse.text();
      console.error('PayMongo API error:', errorData);
      throw new Error('Payment verification failed');
    }

    const paymentIntent = await paymongoResponse.json();
    const status = paymentIntent.data.attributes.status;
    console.log('PayMongo payment status:', status);

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

    return new Response(JSON.stringify({
      payment_status: updatedRecord.payment_status,
      has_access: updatedRecord.payment_status === 'paid',
      payment_intent_status: status,
      entrance_record: updatedRecord
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in verify-payment:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
