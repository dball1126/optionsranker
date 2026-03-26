/* ═══════════════════════════════════════════════════════════════
   OPTIONS STRATEGY RECOMMENDATION ENGINE
   Based on technical analysis signals and volatility
   ═══════════════════════════════════════════════════════════════ */

export interface TechnicalAnalysis {
  indicators: {
    price: number;
    atr: number;
    rsi?: number;
    macd?: number;
    volume?: number;
  };
  composite: {
    signal: 'STRONG BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG SELL';
    confidence: number;
  };
  volatility: 'low' | 'medium' | 'high';
}

export interface StrategyRecommendation {
  name: string;
  type: 'bullish' | 'bearish' | 'neutral';
  icon: string;
  strikes: string;
  expiry: string;
  expiryRaw: string;
  maxProfit: string;
  maxLoss: string;
  breakeven: string;
  risk: number; // 1-5
  explanation: string;
  confidence: number; // 1-100
}

function roundStrike(price: number, step?: number): number {
  if (!step) {
    if (price < 20) step = 1;
    else if (price < 50) step = 2.5;
    else if (price < 200) step = 5;
    else step = 10;
  }
  return Math.round(price / step) * step;
}

function getExpiry(type: 'weekly' | 'swing' | 'leaps'): string {
  const now = new Date();
  let days: number;
  
  switch (type) {
    case 'weekly': days = 7; break;
    case 'swing': days = 35; break;
    case 'leaps': days = 270; break;
    default: days = 35;
  }
  
  const exp = new Date(now.getTime() + days * 86400000);
  
  // Push to next Friday
  const dow = exp.getDay();
  if (dow === 0) exp.setDate(exp.getDate() + 5);
  else if (dow === 6) exp.setDate(exp.getDate() + 6);
  else if (dow !== 5) exp.setDate(exp.getDate() + (5 - dow));
  
  return exp.toISOString().split('T')[0];
}

function formatDate(dateStr: string): string {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const [year, month, day] = dateStr.split('-');
  return `${months[parseInt(month) - 1]} ${parseInt(day)}`;
}

export function generateStrategyRecommendations(analysis: TechnicalAnalysis): StrategyRecommendation[] {
  const { indicators, composite, volatility } = analysis;
  const { price, atr = price * 0.02 } = indicators;
  const { signal } = composite;
  
  const strategies: StrategyRecommendation[] = [];
  
  const isBullish = signal === 'STRONG BUY' || signal === 'BUY';
  const isBearish = signal === 'STRONG SELL' || signal === 'SELL';
  const isStrong = signal === 'STRONG BUY' || signal === 'STRONG SELL';
  const isHighVol = volatility === 'high';
  const isMediumVol = volatility === 'medium';

  // BULLISH STRATEGIES
  if (isBullish) {
    if (!isHighVol) {
      // Buy Calls - Direct exposure
      const strike = roundStrike(price - atr * 0.5);
      const expiry = getExpiry(isStrong ? 'swing' : 'weekly');
      const premium = atr * 1.2;
      
      strategies.push({
        name: 'Buy Calls',
        type: 'bullish',
        icon: '📈',
        strikes: `$${strike} call`,
        expiry: formatDate(expiry),
        expiryRaw: expiry,
        maxProfit: 'Unlimited',
        maxLoss: `$${premium.toFixed(2)} (premium)`,
        breakeven: `$${(strike + premium).toFixed(2)}`,
        risk: 3,
        explanation: `Buy near-money calls. Strong bullish signals suggest significant upside potential. Risk limited to premium paid.`,
        confidence: composite.confidence
      });

      // Bull Call Spread - Defined risk
      const longStrike = roundStrike(price);
      const shortStrike = roundStrike(price + atr * 2);
      const spread = shortStrike - longStrike;
      const netDebit = spread * 0.4;
      
      strategies.push({
        name: 'Bull Call Spread',
        type: 'bullish',
        icon: '📊',
        strikes: `Buy $${longStrike}C / Sell $${shortStrike}C`,
        expiry: formatDate(getExpiry('swing')),
        expiryRaw: getExpiry('swing'),
        maxProfit: `$${(spread - netDebit).toFixed(2)}`,
        maxLoss: `$${netDebit.toFixed(2)}`,
        breakeven: `$${(longStrike + netDebit).toFixed(2)}`,
        risk: 2,
        explanation: `Defined risk bullish spread. Lower cost than buying calls outright with capped but substantial profit potential.`,
        confidence: Math.min(composite.confidence + 10, 100)
      });
    }

    if (isHighVol || isMediumVol) {
      // Cash-Secured Put - High IV play
      const strike = roundStrike(price - atr * 1.5);
      const expiry = getExpiry('swing');
      const premium = atr * (isHighVol ? 1.0 : 0.6);
      
      strategies.push({
        name: 'Cash-Secured Put',
        type: 'bullish',
        icon: '💰',
        strikes: `Sell $${strike} put`,
        expiry: formatDate(expiry),
        expiryRaw: expiry,
        maxProfit: `$${premium.toFixed(2)} (premium)`,
        maxLoss: `$${(strike - premium).toFixed(2)} (if assigned)`,
        breakeven: `$${(strike - premium).toFixed(2)}`,
        risk: 3,
        explanation: `Sell put below support. High IV inflates premiums. Get shares at discount if assigned.`,
        confidence: composite.confidence - 5
      });

      // Bull Put Spread - Credit spread
      const shortPut = roundStrike(price - atr);
      const longPut = roundStrike(price - atr * 3);
      const credit = (shortPut - longPut) * 0.35;
      
      strategies.push({
        name: 'Bull Put Spread',
        type: 'bullish',
        icon: '🛡️',
        strikes: `Sell $${shortPut}P / Buy $${longPut}P`,
        expiry: formatDate(getExpiry('swing')),
        expiryRaw: getExpiry('swing'),
        maxProfit: `$${credit.toFixed(2)} (credit)`,
        maxLoss: `$${(shortPut - longPut - credit).toFixed(2)}`,
        breakeven: `$${(shortPut - credit).toFixed(2)}`,
        risk: 2,
        explanation: `Bullish credit spread. Benefits from IV crush and time decay as price holds above short strike.`,
        confidence: composite.confidence
      });
    }
  }

  // BEARISH STRATEGIES
  if (isBearish) {
    if (!isHighVol) {
      // Buy Puts
      const strike = roundStrike(price + atr * 0.5);
      const premium = atr * 1.2;
      
      strategies.push({
        name: 'Buy Puts',
        type: 'bearish',
        icon: '📉',
        strikes: `$${strike} put`,
        expiry: formatDate(getExpiry(isStrong ? 'swing' : 'weekly')),
        expiryRaw: getExpiry(isStrong ? 'swing' : 'weekly'),
        maxProfit: `$${(strike - premium).toFixed(2)}`,
        maxLoss: `$${premium.toFixed(2)} (premium)`,
        breakeven: `$${(strike - premium).toFixed(2)}`,
        risk: 3,
        explanation: `Buy puts for downside protection. Bearish signals indicate potential weakness ahead.`,
        confidence: composite.confidence
      });

      // Bear Put Spread
      const longPut = roundStrike(price);
      const shortPut = roundStrike(price - atr * 2);
      const netDebit = (longPut - shortPut) * 0.4;
      
      strategies.push({
        name: 'Bear Put Spread',
        type: 'bearish',
        icon: '📊',
        strikes: `Buy $${longPut}P / Sell $${shortPut}P`,
        expiry: formatDate(getExpiry('swing')),
        expiryRaw: getExpiry('swing'),
        maxProfit: `$${(longPut - shortPut - netDebit).toFixed(2)}`,
        maxLoss: `$${netDebit.toFixed(2)}`,
        breakeven: `$${(longPut - netDebit).toFixed(2)}`,
        risk: 2,
        explanation: `Defined risk bearish spread. Lower cost than buying puts with capped profit potential.`,
        confidence: composite.confidence + 5
      });
    }

    if (isHighVol) {
      // Bear Call Spread - High IV
      const shortCall = roundStrike(price + atr);
      const longCall = roundStrike(price + atr * 3);
      const credit = (longCall - shortCall) * 0.35;
      
      strategies.push({
        name: 'Bear Call Spread',
        type: 'bearish',
        icon: '🔻',
        strikes: `Sell $${shortCall}C / Buy $${longCall}C`,
        expiry: formatDate(getExpiry('swing')),
        expiryRaw: getExpiry('swing'),
        maxProfit: `$${credit.toFixed(2)} (credit)`,
        maxLoss: `$${(longCall - shortCall - credit).toFixed(2)}`,
        breakeven: `$${(shortCall + credit).toFixed(2)}`,
        risk: 2,
        explanation: `Bearish credit spread. Profits from high IV decay as price stays below strike.`,
        confidence: composite.confidence
      });
    }
  }

  // NEUTRAL STRATEGIES
  if (!isBullish && !isBearish) {
    if (isHighVol) {
      // Iron Condor - Range-bound + high IV
      const putShort = roundStrike(price - atr * 1.5);
      const putLong = roundStrike(price - atr * 3);
      const callShort = roundStrike(price + atr * 1.5);
      const callLong = roundStrike(price + atr * 3);
      const credit = atr * 0.6;
      
      strategies.push({
        name: 'Iron Condor',
        type: 'neutral',
        icon: '🦅',
        strikes: `${putLong}P/${putShort}P — ${callShort}C/${callLong}C`,
        expiry: formatDate(getExpiry('swing')),
        expiryRaw: getExpiry('swing'),
        maxProfit: `$${credit.toFixed(2)} (credit)`,
        maxLoss: `$${(atr * 1.5 - credit).toFixed(2)}`,
        breakeven: `$${(putShort - credit).toFixed(2)} / $${(callShort + credit).toFixed(2)}`,
        risk: 2,
        explanation: `Neutral range strategy. Profits if price stays between strikes. High IV inflates collected premiums.`,
        confidence: Math.min(composite.confidence + 15, 85)
      });
    } else {
      // Calendar Spread - Low vol environment
      const strike = roundStrike(price);
      
      strategies.push({
        name: 'Calendar Spread',
        type: 'neutral',
        icon: '📅',
        strikes: `$${strike} (sell near / buy far)`,
        expiry: `${formatDate(getExpiry('swing'))} / ${formatDate(getExpiry('leaps'))}`,
        expiryRaw: getExpiry('swing'),
        maxProfit: 'Varies (IV expansion)',
        maxLoss: 'Net debit paid',
        breakeven: `Near $${strike}`,
        risk: 2,
        explanation: `Time spread strategy. Profits from time decay differential and IV expansion. Best in low-vol environments.`,
        confidence: composite.confidence - 10
      });
    }
  }

  // LEAPS for strong conviction plays
  if (isStrong) {
    const strike = isBullish ? roundStrike(price * 0.9) : roundStrike(price * 1.1);
    const type = isBullish ? 'call' : 'put';
    const premium = price * 0.15;
    
    strategies.push({
      name: 'LEAPS',
      type: isBullish ? 'bullish' : 'bearish',
      icon: '🚀',
      strikes: `$${strike} ${type}`,
      expiry: formatDate(getExpiry('leaps')),
      expiryRaw: getExpiry('leaps'),
      maxProfit: 'Substantial (leveraged exposure)',
      maxLoss: 'Premium paid',
      breakeven: isBullish ? `$${(strike + premium).toFixed(2)}` : `$${(strike - premium).toFixed(2)}`,
      risk: 4,
      explanation: `Long-term ${type} for strong ${isBullish ? 'bullish' : 'bearish'} conviction. Time gives thesis room to develop.`,
      confidence: Math.max(composite.confidence - 15, 40)
    });
  }

  // Sort by confidence and return top 3-4 strategies
  return strategies
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, Math.min(4, strategies.length));
}

export function calculateRiskScore(risk: number): string {
  const bars = '█'.repeat(risk) + '░'.repeat(5 - risk);
  return bars;
}