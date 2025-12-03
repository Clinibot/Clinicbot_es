import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface WebhookPayload {
  event: string;
  call: {
    call_id: string;
    agent_id: string;
    call_type: 'phone_call' | 'web_call';
    call_status: string;
    transcript: string;
    recording_url?: string;
    start_timestamp: number;
    end_timestamp: number;
    from_number?: string;
    to_number?: string;
    call_analysis?: {
      call_summary?: string;
      user_sentiment?: string;
      call_successful?: boolean;
      in_voicemail?: boolean;
    };
    call_cost?: {
      product_costs?: Array<{
        product: string;
        unit_price: number;
        cost: number;
      }>;
      total_duration_seconds?: number;
      total_duration_unit_price?: number;
      combined_cost?: number;
    };
    disconnection_reason?: string;
    public_log_url?: string;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const payload: WebhookPayload = await req.json();
    
    console.log('Webhook received:', payload.event);
    console.log('Call ID:', payload.call?.call_id);

    if (payload.event !== 'call_ended') {
      return new Response(
        JSON.stringify({ message: 'Event ignored' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const call = payload.call;
    if (!call) {
      return new Response(
        JSON.stringify({ error: 'No call data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: agent } = await supabaseClient
      .from('agents')
      .select('id, clinic_id')
      .eq('retell_agent_id', call.agent_id)
      .maybeSingle();

    if (!agent) {
      console.error('Agent not found for retell_agent_id:', call.agent_id);
      return new Response(
        JSON.stringify({ error: 'Agent not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const durationSeconds = call.end_timestamp
      ? Math.floor((call.end_timestamp - call.start_timestamp) / 1000)
      : 0;

    // Obtener el costo real de Retell AI o calcular basado en duración
    let externalCost = 0;

    if (call.call_cost?.combined_cost !== undefined) {
      // Usar el costo real de la API (viene en centavos de USD)
      externalCost = call.call_cost.combined_cost / 100;
    } else if (call.call_cost?.product_costs && call.call_cost.product_costs.length > 0) {
      // Sumar los costos de productos individuales (en centavos de USD)
      externalCost = call.call_cost.product_costs.reduce((sum, pc) => sum + pc.cost, 0) / 100;
    } else {
      // Fallback: estimar basado en duración (aprox $0.10/min = $0.00167/seg)
      externalCost = (durationSeconds / 60) * 0.10;
    }

    // Convertir de USD a EUR (aproximadamente 1 USD = 0.92 EUR)
    externalCost = externalCost * 0.92;

    // Aplicar markup del 20%
    const userCost = externalCost * 1.2;

    const callRecord = {
      clinic_id: agent.clinic_id,
      agent_id: agent.id,
      external_call_id: call.call_id,
      caller_phone: call.from_number || call.to_number || 'Unknown',
      caller_name: null,
      duration_seconds: durationSeconds,
      call_type: call.call_type === 'web_call' ? 'inbound' : 'inbound',
      call_status: call.call_status,
      transcript: call.transcript || '',
      recording_url: call.recording_url,
      summary: call.call_analysis?.call_summary || '',
      intent: '',
      external_cost: externalCost,
      user_cost: userCost,
      started_at: new Date(call.start_timestamp).toISOString(),
      ended_at: call.end_timestamp ? new Date(call.end_timestamp).toISOString() : null,
      metadata: {
        sentiment: call.call_analysis?.user_sentiment,
        successful: call.call_analysis?.call_successful,
        in_voicemail: call.call_analysis?.in_voicemail,
        disconnection_reason: call.disconnection_reason,
        public_log_url: call.public_log_url,
      },
    };

    const { error } = await supabaseClient
      .from('call_history')
      .upsert(callRecord, {
        onConflict: 'external_call_id',
        ignoreDuplicates: false,
      });

    if (error) {
      console.error('Error inserting call:', error);
      throw error;
    }

    console.log('✅ Call registered successfully:', call.call_id);

    return new Response(
      JSON.stringify({ success: true, call_id: call.call_id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});