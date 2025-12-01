const RETELL_API_KEY = import.meta.env.VITE_RETELL_API_KEY;
const RETELL_API_URL = 'https://api.retellai.com';

export async function testRetellConnection(): Promise<void> {
  console.log('Testing Retell API connection...');
  console.log('API Key:', RETELL_API_KEY?.substring(0, 10) + '...');

  const endpoints = [
    { name: 'List Agents', url: `${RETELL_API_URL}/list-agents`, method: 'GET' },
    { name: 'List LLMs', url: `${RETELL_API_URL}/list-retell-llms`, method: 'GET' },
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint.url, {
        method: endpoint.method,
        headers: {
          'Authorization': `Bearer ${RETELL_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      console.log(`${endpoint.name}: ${response.status} ${response.ok ? '✓' : '✗'}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`${endpoint.name} response:`, data);
      } else {
        const error = await response.text();
        console.log(`${endpoint.name} error:`, error);
      }
    } catch (error) {
      console.error(`${endpoint.name} failed:`, error);
    }
  }
}

interface CreateLLMPayload {
  general_prompt: string;
  model?: string;
  begin_message?: string;
  start_speaker?: 'agent' | 'user';
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
  beginMessage?: string
): Promise<string> {
  const payload: CreateLLMPayload = {
    general_prompt: prompt,
    model: 'gpt-4o-mini',
    start_speaker: 'agent',
  };

  if (beginMessage) {
    payload.begin_message = beginMessage;
  }

  const response = await fetch(`${RETELL_API_URL}/create-retell-llm`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RETELL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Retell LLM API error:', errorText);
    console.error('Request payload:', JSON.stringify(payload, null, 2));
    throw new Error(`Failed to create Retell LLM: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.llm_id;
}

export async function createRetellAgent(
  name: string,
  prompt: string,
  voiceId: string,
  language: string
): Promise<string> {
  console.log('Creating Retell LLM...');
  const llmId = await createRetellLLM(prompt);
  console.log('LLM created with ID:', llmId);

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

  console.log('Creating agent with payload:', JSON.stringify(payload, null, 2));
  console.log('API URL:', `${RETELL_API_URL}/create-agent`);

  const response = await fetch(`${RETELL_API_URL}/create-agent`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RETELL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  console.log('Response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Retell Agent API error:', errorText);
    console.error('Request payload:', JSON.stringify(payload, null, 2));

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
  console.log('Agent created:', data);
  return data.agent_id;
}

export async function updateRetellAgent(
  agentId: string,
  updates: {
    name?: string;
    prompt?: string;
    voiceId?: string;
    language?: string;
  }
): Promise<void> {
  const payload: UpdateAgentPayload = {};

  if (updates.name) payload.agent_name = updates.name;
  if (updates.voiceId) payload.voice_id = updates.voiceId;
  if (updates.language) payload.language = updates.language;

  if (updates.prompt) {
    payload.response_engine = {
      type: 'retell-llm',
      openai_model_name: 'gpt-4o-mini',
      general_prompt: updates.prompt,
    };
  }

  const response = await fetch(`${RETELL_API_URL}/update-agent/${agentId}`, {
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
  const response = await fetch(`${RETELL_API_URL}/delete-agent/${agentId}`, {
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
  const response = await fetch(`${RETELL_API_URL}/get-agent/${agentId}`, {
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
