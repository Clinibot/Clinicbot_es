import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CallData {
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
  retell_llm_dynamic_variables?: any;
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
  opt_out_sensitive_data_storage?: boolean;
  disconnection_reason?: string;
  public_log_url?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const agentId = url.searchParams.get('agent_id');
    const limit = parseInt(url.searchParams.get('limit') || '1000');

    if (!agentId) {
      return new Response(
        JSON.stringify({ error: 'agent_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const retellApiKey = Deno.env.get('RETELL_API_KEY');
    if (!retellApiKey) {
      throw new Error('RETELL_API_KEY not configured');
    }

    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

    const response = await fetch(
      `https://api.retellai.com/v2/list-calls?agent_id=${agentId}&limit=${limit}&sort_order=descending&start_timestamp_min=${sevenDaysAgo}`,
      {
        headers: {
          'Authorization': `Bearer ${retellApiKey}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch calls: ${response.status} ${errorText}`);
    }

    const data: CallData[] = await response.json();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: agent } = await supabaseClient
      .from('agents')
      .select('id, clinic_id, retell_agent_id')
      .eq('retell_agent_id', agentId)
      .maybeSingle();

    if (!agent) {
      return new Response(
        JSON.stringify({ error: 'Agent not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const callRecords = data.map((call) => {
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

      return {
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
          custom_data: call.retell_llm_dynamic_variables || {},
        },
      };
    });

    for (const record of callRecords) {
      await supabaseClient
        .from('call_history')
        .upsert(record, {
          onConflict: 'external_call_id',
          ignoreDuplicates: false,
        });
    }

    return new Response(
      JSON.stringify({ success: true, imported: callRecords.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching calls:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});