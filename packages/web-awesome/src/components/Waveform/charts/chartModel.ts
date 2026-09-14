import { channelColor, type ColorScheme } from "../theme";
import { envelopeSeries, minmaxColumns } from "../waveform/minmax";
import type { NormalizedWaveform } from "../waveform/normalize";
import { seriesYRange } from "../waveform/yRange";

export type ChartPoint = [number, number | null];

export type ChartTrace = {
  id: string;
  color: string;
  points: ChartPoint[];
};

export type ChartModel = {
  traces: ChartTrace[];
  xMin: number;
  xMax: number;
  yMin: number | null;
  yMax: number | null;
};

function finiteOrNull(v: number): number | null {
  return Number.isFinite(v) ? v : null;
}

export function buildChartModel(
  data: NormalizedWaveform,
  group: string,
  visible: Set<string>,
  i0: number,
  i1: number,
  width: number,
  yFollow: boolean,
  scheme: ColorScheme = "dark",
): ChartModel {
  const block = data.groups[group] ?? {};
  const ids = Object.keys(block).filter((id) => visible.has(id));
  const buckets = Math.max(64, width * 2);
  // Draw against the sample index: it is always uniform and strictly increasing,
  // even when `data.timeline` is an arbitrary, non-uniform, possibly
  // non-monotonic marker array. The timeline is only used for axis/readout labels.
  const cols = minmaxColumns(i0, i1, buckets, (i) => i);
  const x = cols.map((c) => c.x);
  const traces: ChartTrace[] = [];
  const ys: Float64Array[] = [];

  ids.forEach((id, idx) => {
    const env = envelopeSeries(block[id], cols);
    const color = channelColor(id, idx, scheme);
    traces.push({
      id,
      color,
      points: x.map((t, i) => [t, finiteOrNull(env.max[i])]),
    });
    traces.push({
      id: `${id}·`,
      color,
      points: x.map((t, i) => [t, finiteOrNull(env.min[i])]),
    });
    ys.push(block[id]);
  });

  const yr = seriesYRange(ys, { i0, i1 }, yFollow);
  const xMin = x[0] ?? i0;
  const xMax = x[x.length - 1] ?? i1;
  const pad = xMax === xMin ? 1 : 0;
  return {
    traces,
    xMin,
    xMax: xMax === xMin ? xMin + pad : xMax,
    yMin: yr?.min ?? null,
    yMax: yr?.max ?? null,
  };
}
