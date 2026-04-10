#!/usr/bin/env node
/**
 * OptionsRanker Lite — exit plan unit tests
 *
 * Tests the computeExitPlan() helper from lite/exit-plan.js
 *
 * Run: node tests/exit-plan.test.js   (from lite/)
 */

const path = require('path');
const assert = require('assert');
const { exitRules, exitStrategyExplanations, computeExitPlan, evaluateExitTriggers } = require(path.join(__dirname, '..', 'exit-plan.js'));

const tests = [];
function t(name, fn) { tests.push({ name, fn }); }

// Helper: build a minimal mock strategy
function mockStrategy(name, opts = {}) {
  return {
    name,
    sentiment: opts.sentiment || (name.includes('Bull') || name.includes('Long Call') ? 'bullish' : name.includes('Bear') || name.includes('Long Put') ? 'bearish' : 'neutral'),
    legs: opts.legs || [{ action: 'Buy', type: 'Call', strike: 100, price: 5, qty: 1 }],
    maxProfit: opts.maxProfit != null ? opts.maxProfit : 500,
    maxLoss: opts.maxLoss != null ? opts.maxLoss : 250,
    dte: opts.dte != null ? opts.dte : 30,
    iv: opts.iv != null ? opts.iv : 0.3,
  };
}

// Helper: build credit-spread legs (sells higher premium, buys lower for hedge)
function creditLegs(creditPerContract = 2) {
  return [
    { action: 'Sell', type: 'Put', strike: 100, price: creditPerContract + 1, qty: 1 },
    { action: 'Buy',  type: 'Put', strike: 95,  price: 1,                     qty: 1 },
  ];
}

// Helper: build debit-spread legs (buys ATM, sells OTM)
function debitLegs(debitPerContract = 2) {
  return [
    { action: 'Buy',  type: 'Call', strike: 100, price: debitPerContract + 1, qty: 1 },
    { action: 'Sell', type: 'Call', strike: 105, price: 1,                    qty: 1 },
  ];
}

// ─────────────────────────────────────────────────────────────
t('Every strategy in exitRules returns a valid plan', () => {
  Object.keys(exitRules).forEach(name => {
    const s = mockStrategy(name, {
      maxProfit: 500, maxLoss: 250, dte: 30,
      legs: name.includes('Spread') || name === 'Iron Condor' || name.includes('Ratio') ? debitLegs(2) : [{ action: 'Buy', type: 'Call', strike: 100, price: 3, qty: 1 }],
    });
    const plan = computeExitPlan(s, 50, null, null, new Date('2026-04-10T00:00:00Z'));
    assert.ok(plan.profitTarget > 0, `${name} profitTarget not positive (got ${plan.profitTarget})`);
    assert.ok(plan.timeStopDTE > 0, `${name} timeStopDTE not positive`);
    assert.ok(plan.targetExitDate, `${name} targetExitDate missing`);
    assert.ok(plan.holdDays >= 1, `${name} holdDays not positive`);
    assert.ok(plan.explanation && plan.explanation.length > 0, `${name} explanation missing`);
    assert.ok(Array.isArray(plan.dynamicFactors), `${name} dynamicFactors not array`);
  });
});

t('Unknown strategy returns fallback plan with info note', () => {
  const s = mockStrategy('Bogus Strategy', { maxProfit: 200, maxLoss: 100, dte: 20 });
  const plan = computeExitPlan(s, 50, null, null, new Date('2026-04-10T00:00:00Z'));
  assert.ok(plan.profitTarget > 0);
  assert.strictEqual(plan.explanation, 'Multi-trigger exit: whichever profit, stop, or time rule fires first.');
  assert.ok(plan.dynamicFactors.some(f => /default exit plan/i.test(f.text)));
});

t('High IV rank halves credit profit target + adds dynamicFactor', () => {
  const s = mockStrategy('Iron Condor', { legs: creditLegs(3), maxProfit: 100, maxLoss: 400, dte: 45 });
  const base = computeExitPlan(s, 40, null, null, new Date('2026-04-10T00:00:00Z'));
  const hot  = computeExitPlan(s, 60, null, null, new Date('2026-04-10T00:00:00Z'));
  assert.ok(hot.profitTarget < base.profitTarget, `expected hot (${hot.profitTarget}) < base (${base.profitTarget})`);
  assert.ok(hot.dynamicFactors.some(f => /High IV/i.test(f.text)));
});

t('Low IV rank extends debit time stop + adds dynamicFactor', () => {
  const s = mockStrategy('Long Call', { dte: 45, legs: [{ action: 'Buy', type: 'Call', strike: 100, price: 5, qty: 1 }] });
  const base = computeExitPlan(s, 40, null, null, new Date('2026-04-10T00:00:00Z'));
  const cold = computeExitPlan(s, 20, null, null, new Date('2026-04-10T00:00:00Z'));
  assert.ok(cold.timeStopDTE > base.timeStopDTE, `expected cold (${cold.timeStopDTE}) > base (${base.timeStopDTE})`);
  assert.ok(cold.dynamicFactors.some(f => /Low IV/i.test(f.text)));
});

t('Earnings snap fires for short premium (Bull Put Spread)', () => {
  const s = mockStrategy('Bull Put Spread', { dte: 30, legs: creditLegs(2), maxProfit: 200, maxLoss: 300 });
  const plan = computeExitPlan(s, 50, null, 10, new Date('2026-04-10T00:00:00Z'));
  // earnings in 10 days from 2026-04-10 → day before earnings = 2026-04-19
  assert.strictEqual(plan.targetExitDate, '2026-04-19');
  assert.ok(plan.dynamicFactors.some(f => f.level === 'warn' && /Earnings/i.test(f.text)));
});

t('Earnings snap does NOT fire for long premium (Long Call)', () => {
  const s = mockStrategy('Long Call', { dte: 30, legs: [{ action: 'Buy', type: 'Call', strike: 100, price: 5, qty: 1 }] });
  const plan = computeExitPlan(s, 50, null, 10, new Date('2026-04-10T00:00:00Z'));
  // Long Call default time stop is 7 DTE → exit ~2026-05-03 (30-7=23 days out)
  assert.notStrictEqual(plan.targetExitDate, '2026-04-19');
  assert.ok(plan.dynamicFactors.some(f => /holding through/i.test(f.text)));
});

t('Market Pulse bearish warns on bullish strategy', () => {
  const s = mockStrategy('Long Call', { sentiment: 'bullish' });
  const plan = computeExitPlan(s, 50, { bullishCount: 1 }, null, new Date('2026-04-10T00:00:00Z'));
  assert.ok(plan.dynamicFactors.some(f => f.level === 'warn' && /bearish/i.test(f.text)));
});

t('Market Pulse bullish warns on bearish strategy', () => {
  const s = mockStrategy('Long Put', { sentiment: 'bearish' });
  const plan = computeExitPlan(s, 50, { bullishCount: 3 }, null, new Date('2026-04-10T00:00:00Z'));
  assert.ok(plan.dynamicFactors.some(f => f.level === 'warn' && /bullish/i.test(f.text)));
});

t('Market Pulse neutral does not warn when aligned', () => {
  const s = mockStrategy('Long Call', { sentiment: 'bullish' });
  const plan = computeExitPlan(s, 50, { bullishCount: 3 }, null, new Date('2026-04-10T00:00:00Z'));
  // 3/3 bullish + bullish strategy → only info-level note, no warn
  const warns = plan.dynamicFactors.filter(f => f.level === 'warn');
  assert.strictEqual(warns.length, 0);
});

t('Cash-Secured Put returns null stopLoss (assignment-risk only)', () => {
  const s = mockStrategy('Cash-Secured Put', { legs: [{ action: 'Sell', type: 'Put', strike: 100, price: 3, qty: 1 }] });
  const plan = computeExitPlan(s, 50, null, null, new Date('2026-04-10T00:00:00Z'));
  assert.strictEqual(plan.stopLoss, null);
});

t('Profit target uses % of max profit for debit spreads', () => {
  const s = mockStrategy('Bull Call Spread', { legs: debitLegs(2), maxProfit: 300, maxLoss: 200 });
  const plan = computeExitPlan(s, 50, null, null, new Date('2026-04-10T00:00:00Z'));
  // 50% of 300 = 150
  assert.strictEqual(plan.profitTarget, 150);
});

// ─────────────────────────────────────────────────────────────
// Runner
// ─────────────────────────────────────────────────────────────
(async () => {
  let passed = 0, failed = 0;
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log('  \x1b[32m\u2713\x1b[0m ' + name);
      passed++;
    } catch (e) {
      console.log('  \x1b[31m\u2717\x1b[0m ' + name);
      console.log('      ' + e.message);
      failed++;
    }
  }
  console.log(`\n  ${passed}/${tests.length} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
