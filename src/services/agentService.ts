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

// Voice IDs from Retell AI - Only use officially documented voices
// See: https://docs.retellai.com/api-references/list-voices
// Note: Use /list-voices API endpoint to get complete list
export const VOICES = [
  // ElevenLabs voices (support Spanish)
  { id: '11labs-Adrian', name: 'Adrian - ElevenLabs (Masculino)' },

  // OpenAI voices (support multiple languages including Spanish)
  { id: 'openai-Alloy', name: 'Alloy - OpenAI (Neutro)' },
  { id: 'openai-Ash', name: 'Ash - OpenAI (Masculino)' },
  { id: 'openai-Coral', name: 'Coral - OpenAI (Femenino)' },
  { id: 'openai-Sage', name: 'Sage - OpenAI (Neutro)' },

  // Deepgram voices (English only)
  { id: 'deepgram-Angus', name: 'Angus - Deepgram (Masculino)' },
];

// Language codes supported by Retell AI
// Documentation: https://docs.retellai.com/agent/language
// Note: 'multi' supports multilingual (English + Spanish primarily)
export const LANGUAGES = [
  { id: 'es-ES', name: 'Español (España)' },
  { id: 'en-US', name: 'English (US)' },
  { id: 'en-GB', name: 'English (UK)' },
  { id: 'multi', name: 'Multi-idioma (Español + Inglés)' },
  { id: 'fr-FR', name: 'Français' },
  { id: 'de-DE', name: 'Deutsch' },
  { id: 'pt-PT', name: 'Português (Portugal)' },
  { id: 'pt-BR', name: 'Português (Brasil)' },
  { id: 'it-IT', name: 'Italiano' },
  { id: 'ja-JP', name: '日本語 (Japanese)' },
  { id: 'nl-NL', name: 'Nederlands' },
];

export const DEFAULT_PROMPT = `Eres Sofía, una recepcionista IA profesional y amable para una clínica médica. Tu objetivo es proporcionar un servicio de calidad al contestar llamadas, agendar citas, proporcionar información sobre servicios y transferir llamadas cuando sea necesario.

Tus responsabilidades:
1. Saludar amablemente al paciente
2. Entender sus necesidades
3. Agendar citas disponibles
4. Proporcionar información sobre servicios y especialidades
5. Transferir a un profesional cuando sea necesario

Sé profesional, paciente y empático. Habla con claridad y responde en español.`;
