import { buildRatings, predict, normaliseTeam } from './afl-model.js';

const API_BASE = 'https://api.odds-api.net/v1/odds/main-lines/snapshot';
const AFL_HISTORY_BASE = 'https://api.squiggle.com.au/?q=games;year=';
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

async function fetchAflHistory() {
  const years = [2024, 2025, 2026];
  const responses = await Promise.all(years.map(y => fetch(`${AFL_HISTORY_BASE}${y}`, {
    headers: { 'Accept': 'application/json' }
  })));
  const payloads = await Promise.all(responses.map(r => r.ok ? r.json() : { games: [] }));
  return payloads.flatMap(p => Array.isArray(p.games) ? p.games : []);
}

async function attachAflModel(events) {
  try {
    const history = await fetchAflHistory();
    const model = buildRatings(history);
    const predictions = predict(model, events);
    const byEvent = new Map(predictions.map(p => [String(p.event_id), p]));
    return {
      events: events.map(e => {
        const p = byEvent.get(String(e.event_id));
        if (!p) return e;
        return {
          ...e,
          model_probabilities: {
            home: p.homeProbability,
            away: p.awayProbability
          },
          model_source: p.source,
          model_games_used: p.gamesUsed
        };
      }),
      model_meta: {
        source: 'AFL_ELO_V1',
        history_games: model.gamesUsed,
        years: [2024, 2025, 2026]
      }
    };
  } catch (error) {
    return {
      events,
      model_meta: {
        source: 'UNAVAILABLE',
        error: error instanceof Error ? error.message : String(error)
      }
    };
  }
}

export default {
  async fetch(request, env) {
    const headers = corsHeaders(request);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'GET') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...headers, 'Content-Type': 'application/json' } });
    if (!env.ODDS_API_KEY) return new Response(JSON.stringify({ error: 'ODDS_API_KEY is not configured on the Worker.' }), { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } });

    const incoming = new URL(request.url);
    const league = incoming.searchParams.get('league') || 'AFL';
    const bookmakers = incoming.searchParams.get('bookmakers') || '';
    const limit = Math.min(Math.max(Number(incoming.searchParams.get('limit') || 25), 1), 100);
    const upstream = new URL(API_BASE);
    upstream.searchParams.set('league', league);
    upstream.searchParams.set('limit', String(limit));
    if (bookmakers) upstream.searchParams.set('bookmakers', bookmakers);

    try {
      const response = await fetch(upstream.toString(), { headers: { 'X-API-Key': env.ODDS_API_KEY, 'Accept': 'application/json' } });
      const body = await response.json();
      if (!response.ok) return new Response(JSON.stringify(body), { status: response.status, headers: { ...headers, 'Content-Type': 'application/json' } });

      let enriched = body;
      if (league.toUpperCase() === 'AFL' && Array.isArray(body.events)) enriched = await attachAflModel(body.events).then(x => ({ ...body, ...x }));

      return new Response(JSON.stringify(enriched), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json', 'X-Edge-IQ-API-Status': String(response.status) }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Unable to reach Odds API or AFL model data source.', detail: error instanceof Error ? error.message : String(error) }), {
        status: 502,
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }
  }
};
