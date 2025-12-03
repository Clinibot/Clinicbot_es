interface PhoneRequest {
  clinicId: string;
  clinicName: string;
  agentId: string;
  agentName: string;
  country: string;
}

const WEBHOOK_URL = 'https://telvia.app.n8n.cloud/webhook/f777f425-092a-4858-b24d-173246cfe77d';

export async function requestPhoneNumber(request: PhoneRequest): Promise<void> {
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'phone_number_request',
        timestamp: new Date().toISOString(),
        clinic: {
          id: request.clinicId,
          name: request.clinicName,
        },
        agent: {
          id: request.agentId,
          name: request.agentName,
        },
        country: request.country,
        pricing: request.country === 'España' ? '5€/mes' : 'Consultar',
      }),
    });

    if (!response.ok) {
      throw new Error(`Error al enviar solicitud: ${response.status} ${response.statusText}`);
    }

    return;
  } catch (error) {
    console.error('Error requesting phone number:', error);
    throw error;
  }
}
