export type ChannelMeta = {
  id: string;
  group: string;
  pairId?: string | null;
  unit?: string;
};

export type LengthWarning = {
  channel: string;
  expected: number;
  actual: number;
  message?: string;
};

export type ChannelStats = {
  peak: number | null;
  min: number | null;
  peakPeak: number | null;
  average: number | null;
  rms: number | null;
  crestFactor: number | null;
  ripple: number | null;
  thd: null;
};

export type WaveformJson = {
  sampleCount: number;
  samplingRate: number;
  units?: Record<string, string>;
  channels?: ChannelMeta[];
  warnings?: LengthWarning[];
  stats?: { full?: Record<string, ChannelStats | number | null> };
  timeline?: number[] | { t0: number; dt: number; unit?: string };
  [group: string]: unknown;
};

export const NAN_RATIO_LIMIT = 0.001;

export const DEFAULT_CHANNELS: ChannelMeta[] = [
  { id: "Va", group: "voltage", pairId: "phase-A", unit: "V" },
  { id: "Vb", group: "voltage", pairId: "phase-B", unit: "V" },
  { id: "Vc", group: "voltage", pairId: "phase-C", unit: "V" },
  { id: "Ia", group: "current", pairId: "phase-A", unit: "A" },
  { id: "Ib", group: "current", pairId: "phase-B", unit: "A" },
  { id: "Ic", group: "current", pairId: "phase-C", unit: "A" },
  { id: "speed", group: "motor", pairId: null, unit: "rpm" },
  { id: "load", group: "motor", pairId: null, unit: "%" },
];

export const VOLTAGE_IDS = ["Va", "Vb", "Vc"] as const;
export const CURRENT_IDS = ["Ia", "Ib", "Ic"] as const;
