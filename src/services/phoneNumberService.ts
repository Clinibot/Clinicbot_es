import { supabase } from '../lib/supabase';
import { PhoneNumber } from '../types';

export async function createPhoneNumber(
  clinicId: string,
  phoneNumber: string,
  country: string,
  monthlyCost?: number
): Promise<PhoneNumber> {
  const { data, error } = await supabase
    .from('phone_numbers')
    .insert([{
      clinic_id: clinicId,
      phone_number: phoneNumber,
      country,
      status: 'active',
      monthly_cost: monthlyCost,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getPhoneNumber(phoneNumberId: string): Promise<PhoneNumber | null> {
  const { data, error } = await supabase
    .from('phone_numbers')
    .select('*')
    .eq('id', phoneNumberId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getClinicPhoneNumbers(clinicId: string): Promise<PhoneNumber[]> {
  const { data, error } = await supabase
    .from('phone_numbers')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getAvailablePhoneNumbersForAgent(
  clinicId: string,
  agentType: 'inbound' | 'outbound'
): Promise<PhoneNumber[]> {
  const { data, error } = await supabase
    .from('phone_numbers')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('status', 'active')
    .is(agentType === 'inbound' ? 'assigned_inbound_agent_id' : 'assigned_outbound_agent_id', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function assignPhoneToAgent(
  phoneNumberId: string,
  agentId: string,
  agentType: 'inbound' | 'outbound'
): Promise<PhoneNumber> {
  const field = agentType === 'inbound' ? 'assigned_inbound_agent_id' : 'assigned_outbound_agent_id';

  const { data, error } = await supabase
    .from('phone_numbers')
    .update({
      [field]: agentId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', phoneNumberId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function unassignPhoneFromAgent(
  phoneNumberId: string,
  agentType: 'inbound' | 'outbound'
): Promise<PhoneNumber> {
  const field = agentType === 'inbound' ? 'assigned_inbound_agent_id' : 'assigned_outbound_agent_id';

  const { data, error } = await supabase
    .from('phone_numbers')
    .update({
      [field]: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', phoneNumberId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getAgentPhoneNumber(agentId: string, agentType: 'inbound' | 'outbound'): Promise<PhoneNumber | null> {
  const field = agentType === 'inbound' ? 'assigned_inbound_agent_id' : 'assigned_outbound_agent_id';

  const { data, error } = await supabase
    .from('phone_numbers')
    .select('*')
    .eq(field, agentId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updatePhoneNumberStatus(
  phoneNumberId: string,
  status: PhoneNumber['status']
): Promise<PhoneNumber> {
  const { data, error } = await supabase
    .from('phone_numbers')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', phoneNumberId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePhoneNumber(phoneNumberId: string): Promise<void> {
  const { error } = await supabase
    .from('phone_numbers')
    .delete()
    .eq('id', phoneNumberId);

  if (error) throw error;
}
