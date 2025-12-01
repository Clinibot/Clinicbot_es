import { supabase } from '../lib/supabase';

interface CalcomTool {
  type: 'end_call' | 'check_availability_cal' | 'book_cal';
  name: string;
  description: string;
  speak_on_send?: boolean;
  speak_during_execution?: boolean;
  url?: string;
  parameters?: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

interface TransferTool {
  type: 'transfer_call';
  name: string;
  description: string;
  number: string;
}

export async function buildAgentTools(
  clinicId: string,
  agentId?: string,
  transfers?: Array<{ name: string; phone: string; description: string }>
): Promise<Array<TransferTool | CalcomTool>> {
  const tools: Array<TransferTool | CalcomTool> = [];

  if (transfers && transfers.length > 0) {
    transfers.forEach(transfer => {
      tools.push({
        type: 'transfer_call',
        name: transfer.name,
        description: transfer.description,
        number: transfer.phone,
      });
    });
  }

  const { data: config } = await supabase
    .from('calcom_config')
    .select('*, calcom_event_types(*)')
    .eq('clinic_id', clinicId)
    .eq('enabled', true)
    .maybeSingle();

  if (config && config.calcom_event_types) {
    const eventTypes = config.calcom_event_types.filter((et: any) => {
      if (!et.enabled) return false;
      if (!agentId) return true;
      return !et.agent_id || et.agent_id === agentId;
    });

    if (eventTypes.length > 0) {
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

      tools.push({
        type: 'check_availability_cal',
        name: 'check_availability',
        description: `Consulta la disponibilidad de citas. Tipos de citas disponibles: ${eventTypes.map((et: any) => `"${et.event_name}" (${et.duration_minutes} min)`).join(', ')}. Usa esta herramienta cuando el usuario pregunte por disponibilidad o quiera ver horarios.`,
        speak_on_send: false,
        speak_during_execution: true,
        url: `${functionUrl}/calcom-check-availability`,
        parameters: {
          type: 'object',
          properties: {
            eventTypeId: {
              type: 'number',
              description: `ID del tipo de evento. Opciones: ${eventTypes.map((et: any) => `${et.external_event_id} para "${et.event_name}"`).join(', ')}`,
            },
            startDate: {
              type: 'string',
              description: 'Fecha de inicio en formato ISO (ej: 2024-01-01T00:00:00Z)',
            },
            endDate: {
              type: 'string',
              description: 'Fecha de fin en formato ISO (ej: 2024-01-07T23:59:59Z)',
            },
            apiKey: {
              type: 'string',
              description: `API key de Cal.com (usar: ${config.api_key})`,
            },
          },
          required: ['eventTypeId', 'startDate', 'endDate', 'apiKey'],
        },
      });

      tools.push({
        type: 'book_cal',
        name: 'book_appointment',
        description: `Reserva una cita después de confirmar disponibilidad. Tipos disponibles: ${eventTypes.map((et: any) => et.event_name).join(', ')}. Pide al usuario: nombre completo, email y opcionalmente teléfono.`,
        speak_on_send: true,
        speak_during_execution: false,
        url: `${functionUrl}/calcom-create-booking`,
        parameters: {
          type: 'object',
          properties: {
            eventTypeId: {
              type: 'number',
              description: `ID del tipo de evento. Opciones: ${eventTypes.map((et: any) => `${et.external_event_id} para "${et.event_name}"`).join(', ')}`,
            },
            start: {
              type: 'string',
              description: 'Fecha y hora de la cita en formato ISO (ej: 2024-01-15T10:00:00Z)',
            },
            name: {
              type: 'string',
              description: 'Nombre completo del paciente',
            },
            email: {
              type: 'string',
              description: 'Email del paciente',
            },
            phone: {
              type: 'string',
              description: 'Teléfono del paciente (opcional)',
            },
            apiKey: {
              type: 'string',
              description: `API key de Cal.com (usar: ${config.api_key})`,
            },
          },
          required: ['eventTypeId', 'start', 'name', 'email', 'apiKey'],
        },
      });
    }
  }

  return tools;
}
