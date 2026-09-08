// Cloudflare Worker — recebe o clique da LP e envia o evento Lead
// para a API de Conversões da Meta. O token fica em uma variável
// secreta do Worker (CAPI_TOKEN), nunca no HTML público.
//
// Variáveis (Settings > Variables and Secrets):
//   PIXEL_ID        = 937714796060798
//   CAPI_TOKEN      = (secret) seu token da API de Conversões
//   ALLOWED_ORIGIN  = https://marcelobellotti.github.io   (opcional)
//   TEST_EVENT_CODE = TESTxxxxx  (opcional, só enquanto testa no Gerenciador de Eventos)

export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST')   return new Response('Method not allowed', { status: 405, headers: cors });

    let body;
    try { body = JSON.parse(await request.text()); }
    catch { return new Response('Bad JSON', { status: 400, headers: cors }); }

    const event = {
      event_name: body.event_name || 'Lead',
      event_time: Math.floor(Date.now() / 1000),
      event_id: body.event_id,
      event_source_url: body.event_source_url,
      action_source: 'website',
      user_data: {
        client_ip_address: request.headers.get('CF-Connecting-IP') || undefined,
        client_user_agent: request.headers.get('User-Agent') || undefined,
        fbp: body.fbp || undefined,
        fbc: body.fbc || undefined,
      },
      custom_data: { content_name: body.cta || undefined },
    };

    const payload = { data: [event] };
    if (env.TEST_EVENT_CODE) payload.test_event_code = env.TEST_EVENT_CODE;

    const url = `https://graph.facebook.com/v21.0/${env.PIXEL_ID}/events?access_token=${env.CAPI_TOKEN}`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return new Response(await r.text(), {
      status: r.status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  },
};
