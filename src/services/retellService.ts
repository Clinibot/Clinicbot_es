const RETELL_API_KEY = import.meta.env.VITE_RETELL_API_KEY;
const WEBHOOK_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/retell-webhook`;

export async function listRetellVoices(): Promise<any[]> {
  console.log('=== Listing Available Retell Voices ===');
  const response = await fetch('https://api.retellai.com/list-voices', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${RETELL_API_KEY}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to list voices:', errorText);
    throw new Error(`Failed to list voices: ${response.status} ${errorText}`);
  }

  const voices = await response.json();
  console.log(`✅ Found ${voices.length} available voices`);
  console.log('Voices:', voices);
  return voices;
}

export async function testRetellConnection(): Promise<void> {
  console.log('=== Testing Retell API connection ===');
  console.log('API Key:', RETELL_API_KEY?.substring(0, 15) + '...');
  console.log('Base URL:', 'https://api.retellai.com');

  const endpoints = [
    { name: 'List Agents', url: 'https://api.retellai.com/list-agents', method: 'GET' },
    { name: 'List LLMs', url: 'https://api.retellai.com/list-retell-llms', method: 'GET' },
    { name: 'Get Agent (test)', url: 'https://api.retellai.com/get-agent/test123', method: 'GET' },
  ];

  for (const endpoint of endpoints) {
    console.log(`\n--- Testing: ${endpoint.name} ---`);
    console.log(`URL: ${endpoint.url}`);
    try {
      const response = await fetch(endpoint.url, {
        method: endpoint.method,
        headers: {
          'Authorization': `Bearer ${RETELL_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      console.log(`Status: ${response.status} ${response.statusText}`);
      console.log(`Result: ${response.ok ? '✓ SUCCESS' : '✗ FAILED'}`);

      const text = await response.text();
      try {
        const data = JSON.parse(text);
        console.log('Response:', JSON.stringify(data, null, 2));
      } catch {
        console.log('Response (text):', text);
      }
    } catch (error) {
      console.error(`ERROR: ${error}`);
    }
  }

  console.log('\n=== Testing CREATE endpoints ===');

  const testLLMPayload = {
    general_prompt: 'Test prompt for diagnostics',
    model: 'gpt-4o-mini',
    start_speaker: 'agent',
  };

  console.log('\n--- Testing: Create LLM ---');
  console.log('Payload:', JSON.stringify(testLLMPayload, null, 2));

  try {
    const response = await fetch('https://api.retellai.com/create-retell-llm', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RETELL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testLLMPayload),
    });
    console.log(`Status: ${response.status} ${response.statusText}`);
    const text = await response.text();
    console.log('Response:', text);
  } catch (error) {
    console.error(`ERROR: ${error}`);
  }

  console.log('\n=== Test Complete ===');
}

interface CreateLLMPayload {
  general_prompt: string;
  model?: string;
  begin_message?: string;
  start_speaker?: 'agent' | 'user';
  tools?: Array<{
    type: 'transfer_call';
    name: string;
    description: string;
    number: string;
  }>;
}

interface CreateAgentPayload {
  agent_name: string;
  voice_id: string;
  language: string;
  response_engine: {
    type: string;
    llm_id: string;
    version?: number;
  };
  voice_model?: string;
  voice_temperature?: number;
  voice_speed?: number;
  volume?: number;
  responsiveness?: number;
  interruption_sensitivity?: number;
  enable_backchannel?: boolean;
  backchannel_frequency?: number;
  backchannel_words?: string[];
  max_call_duration_ms?: number;
  end_call_after_silence_ms?: number;
  fallback_voice_ids?: string[];
  begin_message_delay_ms?: number;
}

interface UpdateAgentPayload {
  agent_name?: string;
  voice_id?: string;
  language?: string;
  response_engine?: {
    type?: string;
    llm_id?: string;
    openai_model_name?: string;
    general_prompt?: string;
  };
}

export async function createRetellLLM(
  prompt: string,
  beginMessage?: string,
  tools?: Array<{
    type: 'transfer_call';
    name: string;
    description: string;
    number: string;
  }>
): Promise<string> {
  console.log('=== STEP 1: Creating Retell LLM ===');
  console.log('API Key being used:', RETELL_API_KEY?.substring(0, 20) + '...');
  console.log('API URL:', 'https://api.retellai.com/create-retell-llm');

  const payload: CreateLLMPayload = {
    general_prompt: prompt,
    model: 'gpt-4o-mini',
    start_speaker: 'agent',
  };

  if (beginMessage) {
    payload.begin_message = beginMessage;
  }

  if (tools && tools.length > 0) {
    payload.tools = tools;
  }

  console.log('LLM Payload:', JSON.stringify(payload, null, 2));

  const response = await fetch('https://api.retellai.com/create-retell-llm', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RETELL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  console.log('LLM Response Status:', response.status, response.statusText);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Retell LLM API error:', errorText);
    console.error('Request payload:', JSON.stringify(payload, null, 2));
    throw new Error(`Failed to create Retell LLM: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  console.log('✅ LLM created successfully:', data);
  console.log('LLM ID:', data.llm_id);
  return data.llm_id;
}

export async function updateRetellLLM(
  llmId: string,
  prompt: string,
  tools?: Array<{
    type: 'transfer_call';
    name: string;
    description: string;
    number: string;
  }>
): Promise<void> {
  console.log('=== Updating Retell LLM ===');
  console.log('LLM ID:', llmId);
  console.log('New prompt length:', prompt.length);
  console.log('Tools count:', tools?.length || 0);

  const payload: any = {
    general_prompt: prompt,
  };

  if (tools && tools.length > 0) {
    payload.tools = tools;
  }

  console.log('Update payload:', JSON.stringify(payload, null, 2));

  const response = await fetch(`https://api.retellai.com/update-retell-llm/${llmId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${RETELL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  console.log('LLM Update Response Status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Retell LLM Update API error:', errorText);
    throw new Error(`Failed to update Retell LLM: ${response.status} ${errorText}`);
  }

  console.log('✅ LLM updated successfully');
}

export async function createRetellAgent(
  name: string,
  prompt: string,
  voiceId: string,
  language: string,
  tools?: Array<any>
): Promise<string> {
  console.log('\n🚀 Starting Agent Creation Process...\n');

  const llmId = await createRetellLLM(prompt, undefined, tools);

  console.log('\n=== STEP 2: Creating Retell Agent ===');
  console.log('LLM ID from step 1:', llmId);
  console.log('Agent Name:', name);
  console.log('Voice ID:', voiceId);
  console.log('Language:', language);

  const minimalPayload = {
    response_engine: {
      type: 'retell-llm',
      llm_id: llmId,
    },
    agent_name: name,
    voice_id: voiceId,
    language: language,
    webhook_url: WEBHOOK_URL,
  };

  console.log('Trying MINIMAL payload first:');
  console.log('API URL:', 'https://api.retellai.com/create-agent');
  console.log('API Key:', RETELL_API_KEY?.substring(0, 20) + '...');
  console.log('Payload:', JSON.stringify(minimalPayload, null, 2));

  let response = await fetch('https://api.retellai.com/create-agent', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RETELL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(minimalPayload),
  });

  console.log('Minimal payload response status:', response.status, response.statusText);

  let lastPayloadUsed: any = minimalPayload;

  if (!response.ok) {
    console.log('Minimal payload failed, trying FULL payload...');

    const payload: CreateAgentPayload = {
      response_engine: {
        type: 'retell-llm',
        llm_id: llmId,
        version: 0,
      },
      agent_name: name,
      voice_id: voiceId,
      voice_model: 'eleven_turbo_v2',
      fallback_voice_ids: ['openai-Alloy'],
      voice_temperature: 1.0,
      voice_speed: 1.0,
      volume: 1.0,
      responsiveness: 1.0,
      interruption_sensitivity: 1.0,
      enable_backchannel: true,
      backchannel_frequency: 0.8,
      backchannel_words: ['ajá', 'sí', 'entiendo', 'claro'],
      language: language,
      webhook_url: WEBHOOK_URL,
      end_call_after_silence_ms: 20000,
      max_call_duration_ms: 600000,
      begin_message_delay_ms: 1000,
    };

    console.log('Trying full payload:', JSON.stringify(payload, null, 2));
    console.log('API URL:', 'https://api.retellai.com/create-agent');

    lastPayloadUsed = payload;

    response = await fetch('https://api.retellai.com/create-agent', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RETELL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log('Full payload response status:', response.status);
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Agent creation failed!');
    console.error('Status:', response.status, response.statusText);
    console.error('Response:', errorText);
    console.error('Response body:', errorText);
    console.error('Exact payload that failed:', JSON.stringify(lastPayloadUsed, null, 2));

    if (response.status === 404) {
      throw new Error(
        `❌ Error 404: No se pudo crear el agente en Retell AI\n\n` +
        `📋 Datos enviados:\n` +
        `  • Idioma: "${language}"\n` +
        `  • Voice ID: "${voiceId}"\n` +
        `  • LLM ID: "${llmId}" ✓ (creado exitosamente)\n\n` +
        `🔍 Posibles causas:\n` +
        `  1. Voice ID no está conectado a tu cuenta de Retell AI\n` +
        `  2. La voz de ElevenLabs no ha sido importada a Retell AI\n` +
        `  3. Permisos insuficientes en la API key\n\n` +
        `✅ Soluciones:\n` +
        `  1. Ve al dashboard de Retell AI → Voice Library\n` +
        `  2. Verifica que las voces de ElevenLabs estén conectadas\n` +
        `  3. Importa/sincroniza tus voces de ElevenLabs\n` +
        `  4. Abre la consola (F12) y ejecuta:\n` +
        `     await fetch('https://api.retellai.com/list-voices', {\n` +
        `       headers: {'Authorization': 'Bearer ${RETELL_API_KEY?.substring(0, 20)}...'}\n` +
        `     }).then(r => r.json()).then(console.log)\n` +
        `     Para ver las voces disponibles\n\n` +
        `📖 Más info:\n` +
        `  • https://docs.retellai.com/api-references/list-voices\n` +
        `  • https://docs.retellai.com/api-references/create-agent`
      );
    }

    throw new Error(`Failed to create Retell agent: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  console.log('✅ Agent created successfully!');
  console.log('Agent data:', data);
  console.log('Agent ID:', data.agent_id);
  return data.agent_id;
}

export async function updateRetellAgent(
  agentId: string,
  updates: {
    name?: string;
    prompt?: string;
    voiceId?: string;
    language?: string;
    tools?: Array<any>;
  }
): Promise<void> {
  console.log('=== Updating Retell Agent ===');
  console.log('Agent ID received:', agentId);
  console.log('Agent ID length:', agentId?.length);
  console.log('Agent ID type:', typeof agentId);

  if (!agentId || agentId === 'undefined' || agentId === 'null') {
    throw new Error('❌ El agente no tiene un retell_agent_id válido. El agente podría no haberse creado correctamente en Retell AI.');
  }

  // First, verify the agent exists
  console.log('Verificando que el agente existe en Retell AI...');
  let agent;
  try {
    agent = await getRetellAgent(agentId);
    console.log('✓ Agente encontrado en Retell AI');
  } catch (error) {
    console.error('❌ Error al obtener el agente de Retell AI:', error);
    throw new Error(
      `No se pudo encontrar el agente en Retell AI (ID: ${agentId}). ` +
      'Posibles causas:\n' +
      '1. El agente fue eliminado de Retell AI pero sigue en tu base de datos\n' +
      '2. El retell_agent_id guardado es incorrecto\n' +
      '3. Tu API key no tiene permisos para acceder a este agente\n\n' +
      'Solución: Elimina este agente y créalo de nuevo.'
    );
  }

  if (!agent.response_engine?.llm_id) {
    throw new Error('No se pudo obtener el llm_id del agente');
  }

  // Update LLM if needed
  if (updates.prompt !== undefined || updates.tools !== undefined) {
    console.log('Actualizando LLM...');
    await updateRetellLLM(
      agent.response_engine.llm_id,
      updates.prompt !== undefined ? updates.prompt : agent.response_engine.general_prompt,
      updates.tools
    );
  }

  // Prepare agent update payload
  const payload: UpdateAgentPayload = {};

  if (updates.name !== undefined) payload.agent_name = updates.name;
  if (updates.voiceId !== undefined) {
    console.log('Updating voice to:', updates.voiceId);
    payload.voice_id = updates.voiceId;
  }
  if (updates.language !== undefined) payload.language = updates.language;

  if (Object.keys(payload).length === 0) {
    console.log('No agent fields to update (only LLM was updated)');
    return;
  }

  console.log('Actualizando campos del agente...');
  console.log('Update payload:', JSON.stringify(payload, null, 2));

  const response = await fetch(`https://api.retellai.com/update-agent/${agentId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${RETELL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  console.log('Response status:', response.status, response.statusText);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Retell API error:', errorText);

    if (response.status === 404) {
      throw new Error(
        `Agente no encontrado en Retell AI (404).\n\n` +
        `ID del agente: ${agentId}\n\n` +
        'El agente podría haber sido eliminado de Retell AI pero sigue en tu base de datos local. ' +
        'Por favor, elimina este agente y créalo de nuevo.'
      );
    }

    throw new Error(`Failed to update Retell agent: ${response.status} ${errorText}`);
  }

  const updatedAgent = await response.json();
  console.log('✅ Agent updated successfully');
  console.log('Voice ID confirmado en respuesta:', updatedAgent.voice_id);
}

export async function deleteRetellAgent(agentId: string): Promise<void> {
  const response = await fetch(`https://api.retellai.com/delete-agent/${agentId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${RETELL_API_KEY}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Retell API error:', errorText);
    throw new Error(`Failed to delete Retell agent: ${response.status} ${errorText}`);
  }
}

export async function updateAgentWebhook(agentId: string): Promise<void> {
  const response = await fetch(`https://api.retellai.com/update-agent/${agentId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${RETELL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      webhook_url: WEBHOOK_URL,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to update webhook:', errorText);
    throw new Error(`Failed to update webhook: ${response.status} ${errorText}`);
  }

  console.log('✅ Webhook updated for agent:', agentId);
}

export async function getRetellAgent(agentId: string): Promise<any> {
  const response = await fetch(`https://api.retellai.com/get-agent/${agentId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${RETELL_API_KEY}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Retell API error:', errorText);
    throw new Error(`Failed to get Retell agent: ${response.status} ${errorText}`);
  }

  return response.json();
}

/**
 * Assign a phone number to an agent in Retell AI
 * @param phoneNumber The phone number (e.g., "+34612345678")
 * @param agentId The Retell agent ID
 * @returns The updated phone number configuration
 */
export async function assignPhoneNumberToRetellAgent(
  phoneNumber: string,
  agentId: string
): Promise<any> {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  🔄 ACTUALIZANDO NÚMERO EN RETELL AI                      ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('📞 Phone Number:', phoneNumber);
  console.log('🤖 Agent ID:', agentId);
  console.log('🌐 Endpoint:', `https://api.retellai.com/update-phone-number/${encodeURIComponent(phoneNumber)}`);
  console.log('📤 Payload:', JSON.stringify({ agent_id: agentId }, null, 2));

  const response = await fetch(`https://api.retellai.com/update-phone-number/${encodeURIComponent(phoneNumber)}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${RETELL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      agent_id: agentId,
    }),
  });

  console.log('📥 Response Status:', response.status, response.statusText);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('╔═══════════════════════════════════════════════════════════╗');
    console.error('║  ❌ ERROR EN RETELL AI                                    ║');
    console.error('╚═══════════════════════════════════════════════════════════╝');
    console.error('Status:', response.status);
    console.error('Status Text:', response.statusText);
    console.error('Error Response:', errorText);
    try {
      const errorJson = JSON.parse(errorText);
      console.error('Error JSON:', JSON.stringify(errorJson, null, 2));
    } catch (e) {
      console.error('Could not parse error as JSON');
    }
    throw new Error(`Failed to assign phone number in Retell AI: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  ✅ NÚMERO ASIGNADO EN RETELL AI                          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('Response:', JSON.stringify(data, null, 2));
  return data;
}

/**
 * Unassign a phone number from an agent in Retell AI
 * @param phoneNumber The phone number (e.g., "+34612345678")
 * @returns The updated phone number configuration
 */
export async function unassignPhoneNumberFromRetellAgent(
  phoneNumber: string
): Promise<any> {
  console.log('=== Unassigning Phone Number in Retell AI ===');
  console.log('Phone Number:', phoneNumber);

  const response = await fetch(`https://api.retellai.com/update-phone-number/${encodeURIComponent(phoneNumber)}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${RETELL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      agent_id: null,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Retell API error:', errorText);
    throw new Error(`Failed to unassign phone number in Retell AI: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  console.log('✅ Phone number unassigned successfully in Retell AI');
  return data;
}

/**
 * List all phone numbers registered in Retell AI
 * @returns Array of phone number configurations
 */
export async function listRetellPhoneNumbers(): Promise<any[]> {
  console.log('=== Listing Phone Numbers in Retell AI ===');

  const response = await fetch('https://api.retellai.com/list-phone-numbers', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${RETELL_API_KEY}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Retell API error:', errorText);
    throw new Error(`Failed to list phone numbers from Retell AI: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  console.log(`✅ Found ${data.length} phone numbers in Retell AI`);
  console.log('Phone numbers:', data);
  return data;
}

/**
 * Get a specific phone number from Retell AI
 * @param phoneNumber The phone number (e.g., "+34612345678")
 * @returns The phone number configuration
 */
export async function getRetellPhoneNumber(phoneNumber: string): Promise<any> {
  console.log('=== Getting Phone Number from Retell AI ===');
  console.log('Phone Number:', phoneNumber);

  const response = await fetch(`https://api.retellai.com/get-phone-number/${encodeURIComponent(phoneNumber)}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${RETELL_API_KEY}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Retell API error:', errorText);
    throw new Error(`Failed to get phone number from Retell AI: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  console.log('✅ Phone number retrieved from Retell AI:', data);
  return data;
}

