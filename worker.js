const API_BASE = 'https://api.odds-api.net/v1/odds/main-lines/snapshot';
const ALLOWED_ORIGINS = new Set([
  'https://huzzbet.github.io',
  'http://localhost:8788',
  'http://localhost:3000'
]);

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = ALLOWED_ORIGINS.has(origin) ? origin : 'https://huzzbet.github.io';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Accept, Content-Type',
    'Cache-Control': 'no-store',
    'Vary': 'Origin'
  };
}

export default {
  async fetch(request, env) {
    const headers = corsHeaders(request);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    if (request.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    if (!env.ODDS_API_KEY) {
      return new Response(JSON.stringify({
        error: 'ODDS_API_KEY is not configured on the Worker.'
      }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    const incoming = new URL(request.url);
    const league = incoming.searchParams.get('league') || 'AFL';
    const bookmakers = incoming.searchParams.get('bookmakers') || '';
    const limit = Math.min(Math.max(Number(incoming.searchParams.get('limit') || 25), 1), 100);

    const upstream = new URL(API_BASE);
    upstream.searchParams.set('league', league);
    upstream.searchParams.set('limit', String(limit));
    if (bookmakers) upstream.searchParams.set('bookmakers', bookmakers);

    try {
      const response = await fetch(upstream.toString(), {
        method: 'GET',
        headers: {
          'X-API-Key': env.ODDS_API_KEY,
          'Accept': 'application/json'
        }
      });

      const body = await response.text();
      const contentType = response.headers.get('content-type') || 'application/json';
      const outHeaders = {
        ...headers,
        'Content-Type': contentType,
        'X-Edge-IQ-API-Status': String(response.status)
      };

      return new Response(body, { status: response.status, headers: outHeaders });
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Unable to reach Odds API.',
        detail: error instanceof Error ? error.message : String(error)
      }), {
        status: 502,
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }
  }
};
