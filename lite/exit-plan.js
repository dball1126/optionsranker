// OptionsRanker — Dynamic Exit Plan library
// Used by both the lite SPA (browser) and the backtester (Node).
// Same shape, server-safe (no DOM, no window).

const exitRules = {
  'Long Call':         { kind: 'debit',          profitPctOfCost: 100, stopPctOfCost: 50,   timeStopDTE: 7  },
  'Long Put':          { kind: 'debit',          profitPctOfCost: 100, stopPctOfCost: 50,   timeStopDTE: 7  },
  'Bull Call Spread':  { kind: 'debit_spread',   profitPctOfMaxP: 50,  stopPctOfCost: 50,   timeStopDTE: 7  },
  'Bear Put Spread':   { kind: 'debit_spread',   profitPctOfMaxP: 50,  stopPctOfCost: 50,   timeStopDTE: 7  },
  'Bull Put Spread':   { kind: 'credit',         profitPctOfCredit: 50,  stopPctOfCredit: 200, timeStopDTE: 21 },
  'Bear Call Spread':  { kind: 'credit',         profitPctOfCredit: 50,  stopPctOfCredit: 200, timeStopDTE: 21 },
  'Iron Condor':       { kind: 'credit',         profitPctOfCredit: 25,  stopPctOfCredit: 200, timeStopDTE: 21 },
  'Cash-Secured Put':  { kind: 'credit_unhedged',profitPctOfCredit: 50,  stopPctOfCredit: null, timeStopDTE: 21 },
  'Covered Call':      { kind: 'credit_unhedged',profitPctOfCredit: 50,  stopPctOfCredit: null, timeStopDTE: 21 },
  'Straddle':          { kind: 'volatility',     profitPctOfCost: 25,  stopPctOfCost: 25,   timeStopDTE: 14 },
  'Strangle':          { kind: 'volatility',     profitPctOfCost: 25,  stopPctOfCost: 25,   timeStopDTE: 14 },
  'Butterfly':         { kind: 'debit_spread',   profitPctOfMaxP: 50,  stopPctOfCost: 50,   timeStopDTE: 14 },
  'Calendar Spread':   { kind: 'debit_spread',   profitPctOfMaxP: 50,  stopPctOfCost: 50,   timeStopDTE: 14 },
  'Diagonal Spread':   { kind: 'debit_spread',   profitPctOfMaxP: 50,  stopPctOfCost: 50,   timeStopDTE: 14 },
  'Collar':            { kind: 'credit_unhedged',profitPctOfCredit: 50,  stopPctOfCredit: null, timeStopDTE: 21 },
  'Call Ratio Spread': { kind: 'credit',         profitPctOfCredit: 50,  stopPctOfCredit: 200, timeStopDTE: 21 },
  'Put Ratio Spread':  { kind: 'credit',         profitPctOfCredit: 50,  stopPctOfCredit: 200, timeStopDTE: 21 },
};

const exitStrategyExplanations = {
  'Long Call':        'Long premium decays fast in the final week — take profits aggressively and roll out if the thesis still holds. Close 7 DTE regardless to dodge gamma risk.',
  'Long Put':         'Same premium-decay logic as long calls. Take 100% wins quickly, cut losers at half the debit, and exit 7 DTE before theta eats the residual.',
  'Bull Call Spread': 'Debit spreads hit max profit only at expiration. Take half the max profit early since the last 50% costs the most time — pin risk near the short strike rarely pays.',
  'Bear Put Spread':  'Same as bull call spread — 50% of max profit, 50% debit stop, exit 7 DTE before pin risk.',
  'Bull Put Spread':  'Credit spreads realize max profit at expiry but capture half the decay in the first third. 50% credit target, 2x credit stop, manage at 21 DTE to dodge gamma risk.',
  'Bear Call Spread': 'Same tastytrade profile as bull put. 50% credit target, 2x credit stop, manage at 21 DTE.',
  'Iron Condor':      'Condors mean-revert quickly. Take 25% profit fast — the last 75% of the credit is asymmetric risk. Manage both sides at 21 DTE.',
  'Cash-Secured Put': 'Structural exit: keep 50% of the credit or accept assignment. No stop-loss — if the stock drops, you wanted the shares anyway.',
  'Covered Call':     'Let the call decay or get called away. 50% of the credit is the standard buyback; no stop because your stock cost basis is unchanged.',
  'Straddle':         'Volatility trades need speed. 25% profit default — greeks turn against you fast. 25% cost stop limits the bleed; 14 DTE exit captures vega before theta dominates.',
  'Strangle':         'Same profile as straddle — wider wings make 25% more realistic than 50%. Exit 14 DTE on vega collapse.',
  'Butterfly':        'Butterflies live or die at the middle strike. Take 50% of max profit early; the pin-risk convergence near expiration rarely pays.',
  'Calendar Spread':  'Calendars profit from the near leg decaying faster. Close at 50% of max profit or 14 DTE — near leg gamma gets ugly inside two weeks.',
  'Diagonal Spread':  'Like a calendar with directional tilt. 50% of max profit, 14 DTE exit.',
  'Collar':           'Collars protect stock — the exit is the stock exit. Buy back the call at 50% if it decays; leave the put until you need it.',
  'Call Ratio Spread':'Credit ratios mean-revert. 50% of credit, manage at 21 DTE — the uncovered short wing is binary risk if you let it ride.',
  'Put Ratio Spread': 'Same as call ratio — manage aggressively at 50% credit.',
};

function addDays(d, n) {
  const out = new Date(d.getTime());
  out.setUTCDate(out.getUTCDate() + n);
  return out;
}

function fmtDate(d) {
  return d.toISOString().slice(0, 10);
}

// Compute net per-contract cost from legs.
// Returns positive = credit received, negative = debit paid.
// Sign convention: Buy/Hold = -1, Sell = +1.
function netPerContract(legs) {
  if (!legs || !legs.length) return 0;
  return legs.reduce((sum, l) => {
    const mult = (l.action === 'Buy' || l.action === 'Hold') ? -1 : 1;
    const multiplier = l.type === 'Stock' ? 1 : 100;
    return sum + (l.price || 0) * mult * (l.qty || 1) * multiplier;
  }, 0);
}

function computeExitPlan(s, ivRank, marketPulse, earningsDays, nowDate) {
  nowDate = nowDate || new Date();
  const rule = exitRules[s.name];
  const dynamicFactors = [];

  // Fallback for unknown strategies
  if (!rule) {
    const fbProfit = s.maxProfit && isFinite(s.maxProfit) ? s.maxProfit * 0.5 : 100;
    const fbStop = s.maxLoss && isFinite(s.maxLoss) ? -s.maxLoss * 0.5 : -100;
    const fbTime = Math.max(7, Math.floor((s.dte || 14) / 2));
    const fbDate = addDays(nowDate, Math.max(0, (s.dte || 14) - fbTime));
    return {
      entryDate: fmtDate(nowDate),
      targetExitDate: fmtDate(fbDate),
      holdDays: Math.max(1, Math.round((fbDate - nowDate) / 86400000)),
      profitTarget: Math.max(1, fbProfit),
      stopLoss: fbStop,
      timeStopDTE: fbTime,
      dynamicFactors: [{ level: 'info', text: 'Using default exit plan — strategy-specific rules unavailable.' }],
      explanation: 'Multi-trigger exit: whichever profit, stop, or time rule fires first.',
    };
  }

  // Compute debit / credit per contract from legs
  const net = netPerContract(s.legs);
  const debit = Math.max(0, -net);
  const credit = Math.max(0, net);

  // Profit target
  let profitTarget;
  if (rule.profitPctOfMaxP != null) {
    const maxP = isFinite(s.maxProfit) ? s.maxProfit : (debit > 0 ? debit * 5 : 1000);
    profitTarget = maxP * (rule.profitPctOfMaxP / 100);
  } else if (rule.profitPctOfCost != null) {
    profitTarget = debit * (rule.profitPctOfCost / 100);
  } else if (rule.profitPctOfCredit != null) {
    profitTarget = credit * (rule.profitPctOfCredit / 100);
  } else {
    profitTarget = 50;
  }
  profitTarget = Math.max(1, profitTarget);

  // Stop loss (negative number; null for credit_unhedged)
  let stopLoss;
  if (rule.kind === 'credit_unhedged') {
    stopLoss = null;
  } else if (rule.stopPctOfCost != null) {
    stopLoss = -debit * (rule.stopPctOfCost / 100);
    if (stopLoss === 0 && isFinite(s.maxLoss)) stopLoss = -s.maxLoss * 0.5;
  } else if (rule.stopPctOfCredit != null) {
    stopLoss = -credit * (rule.stopPctOfCredit / 100);
  } else {
    stopLoss = -50;
  }
  if (stopLoss !== null && stopLoss === 0) stopLoss = -1;

  // Time stop DTE — IV-aware adjustment
  let timeStopDTE = rule.timeStopDTE;
  const isCredit = (rule.kind === 'credit' || rule.kind === 'credit_unhedged');
  const isDebit = (rule.kind === 'debit' || rule.kind === 'debit_spread' || rule.kind === 'volatility');

  if (ivRank != null && ivRank > 50 && isCredit) {
    profitTarget *= 0.5;
    dynamicFactors.push({ level: 'info', text: 'High IV rank (>50) — using aggressive 25% credit target (mean reversion is faster in elevated IV).' });
  }
  if (ivRank != null && ivRank < 30 && isDebit) {
    timeStopDTE = Math.round(rule.timeStopDTE * 1.5);
    dynamicFactors.push({ level: 'info', text: 'Low IV rank (<30) — extending time stop 50% to let the move develop.' });
  }

  // Compute target exit date
  const dte = s.dte || 14;
  let targetExitDate = addDays(nowDate, Math.max(0, dte - timeStopDTE));

  // Earnings-aware snap
  if (earningsDays != null && earningsDays > 0 && earningsDays < dte) {
    const earningsDate = addDays(nowDate, earningsDays);
    const dayBefore = addDays(earningsDate, -1);
    const isShortPremium = isCredit || s.name === 'Iron Condor' || s.name === 'Butterfly';
    if (isShortPremium) {
      if (dayBefore < targetExitDate) {
        targetExitDate = dayBefore;
      }
      dynamicFactors.push({ level: 'warn', text: 'Earnings in ' + earningsDays + ' days — snapping exit to day before announcement to avoid IV crush on short premium.' });
    } else {
      dynamicFactors.push({ level: 'info', text: 'Earnings in ' + earningsDays + ' days — holding through to capture the implied move.' });
    }
  }

  // Market pulse soft signal (info-only)
  if (marketPulse && marketPulse.bullishCount != null) {
    const bc = marketPulse.bullishCount;
    if (s.sentiment === 'bullish' && bc <= 1) {
      dynamicFactors.push({ level: 'warn', text: 'Market Pulse bearish (' + bc + '/3) — consider closing early if it weakens further.' });
    } else if (s.sentiment === 'bearish' && bc >= 2) {
      dynamicFactors.push({ level: 'warn', text: 'Market Pulse bullish (' + bc + '/3) — consider closing early if it strengthens further.' });
    } else {
      dynamicFactors.push({ level: 'info', text: 'Market Pulse ' + bc + '/3 — no conflict with this trade.' });
    }
  }

  const holdDays = Math.max(1, Math.round((targetExitDate - nowDate) / 86400000));
  const explanation = exitStrategyExplanations[s.name] || 'Multi-trigger exit: whichever profit, stop, or time rule fires first.';

  return {
    entryDate: fmtDate(nowDate),
    targetExitDate: fmtDate(targetExitDate),
    holdDays,
    profitTarget,
    stopLoss,
    timeStopDTE,
    dynamicFactors,
    explanation,
  };
}

// Backtester helper: evaluate which trigger (if any) trips for an open trade
// row needs: profit_target, stop_loss, target_exit_date
// Priority: profit_target > stop_loss > time_stop
function evaluateExitTriggers(row, pnlPerContract, todayStr) {
  if (row.profit_target != null && pnlPerContract >= row.profit_target) {
    return { trip: true, reason: 'profit_target' };
  }
  if (row.stop_loss != null && pnlPerContract <= row.stop_loss) {
    return { trip: true, reason: 'stop_loss' };
  }
  // Strict greater-than gives a 1-day grace period
  if (row.target_exit_date && todayStr > row.target_exit_date) {
    return { trip: true, reason: 'time_stop' };
  }
  return null;
}

// Dual export — CommonJS for Node tests + backtester, window globals for browser SPA
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { exitRules, exitStrategyExplanations, addDays, netPerContract, computeExitPlan, evaluateExitTriggers };
}
if (typeof window !== 'undefined') {
  window.exitRules = exitRules;
  window.exitStrategyExplanations = exitStrategyExplanations;
  window.computeExitPlan = computeExitPlan;
  window.evaluateExitTriggers = evaluateExitTriggers;
}
