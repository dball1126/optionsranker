# 2026-04-21 15:11 EDT — Watchlist IV Heat

## Summary
- Upgraded the lite SPA watchlist to sort saved tickers by IV Rank instead of simple recency.
- Added IV heat badges (`Hot IV`, `Elevated IV`, `Balanced IV`, `Calm IV`) to each watchlist row.
- Added summary copy that counts hot, elevated, and calm setups on the landing page.

## Files
- `lite/index.html`
- `lite/tests/features.test.js`

## Verification
- `cd lite && node tests/features.test.js`
- Deployed preview: `https://48f4ac2f.optionsranker.pages.dev`
- Preview fetch confirms new watchlist summary and IV heat labels are present.

## Notes
- `optionsranker.io` custom-domain smoke remains blocked by the existing DNS issue documented in workspace memory; preview deployment succeeded.
