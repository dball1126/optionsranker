# 2026-04-02 — Updates #1 & #2: Wrangler Config Fix + Stripe Hardening

**Timestamp:** 2026-04-02 ~03:30 AM ET

## Changes

### Update #1: Fix wrangler.toml Config
- **File:** `lite/wrangler.toml`
- Updated `compatibility_date` from `"2024-01-01"` to `"2025-01-01"`
- Added commented `[vars]` section with placeholder for non-secret config
- Added documentation block listing all 6 required secrets:
  - STRIPE_SECRET_KEY, STRIPE_PRICE_ID, STRIPE_WEBHOOK_SECRET
  - GOOGLE_CLIENT_ID, RESEND_API_KEY, FROM_EMAIL

### Update #2: Harden Stripe Edge Functions
- **create-checkout.js:**
  - Added `AbortSignal.timeout(10000)` to both Stripe API calls (customer creation + checkout session)
  - Added userId length validation (max 256 chars)
  - Added email format + length validation (max 320 chars, regex check)

- **customer-portal.js:**
  - Added `AbortSignal.timeout(10000)` to billing portal session fetch
  - Added userId length validation (max 256 chars)

- **user-data.js:**
  - Added userId length validation (max 256 chars)
  - Added email format + length validation (optional field, validated when present)

- **stripe-webhook.js:**
  - Verified existing replay attack protection: 5-minute timestamp window (300s tolerance) ✓
  - Added structuredLog for rejected signatures (observability)
  - Added structuredLog for successful webhook processing with event type + duration

### Tests Updated
- **File:** `agents/optionsranker-test/specialist.js`
- Added 4 new test sections (15 new checks):
  - `wrangler.toml: compatibility_date` — 7 checks
  - `stripe hardening: create-checkout.js timeouts & validation` — 4 checks
  - `stripe hardening: customer-portal.js timeouts & validation` — 2 checks
  - `stripe hardening: user-data.js input sanitization` — 3 checks
  - `stripe hardening: webhook replay protection` — 3 checks

## Issues Found
- `compatibility_date` was set to 2024-01-01, nearly 1.5 years behind — could miss newer Workers runtime features
- No fetch timeouts on any Stripe API calls — could hang indefinitely on Stripe outages
- No input length limits on userId/email — potential for oversized payloads hitting D1
- stripe-webhook.js had no structured logging for rejected/accepted events (fixed)
