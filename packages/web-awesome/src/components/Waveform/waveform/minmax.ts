export type MinmaxColumn = { start: number; end: number; x: number };

export function minmaxColumns(i0: number, i1: number, buckets: number, xAt: (index: number) => number): MinmaxColumn[] {
  const start = Math.min(i0, i1);
  const end = Math.max(i0, i1);
  const span = end - start + 1;
  const b = Math.max(1, Math.min(Math.max(1, buckets), span));
  const cols: MinmaxColumn[] = [];
  for (let k = 0; k < b; k++) {
    const a = start + Math.floor((k * span) / b);
    const c = start + Math.floor(((k + 1) * span) / b) - 1;
    const hi = Math.max(a, c);
    cols.push({ start: a, end: hi, x: xAt((a + hi) / 2) });
  }
  return cols;
}

export function columnMinMax(y: Float64Array, start: number, end: number): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (let i = start; i <= end; i++) {
    const v = y[i];
    if (!Number.isFinite(v)) continue;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (min === Infinity) return { min: Number.NaN, max: Number.NaN };
  return { min, max };
}

export function envelopeSeries(y: Float64Array, cols: MinmaxColumn[]): { min: number[]; max: number[] } {
  const min: number[] = [];
  const max: number[] = [];
  for (const c of cols) {
    const mm = columnMinMax(y, c.start, c.end);
    min.push(mm.min);
    max.push(mm.max);
  }
  return { min, max };
}
