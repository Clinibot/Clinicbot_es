import { supabase } from '../lib/supabase';
import { PhoneRequest } from '../types';
import { createPhoneNumber, assignPhoneToAgent } from './phoneNumberService';
import { getAgent } from './agentService';

export async function createPhoneRequest(
  clinicId: string,
  agentId: string,
  requestNotes?: string
): Promise<PhoneRequest> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('phone_requests')
    .insert([{
      clinic_id: clinicId,
      user_id: user.id,
      agent_id: agentId,
      user_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
      user_email: user.email,
      status: 'pending',
      request_notes: requestNotes,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getPhoneRequest(requestId: string): Promise<PhoneRequest | null> {
  const { data, error } = await supabase
    .from('phone_requests')
    .select('*')
    .eq('id', requestId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getAllPhoneRequests(): Promise<PhoneRequest[]> {
  const { data, error } = await supabase
    .from('phone_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getPendingPhoneRequests(): Promise<PhoneRequest[]> {
  const { data, error } = await supabase
    .from('phone_requests')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getClinicPhoneRequests(clinicId: string): Promise<PhoneRequest[]> {
  const { data, error } = await supabase
    .from('phone_requests')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function approvePhoneRequest(
  requestId: string,
  phoneNumber: string,
  country: string,
  monthlyCost: number,
  adminNotes?: string
): Promise<PhoneRequest> {
  // First, get the request to get clinic_id and agent_id
  const request = await getPhoneRequest(requestId);
  if (!request) throw new Error('Phone request not found');

  // Get agent info to know the type
  const agent = request.agent_id ? await getAgent(request.agent_id) : null;
  if (!agent) throw new Error('Agent not found for this request');

  // Create the phone number record
  const phoneNumberRecord = await createPhoneNumber(
    request.clinic_id,
    phoneNumber,
    country,
    monthlyCost
  );

  // Assign the phone to the specific agent
  await assignPhoneToAgent(phoneNumberRecord.id, agent.id, agent.agent_type);

  // Update the request status
  const { data, error } = await supabase
    .from('phone_requests')
    .update({
      status: 'approved',
      phone_number: phoneNumber,
      admin_notes: adminNotes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function rejectPhoneRequest(
  requestId: string,
  adminNotes?: string
): Promise<PhoneRequest> {
  const { data, error } = await supabase
    .from('phone_requests')
    .update({
      status: 'rejected',
      admin_notes: adminNotes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePhoneRequest(requestId: string): Promise<void> {
  const { error } = await supabase
    .from('phone_requests')
    .delete()
    .eq('id', requestId);

  if (error) throw error;
}
