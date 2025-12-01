const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { eventTypeId, start, name, email, phone, apiKey } = await req.json();

    if (!eventTypeId || !start || !name || !email || !apiKey) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const bookingData = {
      eventTypeId,
      start,
      responses: {
        name,
        email,
        ...(phone && { phone }),
      },
      metadata: {},
      timeZone: 'Europe/Madrid',
    };

    // Cal.com API usa el parámetro apiKey en la URL
    const url = `https://api.cal.com/v1/bookings?apiKey=${encodeURIComponent(apiKey)}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bookingData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error creating booking');
    }

    const data = await response.json();

    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating booking:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});