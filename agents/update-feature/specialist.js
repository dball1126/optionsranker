/**
 * OptionsRanker — Update Feature Agent
 *
 * Scans the lite site codebase and determines which production-hardening
 * updates have been applied and which are still pending.
 *
 * Usage:
 *   node agents/update-feature/specialist.js           # status report
 *   node agents/update-feature/specialist.js --verify   # verify updates against dev server
 *
 * Update queue:
 *   1. Fix wrangler.toml Config
 *   2. Harden Stripe Edge Functions
 *   3. Improve Market Pulse Resilience
 *   4. Harden Auth Flow
 *   5. Accessibility Pass
 *   6. Production wrangler.toml Finalization
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const LITE_DIR = path.resolve(__dirname, '../../lite');
const BASE = 'http://localhost:8789';
const verifyMode = process.argv.includes('--verify');

let passed = 0;
let failed = 0;

function check(condition, label) {
  if (condition) {
    console.log(`    ✓ ${label}`);
    passed++;
  } else {
    console.log(`    ✗ ${label}`);
    failed++;
  }
  return condition;
}

function readFile(relativePath) {
  try {
    return fs.readFileSync(path.join(LITE_DIR, relativePath), 'utf-8');
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────
// Update detection functions
// ─────────────────────────────────────────

function checkUpdate1_WranglerConfig() {
  const wrangler = readFile('wrangler.toml');

  const checks = {
    compatDateUpdated: wrangler && !wrangler.includes('2024-01-01'),
    hasVarsSection: wrangler && (wrangler.includes('[vars]') || wrangler.includes('[env')),
    hasSecretsDocs: wrangler && (wrangler.includes('STRIPE') || wrangler.includes('# Secret')),
    noPlaceholderDbId: wrangler && !wrangler.includes('database_id = "PLACEHOLDER"'),
  };

  return {
    implemented: checks.compatDateUpdated && checks.hasVarsSection && checks.noPlaceholderDbId,
    partial: Object.values(checks).some(v => v),
    checks,
  };
}

function checkUpdate2_StripeHardening() {
  const checkout = readFile('functions/api/create-checkout.js');
  const portal = readFile('functions/api/customer-portal.js');
  const userData = readFile('functions/api/user-data.js');
  const webhook = readFile('functions/api/stripe-webhook.js');

  const checks = {
    checkoutHasTimeout: checkout && (checkout.includes('AbortController') || checkout.includes('timeout') || checkout.includes('signal')),
    portalHasTimeout: portal && (portal.includes('AbortController') || portal.includes('timeout') || portal.includes('signal')),
    userDataValidatesInput: userData && (userData.includes('.length') || userData.includes('sanitiz') || userData.includes('maxLength') || userData.includes('trim')),
    webhookHasTimestampCheck: webhook && webhook.includes('300'),  // 5-min = 300 seconds
  };

  return {
    implemented: Object.values(checks).filter(v => v).length >= 3,
    partial: Object.values(checks).some(v => v),
    checks,
  };
}

function checkUpdate3_MarketPulseResilience() {
  const html = readFile('index.html');

  const checks = {
    hasAbortController: html && html.includes('AbortController') && html.includes('loadMarketPulse'),
    hasLocalStorageCache: html && (html.includes('mp_cache') || html.includes('market_pulse_cache') || html.includes('mp-cache')),
    hasStaleDataBadge: html && (html.includes('Last updated') || html.includes('ago') || html.includes('stale')),
    hasFetchTimeout: html && (html.includes('AbortSignal.timeout') || (html.includes('AbortController') && html.includes('setTimeout'))),
  };

  return {
    implemented: checks.hasAbortController && checks.hasLocalStorageCache,
    partial: Object.values(checks).some(v => v),
    checks,
  };
}

function checkUpdate4_AuthHardening() {
  const html = readFile('index.html');

  const checks = {
    hasSessionExpiry: html && (html.includes('session_expir') || html.includes('loginAt') || html.includes('auth_timestamp') || html.includes('30 * 24')),
    clearsStaleData: html && (html.includes('isExpired') || html.includes('stale') || (html.includes('removeItem') && html.includes('optionsranker_user'))),
    hasNonceOrState: html && (html.includes('nonce') || html.includes('state') || html.includes('csrf')),
  };

  return {
    implemented: checks.hasSessionExpiry && checks.clearsStaleData,
    partial: Object.values(checks).some(v => v),
    checks,
  };
}

function checkUpdate5_Accessibility() {
  const html = readFile('index.html');

  const checks = {
    hasAriaLabels: html && (html.match(/aria-label/g) || []).length >= 3,
    hasRoleDialog: html && html.includes('role="dialog"'),
    hasFocusTrap: html && (html.includes('focusTrap') || html.includes('focus-trap') || html.includes('tabindex')),
    hasAriaLive: html && html.includes('aria-live'),
  };

  return {
    implemented: checks.hasAriaLabels && checks.hasRoleDialog && checks.hasAriaLive,
    partial: Object.values(checks).some(v => v),
    checks,
  };
}

function checkUpdate6_WranglerFinalization() {
  const wrangler = readFile('wrangler.toml');

  const checks = {
    correctBuildDir: wrangler && wrangler.includes('pages_build_output_dir'),
    hasD1CreateDocs: wrangler && (wrangler.includes('wrangler d1 create') || wrangler.includes('# D1')),
    hasProductionEnv: wrangler && (wrangler.includes('[env.production]') || wrangler.includes('[env]')),
    noPlaceholders: wrangler && !wrangler.includes('PLACEHOLDER'),
  };

  return {
    implemented: checks.correctBuildDir && checks.noPlaceholders && (checks.hasD1CreateDocs || checks.hasProductionEnv),
    partial: Object.values(checks).some(v => v),
    checks,
  };
}

// ─────────────────────────────────────────
// Main
// ─────────────────────────────────────────

async function main() {
  console.log('\n=== OptionsRanker Update-Feature Agent ===');
  console.log('  Scanning codebase for hardening update status...\n');

  const updates = [
    { id: 1, name: 'Fix wrangler.toml Config', check: checkUpdate1_WranglerConfig },
    { id: 2, name: 'Harden Stripe Edge Functions', check: checkUpdate2_StripeHardening },
    { id: 3, name: 'Improve Market Pulse Resilience', check: checkUpdate3_MarketPulseResilience },
    { id: 4, name: 'Harden Auth Flow', check: checkUpdate4_AuthHardening },
    { id: 5, name: 'Accessibility Pass', check: checkUpdate5_Accessibility },
    { id: 6, name: 'Production wrangler.toml Finalization', check: checkUpdate6_WranglerFinalization },
  ];

  const results = [];

  for (const update of updates) {
    const result = update.check();
    results.push({ ...update, ...result });

    const icon = result.implemented ? '✅' : result.partial ? '🔶' : '⬜';
    const status = result.implemented ? 'DONE' : result.partial ? 'PARTIAL' : 'TODO';
    console.log(`  ${icon} Update #${update.id}: ${update.name} [${status}]`);

    for (const [key, val] of Object.entries(result.checks)) {
      const display = typeof val === 'boolean' ? (val ? '✓' : '✗') : val;
      console.log(`      ${display} ${key}: ${val}`);
    }
    console.log('');
  }

  // Summary
  const done = results.filter(r => r.implemented).length;
  const partial = results.filter(r => r.partial && !r.implemented).length;
  const todo = results.filter(r => !r.implemented && !r.partial).length;

  console.log('─'.repeat(50));
  console.log(`  Summary: ${done} done, ${partial} partial, ${todo} todo (${results.length} total)`);
  console.log('─'.repeat(50));

  // Next action
  const next = results.find(r => !r.implemented);
  if (next) {
    console.log(`\n  ➤ Next update to apply: #${next.id} — ${next.name}`);
    console.log(`    See agents/update-feature/CLAUDE.md for specs\n`);
  } else {
    console.log(`\n  ✅ All updates applied! Site is production-hardened.\n`);
  }

  // Exit code: 0 if all done, 1 if work remains
  process.exit(next ? 1 : 0);
}

main().catch(e => {
  console.error('Agent error:', e);
  process.exit(1);
});
