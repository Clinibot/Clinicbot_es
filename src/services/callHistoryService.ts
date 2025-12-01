import { supabase } from '../lib/supabase';

export interface CallRecord {
  id: string;
  clinic_id: string;
  agent_id: string;
  external_call_id: string;
  caller_phone: string;
  caller_name: string | null;
  duration_seconds: number;
  call_type: string;
  call_status: string;
  transcript: string | null;
  recording_url: string | null;
  summary: string | null;
  intent: string | null;
  external_cost: number;
  user_cost: number;
  started_at: string;
  ended_at: string | null;
  created_at: string;
  metadata: any;
  agent?: {
    name: string;
  };
}

export interface CallAnalytics {
  totalCalls: number;
  totalDuration: number;
  totalCost: number;
  avgDuration: number;
  completedCalls: number;
  missedCalls: number;
}

export async function fetchCallsFromAPI(agentId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('fetch-calls', {
    body: { agent_id: agentId },
  });

  if (error) throw error;
  return data;
}

export async function getCallHistory(
  clinicId: string,
  options?: {
    agentId?: string;
    limit?: number;
    offset?: number;
  }
): Promise<CallRecord[]> {
  let query = supabase
    .from('call_history')
    .select('*, agent:agents(name)')
    .eq('clinic_id', clinicId)
    .order('started_at', { ascending: false });

  if (options?.agentId) {
    query = query.eq('agent_id', options.agentId);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function getCallAnalytics(
  clinicId: string,
  agentId?: string
): Promise<CallAnalytics> {
  let query = supabase
    .from('call_history')
    .select('duration_seconds, user_cost, call_status')
    .eq('clinic_id', clinicId);

  if (agentId) {
    query = query.eq('agent_id', agentId);
  }

  const { data, error } = await query;

  if (error) throw error;

  const calls = data || [];

  return {
    totalCalls: calls.length,
    totalDuration: calls.reduce((sum, call) => sum + call.duration_seconds, 0),
    totalCost: calls.reduce((sum, call) => sum + parseFloat(call.user_cost.toString()), 0),
    avgDuration: calls.length > 0
      ? calls.reduce((sum, call) => sum + call.duration_seconds, 0) / calls.length
      : 0,
    completedCalls: calls.filter(c => c.call_status === 'completed').length,
    missedCalls: calls.filter(c => c.call_status === 'missed' || c.call_status === 'no-answer').length,
  };
}

export async function getCallDetail(callId: string): Promise<CallRecord | null> {
  const { data, error } = await supabase
    .from('call_history')
    .select('*, agent:agents(name)')
    .eq('id', callId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function syncCallsForClinic(clinicId: string): Promise<void> {
  const { data: agents, error: agentsError } = await supabase
    .from('agents')
    .select('retell_agent_id')
    .eq('clinic_id', clinicId);

  if (agentsError) throw agentsError;

  for (const agent of agents || []) {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-calls?agent_id=${agent.retell_agent_id}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to sync calls for agent ${agent.retell_agent_id}:`, errorText);
    }
  }
}
