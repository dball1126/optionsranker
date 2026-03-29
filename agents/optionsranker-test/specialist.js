/**
 * OptionsRanker Test Agent — Market Pulse Notification checks
 *
 * Validates:
 * 1. /api/market-pulse?action=report-signals POST returns { saved: true }
 * 2. /api/market-pulse?action=get-preferences GET returns preferences object
 * 3. index.html contains market-pulse and toggleMarketPulseAlerts references
 * 4. schema.sql references signal_snapshots and notification_log tables
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:8789';
const LITE_DIR = path.resolve(__dirname, '../../lite');

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.log(`  ✗ ${label}`);
    failed++;
  }
}

function fetchJSON(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: null, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function runTests() {
  console.log('\n=== OptionsRanker Market Pulse Tests ===\n');

  // Test 1: report-signals endpoint
  console.log('API: report-signals');
  try {
    const res = await fetchJSON(`${BASE}/api/market-pulse?action=report-signals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spy_above_200: true,
        spy_pct_from_200: 3.5,
        breadth_improving: true,
        rsp_vs_spy: 0.8,
        vix_bullish: true,
        vix_current: 17.5,
        vix_20_high: 28.3,
        bullish_count: 3,
      }),
    });
    assert(res.status === 200, 'report-signals returns 200');
    assert(res.data?.saved === true, 'report-signals returns { saved: true }');
    assert(typeof res.data?.date === 'string', 'report-signals returns date');
  } catch (e) {
    assert(false, `report-signals failed: ${e.message}`);
  }

  // Test 2: history endpoint
  console.log('\nAPI: history');
  try {
    const res = await fetchJSON(`${BASE}/api/market-pulse?action=history`);
    assert(res.status === 200, 'history returns 200');
    assert(Array.isArray(res.data?.history), 'history returns array');
    assert(res.data.history.length > 0, 'history has at least 1 snapshot after report');
  } catch (e) {
    assert(false, `history failed: ${e.message}`);
  }

  // Test 3: get-preferences endpoint
  console.log('\nAPI: get-preferences');
  try {
    const res = await fetchJSON(`${BASE}/api/market-pulse?action=get-preferences&userId=test_user_123`);
    assert(res.status === 200, 'get-preferences returns 200');
    assert(typeof res.data?.preferences === 'object', 'get-preferences returns preferences object');
  } catch (e) {
    assert(false, `get-preferences failed: ${e.message}`);
  }

  // Test 4: preferences toggle endpoint
  console.log('\nAPI: preferences toggle');
  try {
    const res = await fetchJSON(`${BASE}/api/market-pulse?action=preferences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'test_user_123', market_pulse_alerts: true }),
    });
    assert(res.status === 200, 'preferences toggle returns 200');
    assert(res.data?.saved === true, 'preferences toggle returns { saved: true }');
    assert(res.data?.preferences?.market_pulse_alerts === true, 'market_pulse_alerts set to true');
  } catch (e) {
    assert(false, `preferences toggle failed: ${e.message}`);
  }

  // Test 5: index.html contains market-pulse references
  console.log('\nHTML: index.html checks');
  try {
    const html = fs.readFileSync(path.join(LITE_DIR, 'index.html'), 'utf-8');
    assert(html.includes('market-pulse'), 'index.html contains "market-pulse"');
    assert(html.includes('toggleMarketPulseAlerts'), 'index.html contains "toggleMarketPulseAlerts"');
    assert(html.includes('loadUserPreferences'), 'index.html contains "loadUserPreferences"');
    assert(html.includes('mp-alert-btn'), 'index.html contains "mp-alert-btn" class');
    assert(html.includes('report-signals'), 'index.html contains "report-signals" action');
  } catch (e) {
    assert(false, `HTML check failed: ${e.message}`);
  }

  // Test 6: schema.sql contains new tables
  console.log('\nSchema: schema.sql checks');
  try {
    const schema = fs.readFileSync(path.join(LITE_DIR, 'schema.sql'), 'utf-8');
    assert(schema.includes('signal_snapshots'), 'schema.sql contains "signal_snapshots" table');
    assert(schema.includes('notification_log'), 'schema.sql contains "notification_log" table');
    assert(schema.includes('notification_sent'), 'schema.sql contains "notification_sent" column');
    assert(schema.includes('idx_notif_user'), 'schema.sql contains notification_log index');
  } catch (e) {
    assert(false, `Schema check failed: ${e.message}`);
  }

  // Summary
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(e => {
  console.error('Test runner error:', e);
  process.exit(1);
});
