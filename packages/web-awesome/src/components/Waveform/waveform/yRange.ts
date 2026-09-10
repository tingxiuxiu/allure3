import { columnMinMax } from "./minmax";
import type { SampleRange } from "./viewRange";

export function seriesYRange(
  series: Float64Array[],
  view: SampleRange,
  followWindow: boolean,
): { min: number; max: number } | null {
  let min = Infinity;
  let max = -Infinity;
  for (const y of series) {
    const a = followWindow ? view.i0 : 0;
    const b = followWindow ? view.i1 : y.length - 1;
    const mm = columnMinMax(y, a, b);
    if (!Number.isFinite(mm.min)) continue;
    if (mm.min < min) min = mm.min;
    if (mm.max > max) max = mm.max;
  }
  if (min === Infinity) return null;
  const pad = (max - min) * 0.06 || 1;
  return { min: min - pad, max: max + pad };
}
