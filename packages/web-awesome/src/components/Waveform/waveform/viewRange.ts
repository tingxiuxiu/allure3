export const MIN_VIEW_SAMPLES = 20;

export type SampleRange = { i0: number; i1: number };

export function fullRange(n: number): SampleRange {
  return { i0: 0, i1: Math.max(0, n - 1) };
}

export function clampRange(i0: number, i1: number, n: number): SampleRange {
  if (n <= 0) return { i0: 0, i1: 0 };
  let a = Math.min(i0, i1);
  let b = Math.max(i0, i1);
  a = Math.max(0, Math.min(a, n - 1));
  b = Math.max(0, Math.min(b, n - 1));
  if (b - a + 1 < MIN_VIEW_SAMPLES && n >= MIN_VIEW_SAMPLES) {
    const need = MIN_VIEW_SAMPLES - (b - a + 1);
    const left = Math.min(a, Math.floor(need / 2));
    a -= left;
    b = Math.min(n - 1, b + (need - left));
    if (b - a + 1 < MIN_VIEW_SAMPLES) a = Math.max(0, b - (MIN_VIEW_SAMPLES - 1));
  }
  return { i0: a, i1: b };
}

export function boxZoom(current: SampleRange, frac0: number, frac1: number, n: number): SampleRange {
  const span = current.i1 - current.i0;
  const f0 = Math.min(frac0, frac1);
  const f1 = Math.max(frac0, frac1);
  const i0 = current.i0 + Math.floor(f0 * span);
  const i1 = current.i0 + Math.ceil(f1 * span);
  return clampRange(i0, i1, n);
}

export function panRange(current: SampleRange, deltaSamples: number, n: number): SampleRange {
  const w = current.i1 - current.i0;
  let i0 = current.i0 + deltaSamples;
  let i1 = current.i1 + deltaSamples;
  if (i0 < 0) {
    i0 = 0;
    i1 = w;
  }
  if (i1 > n - 1) {
    i1 = n - 1;
    i0 = Math.max(0, i1 - w);
  }
  return clampRange(i0, i1, n);
}

export function zoomAt(current: SampleRange, frac: number, factor: number, n: number): SampleRange {
  const span = current.i1 - current.i0;
  const next = Math.max(MIN_VIEW_SAMPLES - 1, span * factor);
  const center = current.i0 + frac * span;
  const i0 = center - next * frac;
  const i1 = i0 + next;
  return clampRange(Math.floor(i0), Math.ceil(i1), n);
}

export function indexAtTime(t: number, fs: number, n: number): number {
  if (n <= 0 || fs <= 0 || !Number.isFinite(t)) return 0;
  return Math.max(0, Math.min(n - 1, Math.round(t * fs)));
}

export function rangeFromTimes(t0: number, t1: number, fs: number, n: number): SampleRange {
  return clampRange(indexAtTime(t0, fs, n), indexAtTime(t1, fs, n), n);
}
