# Edge-IQ Odds API setup

Edge-IQ uses the Odds API only when **LOAD LIVE ODDS** is pressed.

## Architecture

`GitHub Pages dashboard → Cloudflare Worker → Odds API`

The Odds API key is never placed in `index.html` or committed to GitHub.

## Cloudflare Worker

Deploy `worker.js` as a Cloudflare Worker.

Add a Worker secret named:

`ODDS_API_KEY`

Set its value to your Odds API key.

The Worker URL should look like:

`https://edge-iq-odds.<your-subdomain>.workers.dev`

Then open Edge-IQ and enter that Worker URL in **API Proxy URL**.

## Request behaviour

- No API call on page load.
- No polling.
- No timers.
- No API calls when filters change.
- One request is made only when **LOAD LIVE ODDS** is pressed.
- The button is disabled while the request is running.
- Returned data is cached locally so filters can be changed without another API call.
- The dashboard records the number of API loads in the current browser session.

## Initial leagues

- AFL
- NBA
- NBL

The proxy uses the Odds API `main-lines/snapshot` endpoint so the initial odds load can retrieve multiple events/markets in one API request rather than making one request per event.

## Important

Do not put the API key in browser JavaScript, GitHub Pages, README files, or GitHub Secrets expecting GitHub Pages to expose it. The browser calls the Cloudflare Worker; the Worker holds the secret and calls the Odds API with `X-API-Key`.
