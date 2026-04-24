# 2026-04-24 — Market Scanner and AEROC Ranking

## Summary

Added the full-platform market scanner surface and an AEROC ranking mode for debit-focused options strategy comparison.

## Changes

- Added `/scanner` route and Market Scanner page.
- Added `/strategies/scan` API support.
- Added ranking mode support to `/strategies/rank/:symbol`.
- Added AEROC/EROC strategy fields and scanner sector constants to shared types.
- Added stricter liquidity/spread filtering in the ranking service.
- Added a Lite daily top-options content page and local AEROC helper script.

## Verification

- `npm run build` passed.
- `npx vitest run client/src/__tests__/ranking.test.ts server/src/__tests__/ranking.test.ts` passed: 49 tests.
- Lite tests passed: 113/113.
