import { channelStats, imbalancePercent, nanRatio, NAN_RATIO_LIMIT } from "./stats";
import { parseTimeline, type Timeline } from "./timeline";
import { DEFAULT_CHANNELS, type LengthWarning, type WaveformJson } from "./types";

const META = new Set(["sampleCount", "samplingRate", "units", "channels", "warnings", "stats", "timeline"]);

export type SeriesMap = Record<string, Record<string, Float64Array>>;

export type NormalizedWaveform = {
  sampleCount: number;
  samplingRate: number;
  units: Record<string, string>;
  channels: NonNullable<WaveformJson["channels"]>;
  warnings: LengthWarning[];
  groups: SeriesMap;
  durationSeconds: number;
  statsFull: Record<string, unknown>;
  timeline: Timeline;
};

export function isGroupBlock(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeWaveform(raw: WaveformJson): NormalizedWaveform {
  const sampleCount = raw.sampleCount;
  const samplingRate = raw.samplingRate;
  const warnings: LengthWarning[] = [...(raw.warnings ?? [])];
  const groups: SeriesMap = {};

  for (const [key, value] of Object.entries(raw)) {
    if (META.has(key) || !isGroupBlock(value)) continue;
    const series: Record<string, Float64Array> = {};
    for (const [chId, arr] of Object.entries(value)) {
      if (!Array.isArray(arr)) continue;
      if (arr.length !== sampleCount && !warnings.some((w) => w.channel === chId)) {
        warnings.push({
          channel: chId,
          expected: sampleCount,
          actual: arr.length,
          message:
            arr.length < sampleCount
              ? `${chId} length ${arr.length} < ${sampleCount}`
              : `${chId} length ${arr.length} > ${sampleCount}, truncated in view`,
        });
      }
      const out = new Float64Array(sampleCount);
      const n = Math.min(arr.length, sampleCount);
      for (let i = 0; i < n; i++) {
        const v = arr[i];
        out[i] = typeof v === "number" && Number.isFinite(v) ? v : Number.NaN;
      }
      for (let i = n; i < sampleCount; i++) out[i] = Number.NaN;
      series[chId] = out;
    }
    groups[key] = series;
  }

  return {
    sampleCount,
    samplingRate,
    units: raw.units ?? {},
    channels: raw.channels?.length ? raw.channels : DEFAULT_CHANNELS,
    warnings,
    groups,
    durationSeconds: sampleCount > 1 ? (sampleCount - 1) / samplingRate : 0,
    statsFull: (raw.stats?.full ?? {}) as Record<string, unknown>,
    timeline: parseTimeline(raw.timeline, sampleCount, samplingRate),
  };
}

export function windowStats(series: Float64Array, i0: number, i1: number): ReturnType<typeof channelStats> {
  const a = Math.max(0, Math.min(i0, i1));
  const b = Math.min(series.length, Math.max(i0, i1) + 1);
  const slice: number[] = [];
  for (let i = a; i < b; i++) slice.push(series[i]);
  return channelStats(slice);
}

export function groupImbalance(
  groups: SeriesMap,
  group: "voltage" | "current",
  ids: [string, string, string],
  expected: number,
): number | null {
  const block = groups[group];
  if (!block) return null;
  const rms = ids.map((id) => {
    const s = block[id];
    if (!s) return null;
    if (nanRatio(s, expected) > NAN_RATIO_LIMIT) return null;
    return channelStats(Array.from(s)).rms;
  });
  return imbalancePercent(rms);
}
