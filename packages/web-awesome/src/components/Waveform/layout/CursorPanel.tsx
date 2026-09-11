import { CORE_GROUPS, GROUP_LABELS, channelColor } from "../theme";
import { useWaveformStore } from "../waveform/store";
import type { ChannelMeta } from "../waveform/types";

function fmt(v: unknown, digits = 2): string {
  if (typeof v === "number" && Number.isFinite(v)) return v.toFixed(digits);
  return "—";
}

function fmtSigned(v: number, digits = 2): string {
  const abs = Math.abs(v).toFixed(digits);
  if (v > 0) return `+${abs}`;
  if (v < 0) return `−${abs}`;
  return abs;
}

function groupRows(channels: ChannelMeta[], ids: string[]) {
  const meta = new Map(channels.map((ch) => [ch.id, ch]));
  const extra = ids.filter((id) => !meta.has(id)).map((id) => ({ id, group: "other" }));
  const all = [...channels, ...extra];
  const byGroup = new Map<string, ChannelMeta[]>();
  const seen = new Set<string>();
  for (const ch of all) {
    if (seen.has(ch.id)) continue;
    seen.add(ch.id);
    const list = byGroup.get(ch.group) ?? [];
    list.push(ch);
    byGroup.set(ch.group, list);
  }
  const known = new Set<string>(CORE_GROUPS);
  const order = [...CORE_GROUPS.filter((g) => byGroup.has(g)), ...[...byGroup.keys()].filter((g) => !known.has(g))];
  return order.map((group) => ({ group, rows: byGroup.get(group)! }));
}

type MarkerProps = {
  mark: "A" | "B";
  index: number | null;
  timeAt: (index: number) => number;
  unit: string;
  onClear: () => void;
};

function fmtDeltaT(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(3)} s`;
  if (ms >= 1) return `${ms.toFixed(1)} ms`;
  return `${(ms * 1000).toFixed(1)} µs`;
}

function fmtHz(hz: number): string {
  if (hz >= 1000) return `${(hz / 1000).toFixed(2)} kHz`;
  if (hz >= 10) return `${hz.toFixed(1)} Hz`;
  return `${hz.toFixed(2)} Hz`;
}

function CursorMarker({ mark, index, timeAt, unit, onClear }: MarkerProps) {
  return (
    <div className="cursor-mark" data-mark={mark}>
      <span className="cursor-badge" aria-hidden="true">
        {mark}
      </span>
      <div className="cursor-mark-copy">
        {index == null ? (
          <span className="cursor-mark-empty">点击波形放置</span>
        ) : (
          <>
            <span className="cursor-mark-time">
              {timeAt(index).toFixed(4)} {unit}
            </span>
            <span className="cursor-mark-index">#{index.toLocaleString()}</span>
          </>
        )}
      </div>
      <button
        type="button"
        className="cursor-clear"
        disabled={index == null}
        onClick={onClear}
        aria-label={`清除游标 ${mark}`}
      >
        清除
      </button>
    </div>
  );
}

type Props = {
  timeAt: (index: number) => number;
  unit: string;
  cursorA: number | null;
  cursorB: number | null;
  channels: ChannelMeta[];
  aVals: Record<string, number | null>;
  bVals: Record<string, number | null>;
  onClearA: () => void;
  onClearB: () => void;
};

export function CursorPanel({ timeAt, unit, cursorA, cursorB, channels, aVals, bVals, onClearA, onClearB }: Props) {
  const scheme = useWaveformStore((s) => s.scheme);
  const ids = Object.keys({ ...aVals, ...bVals });
  const sections = groupRows(channels, ids);
  const ready = cursorA != null && cursorB != null;
  const sampleSpan = ready ? Math.abs(cursorB - cursorA) : 0;
  const deltaS = ready ? Math.abs(timeAt(cursorB) - timeAt(cursorA)) : 0;
  const deltaMs = deltaS * 1000;
  const hz = ready && deltaS > 0 ? 1 / deltaS : null;

  return (
    <div className="cursor-panel">
      <div className="cursor-marks">
        <CursorMarker mark="A" index={cursorA} timeAt={timeAt} unit={unit} onClear={onClearA} />
        <CursorMarker mark="B" index={cursorB} timeAt={timeAt} unit={unit} onClear={onClearB} />
      </div>

      <div className="cursor-delta" data-ready={ready}>
        <div className="cursor-delta-cell">
          <span className="cursor-delta-label">Δt</span>
          <span className="cursor-delta-value">{ready ? fmtDeltaT(deltaMs) : "—"}</span>
        </div>
        <div className="cursor-delta-cell">
          <span className="cursor-delta-label">间隔</span>
          <span className="cursor-delta-value">{ready ? `${sampleSpan.toLocaleString()} 点` : "—"}</span>
        </div>
        <div className="cursor-delta-cell">
          <span className="cursor-delta-label">1/Δt</span>
          <span className="cursor-delta-value">{hz == null ? "—" : fmtHz(hz)}</span>
        </div>
      </div>

      <table className="cursor-table">
        <thead>
          <tr>
            <th>通道</th>
            <th>A</th>
            <th>B</th>
            <th>Δ</th>
          </tr>
        </thead>
        {sections.map(({ group, rows }) => (
          <tbody key={group}>
            <tr className="cursor-table-group">
              <th colSpan={4}>{GROUP_LABELS[group] ?? group}</th>
            </tr>
            {rows.map((ch, index) => {
              const a = aVals[ch.id];
              const b = bVals[ch.id];
              const delta =
                typeof a === "number" && typeof b === "number" && Number.isFinite(a) && Number.isFinite(b)
                  ? b - a
                  : null;
              return (
                <tr key={ch.id}>
                  <th scope="row">
                    <span className="cursor-ch">
                      <span className="legend-dot" style={{ background: channelColor(ch.id, index, scheme) }} />
                      {ch.id}
                    </span>
                  </th>
                  <td>{fmt(a)}</td>
                  <td>{fmt(b)}</td>
                  <td>{delta == null ? "—" : fmtSigned(delta)}</td>
                </tr>
              );
            })}
          </tbody>
        ))}
      </table>
    </div>
  );
}
