import { supabase } from '../lib/supabase';
import { PhoneRequest } from '../types';

export async function createPhoneRequest(
  clinicId: string,
  requestNotes?: string
): Promise<PhoneRequest> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('phone_requests')
    .insert([{
      clinic_id: clinicId,
      user_id: user.id,
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
  adminNotes?: string
): Promise<PhoneRequest> {
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

  // Update the clinic's phone number
  const request = data as PhoneRequest;
  await supabase
    .from('clinics')
    .update({ phone: phoneNumber })
    .eq('id', request.clinic_id);

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
