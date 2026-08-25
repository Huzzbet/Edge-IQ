# Edge-IQ API setup

## What you need to do with your free Odds API key

**Do not send the key to me and do not paste it into GitHub.**

The key belongs in Cloudflare as a Worker **Secret** named exactly:

`ODDS_API_KEY`

Cloudflare keeps Worker secrets encrypted and makes them available to the Worker through `env.ODDS_API_KEY`. citehttps://developers.cloudflare.com/workers/configuration/secrets/

## Recommended setup from your iPhone

1. Open the Cloudflare dashboard.
2. Go to **Workers & Pages**.
3. Open the Worker **edge-iq-odds**.
4. Open **Settings**.
5. Find **Variables and Secrets**.
6. Select **Add**.
7. Choose **Secret**.
8. Variable name: `ODDS_API_KEY`
9. Paste your free Odds API key into **Value**.
10. Save/deploy the Worker.

Cloudflare's current dashboard flow is Workers & Pages → Worker → Settings → Variables and Secrets → Add → Secret → Deploy. citeturn1search0

### Alternative: Wrangler

If you later use a terminal, this also works:

```bash
npx wrangler secret put ODDS_API_KEY
```

Cloudflare will prompt for the value and store it as a Worker secret. citeturn1search0

## Edge-IQ architecture

`index.html` is a static GitHub Pages app. It never contains the Odds API key.

`worker.js` is the server-side proxy. It reads `env.ODDS_API_KEY` and forwards the request to Odds API using the `X-API-Key` header.

The browser only calls the Worker when **LOAD LIVE ODDS** is pressed. There is deliberately:

- no polling
- no page-load API request
- no filter-triggered API request
- no timer
- no SSE connection
- no WebSocket connection

One button press = one browser request to the Worker = one upstream Odds API snapshot request.

## Edge-IQ setup

After the Worker is deployed:

1. Copy the Worker URL, for example `https://edge-iq-odds.<your-subdomain>.workers.dev`.
2. Open Edge-IQ.
3. Expand **API connection settings**.
4. Paste the Worker URL.
5. Tap **Save**.
6. Select AFL, NBA or NBL.
7. Tap **LOAD LIVE ODDS**.

The first request should then return the live snapshot.

## EV + Kelly

The market board now lets you enter a **Model %** for any selection. Edge-IQ calculates locally:

- implied probability
- fair odds
- EV %
- Kelly %
- suggested stake from the selected bankroll

These calculations use the cached odds snapshot and create **zero additional API requests**.

The default staking setting is **Half Kelly** with a $5,000 example bankroll; both are editable and saved locally in your browser.

## Bookmakers

Use canonical bookmaker keys such as `sportsbet`, `tab`, `ladbrokes`, `bet365ww`, `neds` or `unibet` where available. The current Odds API bookmaker catalog is the authority for the keys available to your API client. citeturn0search5

## Security

Never put the Odds API key in:

- `index.html`
- `worker.js`
- `wrangler.toml`
- GitHub commits
- the Edge-IQ API connection field
- screenshots or public posts

If a key is ever accidentally committed or exposed, revoke/rotate it with the API provider immediately.
