# Production Readiness Agents Setup

**Date**: 2026-03-29
**Session**: Created add-feature and update-feature agents with weekly cron schedule

## What Changed

### New Agent: `agents/add-feature/CLAUDE.md`
Implements 5 new features needed for production:
1. Rate limiting on Yahoo Finance proxy (30 req/min per IP)
2. Structured request logging / error monitoring for all edge functions
3. `/api/config` endpoint to replace hardcoded Google Client ID placeholder
4. `.env.example` + `DEPLOY.md` deployment documentation
5. Dynamic email domain in market-pulse.js (from env vars instead of hardcoded)

### New Agent: `agents/update-feature/CLAUDE.md`
Hardens 6 existing features for production:
1. Fix wrangler.toml (compatibility_date, DB ID placeholder, vars section)
2. Harden Stripe edge functions (timeouts, input sanitization)
3. Market Pulse resilience (AbortController timeouts, localStorage cache fallback)
4. Auth flow hardening (session expiry, stale data cleanup)
5. Accessibility pass (aria-labels, focus traps, screen reader updates)
6. Production wrangler.toml finalization

### Weekly Cron Schedule (session-only)
- Mon 3/31: add-feature #1 + #2 (rate limiting, logging)
- Tue 4/1: add-feature #3 + #5 (config endpoint, dynamic email)
- Wed 4/2: update-feature #1 + #2 (wrangler config, Stripe hardening)
- Thu 4/3: update-feature #3 + #4 (Market Pulse resilience, auth hardening)
- Fri 4/4: both agents — accessibility, wrangler finalization, DEPLOY.md, full test run

## Production Readiness Analysis
Site is feature-complete but has config/hardening gaps. Target: production-ready by end of week (4/4).
