/** Apple DESIGN.md tokens + waveform series colors (data, not chrome). */

export type ColorScheme = "dark" | "light";

export const CORE_GROUPS = ["voltage", "current", "motor"] as const;

export const GROUP_LABELS: Record<string, string> = {
  voltage: "三相电压",
  current: "三相电流",
  motor: "电机状态",
};

/** Distinct traces; UI chrome stays Action Blue. Ink traces invert on dark. */
const CHANNEL_COLORS: Record<ColorScheme, Record<string, string>> = {
  light: {
    Va: "#0066cc",
    Vb: "#1d1d1f",
    Vc: "#ff9f0a",
    Ia: "#34aadc",
    Ib: "#af52de",
    Ic: "#ff375f",
    speed: "#0066cc",
    load: "#1d1d1f",
  },
  dark: {
    Va: "#2997ff",
    Vb: "#f5f5f7",
    Vc: "#ff9f0a",
    Ia: "#64d2ff",
    Ib: "#bf5af2",
    Ic: "#ff375f",
    speed: "#2997ff",
    load: "#d2d2d7",
  },
};

const FALLBACK: Record<ColorScheme, string[]> = {
  light: ["#0066cc", "#1d1d1f", "#ff9f0a", "#34aadc", "#af52de", "#ff375f"],
  dark: ["#2997ff", "#f5f5f7", "#ff9f0a", "#64d2ff", "#bf5af2", "#ff375f"],
};

export function channelColor(id: string, index = 0, scheme: ColorScheme = "dark"): string {
  return CHANNEL_COLORS[scheme][id] ?? FALLBACK[scheme][index % FALLBACK[scheme].length];
}

export function channelFill(id: string, index = 0, alpha = 0.22, scheme: ColorScheme = "dark"): string {
  const hex = channelColor(id, index, scheme).replace("#", "");
  const n = parseInt(hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export const STAT_CARDS = [
  {
    title: "电压",
    group: "voltage",
    ids: ["Va", "Vb", "Vc"] as const,
    cols: ["Peak", "Min", "P-P", "Avg", "RMS", "CF"] as const,
    thd: true,
  },
  {
    title: "电流",
    group: "current",
    ids: ["Ia", "Ib", "Ic"] as const,
    cols: ["Peak", "Min", "P-P", "Avg", "RMS", "CF"] as const,
    thd: true,
  },
  {
    title: "电机",
    group: "motor",
    ids: ["speed", "load"] as const,
    cols: ["Peak", "Min", "Avg", "Ripple"] as const,
    thd: false,
  },
] as const;
