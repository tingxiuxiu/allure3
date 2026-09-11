import { NAN_RATIO_LIMIT, type ChannelStats } from "./types";

export function channelStats(values: Array<number | null | undefined>): ChannelStats {
  const arr = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  const empty: ChannelStats = {
    peak: null,
    min: null,
    peakPeak: null,
    average: null,
    rms: null,
    crestFactor: null,
    ripple: null,
    thd: null,
  };
  if (arr.length < 1) return empty;
  let peak = -Infinity;
  let min = Infinity;
  let sum = 0;
  let sumSq = 0;
  for (const v of arr) {
    if (v > peak) peak = v;
    if (v < min) min = v;
    sum += v;
    sumSq += v * v;
  }
  const average = sum / arr.length;
  const rms = Math.sqrt(sumSq / arr.length);
  return {
    peak,
    min,
    peakPeak: peak - min,
    average,
    rms,
    crestFactor: rms > 0 ? Math.max(Math.abs(peak), Math.abs(min)) / rms : null,
    ripple: Math.abs(average) > 0 ? ((peak - min) / Math.abs(average)) * 100 : null,
    thd: null,
  };
}

export function imbalancePercent(rmsValues: Array<number | null>): number | null {
  const vals = rmsValues.filter((v): v is number => v != null && Number.isFinite(v));
  if (vals.length !== 3) return null;
  const mean = vals.reduce((a, b) => a + b, 0) / 3;
  if (mean === 0) return null;
  return (Math.max(...vals.map((v) => Math.abs(v - mean))) / mean) * 100;
}

export function nanRatio(values: Float64Array, expected: number): number {
  const n = Math.max(expected, values.length);
  if (n === 0) return 1;
  let finite = 0;
  for (let i = 0; i < values.length; i++) {
    if (Number.isFinite(values[i])) finite++;
  }
  return (n - finite) / n;
}

export { NAN_RATIO_LIMIT };
