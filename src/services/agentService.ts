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

// Voice IDs - From Retell AI dashboard (Custom ElevenLabs voices)
// These IDs are assigned by Retell AI when importing from ElevenLabs
export const VOICES = [
  // ElevenLabs custom voices - Spanish optimized
  { id: 'custom-Carolina', name: 'Carolina - Spanish Woman (Femenino)' },
  { id: 'custom_voice_6105206ed083e6faf35d86f533', name: 'Alejandra - Voz Española (Femenino)' },
  { id: 'custom-Sara-Martin', name: 'Sara Martin - Voz Española (Femenino)' },
  { id: 'custom-Susi', name: 'Susi - Voz Española (Femenino)' },
  { id: 'custom_voice_5fcbf67dfede3356325ce9e8d7', name: 'Dani Español (Masculino)' },
  { id: 'custom_voice_1677f5ab3638d48617f624562c', name: 'Pablo - Voz Española (Masculino)' },
  { id: 'custom_voice_d4f438ffa5599beda7caa36699', name: 'Tony - Your Casual Voice (Masculino)' },

  // OpenAI fallback voices (multilingual support)
  { id: 'openai-Alloy', name: 'Alloy - OpenAI (Neutro)' },
  { id: 'openai-Coral', name: 'Coral - OpenAI (Femenino)' },
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
