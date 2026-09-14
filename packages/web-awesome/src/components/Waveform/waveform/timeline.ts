export type TimelineSpec = { t0: number; dt: number; unit: string };
export type Timeline = TimelineSpec | Float64Array;

export function fallbackTimeline(samplingRate: number, t0 = 0): TimelineSpec {
  return { t0, dt: samplingRate > 0 ? 1 / samplingRate : 1, unit: "s" };
}

export function parseTimeline(raw: unknown, sampleCount: number, samplingRate: number): Timeline {
  const fb = fallbackTimeline(samplingRate);
  if (Array.isArray(raw) && raw.length > 0) {
    const arr = new Float64Array(sampleCount);
    const n = Math.min(raw.length, sampleCount);
    for (let i = 0; i < n; i++) {
      const v = raw[i];
      arr[i] = typeof v === "number" && Number.isFinite(v) ? v : Number.NaN;
    }
    for (let i = n; i < sampleCount; i++) arr[i] = fb.t0 + i * fb.dt;
    return arr;
  }
  if (raw && typeof raw === "object" && !Array.isArray(raw) && "t0" in (raw as object)) {
    const o = raw as { t0?: unknown; dt?: unknown; unit?: unknown };
    const t0 = typeof o.t0 === "number" && Number.isFinite(o.t0) ? o.t0 : fb.t0;
    const dt = typeof o.dt === "number" && o.dt > 0 ? o.dt : fb.dt;
    const unit = typeof o.unit === "string" && o.unit.length > 0 ? o.unit : "s";
    return { t0, dt, unit };
  }
  return fb;
}

export function timeAt(timeline: Timeline, index: number): number {
  if (timeline instanceof Float64Array) {
    const v = timeline[index];
    return Number.isFinite(v) ? v : Number.NaN;
  }
  return timeline.t0 + index * timeline.dt;
}

/**
 * Time marker at a possibly-fractional sample index, used only for axis-tick and
 * readout labels. For an array timeline (arbitrary, non-uniform, possibly
 * non-monotonic markers) this linearly interpolates between neighbouring
 * samples and clamps at the ends; charts are drawn against the sample index, not
 * this value, so the timeline never needs to be uniform or sorted.
 */
export function timeAtInterp(timeline: Timeline, index: number): number {
  if (!(timeline instanceof Float64Array)) {
    return timeline.t0 + index * timeline.dt;
  }
  const len = timeline.length;
  if (len === 0) return Number.NaN;
  if (index <= 0) return timeline[0];
  if (index >= len - 1) return timeline[len - 1];
  const lo = Math.floor(index);
  const hi = lo + 1;
  const frac = index - lo;
  const a = timeline[lo];
  const b = timeline[hi];
  if (!Number.isFinite(a)) return Number.isFinite(b) ? b : Number.NaN;
  if (!Number.isFinite(b)) return a;
  return a + (b - a) * frac;
}

export function timelineUnit(timeline: Timeline): string {
  if (timeline instanceof Float64Array) return "s";
  return timeline.unit || "s";
}

export function samplesPerUnit(timeline: Timeline, fallbackFs: number): number {
  if (timeline instanceof Float64Array) {
    if (timeline.length < 2) return fallbackFs;
    const dt = timeline[1] - timeline[0];
    return dt > 0 ? 1 / dt : fallbackFs;
  }
  return timeline.dt > 0 ? 1 / timeline.dt : fallbackFs;
}

export function indexOnTimeline(t: number, timeline: Timeline, n: number): number {
  if (n <= 0 || !Number.isFinite(t)) return 0;
  if (timeline instanceof Float64Array) {
    const last = Math.min(timeline.length, n) - 1;
    if (last < 0) return 0;
    if (t <= timeline[0]) return 0;
    if (t >= timeline[last]) return last;
    let lo = 0;
    let hi = last;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (timeline[mid] < t) lo = mid + 1;
      else hi = mid;
    }
    if (lo > 0 && Math.abs(timeline[lo - 1] - t) <= Math.abs(timeline[lo] - t)) return lo - 1;
    return lo;
  }
  if (timeline.dt <= 0) return 0;
  return Math.max(0, Math.min(n - 1, Math.round((t - timeline.t0) / timeline.dt)));
}

export function formatAxisTime(v: number, unit: string): string {
  const abs = Math.abs(v);
  const num = abs >= 100 ? v.toFixed(1) : abs >= 1 ? v.toFixed(3) : Number(v).toPrecision(4);
  return unit && unit !== "s" ? `${num} ${unit}` : num;
}
