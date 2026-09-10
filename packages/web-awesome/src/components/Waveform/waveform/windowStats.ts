import type { SeriesMap } from "./normalize";
import { channelStats, imbalancePercent, NAN_RATIO_LIMIT } from "./stats";
import { CURRENT_IDS, VOLTAGE_IDS, type ChannelStats } from "./types";

export type WindowStatsResult = {
  channels: Record<string, ChannelStats>;
  voltageImbalance: number | null;
  currentImbalance: number | null;
};

function nanRatioSlice(y: Float64Array, i0: number, i1: number): number {
  const n = i1 - i0 + 1;
  if (n <= 0) return 1;
  let finite = 0;
  for (let i = i0; i <= i1; i++) if (Number.isFinite(y[i])) finite++;
  return (n - finite) / n;
}

export function computeWindowStats(groups: SeriesMap, i0: number, i1: number): WindowStatsResult {
  const channels: Record<string, ChannelStats> = {};
  const vRms: Array<number | null> = [];
  const iRms: Array<number | null> = [];
  for (const [group, block] of Object.entries(groups)) {
    for (const [id, y] of Object.entries(block)) {
      const a = Math.max(0, Math.min(i0, i1));
      const b = Math.min(y.length - 1, Math.max(i0, i1));
      const slice: number[] = [];
      for (let i = a; i <= b; i++) slice.push(y[i]);
      const st = channelStats(slice);
      channels[id] = st;
      const missing = nanRatioSlice(y, a, b) > NAN_RATIO_LIMIT;
      if (group === "voltage" && (VOLTAGE_IDS as readonly string[]).includes(id)) vRms.push(missing ? null : st.rms);
      if (group === "current" && (CURRENT_IDS as readonly string[]).includes(id)) iRms.push(missing ? null : st.rms);
    }
  }
  return {
    channels,
    voltageImbalance: imbalancePercent(vRms),
    currentImbalance: imbalancePercent(iRms),
  };
}

export function sampleAt(groups: SeriesMap, index: number): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const block of Object.values(groups)) {
    for (const [id, y] of Object.entries(block)) {
      const v = y[index];
      out[id] = Number.isFinite(v) ? v : null;
    }
  }
  return out;
}
