# Market Pulse Signals + Email Notifications

**Date**: 2026-03-29
**Session**: Market Pulse persistence, transition detection, and email alerts

## What Changed

### Schema (`lite/schema.sql`)
- Added `signal_snapshots` table — stores daily market pulse signal values (SPY vs 200MA, breadth, VIX), upserted once per day with `notification_sent` flag to prevent duplicate emails
- Added `notification_log` table — audit trail for all email notifications sent

### New Edge Function (`lite/functions/api/market-pulse.js`)
- 4 actions: `report-signals`, `history`, `preferences`, `get-preferences`
- Transition detection: when bullish_count goes from <3 to 3, queries all opted-in users and sends email via Resend HTTP API
- Duplicate prevention: sets `notification_sent = 1` on the snapshot after sending

### Local Dev Server (`lite/server.js`)
- Added `/api/market-pulse` route with in-memory stores mirroring all 4 edge function actions
- Console-logs simulated email sends in dev mode

### Client (`lite/index.html`)
- `userPreferences` global state + `loadUserPreferences()` / `toggleMarketPulseAlerts()` functions
- Bell icon toggle in header for signed-in non-guest users
- Fire-and-forget POST to `/api/market-pulse?action=report-signals` after computing signals
- Opt-in CTA in Market Pulse section: "Get notified when all 3 signals align"
- CSS for `.mp-alert-cta`, `.mp-alert-btn`, `.mp-bell-btn`

### Test Agent (`agents/optionsranker-test/specialist.js`)
- New file with 20 test checks covering all API endpoints, HTML references, and schema definitions
- All 20 tests passing

## Production Steps Remaining
- Set `RESEND_API_KEY` env var in Cloudflare Pages
- Run new schema statements on D1
- Verify `from` email domain in Resend
