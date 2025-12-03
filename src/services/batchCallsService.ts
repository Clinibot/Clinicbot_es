interface CallRecipient {
  phone: string;
  name?: string;
}

interface CreateCallPayload {
  from_number: string;
  to_number: string;
  override_agent_id?: string;
  retell_llm_dynamic_variables?: Record<string, any>;
}

export async function createBatchCalls(
  clinicId: string,
  agentId: string,
  recipients: CallRecipient[]
): Promise<void> {
  try {
    // Obtener el retell_agent_id del agente
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/agents?id=eq.${agentId}&select=retell_agent_id`, {
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error('No se pudo obtener información del agente');
    }

    const agents = await response.json();
    if (!agents || agents.length === 0) {
      throw new Error('Agente no encontrado');
    }

    const retellAgentId = agents[0].retell_agent_id;

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
          'Authorization': `Bearer ${import.meta.env.VITE_RETELL_API_KEY}`,
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
