import { supabase } from '../lib/supabase';
import { Clinic, ScrapedClinicInfo } from '../types';

export async function createClinic(clinic: Omit<Clinic, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('clinics')
    .insert([{ ...clinic, user_id: user.id }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getClinic(clinicId: string) {
  const { data, error } = await supabase
    .from('clinics')
    .select('*')
    .eq('id', clinicId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getUserClinics() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('clinics')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function updateClinic(clinicId: string, updates: Partial<Clinic>) {
  const { data, error } = await supabase
    .from('clinics')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', clinicId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteClinic(clinicId: string) {
  const { error } = await supabase
    .from('clinics')
    .delete()
    .eq('id', clinicId);

  if (error) throw error;
}

export async function scrapeClinicWebsite(websiteUrl: string): Promise<ScrapedClinicInfo> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('User not authenticated');

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scrape-clinic`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ website_url: websiteUrl }),
  });

  if (!response.ok) throw new Error('Failed to scrape website');
  return response.json();
}
