import type { StrategyLeg, StrategyAnalysisResponse } from '@optionsranker/shared';
import { STRATEGY_TEMPLATES } from '@optionsranker/shared';
import * as bs from '../utils/blackScholes.js';

const DEFAULT_RISK_FREE_RATE = 0.05;
const DEFAULT_VOLATILITY = 0.30;
const DEFAULT_TIME_TO_EXPIRY = 30 / 365; // 30 days

export function analyzeStrategy(data: {
  underlying: string;
  underlyingPrice: number;
  legs: StrategyLeg[];
  riskFreeRate?: number;
  volatility?: number;
}): StrategyAnalysisResponse {
  const S = data.underlyingPrice;
  const r = data.riskFreeRate ?? DEFAULT_RISK_FREE_RATE;
  const sigma = data.volatility ?? DEFAULT_VOLATILITY;
  const T = DEFAULT_TIME_TO_EXPIRY;

  // Calculate aggregate Greeks
  let totalDelta = 0;
  let totalGamma = 0;
  let totalTheta = 0;
  let totalVega = 0;

  for (const leg of data.legs) {
    if (leg.type === 'stock') {
      const direction = leg.direction === 'buy' ? 1 : -1;
      totalDelta += direction * leg.quantity;
      continue;
    }

    const K = leg.strike ?? S; // default to ATM if no strike
    const greeks = bs.calculateGreeks(leg.type, S, K, T, r, sigma);
    const direction = leg.direction === 'buy' ? 1 : -1;
    const multiplier = direction * leg.quantity * 100; // 100 shares per contract

    totalDelta += greeks.delta * multiplier;
    totalGamma += greeks.gamma * multiplier;
    totalTheta += greeks.theta * multiplier;
    totalVega += greeks.vega * multiplier;
  }

  // Calculate P&L across a range of underlying prices at expiration
  const lowerBound = S * 0.7;
  const upperBound = S * 1.3;
  const steps = 60;
  const stepSize = (upperBound - lowerBound) / steps;

  const pnlData: { price: number; pnl: number }[] = [];

  for (let i = 0; i <= steps; i++) {
    const priceAtExpiry = lowerBound + i * stepSize;
    let pnl = 0;

    for (const leg of data.legs) {
      const direction = leg.direction === 'buy' ? 1 : -1;
      const premium = leg.premium ?? 0;

      if (leg.type === 'stock') {
        pnl += direction * leg.quantity * (priceAtExpiry - S);
        continue;
      }

      const K = leg.strike ?? S;
      let intrinsicValue: number;

      if (leg.type === 'call') {
        intrinsicValue = Math.max(0, priceAtExpiry - K);
      } else {
        intrinsicValue = Math.max(0, K - priceAtExpiry);
      }

      // P&L per leg = direction * (intrinsic value - premium paid) * quantity * 100
      pnl += direction * (intrinsicValue - premium) * leg.quantity * 100;
    }

    pnlData.push({
      price: Math.round(priceAtExpiry * 100) / 100,
      pnl: Math.round(pnl * 100) / 100,
    });
  }

  // Calculate max profit and max loss from P&L data
  const pnlValues = pnlData.map(d => d.pnl);
  const rawMaxProfit = Math.max(...pnlValues);
  const rawMaxLoss = Math.min(...pnlValues);

  // Check if profit is unlimited (still increasing at upper boundary)
  const lastPnl = pnlValues[pnlValues.length - 1];
  const secondLastPnl = pnlValues[pnlValues.length - 2];
  const firstPnl = pnlValues[0];
  const secondPnl = pnlValues[1];

  const maxProfit: number | 'unlimited' =
    (lastPnl > secondLastPnl && lastPnl === rawMaxProfit) ||
    (firstPnl > secondPnl && firstPnl === rawMaxProfit)
      ? 'unlimited'
      : rawMaxProfit;

  // Check if loss is unlimited
  const maxLoss: number | 'unlimited' =
    (firstPnl < secondPnl && firstPnl === rawMaxLoss) ||
    (lastPnl < secondLastPnl && lastPnl === rawMaxLoss)
      ? 'unlimited'
      : rawMaxLoss;

  // Find breakeven points (where P&L crosses zero)
  const breakeven: number[] = [];
  for (let i = 1; i < pnlData.length; i++) {
    const prev = pnlData[i - 1];
    const curr = pnlData[i];

    if ((prev.pnl <= 0 && curr.pnl >= 0) || (prev.pnl >= 0 && curr.pnl <= 0)) {
      // Linear interpolation
      const ratio = Math.abs(prev.pnl) / (Math.abs(prev.pnl) + Math.abs(curr.pnl));
      const breakEvenPrice = prev.price + ratio * (curr.price - prev.price);
      breakeven.push(Math.round(breakEvenPrice * 100) / 100);
    }
  }

  // Estimate probability of profit (simplified: proportion of price range that is profitable)
  const profitableSteps = pnlValues.filter(v => v > 0).length;
  const probabilityOfProfit = Math.round((profitableSteps / pnlValues.length) * 100) / 100;

  return {
    legs: data.legs,
    greeks: {
      delta: Math.round(totalDelta * 10000) / 10000,
      gamma: Math.round(totalGamma * 10000) / 10000,
      theta: Math.round(totalTheta * 10000) / 10000,
      vega: Math.round(totalVega * 10000) / 10000,
    },
    maxProfit,
    maxLoss,
    breakeven,
    pnlData,
    probabilityOfProfit,
  };
}

export function getTemplates() {
  return STRATEGY_TEMPLATES;
}
