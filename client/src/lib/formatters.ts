export function formatStrike(strike: number): string {
  return strike.toFixed(2);
}

export function formatPremium(premium: number): string {
  return premium.toFixed(2);
}

export function formatGreek(value: number, decimals: number = 4): string {
  if (Math.abs(value) < 0.00005) return '0.0000';
  return value.toFixed(decimals);
}

export function formatVolume(volume: number): string {
  if (volume >= 1_000_000) {
    return `${(volume / 1_000_000).toFixed(1)}M`;
  }
  if (volume >= 1_000) {
    return `${(volume / 1_000).toFixed(1)}K`;
  }
  return volume.toString();
}

export function formatOI(openInterest: number): string {
  if (openInterest >= 1_000_000) {
    return `${(openInterest / 1_000_000).toFixed(1)}M`;
  }
  if (openInterest >= 1_000) {
    return `${(openInterest / 1_000).toFixed(1)}K`;
  }
  return openInterest.toString();
}
