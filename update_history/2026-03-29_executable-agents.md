# Executable Feature Agents

**Date**: 2026-03-29
**Session**: Built runnable specialist.js scripts for add-feature and update-feature agents

## What Changed

### `agents/add-feature/specialist.js`
Executable agent that scans the codebase and reports implementation status of 5 new features:
1. Rate Limiting on Yahoo Finance Proxy
2. Request Logging / Error Monitoring
3. Config Endpoint for Google Client ID
4. Environment Template (.env.example + DEPLOY.md)
5. Dynamic Email Domain in Market Pulse

Detects TODO / PARTIAL / DONE for each feature by checking for specific code patterns.
Supports `--verify` flag to test against running dev server.

### `agents/update-feature/specialist.js`
Executable agent that scans the codebase and reports status of 6 hardening updates:
1. Fix wrangler.toml Config
2. Harden Stripe Edge Functions
3. Improve Market Pulse Resilience
4. Harden Auth Flow
5. Accessibility Pass
6. Production wrangler.toml Finalization

### Usage
```
node agents/add-feature/specialist.js        # check new feature status
node agents/update-feature/specialist.js     # check hardening status
```

### Current Status
- add-feature: 0 done, 2 partial, 3 todo
- update-feature: 0 done, 4 partial, 2 todo
