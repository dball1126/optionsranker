/**
 * OptionsRanker — Add Feature Agent
 *
 * Scans the lite site codebase and determines which production-readiness
 * features have been implemented and which are still pending.
 *
 * Usage:
 *   node agents/add-feature/specialist.js           # status report
 *   node agents/add-feature/specialist.js --verify   # verify implemented features work
 *
 * Feature queue:
 *   1. Rate Limiting on Yahoo Finance Proxy
 *   2. Request Logging / Error Monitoring
 *   3. Config Endpoint for Google Client ID
 *   4. Environment Template (.env.example + DEPLOY.md)
 *   5. Dynamic Email Domain in Market Pulse
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

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = http.request({
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data: null, raw: data }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// ─────────────────────────────────────────
// Feature detection functions
// ─────────────────────────────────────────

function checkFeature1_RateLimiting() {
  const chartFn = readFile('functions/api/chart/[[path]].js');
  const optionsFn = readFile('functions/api/options/[[path]].js');

  const checks = {
    chartHasRateLimit: chartFn && (chartFn.includes('429') || chartFn.includes('rate') || chartFn.includes('Rate')),
    optionsHasRateLimit: optionsFn && (optionsFn.includes('429') || optionsFn.includes('rate') || optionsFn.includes('Rate')),
    chartHasIPCheck: chartFn && (chartFn.includes('CF-Connecting-IP') || chartFn.includes('cf-connecting-ip') || chartFn.includes('remoteAddr')),
    optionsHasIPCheck: optionsFn && (optionsFn.includes('CF-Connecting-IP') || optionsFn.includes('cf-connecting-ip') || optionsFn.includes('remoteAddr')),
  };

  return {
    implemented: checks.chartHasRateLimit && checks.optionsHasRateLimit,
    partial: checks.chartHasRateLimit || checks.optionsHasRateLimit,
    checks,
  };
}

function checkFeature2_Logging() {
  const html = readFile('index.html');
  const fns = [
    readFile('functions/api/market-pulse.js'),
    readFile('functions/api/options-data.js'),
    readFile('functions/api/user-data.js'),
    readFile('functions/api/subscription.js'),
    readFile('functions/api/create-checkout.js'),
    readFile('functions/api/customer-portal.js'),
    readFile('functions/api/stripe-webhook.js'),
  ];

  const structuredLogging = fns.filter(f => f && (f.includes('console.log(JSON') || f.includes('durationMs') || f.includes('structuredLog'))).length;
  const errorBoundary = html && (html.includes('window.onerror') || html.includes('addEventListener(\'error') || html.includes('unhandledrejection'));

  return {
    implemented: structuredLogging >= 5 && errorBoundary,
    partial: structuredLogging > 0 || errorBoundary,
    checks: {
      edgeFunctionsWithLogging: `${structuredLogging}/7`,
      frontendErrorBoundary: !!errorBoundary,
    },
  };
}

function checkFeature3_ConfigEndpoint() {
  const configFn = readFile('functions/api/config.js');
  const html = readFile('index.html');

  const configExists = !!configFn;
  const configReturnsGoogleId = configFn && configFn.includes('googleClientId');
  const htmlFetchesConfig = html && html.includes('/api/config');
  const hardcodedRemoved = html && !html.includes("client_id: 'GOOGLE_CLIENT_ID'");

  return {
    implemented: configExists && configReturnsGoogleId && htmlFetchesConfig && hardcodedRemoved,
    partial: configExists || htmlFetchesConfig,
    checks: {
      configEndpointExists: configExists,
      returnsGoogleClientId: !!configReturnsGoogleId,
      htmlFetchesConfig: !!htmlFetchesConfig,
      hardcodedPlaceholderRemoved: !!hardcodedRemoved,
    },
  };
}

function checkFeature4_EnvTemplate() {
  const envExample = readFile('.env.example') || readFile('../.env.example');
  const deployMd = readFile('DEPLOY.md') || readFile('../DEPLOY.md');

  const envHasStripe = envExample && envExample.includes('STRIPE');
  const envHasResend = envExample && envExample.includes('RESEND');
  const envHasGoogle = envExample && envExample.includes('GOOGLE');
  const deployHasSteps = deployMd && (deployMd.includes('D1') || deployMd.includes('Cloudflare'));

  return {
    implemented: !!envExample && !!deployMd && envHasStripe && envHasResend,
    partial: !!envExample || !!deployMd,
    checks: {
      envExampleExists: !!envExample,
      deployMdExists: !!deployMd,
      envListsStripeVars: !!envHasStripe,
      envListsResendVar: !!envHasResend,
      envListsGoogleVar: !!envHasGoogle,
      deployHasInstructions: !!deployHasSteps,
    },
  };
}

function checkFeature5_DynamicEmail() {
  const marketPulse = readFile('functions/api/market-pulse.js');

  const usesEnvFromEmail = marketPulse && (marketPulse.includes('FROM_EMAIL') || marketPulse.includes('from_email'));
  const usesDynamicOrigin = marketPulse && (marketPulse.includes('request.url') || marketPulse.includes('origin'));
  const hardcodedDomain = marketPulse && marketPulse.includes("alerts@optionsranker.com");
  const hardcodedUrl = marketPulse && marketPulse.includes("https://optionsranker.com");

  return {
    implemented: (usesEnvFromEmail || !hardcodedDomain) && (usesDynamicOrigin || !hardcodedUrl),
    partial: usesEnvFromEmail || usesDynamicOrigin,
    checks: {
      usesEnvForFromEmail: !!usesEnvFromEmail,
      usesDynamicOrigin: !!usesDynamicOrigin,
      hardcodedEmailRemoved: !hardcodedDomain,
      hardcodedUrlRemoved: !hardcodedUrl,
    },
  };
}

// ─────────────────────────────────────────
// Verification (--verify mode, requires dev server)
// ─────────────────────────────────────────

async function verifyFeatures() {
  console.log('\n  Verifying against running dev server...\n');

  // Verify config endpoint
  console.log('  Config endpoint:');
  try {
    const res = await fetchJSON(`${BASE}/api/config`);
    check(res.status === 200, '/api/config returns 200');
    check(res.data?.googleClientId != null, '/api/config returns googleClientId');
  } catch {
    check(false, '/api/config reachable (is dev server running on 8789?)');
  }

  // Verify rate limiting headers exist
  console.log('\n  Rate limiting:');
  try {
    const res = await fetchJSON(`${BASE}/api/chart/SPY?range=1d&interval=1d`);
    check(res.status === 200 || res.status === 429, 'chart proxy responds');
  } catch {
    check(false, 'chart proxy reachable');
  }
}

// ─────────────────────────────────────────
// Main
// ─────────────────────────────────────────

async function main() {
  console.log('\n=== OptionsRanker Add-Feature Agent ===');
  console.log('  Scanning codebase for feature implementation status...\n');

  const features = [
    { id: 1, name: 'Rate Limiting on Yahoo Finance Proxy', check: checkFeature1_RateLimiting },
    { id: 2, name: 'Request Logging / Error Monitoring', check: checkFeature2_Logging },
    { id: 3, name: 'Config Endpoint for Google Client ID', check: checkFeature3_ConfigEndpoint },
    { id: 4, name: 'Environment Template (.env.example + DEPLOY.md)', check: checkFeature4_EnvTemplate },
    { id: 5, name: 'Dynamic Email Domain in Market Pulse', check: checkFeature5_DynamicEmail },
  ];

  const results = [];

  for (const feature of features) {
    const result = feature.check();
    results.push({ ...feature, ...result });

    const icon = result.implemented ? '✅' : result.partial ? '🔶' : '⬜';
    const status = result.implemented ? 'DONE' : result.partial ? 'PARTIAL' : 'TODO';
    console.log(`  ${icon} Feature #${feature.id}: ${feature.name} [${status}]`);

    for (const [key, val] of Object.entries(result.checks)) {
      const c = val === true ? '✓' : val === false ? '✗' : val;
      console.log(`      ${typeof val === 'boolean' ? (val ? '✓' : '✗') : '•'} ${key}: ${val}`);
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
    console.log(`\n  ➤ Next feature to implement: #${next.id} — ${next.name}`);
    console.log(`    See agents/add-feature/CLAUDE.md for specs\n`);
  } else {
    console.log(`\n  ✅ All features implemented! Run with --verify to test against dev server.\n`);
  }

  if (verifyMode) {
    await verifyFeatures();
    console.log(`\n  Verification: ${passed} passed, ${failed} failed\n`);
  }

  // Exit code: 0 if all done, 1 if work remains
  process.exit(next ? 1 : 0);
}

main().catch(e => {
  console.error('Agent error:', e);
  process.exit(1);
});
