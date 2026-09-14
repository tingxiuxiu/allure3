import type { VNode } from "preact";

import { STAT_CARDS, channelColor } from "../theme";
import { useWaveformStore } from "../waveform/store";
import type { ChannelStats } from "../waveform/types";

function fmt(v: unknown, digits = 2): string {
  if (typeof v === "number" && Number.isFinite(v)) return v.toFixed(digits);
  if (v == null) return "N/A";
  return String(v);
}

function asChannelStats(v: unknown): ChannelStats | null {
  if (!v || typeof v !== "object") return null;
  return v as ChannelStats;
}

function colKey(col: string): keyof ChannelStats {
  if (col === "P-P") return "peakPeak";
  if (col === "Avg") return "average";
  if (col === "CF") return "crestFactor";
  if (col === "Ripple") return "ripple";
  return col.toLowerCase() as keyof ChannelStats;
}

type Props = {
  embedded: boolean;
  abReady: boolean;
  sampleCount?: number;
  samplingRate?: number;
  statsFull?: Record<string, unknown>;
  windowChannels: Record<string, ChannelStats> | null;
  voltageImb: number | null | undefined;
  currentImb: number | null | undefined;
};

export function StatsFooter({
  embedded,
  abReady,
  sampleCount,
  samplingRate,
  statsFull,
  windowChannels,
  voltageImb,
  currentImb,
}: Props): VNode {
  const scheme = useWaveformStore((s) => s.scheme);
  const getSt = (id: string): ChannelStats | null =>
    windowChannels ? windowChannels[id] : asChannelStats(statsFull?.[id]);

  if (embedded) {
    return (
      <footer className="statistics-bar">
        <div className="statistics-compact">
          <span>
            <strong>采样</strong> {sampleCount?.toLocaleString() ?? "—"} 点
          </span>
          <span>
            <strong>频率</strong> {samplingRate?.toLocaleString() ?? "—"} Hz
          </span>
          <span>
            <strong>Va RMS</strong> {fmt(getSt("Va")?.rms)} V
          </span>
          <span>
            <strong>电压不平衡</strong> {fmt(voltageImb)}%
          </span>
          <span className="scope-pill">{abReady ? "A–B 区间" : "全记录"}</span>
        </div>
      </footer>
    );
  }

  return (
    <footer className="statistics-bar">
      <div className="statistics-full">
        <div className="statistics-heading">
          <h2>统计分析</h2>
          <span>{abReady ? "A–B 区间" : "全记录"}</span>
        </div>
        <div className="stats-cards">
          {STAT_CARDS.map((card) => (
            <section key={card.title} className="stats-card">
              <h3 className="stats-card-title">
                <span className="stats-card-dot" style={{ background: channelColor(card.ids[0], 0, scheme) }} />
                {card.title}
              </h3>
              <table className="stats-table">
                <thead>
                  <tr>
                    <th>通道</th>
                    {card.cols.map((c) => (
                      <th key={c}>{c}</th>
                    ))}
                    {card.thd ? <th>THD</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {card.ids.map((id) => {
                    const st = getSt(id);
                    return (
                      <tr key={id}>
                        <td>{id}</td>
                        {card.cols.map((c) => (
                          <td key={c}>{fmt(st?.[colKey(c)])}</td>
                        ))}
                        {card.thd ? <td>N/A</td> : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          ))}
        </div>
        <div className="stats-summary">
          电压不平衡 {fmt(voltageImb)}% · 电流不平衡 {fmt(currentImb)}%
        </div>
      </div>
    </footer>
  );
}
