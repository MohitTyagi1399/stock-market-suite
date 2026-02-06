export type CandleLike = { t: string; o: number; h: number; l: number; c: number; v: number };

export const sma = (values: number[], period: number): Array<number | null> => {
  if (period <= 0) throw new Error('period must be > 0');
  const out: Array<number | null> = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i]!;
    if (i >= period) sum -= values[i - period]!;
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
};

export const ema = (values: number[], period: number): Array<number | null> => {
  if (period <= 0) throw new Error('period must be > 0');
  const out: Array<number | null> = new Array(values.length).fill(null);
  const k = 2 / (period + 1);
  let prev: number | null = null;
  for (let i = 0; i < values.length; i++) {
    const v = values[i]!;
    if (i < period - 1) continue;
    if (prev === null) {
      const seed = sma(values.slice(0, i + 1), period)[i]!;
      prev = seed;
      out[i] = seed;
      continue;
    }
    const prevValue = prev as number;
    const nextValue = v * k + prevValue * (1 - k);
    prev = nextValue;
    out[i] = nextValue;
  }
  return out;
};

export const rsi = (values: number[], period = 14): Array<number | null> => {
  if (period <= 0) throw new Error('period must be > 0');
  const out: Array<number | null> = new Array(values.length).fill(null);
  if (values.length < period + 1) return out;

  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = values[i]! - values[i - 1]!;
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i]! - values[i - 1]!;
    const g = diff > 0 ? diff : 0;
    const l = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
};

export const vwap = (candles: CandleLike[]): Array<number | null> => {
  const out: Array<number | null> = new Array(candles.length).fill(null);
  let cumPV = 0;
  let cumV = 0;
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i]!;
    const typical = (c.h + c.l + c.c) / 3;
    const vol = c.v ?? 0;
    cumPV += typical * vol;
    cumV += vol;
    out[i] = cumV === 0 ? null : cumPV / cumV;
  }
  return out;
};
