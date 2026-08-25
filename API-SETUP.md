# Edge-IQ API setup

## Architecture

`index.html` is a static GitHub Pages app. It never contains the Odds API key.

`worker.js` is the server-side proxy. It reads the `ODDS_API_KEY` secret from Cloudflare and forwards a single snapshot request to Odds API.

The browser only calls the Worker when **LOAD LIVE ODDS** is pressed. Filters, sorting and cached-data rendering do not call the API.

## Cloudflare Worker

1. Deploy `worker.js` using the Worker name in `wrangler.toml` (`edge-iq-odds`).
2. Add the API key as a Cloudflare Worker secret named `ODDS_API_KEY`.
3. Do **not** put the key in `index.html`, `wrangler.toml`, GitHub Secrets exposed to the browser, or any committed file.
4. Copy the deployed Worker URL into **API connection settings** in Edge-IQ.

With Wrangler, the secret can be added with:

```bash
npx wrangler secret put ODDS_API_KEY
```

The value entered at the prompt is stored by Cloudflare and is not committed to the repository.

## Manual request policy

Edge-IQ intentionally has no polling loop, page-load request, filter-triggered request, timer, SSE connection or WebSocket connection.

One click on **LOAD LIVE ODDS** produces one browser request to the Worker. The Worker makes one upstream Odds API snapshot request for that load.

The returned snapshot is cached in `localStorage` for the current browser. Changing the minimum-odds filter only re-renders that cached snapshot.

## API parameters

The Worker accepts:

- `league`: `AFL`, `NBA`, or `NBL`
- `limit`: maximum number of events, capped at 100
- `bookmakers`: optional comma-separated bookmaker keys

Example Worker request:

`/odds?league=AFL&limit=25&bookmakers=sportsbet,tab`

The Worker sends the API key upstream using the `X-API-Key` header.

## Next EV layer

The normalized market board already exposes:

- event
- start time
- market
- selection
- line
- bookmaker
- decimal odds
- implied probability

The next layer will add model probability, fair odds, edge, EV%, Kelly fraction and bookmaker-best-price ranking without creating any additional odds API requests.
