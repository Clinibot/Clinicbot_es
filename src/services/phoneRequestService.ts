import { supabase } from '../lib/supabase';
import { PhoneRequest } from '../types';
import { createPhoneNumber, assignPhoneToAgent } from './phoneNumberService';
import { getAgent } from './agentService';

export async function createPhoneRequest(
  clinicId: string,
  agentId: string | null | undefined,
  requestNotes?: string
): Promise<PhoneRequest> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('phone_requests')
    .insert([{
      clinic_id: clinicId,
      user_id: user.id,
      agent_id: agentId || null,
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
  // First, get the request to get clinic_id
  const request = await getPhoneRequest(requestId);
  if (!request) throw new Error('Phone request not found');

  // Create the phone number record WITHOUT assigning to any agent
  // The user will assign it later from ManagePhones page
  await createPhoneNumber(
    request.clinic_id,
    phoneNumber,
    country,
    monthlyCost
  );

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
