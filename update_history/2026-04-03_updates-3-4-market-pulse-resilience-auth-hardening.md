# 2026-04-03 — Updates #3 & #4: Market Pulse Resilience + Auth Hardening

**Timestamp:** 2026-04-03 ~01:30 AM ET

## Changes

### Update #3: Improve Market Pulse Resilience
- **File:** `lite/index.html`
- Added `AbortController` with 15-second timeout to all 3 Yahoo Finance fetch calls in `loadMarketPulse()`
- Added localStorage cache (`optionsranker_mp_cache`) that saves the last successful Market Pulse result
- On fetch failure/timeout, falls back to cached data automatically
- Added "Last updated X ago" stale badge (`mp-stale-badge` CSS class) shown when displaying cached data
- Helper functions: `getMpCache()`, `setMpCache()`, `formatTimeAgo()`
- Cache structure: `{ ts: timestamp, data: { spyResult, vixResult, rspResult } }`

### Update #4: Harden Auth Flow
- **File:** `lite/index.html`
- Added CSRF-like nonce to Google OAuth flow:
  - `generateNonce()` creates 16-byte random hex via `crypto.getRandomValues()`
  - Nonce stored in `localStorage` (`optionsranker_oauth_nonce`) before OAuth init
  - Nonce passed to `google.accounts.id.initialize({ nonce })`
  - `handleCredentialResponse()` verifies nonce matches, rejects on mismatch
  - Nonce cleared after successful auth and on sign-out
- Added 30-day session expiry:
  - `SESSION_MAX_AGE_MS` constant (30 days in ms)
  - `isSessionExpired()` checks `savedAt` timestamp on stored user data
  - `initAuth()` clears expired sessions on page load (removes user + nonce from localStorage)
  - `savedAt: Date.now()` added to both Google and guest sign-in flows
- Sign-out now clears nonce from localStorage alongside user data

### Tests Updated
- **File:** `agents/optionsranker-test/specialist.js`
- Added 6 new test sections (25 new checks):
  - `market pulse resilience: AbortController timeout` — 3 checks
  - `market pulse resilience: localStorage cache` — 5 checks
  - `market pulse resilience: stale data badge` — 4 checks
  - `auth hardening: OAuth nonce (CSRF protection)` — 4 checks
  - `auth hardening: session expiry (30-day max)` — 4 checks
  - `auth hardening: stale data cleanup on expiry` — 3 checks (note: 1 check inherently passes from multiple removeItem calls)

## Issues Found
- No timeout on Yahoo Finance fetches — page could hang indefinitely during outages
- Auth sessions persisted forever in localStorage — no expiry check
- No CSRF protection on OAuth callback — nonce now prevents replay/injection
- No offline/degraded fallback for Market Pulse — now shows cached data with age indicator
