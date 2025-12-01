const RETELL_API_KEY = import.meta.env.VITE_RETELL_API_KEY;

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
  transfers?: Array<{ name: string; phone: string; description: string }>
): Promise<string> {
  console.log('\n🚀 Starting Agent Creation Process...\n');

  const tools = transfers?.map(t => ({
    type: 'transfer_call' as const,
    name: t.name,
    description: t.description,
    number: t.phone,
  }));

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
      end_call_after_silence_ms: 20000,
      max_call_duration_ms: 600000,
      begin_message_delay_ms: 1000,
    };

    console.log('Trying full payload:', JSON.stringify(payload, null, 2));
    console.log('API URL:', 'https://api.retellai.com/create-agent');

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
    console.error('Headers sent:', {
      'Authorization': 'Bearer ' + RETELL_API_KEY?.substring(0, 20) + '...',
      'Content-Type': 'application/json'
    });

    if (response.status === 404) {
      throw new Error(
        'Error 404: El endpoint /create-agent no está disponible. ' +
        'Posibles causas:\n' +
        '1. Tu cuenta de Retell AI podría necesitar verificación o activación\n' +
        '2. La API key podría no tener los permisos necesarios\n' +
        '3. Tu plan podría no incluir acceso a la API de agentes\n\n' +
        'Por favor verifica tu cuenta en https://beta.retellai.com/dashboard y asegúrate de que:\n' +
        '- Tu cuenta esté completamente activada\n' +
        '- Tu API key tenga permisos completos\n' +
        '- Tu plan incluya acceso a la API de creación de agentes'
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
    transfers?: Array<{ name: string; phone: string; description: string }>;
  }
): Promise<void> {
  if (updates.prompt || updates.transfers) {
    const agent = await getRetellAgent(agentId);

    if (!agent.response_engine?.llm_id) {
      throw new Error('No se pudo obtener el llm_id del agente');
    }

    const tools = updates.transfers?.map(t => ({
      type: 'transfer_call' as const,
      name: t.name,
      description: t.description,
      number: t.phone,
    }));

    await updateRetellLLM(agent.response_engine.llm_id, updates.prompt || agent.response_engine.general_prompt, tools);
  }

  const payload: UpdateAgentPayload = {};

  if (updates.name) payload.agent_name = updates.name;
  if (updates.voiceId) payload.voice_id = updates.voiceId;
  if (updates.language) payload.language = updates.language;

  if (Object.keys(payload).length === 0) {
    return;
  }

  const response = await fetch(`https://api.retellai.com/update-agent/${agentId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${RETELL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Retell API error:', errorText);
    throw new Error(`Failed to update Retell agent: ${response.status} ${errorText}`);
  }
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
