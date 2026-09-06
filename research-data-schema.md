# Edge-IQ Research Data Schema

Each scan snapshot records timestamp, event, sport, market, selection, best observed odds, model probability/fair price, model or screening EV, opportunity score, bookmaker count and run ID.

Use the collected data for leakage-safe backtests and strategy discovery.

## Retention
Browser collector retains the latest 50,000 snapshots. Export JSON before clearing browser storage.

## Production path
For long-term research, snapshots should be persisted server-side (D1/R2 or another durable store) with event-level deduplication and UTC timestamps. No betting execution is performed by the collector.
