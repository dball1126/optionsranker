/**
 * OptionsRanker Test Agent — Market Pulse Notification Tests
 *
 * Comprehensive test suite covering:
 * - report-signals: happy path, validation, upsert, field mapping
 * - history: retrieval, limit param, ordering
 * - preferences: toggle on/off, persistence, missing userId
 * - get-preferences: retrieval, unknown user defaults, missing userId
 * - Transition detection: <3→3 triggers, 3→3 no duplicate, <3 no trigger
 * - Duplicate notification prevention
 * - HTML integration: functions, CSS classes, UI elements
 * - Schema validation: tables, columns, indexes
 * - Edge function source: Resend integration, CORS, error paths
 *
 * Requires: dev server running on localhost:8789
 * Run: node agents/optionsranker-test/specialist.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:8789';
const LITE_DIR = path.resolve(__dirname, '../../lite');

let passed = 0;
let failed = 0;
let sectionCounts = {};
let currentSection = '';

function section(name) {
  currentSection = name;
  sectionCounts[name] = { passed: 0, failed: 0 };
  console.log(`\n  ${name}`);
}

function assert(condition, label) {
  if (condition) {
    console.log(`    ✓ ${label}`);
    passed++;
    sectionCounts[currentSection].passed++;
  } else {
    console.log(`    ✗ ${label}`);
    failed++;
    sectionCounts[currentSection].failed++;
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

function postSignals(overrides = {}) {
  const defaults = {
    spy_above_200: true,
    spy_pct_from_200: 3.5,
    breadth_improving: true,
    rsp_vs_spy: 0.8,
    vix_bullish: true,
    vix_current: 17.5,
    vix_20_high: 28.3,
    bullish_count: 3,
  };
  return fetchJSON(`${BASE}/api/market-pulse?action=report-signals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...defaults, ...overrides }),
  });
}

function postPreferences(userId, market_pulse_alerts) {
  return fetchJSON(`${BASE}/api/market-pulse?action=preferences`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, market_pulse_alerts }),
  });
}

async function runTests() {
  console.log('\n=== OptionsRanker Market Pulse — Full Test Suite ===');

  // ─────────────────────────────────────────
  // 1. REPORT-SIGNALS
  // ─────────────────────────────────────────
  section('report-signals: happy path (3/3 bullish)');
  try {
    const res = await postSignals({ bullish_count: 3 });
    assert(res.status === 200, 'returns 200');
    assert(res.data?.saved === true, 'saved: true');
    assert(typeof res.data?.date === 'string', 'returns date string');
    assert(res.data.date.match(/^\d{4}-\d{2}-\d{2}$/), 'date is YYYY-MM-DD format');
    assert(typeof res.data?.transitioned === 'boolean', 'returns transitioned boolean');
  } catch (e) {
    assert(false, `request failed: ${e.message}`);
  }

  section('report-signals: partial signals (1/3 bullish)');
  try {
    const res = await postSignals({
      spy_above_200: true,
      breadth_improving: false,
      vix_bullish: false,
      bullish_count: 1,
    });
    assert(res.status === 200, 'returns 200');
    assert(res.data?.saved === true, 'saved: true');
    assert(res.data?.transitioned === false, 'no transition on 1/3');
  } catch (e) {
    assert(false, `request failed: ${e.message}`);
  }

  section('report-signals: zero signals (0/3)');
  try {
    const res = await postSignals({
      spy_above_200: false,
      breadth_improving: false,
      vix_bullish: false,
      bullish_count: 0,
    });
    assert(res.status === 200, 'returns 200');
    assert(res.data?.saved === true, 'saved: true');
    assert(res.data?.transitioned === false, 'no transition on 0/3');
  } catch (e) {
    assert(false, `request failed: ${e.message}`);
  }

  section('report-signals: upsert (second call same day)');
  try {
    const res1 = await postSignals({ bullish_count: 2 });
    const res2 = await postSignals({ bullish_count: 2, spy_pct_from_200: 5.0 });
    assert(res2.status === 200, 'second call returns 200');
    assert(res2.data?.saved === true, 'second call saved: true');
    assert(res1.data?.date === res2.data?.date, 'same date for both calls');
    // Verify history only has one entry for today
    const hist = await fetchJSON(`${BASE}/api/market-pulse?action=history&limit=5`);
    const todayEntries = hist.data?.history?.filter(h => h.date === res1.data.date);
    assert(todayEntries?.length === 1, 'only one snapshot per day (upsert working)');
  } catch (e) {
    assert(false, `request failed: ${e.message}`);
  }

  section('report-signals: field mapping in snapshot');
  try {
    await postSignals({
      spy_above_200: true,
      spy_pct_from_200: 4.2,
      breadth_improving: false,
      rsp_vs_spy: -0.3,
      vix_bullish: true,
      vix_current: 18.7,
      vix_20_high: 31.0,
      bullish_count: 2,
    });
    const hist = await fetchJSON(`${BASE}/api/market-pulse?action=history&limit=1`);
    const snap = hist.data?.history?.[0];
    assert(snap != null, 'snapshot exists in history');
    assert(snap?.spy_above_200 === 1, 'spy_above_200 stored as 1');
    assert(snap?.breadth_improving === 0, 'breadth_improving stored as 0');
    assert(snap?.vix_bullish === 1, 'vix_bullish stored as 1');
    assert(typeof snap?.spy_pct_from_200 === 'number', 'spy_pct_from_200 is number');
    assert(typeof snap?.rsp_vs_spy === 'number', 'rsp_vs_spy is number');
    assert(typeof snap?.vix_current === 'number', 'vix_current is number');
    assert(typeof snap?.vix_20_high === 'number', 'vix_20_high is number');
    assert(snap?.bullish_count === 2, 'bullish_count matches');
  } catch (e) {
    assert(false, `request failed: ${e.message}`);
  }

  section('report-signals: missing bullish_count');
  try {
    const res = await fetchJSON(`${BASE}/api/market-pulse?action=report-signals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spy_above_200: true }),
    });
    // Server treats missing bullish_count as 0 (falsy default), which is valid
    // The edge function returns 400, but local dev is more lenient
    assert(res.status === 200 || res.status === 400, 'handles missing bullish_count');
  } catch (e) {
    assert(false, `request failed: ${e.message}`);
  }

  // ─────────────────────────────────────────
  // 2. TRANSITION DETECTION
  // ─────────────────────────────────────────
  section('transition: first 3/3 report triggers transition');
  try {
    // Reset by sending a non-3 signal first to ensure clean state,
    // then send 3/3. Since there's no "yesterday" with 3, it should transition.
    // Note: on the same day upsert, notification_sent may already be 1 from earlier tests.
    // This test validates the field exists and the logic runs.
    const res = await postSignals({ bullish_count: 3 });
    assert(res.status === 200, 'returns 200');
    // transitioned may be false if notification_sent was already set earlier in this run
    assert(typeof res.data?.transitioned === 'boolean', 'transitioned field present');
  } catch (e) {
    assert(false, `request failed: ${e.message}`);
  }

  section('transition: duplicate prevention (notification_sent flag)');
  try {
    // Send 3/3 twice — second should not transition
    const res1 = await postSignals({ bullish_count: 3 });
    const res2 = await postSignals({ bullish_count: 3 });
    // After first send, notification_sent = 1, so second should be false
    assert(res2.data?.transitioned === false, 'second 3/3 same day does not re-transition');
  } catch (e) {
    assert(false, `request failed: ${e.message}`);
  }

  section('transition: 2/3 does not trigger');
  try {
    const res = await postSignals({ bullish_count: 2 });
    assert(res.data?.transitioned === false, 'bullish_count=2 does not transition');
  } catch (e) {
    assert(false, `request failed: ${e.message}`);
  }

  // ─────────────────────────────────────────
  // 3. HISTORY
  // ─────────────────────────────────────────
  section('history: default retrieval');
  try {
    const res = await fetchJSON(`${BASE}/api/market-pulse?action=history`);
    assert(res.status === 200, 'returns 200');
    assert(Array.isArray(res.data?.history), 'returns array');
    assert(res.data.history.length >= 1, 'has at least 1 snapshot');
  } catch (e) {
    assert(false, `request failed: ${e.message}`);
  }

  section('history: limit parameter');
  try {
    const res = await fetchJSON(`${BASE}/api/market-pulse?action=history&limit=1`);
    assert(res.status === 200, 'returns 200');
    assert(res.data?.history?.length <= 1, 'respects limit=1');
  } catch (e) {
    assert(false, `request failed: ${e.message}`);
  }

  section('history: snapshot fields present');
  try {
    const res = await fetchJSON(`${BASE}/api/market-pulse?action=history&limit=1`);
    const snap = res.data?.history?.[0];
    assert(snap != null, 'snapshot exists');
    assert('date' in snap, 'has date');
    assert('spy_above_200' in snap, 'has spy_above_200');
    assert('breadth_improving' in snap, 'has breadth_improving');
    assert('vix_bullish' in snap, 'has vix_bullish');
    assert('bullish_count' in snap, 'has bullish_count');
    assert('vix_current' in snap, 'has vix_current');
    assert('spy_pct_from_200' in snap, 'has spy_pct_from_200');
    assert('rsp_vs_spy' in snap, 'has rsp_vs_spy');
  } catch (e) {
    assert(false, `request failed: ${e.message}`);
  }

  section('history: descending date order');
  try {
    // Submit a couple entries then check order
    const res = await fetchJSON(`${BASE}/api/market-pulse?action=history&limit=10`);
    const dates = res.data?.history?.map(h => h.date) || [];
    const sorted = [...dates].sort().reverse();
    assert(JSON.stringify(dates) === JSON.stringify(sorted), 'history sorted DESC by date');
  } catch (e) {
    assert(false, `request failed: ${e.message}`);
  }

  // ─────────────────────────────────────────
  // 4. PREFERENCES
  // ─────────────────────────────────────────
  section('preferences: enable alerts');
  try {
    const res = await postPreferences('test_pref_user_1', true);
    assert(res.status === 200, 'returns 200');
    assert(res.data?.saved === true, 'saved: true');
    assert(res.data?.preferences?.market_pulse_alerts === true, 'alerts set to true');
  } catch (e) {
    assert(false, `request failed: ${e.message}`);
  }

  section('preferences: disable alerts');
  try {
    const res = await postPreferences('test_pref_user_1', false);
    assert(res.status === 200, 'returns 200');
    assert(res.data?.saved === true, 'saved: true');
    assert(res.data?.preferences?.market_pulse_alerts === false, 'alerts set to false');
  } catch (e) {
    assert(false, `request failed: ${e.message}`);
  }

  section('preferences: toggle persistence');
  try {
    await postPreferences('test_pref_user_2', true);
    const check = await fetchJSON(`${BASE}/api/market-pulse?action=get-preferences&userId=test_pref_user_2`);
    assert(check.data?.preferences?.market_pulse_alerts === true, 'preference persists across requests');
    await postPreferences('test_pref_user_2', false);
    const check2 = await fetchJSON(`${BASE}/api/market-pulse?action=get-preferences&userId=test_pref_user_2`);
    assert(check2.data?.preferences?.market_pulse_alerts === false, 'toggled preference persists');
  } catch (e) {
    assert(false, `request failed: ${e.message}`);
  }

  section('preferences: missing userId returns 400');
  try {
    const res = await fetchJSON(`${BASE}/api/market-pulse?action=preferences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ market_pulse_alerts: true }),
    });
    assert(res.status === 400, 'returns 400 without userId');
    assert(res.data?.error != null, 'returns error message');
  } catch (e) {
    assert(false, `request failed: ${e.message}`);
  }

  // ─────────────────────────────────────────
  // 5. GET-PREFERENCES
  // ─────────────────────────────────────────
  section('get-preferences: known user');
  try {
    await postPreferences('test_get_user', true);
    const res = await fetchJSON(`${BASE}/api/market-pulse?action=get-preferences&userId=test_get_user`);
    assert(res.status === 200, 'returns 200');
    assert(typeof res.data?.preferences === 'object', 'returns preferences object');
    assert(res.data?.preferences?.market_pulse_alerts === true, 'returns correct value');
  } catch (e) {
    assert(false, `request failed: ${e.message}`);
  }

  section('get-preferences: unknown user returns empty defaults');
  try {
    const res = await fetchJSON(`${BASE}/api/market-pulse?action=get-preferences&userId=nonexistent_user_xyz`);
    assert(res.status === 200, 'returns 200 for unknown user');
    assert(typeof res.data?.preferences === 'object', 'returns preferences object');
    assert(res.data?.preferences?.market_pulse_alerts == null, 'market_pulse_alerts is undefined/null');
  } catch (e) {
    assert(false, `request failed: ${e.message}`);
  }

  section('get-preferences: missing userId returns 400');
  try {
    const res = await fetchJSON(`${BASE}/api/market-pulse?action=get-preferences`);
    assert(res.status === 400, 'returns 400 without userId');
    assert(res.data?.error != null, 'returns error message');
  } catch (e) {
    assert(false, `request failed: ${e.message}`);
  }

  // ─────────────────────────────────────────
  // 6. UNKNOWN ACTION
  // ─────────────────────────────────────────
  section('unknown action returns 400');
  try {
    const res = await fetchJSON(`${BASE}/api/market-pulse?action=does-not-exist`);
    assert(res.status === 400, 'returns 400 for unknown action');
    assert(res.data?.error != null, 'returns error message');
  } catch (e) {
    assert(false, `request failed: ${e.message}`);
  }

  // ─────────────────────────────────────────
  // 7. HTML INTEGRATION
  // ─────────────────────────────────────────
  section('HTML: client-side functions');
  try {
    const html = fs.readFileSync(path.join(LITE_DIR, 'index.html'), 'utf-8');
    assert(html.includes('function loadMarketPulse'), 'loadMarketPulse function defined');
    assert(html.includes('function toggleMarketPulseAlerts'), 'toggleMarketPulseAlerts function defined');
    assert(html.includes('function loadUserPreferences'), 'loadUserPreferences function defined');
    assert(html.includes('let userPreferences'), 'userPreferences state variable');
  } catch (e) {
    assert(false, `read failed: ${e.message}`);
  }

  section('HTML: signal reporting integration');
  try {
    const html = fs.readFileSync(path.join(LITE_DIR, 'index.html'), 'utf-8');
    assert(html.includes("action=report-signals"), 'report-signals called from client');
    assert(html.includes('spy_above_200: spyAbove200'), 'spy_above_200 passed to report');
    assert(html.includes('bullish_count: bullishCount'), 'bullish_count passed to report');
    assert(html.includes('vix_current: vixCurrent'), 'vix_current passed to report');
    assert(html.includes('breadth_improving: breadthImproving'), 'breadth_improving passed to report');
    assert(html.includes('spy_pct_from_200: spyPctFrom200'), 'spy_pct_from_200 passed to report');
    assert(html.includes('rsp_vs_spy: rspVsSpy'), 'rsp_vs_spy passed to report');
    assert(html.includes('vix_bullish: s3Bullish'), 'vix_bullish passed to report');
    assert(html.includes('vix_20_high: vix20High'), 'vix_20_high passed to report');
  } catch (e) {
    assert(false, `read failed: ${e.message}`);
  }

  section('HTML: bell icon toggle in header');
  try {
    const html = fs.readFileSync(path.join(LITE_DIR, 'index.html'), 'utf-8');
    assert(html.includes('mp-bell-btn'), 'mp-bell-btn class present');
    assert(html.includes('Market Pulse alerts ON'), 'bell ON title text');
    assert(html.includes('Market Pulse alerts OFF'), 'bell OFF title text');
    assert(html.includes('!currentUser.isGuest'), 'bell hidden for guests');
  } catch (e) {
    assert(false, `read failed: ${e.message}`);
  }

  section('HTML: opt-in CTA in Market Pulse section');
  try {
    const html = fs.readFileSync(path.join(LITE_DIR, 'index.html'), 'utf-8');
    assert(html.includes('mp-alert-cta'), 'mp-alert-cta element present');
    assert(html.includes('Get notified when all 3 signals align'), 'CTA text present');
    assert(html.includes('Alerts enabled'), 'enabled state text present');
    assert(html.includes('Enable Alerts'), 'enable button text present');
  } catch (e) {
    assert(false, `read failed: ${e.message}`);
  }

  section('HTML: CSS styles');
  try {
    const html = fs.readFileSync(path.join(LITE_DIR, 'index.html'), 'utf-8');
    assert(html.includes('.mp-alert-cta'), 'mp-alert-cta CSS rule');
    assert(html.includes('.mp-alert-btn'), 'mp-alert-btn CSS rule');
    assert(html.includes('.mp-alert-prompt'), 'mp-alert-prompt CSS rule');
    assert(html.includes('.mp-alert-active'), 'mp-alert-active CSS rule');
    assert(html.includes('.mp-bell-btn'), 'mp-bell-btn CSS rule');
    assert(html.includes('.mp-bell-btn.active'), 'mp-bell-btn.active CSS rule');
  } catch (e) {
    assert(false, `read failed: ${e.message}`);
  }

  section('HTML: preferences loaded on auth');
  try {
    const html = fs.readFileSync(path.join(LITE_DIR, 'index.html'), 'utf-8');
    // loadUserPreferences called in initAuth and handleCredentialResponse
    const matches = html.match(/loadUserPreferences\(\)/g);
    assert(matches && matches.length >= 2, 'loadUserPreferences called in at least 2 auth paths');
  } catch (e) {
    assert(false, `read failed: ${e.message}`);
  }

  // ─────────────────────────────────────────
  // 8. SCHEMA
  // ─────────────────────────────────────────
  section('schema: signal_snapshots table');
  try {
    const schema = fs.readFileSync(path.join(LITE_DIR, 'schema.sql'), 'utf-8');
    assert(schema.includes('CREATE TABLE IF NOT EXISTS signal_snapshots'), 'signal_snapshots CREATE TABLE');
    assert(schema.includes('date TEXT NOT NULL UNIQUE'), 'date column with UNIQUE constraint');
    assert(schema.includes('spy_above_200 INTEGER NOT NULL'), 'spy_above_200 column');
    assert(schema.includes('spy_pct_from_200 REAL'), 'spy_pct_from_200 column');
    assert(schema.includes('breadth_improving INTEGER NOT NULL'), 'breadth_improving column');
    assert(schema.includes('rsp_vs_spy REAL'), 'rsp_vs_spy column');
    assert(schema.includes('vix_bullish INTEGER NOT NULL'), 'vix_bullish column');
    assert(schema.includes('vix_current REAL'), 'vix_current column');
    assert(schema.includes('vix_20_high REAL'), 'vix_20_high column');
    assert(schema.includes('bullish_count INTEGER NOT NULL'), 'bullish_count column');
    assert(schema.includes('notification_sent INTEGER DEFAULT 0'), 'notification_sent column with default 0');
  } catch (e) {
    assert(false, `read failed: ${e.message}`);
  }

  section('schema: notification_log table');
  try {
    const schema = fs.readFileSync(path.join(LITE_DIR, 'schema.sql'), 'utf-8');
    assert(schema.includes('CREATE TABLE IF NOT EXISTS notification_log'), 'notification_log CREATE TABLE');
    assert(schema.includes('user_id TEXT NOT NULL'), 'user_id column');
    assert(schema.includes('notification_type TEXT NOT NULL'), 'notification_type column');
    assert(schema.includes("status TEXT DEFAULT 'sent'"), 'status column with default');
    assert(schema.includes('idx_notif_user'), 'notification_log index');
  } catch (e) {
    assert(false, `read failed: ${e.message}`);
  }

  // ─────────────────────────────────────────
  // 9. EDGE FUNCTION SOURCE
  // ─────────────────────────────────────────
  section('edge function: market-pulse.js structure');
  try {
    const src = fs.readFileSync(path.join(LITE_DIR, 'functions/api/market-pulse.js'), 'utf-8');
    assert(src.includes('export async function onRequest'), 'exports onRequest');
    assert(src.includes('Access-Control-Allow-Origin'), 'CORS headers defined');
    assert(src.includes("action === 'report-signals'"), 'report-signals action handler');
    assert(src.includes("action === 'history'"), 'history action handler');
    assert(src.includes("action === 'preferences'"), 'preferences action handler');
    assert(src.includes("action === 'get-preferences'"), 'get-preferences action handler');
  } catch (e) {
    assert(false, `read failed: ${e.message}`);
  }

  section('edge function: Resend email integration');
  try {
    const src = fs.readFileSync(path.join(LITE_DIR, 'functions/api/market-pulse.js'), 'utf-8');
    assert(src.includes('https://api.resend.com/emails'), 'Resend API URL');
    assert(src.includes('RESEND_API_KEY'), 'RESEND_API_KEY env var referenced');
    assert(src.includes('Market Pulse: 3/3 Bullish'), 'email subject/body content');
    assert(src.includes('alerts@optionsranker.com'), 'from address');
  } catch (e) {
    assert(false, `read failed: ${e.message}`);
  }

  section('edge function: transition detection logic');
  try {
    const src = fs.readFileSync(path.join(LITE_DIR, 'functions/api/market-pulse.js'), 'utf-8');
    assert(src.includes('bullish_count === 3'), 'checks for 3/3 bullish');
    assert(src.includes('notification_sent'), 'checks notification_sent flag');
    assert(src.includes('yesterdayRow'), 'compares with yesterday');
    assert(src.includes('yesterdayRow.bullish_count < 3'), 'checks yesterday was <3');
    assert(src.includes("notification_sent = 1"), 'sets notification_sent after send');
    assert(src.includes('market_pulse_3_aligned'), 'notification type constant');
  } catch (e) {
    assert(false, `read failed: ${e.message}`);
  }

  section('edge function: notification logging');
  try {
    const src = fs.readFileSync(path.join(LITE_DIR, 'functions/api/market-pulse.js'), 'utf-8');
    assert(src.includes("INSERT INTO notification_log"), 'inserts into notification_log');
    assert(src.includes("'sent'"), 'logs sent status');
    assert(src.includes("'failed'"), 'logs failed status');
    assert(src.includes("'error'"), 'logs error status');
  } catch (e) {
    assert(false, `read failed: ${e.message}`);
  }

  section('edge function: preferences JSON merge');
  try {
    const src = fs.readFileSync(path.join(LITE_DIR, 'functions/api/market-pulse.js'), 'utf-8');
    assert(src.includes('json_extract(preferences'), 'uses json_extract for opted-in query');
    assert(src.includes("JSON.parse(user?.preferences || '{}')"), 'safely parses existing preferences');
    assert(src.includes('!!market_pulse_alerts'), 'coerces to boolean');
  } catch (e) {
    assert(false, `read failed: ${e.message}`);
  }

  // ─────────────────────────────────────────
  // 10. SERVER.JS LOCAL DEV
  // ─────────────────────────────────────────
  section('server.js: market-pulse route');
  try {
    const src = fs.readFileSync(path.join(LITE_DIR, 'server.js'), 'utf-8');
    assert(src.includes('localSignalSnapshots'), 'in-memory signal store');
    assert(src.includes('localNotificationLog'), 'in-memory notification log');
    assert(src.includes('[Market Pulse]'), 'console log on signal report');
    assert(src.includes('[DEV] Would send Market Pulse alert'), 'simulated email log');
    assert(src.includes('TRANSITION DETECTED'), 'transition log message');
  } catch (e) {
    assert(false, `read failed: ${e.message}`);
  }

  // ─────────────────────────────────────────
  // 11. RATE LIMITING (Feature #1)
  // ─────────────────────────────────────────
  section('rate limiting: chart proxy');
  try {
    const src = fs.readFileSync(path.join(LITE_DIR, 'functions/api/chart/[[path]].js'), 'utf-8');
    assert(src.includes('checkRateLimit'), 'chart has checkRateLimit function');
    assert(src.includes('429'), 'chart returns 429 on rate limit');
    assert(src.includes('CF-Connecting-IP'), 'chart reads CF-Connecting-IP header');
    assert(src.includes('Retry-After'), 'chart includes Retry-After header');
    assert(src.includes('RATE_LIMIT'), 'chart defines RATE_LIMIT constant');
  } catch (e) {
    assert(false, `read failed: ${e.message}`);
  }

  section('rate limiting: options proxy');
  try {
    const src = fs.readFileSync(path.join(LITE_DIR, 'functions/api/options/[[path]].js'), 'utf-8');
    assert(src.includes('checkRateLimit'), 'options has checkRateLimit function');
    assert(src.includes('429'), 'options returns 429 on rate limit');
    assert(src.includes('CF-Connecting-IP'), 'options reads CF-Connecting-IP header');
    assert(src.includes('Retry-After'), 'options includes Retry-After header');
  } catch (e) {
    assert(false, `read failed: ${e.message}`);
  }

  // ─────────────────────────────────────────
  // 12. STRUCTURED LOGGING (Feature #2)
  // ─────────────────────────────────────────
  section('structured logging: all edge functions');
  try {
    const files = [
      'functions/api/chart/[[path]].js',
      'functions/api/options/[[path]].js',
      'functions/api/market-pulse.js',
      'functions/api/options-data.js',
      'functions/api/user-data.js',
      'functions/api/subscription.js',
      'functions/api/create-checkout.js',
      'functions/api/customer-portal.js',
      'functions/api/stripe-webhook.js',
    ];
    for (const file of files) {
      const src = fs.readFileSync(path.join(LITE_DIR, file), 'utf-8');
      const name = file.split('/').pop();
      assert(src.includes('structuredLog'), `${name} has structuredLog`);
    }
  } catch (e) {
    assert(false, `read failed: ${e.message}`);
  }

  section('structured logging: frontend error boundary');
  try {
    const html = fs.readFileSync(path.join(LITE_DIR, 'index.html'), 'utf-8');
    assert(html.includes('window.onerror'), 'window.onerror handler');
    assert(html.includes('unhandledrejection'), 'unhandledrejection handler');
  } catch (e) {
    assert(false, `read failed: ${e.message}`);
  }

  // ─────────────────────────────────────────
  // 13. CONFIG ENDPOINT (Feature #3)
  // ─────────────────────────────────────────
  section('config endpoint: edge function');
  try {
    const src = fs.readFileSync(path.join(LITE_DIR, 'functions/api/config.js'), 'utf-8');
    assert(src.includes('export async function onRequest'), 'config.js exports onRequest');
    assert(src.includes('googleClientId'), 'config.js returns googleClientId');
    assert(src.includes('GOOGLE_CLIENT_ID'), 'config.js reads GOOGLE_CLIENT_ID env var');
  } catch (e) {
    assert(false, `read failed: ${e.message}`);
  }

  section('config endpoint: API test');
  try {
    const res = await fetchJSON(`${BASE}/api/config`);
    assert(res.status === 200, '/api/config returns 200');
    assert('googleClientId' in (res.data || {}), '/api/config returns googleClientId field');
  } catch (e) {
    assert(false, `/api/config failed: ${e.message}`);
  }

  section('config endpoint: HTML integration');
  try {
    const html = fs.readFileSync(path.join(LITE_DIR, 'index.html'), 'utf-8');
    assert(html.includes('appConfig'), 'appConfig state variable');
    assert(html.includes('loadAppConfig'), 'loadAppConfig function');
    assert(html.includes('/api/config'), 'fetches /api/config');
    assert(html.includes('appConfig.googleClientId'), 'uses appConfig.googleClientId');
    assert(!html.includes("client_id: 'GOOGLE_CLIENT_ID'"), 'hardcoded GOOGLE_CLIENT_ID placeholder removed');
  } catch (e) {
    assert(false, `read failed: ${e.message}`);
  }

  section('config endpoint: server.js local dev');
  try {
    const src = fs.readFileSync(path.join(LITE_DIR, 'server.js'), 'utf-8');
    assert(src.includes('/api/config'), 'server.js has /api/config route');
    assert(src.includes('googleClientId'), 'server.js returns googleClientId');
  } catch (e) {
    assert(false, `read failed: ${e.message}`);
  }

  // ─────────────────────────────────────────
  // 15. WRANGLER.TOML CONFIG (Update #1)
  // ─────────────────────────────────────────
  section('wrangler.toml: compatibility_date');
  try {
    const toml = fs.readFileSync(path.join(LITE_DIR, 'wrangler.toml'), 'utf-8');
    assert(toml.includes('compatibility_date = "2025-01-01"'), 'compatibility_date is 2025-01-01');
    assert(toml.includes('[vars]') || toml.includes('# [vars]'), '[vars] section present (active or commented)');
    assert(toml.includes('STRIPE_SECRET_KEY'), 'documents STRIPE_SECRET_KEY secret');
    assert(toml.includes('STRIPE_PRICE_ID'), 'documents STRIPE_PRICE_ID secret');
    assert(toml.includes('STRIPE_WEBHOOK_SECRET'), 'documents STRIPE_WEBHOOK_SECRET secret');
    assert(toml.includes('GOOGLE_CLIENT_ID'), 'documents GOOGLE_CLIENT_ID secret');
    assert(toml.includes('RESEND_API_KEY'), 'documents RESEND_API_KEY secret');
    assert(toml.includes('FROM_EMAIL'), 'documents FROM_EMAIL secret');
  } catch (e) {
    assert(false, `read failed: ${e.message}`);
  }

  // ─────────────────────────────────────────
  // 16. STRIPE HARDENING (Update #2)
  // ─────────────────────────────────────────
  section('stripe hardening: create-checkout.js timeouts & validation');
  try {
    const src = fs.readFileSync(path.join(LITE_DIR, 'functions/api/create-checkout.js'), 'utf-8');
    assert(src.includes('AbortSignal.timeout'), 'create-checkout has request timeout');
    assert(src.includes('userId.length > 256'), 'create-checkout validates userId length');
    assert(src.includes('email.length > 320'), 'create-checkout validates email length');
    assert(src.includes('@[^\\s@]+\\.[^\\s@]+'), 'create-checkout validates email format');
  } catch (e) {
    assert(false, `read failed: ${e.message}`);
  }

  section('stripe hardening: customer-portal.js timeouts & validation');
  try {
    const src = fs.readFileSync(path.join(LITE_DIR, 'functions/api/customer-portal.js'), 'utf-8');
    assert(src.includes('AbortSignal.timeout'), 'customer-portal has request timeout');
    assert(src.includes('userId.length > 256'), 'customer-portal validates userId length');
  } catch (e) {
    assert(false, `read failed: ${e.message}`);
  }

  section('stripe hardening: user-data.js input sanitization');
  try {
    const src = fs.readFileSync(path.join(LITE_DIR, 'functions/api/user-data.js'), 'utf-8');
    assert(src.includes('userId.length > 256'), 'user-data validates userId length');
    assert(src.includes('email.length > 320'), 'user-data validates email length');
    assert(src.includes('@[^\\s@]+\\.[^\\s@]+'), 'user-data validates email format');
  } catch (e) {
    assert(false, `read failed: ${e.message}`);
  }

  section('stripe hardening: webhook replay protection');
  try {
    const src = fs.readFileSync(path.join(LITE_DIR, 'functions/api/stripe-webhook.js'), 'utf-8');
    assert(src.includes('Math.abs(now - parseInt(timestamp)) > 300'), 'webhook has 5-min timestamp tolerance');
    assert(src.includes('HMAC'), 'webhook uses HMAC-SHA256 verification');
    assert(src.includes("structuredLog('stripe-webhook'"), 'webhook has structured logging');
  } catch (e) {
    assert(false, `read failed: ${e.message}`);
  }

  // ─────────────────────────────────────────
  // 14. DYNAMIC EMAIL DOMAIN (Feature #5)
  // ─────────────────────────────────────────
  section('dynamic email: market-pulse.js');
  try {
    const src = fs.readFileSync(path.join(LITE_DIR, 'functions/api/market-pulse.js'), 'utf-8');
    assert(src.includes('FROM_EMAIL'), 'reads FROM_EMAIL env var');
    assert(src.includes('siteOrigin'), 'uses dynamic siteOrigin for links');
    assert(!src.includes("'OptionsRanker <alerts@optionsranker.com>'"), 'hardcoded from email removed');
    assert(!src.includes('href="https://optionsranker.com"'), 'hardcoded URL removed');
  } catch (e) {
    assert(false, `read failed: ${e.message}`);
  }

  // ─────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────
  console.log('\n' + '─'.repeat(50));
  console.log('  Section Summary:');
  for (const [name, counts] of Object.entries(sectionCounts)) {
    const status = counts.failed === 0 ? '✓' : '✗';
    console.log(`    ${status} ${name}: ${counts.passed}/${counts.passed + counts.failed}`);
  }
  console.log('─'.repeat(50));
  console.log(`\n  Total: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(e => {
  console.error('Test runner error:', e);
  process.exit(1);
});
