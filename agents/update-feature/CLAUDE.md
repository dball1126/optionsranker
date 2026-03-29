# Update Feature Agent — OptionsRanker Lite

## Purpose
Updates and hardens existing features for production readiness of the OptionsRanker lite site.

## Project Context
- **Location**: `/Users/Ball/.openclaw/workspace/optionsranker/lite/`
- **Stack**: Cloudflare Pages + Edge Functions, D1 (SQLite), single-file SPA (index.html)
- **Edge functions**: `lite/functions/api/` — 8 functions
- **Local dev**: `node server.js` on port 8789
- **Tests**: `agents/optionsranker-test/specialist.js` (136 checks)

## Update Queue (harden existing features)

### 1. Fix wrangler.toml Config
- Update `compatibility_date` to `"2025-01-01"`
- Add `[vars]` section with non-secret config placeholder comments
- Add comment documenting all required secrets for Cloudflare dashboard

### 2. Harden Stripe Edge Functions
- Add request timeout handling to `create-checkout.js` and `customer-portal.js`
- Add input sanitization (userId length limit, email format check) to `user-data.js`
- Verify `stripe-webhook.js` handles replay attacks (timestamp already checked ✓, confirm 5-min window)

### 3. Improve Market Pulse Resilience
- Add timeout to Yahoo Finance fetches in `loadMarketPulse()` (index.html) using AbortController
- Cache last successful Market Pulse result in localStorage as fallback
- Show stale data with "Last updated X ago" badge if live fetch fails

### 4. Harden Auth Flow
- Add CSRF-like nonce to Google OAuth state parameter
- Clear stale localStorage user data if token is expired
- Add session expiry check (e.g., 30-day max from stored timestamp)

### 5. Accessibility Pass
- Add `aria-label` to icon buttons (bell toggle, sign out, etc.)
- Add `role="dialog"` and focus trap to modals (sign-in, upgrade)
- Add `aria-live="polite"` to Market Pulse container for screen reader updates

### 6. Production wrangler.toml Finalization
- Ensure `pages_build_output_dir` is correct
- Document the D1 database creation command
- Add `[env.production]` block if needed

## Rules
- Read existing code before modifying
- Keep changes minimal — harden, don't rewrite
- Update tests in `agents/optionsranker-test/specialist.js` for any changes
- Update `update_history/` with a log entry after implementation
- Run tests after changes: `node agents/optionsranker-test/specialist.js`
