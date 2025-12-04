import { supabase } from '../lib/supabase';
import { getAgent } from './agentService';

interface CallRecipient {
  phone: string;
  name?: string;
}

const RETELL_API_KEY = import.meta.env.VITE_RETELL_API_KEY;

export async function createBatchCalls(
  clinicId: string,
  agentId: string,
  recipients: CallRecipient[]
): Promise<void> {
  try {
    // Obtener el agente usando el servicio existente
    const agent = await getAgent(agentId);

    if (!agent || !agent.retell_agent_id) {
      throw new Error('Agente no encontrado');
    }

    const retellAgentId = agent.retell_agent_id;

    // Crear las llamadas una por una usando Retell AI
    const callPromises = recipients.map(async (recipient) => {
      const callPayload = {
        agent_id: retellAgentId,
        to_number: recipient.phone,
        // Variables dinámicas que pueden usarse en el prompt
        retell_llm_dynamic_variables: {
          customer_name: recipient.name || 'Cliente',
        },
      };

      const callResponse = await fetch('https://api.retellai.com/v2/create-phone-call', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RETELL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(callPayload),
      });

      if (!callResponse.ok) {
        const errorText = await callResponse.text();
        console.error(`Error creating call to ${recipient.phone}:`, errorText);
        throw new Error(`Error al crear llamada a ${recipient.phone}`);
      }

      return await callResponse.json();
    });

    // Ejecutar todas las llamadas
    await Promise.all(callPromises);

  } catch (error) {
    console.error('Error in createBatchCalls:', error);
    throw error;
  }
}
