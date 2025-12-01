const RETELL_API_KEY = import.meta.env.VITE_RETELL_API_KEY;
const RETELL_API_URL = 'https://api.retellai.com';

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
  };
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
  const llmId = await createRetellLLM(prompt);

  const payload: CreateAgentPayload = {
    agent_name: name,
    voice_id: voiceId,
    language: language,
    response_engine: {
      type: 'retell-llm',
      llm_id: llmId,
    },
  };

  const response = await fetch(`${RETELL_API_URL}/create-agent`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RETELL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Retell Agent API error:', errorText);
    console.error('Request payload:', JSON.stringify(payload, null, 2));
    throw new Error(`Failed to create Retell agent: ${response.status} ${errorText}`);
  }

  const data = await response.json();
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
