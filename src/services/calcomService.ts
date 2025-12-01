import { supabase } from '../lib/supabase';

export interface CalcomConfig {
  id: string;
  clinic_id: string;
  api_key: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CalcomEventType {
  id: string;
  clinic_id: string;
  agent_id: string | null;
  external_event_id: number;
  event_name: string;
  duration_minutes: number;
  description: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export async function getCalcomConfig(clinicId: string): Promise<CalcomConfig | null> {
  const { data, error } = await supabase
    .from('calcom_config')
    .select('*')
    .eq('clinic_id', clinicId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function saveCalcomConfig(clinicId: string, apiKey: string, enabled: boolean): Promise<void> {
  const { error } = await supabase
    .from('calcom_config')
    .upsert({
      clinic_id: clinicId,
      api_key: apiKey,
      enabled,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'clinic_id',
    });

  if (error) throw error;
}

export async function getCalcomEventTypes(clinicId: string): Promise<CalcomEventType[]> {
  const { data, error } = await supabase
    .from('calcom_event_types')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('event_name');

  if (error) throw error;
  return data || [];
}

export async function saveCalcomEventType(eventType: Partial<CalcomEventType>): Promise<void> {
  const { error } = await supabase
    .from('calcom_event_types')
    .upsert({
      ...eventType,
      updated_at: new Date().toISOString(),
    });

  if (error) throw error;
}

export async function deleteCalcomEventType(id: string): Promise<void> {
  const { error } = await supabase
    .from('calcom_event_types')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function fetchCalcomEventTypes(apiKey: string): Promise<any[]> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calcom-fetch-event-types`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ apiKey }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Error al conectar con Cal.com. Verifica tu API key.');
  }

  const data = await response.json();
  return data.event_types || [];
}

export async function checkAvailability(
  apiKey: string,
  eventTypeId: number,
  startDate: string,
  endDate: string
): Promise<any> {
  const url = `https://api.cal.com/v1/slots/available?eventTypeId=${eventTypeId}&startTime=${startDate}&endTime=${endDate}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Error al consultar disponibilidad');
  }

  return await response.json();
}

export async function createBooking(
  apiKey: string,
  eventTypeId: number,
  start: string,
  responses: { name: string; email: string; phone?: string }
): Promise<any> {
  const response = await fetch('https://api.cal.com/v1/bookings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      eventTypeId,
      start,
      responses: {
        name: responses.name,
        email: responses.email,
        ...(responses.phone && { phone: responses.phone }),
      },
      metadata: {},
      timeZone: 'Europe/Madrid',
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Error al crear la reserva');
  }

  return await response.json();
}
