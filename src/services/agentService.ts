import { supabase } from '../lib/supabase';
import { Agent } from '../types';

export async function createAgent(agent: Omit<Agent, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('agents')
    .insert([agent])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getAgent(agentId: string) {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('id', agentId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getClinicAgents(clinicId: string) {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function updateAgent(agentId: string, updates: Partial<Agent>) {
  const { data, error } = await supabase
    .from('agents')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', agentId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAgent(agentId: string) {
  const { error } = await supabase
    .from('agents')
    .delete()
    .eq('id', agentId);

  if (error) throw error;
}

export const VOICES = [
  { id: '11labs-Rachel', name: 'Rachel - Cálida y Natural (Femenino)' },
  { id: '11labs-Matilda', name: 'Matilda - Profesional y Clara (Femenino)' },
  { id: '11labs-Bella', name: 'Bella - Amigable y Cercana (Femenino)' },
  { id: '11labs-Charlotte', name: 'Charlotte - Dulce y Empática (Femenino)' },
  { id: '11labs-Daniel', name: 'Daniel - Seguro y Confiable (Masculino)' },
  { id: '11labs-Josh', name: 'Josh - Joven y Dinámico (Masculino)' },
  { id: '11labs-Antoni', name: 'Antoni - Versátil y Natural (Masculino)' },
];

export const LANGUAGES = [
  { id: 'multi', name: 'Multi-idioma (Recomendado)' },
  { id: 'es-ES', name: 'Español (España)' },
  { id: 'es-419', name: 'Español (Latinoamérica)' },
  { id: 'ca-ES', name: 'Català' },
  { id: 'en-US', name: 'English (US)' },
  { id: 'en-GB', name: 'English (UK)' },
];

export const DEFAULT_PROMPT = `Eres Sofía, una recepcionista IA profesional y amable para una clínica médica. Tu objetivo es proporcionar un servicio de calidad al contestar llamadas, agendar citas, proporcionar información sobre servicios y transferir llamadas cuando sea necesario.

Tus responsabilidades:
1. Saludar amablemente al paciente
2. Entender sus necesidades
3. Agendar citas disponibles
4. Proporcionar información sobre servicios y especialidades
5. Transferir a un profesional cuando sea necesario

Sé profesional, paciente y empático. Habla con claridad y responde en español.`;
