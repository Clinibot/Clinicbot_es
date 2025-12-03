const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ProxyRequest {
  webhook_url: string;
  api_key?: string;
  payload: Record<string, any>;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: ProxyRequest = await req.json();

    console.log('📞 Custom Function Proxy Request:', {
      webhook_url: body.webhook_url,
      has_api_key: !!body.api_key,
      payload: body.payload
    });

    if (!body.webhook_url) {
      return new Response(
        JSON.stringify({ error: 'webhook_url is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build headers for the webhook request
    const webhookHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (body.api_key) {
      webhookHeaders['Authorization'] = `Bearer ${body.api_key}`;
    }

    // Make the request to the user's webhook
    const webhookResponse = await fetch(body.webhook_url, {
      method: 'POST',
      headers: webhookHeaders,
      body: JSON.stringify(body.payload),
    });

    const webhookData = await webhookResponse.json();

    console.log('✅ Webhook Response:', {
      status: webhookResponse.status,
      data: webhookData
    });

    // Return the webhook response back to Retell
    return new Response(
      JSON.stringify({
        success: webhookResponse.ok,
        status: webhookResponse.status,
        data: webhookData
      }),
      {
        status: webhookResponse.ok ? 200 : webhookResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('❌ Custom Function Proxy Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
