import { supabase } from '../lib/supabase';
import { updateRetellAgent, getRetellAgent } from './retellService';
import { getAgent } from './agentService';

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
  // Cal.com API usa el parámetro apiKey en la URL
  const url = `https://api.cal.com/v1/slots/available?eventTypeId=${eventTypeId}&startTime=${startDate}&endTime=${endDate}&apiKey=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
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
  // Cal.com API usa el parámetro apiKey en la URL
  const url = `https://api.cal.com/v1/bookings?apiKey=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
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

/**
 * Genera el texto de instrucciones para el prompt del agente sobre cómo usar Cal.com
 */
function generateCalcomPromptInstructions(eventTypes: CalcomEventType[]): string {
  if (eventTypes.length === 0) return '';

  const eventList = eventTypes
    .map(et => `- "${et.event_name}" (${et.duration_minutes} minutos)`)
    .join('\n');

  return `

## RESERVA DE CITAS CON CAL.COM

Tienes acceso a las siguientes herramientas para gestionar citas:

**Tipos de citas disponibles:**
${eventList}

**Para reservar una cita, sigue estos pasos:**

1. **Consultar disponibilidad**: Primero, usa la función \`check_availability\` para ver los horarios disponibles.
   - Pregunta al usuario qué tipo de cita necesita y para qué fecha aproximada
   - Ejecuta la función con el tipo de evento y rango de fechas apropiado
   - Presenta las opciones disponibles al usuario de forma clara

2. **Crear la reserva**: Una vez que el usuario confirme un horario, usa la función \`book_appointment\`.
   - IMPORTANTE: Antes de reservar, debes solicitar:
     * Nombre completo del paciente
     * Email del paciente
     * Teléfono (opcional)
   - Confirma todos los datos con el usuario antes de ejecutar la reserva
   - Después de crear la reserva, confirma los detalles al usuario

**Recuerda:**
- Siempre verifica disponibilidad antes de intentar reservar
- Sé claro y detallado al presentar las opciones de horario
- Confirma todos los datos del paciente antes de finalizar la reserva`;
}

/**
 * Actualiza el prompt del agente para incluir instrucciones de Cal.com
 */
export async function updateAgentPromptWithCalcom(agentId: string): Promise<void> {
  try {
    // Obtener el agente de la base de datos
    const agent = await getAgent(agentId);
    if (!agent) {
      throw new Error('Agente no encontrado');
    }

    // Obtener los event types asignados a este agente
    const { data: eventTypes, error } = await supabase
      .from('calcom_event_types')
      .select('*')
      .eq('clinic_id', agent.clinic_id)
      .eq('enabled', true)
      .or(`agent_id.is.null,agent_id.eq.${agentId}`);

    if (error) throw error;

    // Obtener el prompt actual del agente desde Retell
    const retellAgent = await getRetellAgent(agent.retell_agent_id);
    let currentPrompt = retellAgent.response_engine?.general_prompt || agent.prompt;

    // Remover instrucciones previas de Cal.com si existen
    const calcomSectionRegex = /\n\n## RESERVA DE CITAS CON CAL\.COM[\s\S]*$/;
    currentPrompt = currentPrompt.replace(calcomSectionRegex, '');

    // Añadir nuevas instrucciones si hay eventos disponibles
    let updatedPrompt = currentPrompt;
    if (eventTypes && eventTypes.length > 0) {
      const calcomInstructions = generateCalcomPromptInstructions(eventTypes);
      updatedPrompt = currentPrompt + calcomInstructions;
    }

    // Actualizar el prompt en Retell AI
    await updateRetellAgent(agent.retell_agent_id, {
      prompt: updatedPrompt,
    });

    // Actualizar también en la base de datos local
    await supabase
      .from('agents')
      .update({
        prompt: updatedPrompt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agentId);

    console.log('✅ Prompt del agente actualizado con instrucciones de Cal.com');
  } catch (error) {
    console.error('Error al actualizar prompt del agente:', error);
    throw error;
  }
}

/**
 * Actualiza los prompts de todos los agentes de una clínica
 */
export async function updateAllAgentsPromptsForClinic(clinicId: string): Promise<void> {
  try {
    // Obtener todos los agentes de la clínica
    const { data: agents, error } = await supabase
      .from('agents')
      .select('id')
      .eq('clinic_id', clinicId)
      .eq('enabled', true);

    if (error) throw error;

    if (!agents || agents.length === 0) {
      console.log('No hay agentes para actualizar');
      return;
    }

    // Actualizar cada agente
    for (const agent of agents) {
      await updateAgentPromptWithCalcom(agent.id);
    }

    console.log(`✅ ${agents.length} agentes actualizados`);
  } catch (error) {
    console.error('Error al actualizar prompts de agentes:', error);
    throw error;
  }
}
