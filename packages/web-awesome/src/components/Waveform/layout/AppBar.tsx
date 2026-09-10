import { Icon } from "../components/Icon";
import type { ColorScheme } from "../theme";
import type { Tool } from "../waveform/store";

const TOOLS: Array<{ id: Tool; label: string }> = [
  { id: "box", label: "框选" },
  { id: "pan", label: "平移" },
  { id: "cursor", label: "游标" },
];

type Props = {
  sampleCount?: number;
  samplingRate?: number;
  tool: Tool;
  yFollow: boolean;
  embedded: boolean;
  drawer: "channels" | "cursors" | null;
  onTool: (tool: Tool) => void;
  onUndo: () => void;
  onReset: () => void;
  onYFollow: (v: boolean) => void;
  onDrawer: (d: "channels" | "cursors" | null) => void;
  onFullscreen: () => void;
  scheme: ColorScheme;
  onScheme: () => void;
};

export function AppBar({
  sampleCount,
  samplingRate,
  tool,
  yFollow,
  embedded,
  drawer,
  onTool,
  onUndo,
  onReset,
  onYFollow,
  onDrawer,
  onFullscreen,
  scheme,
  onScheme,
}: Props) {
  return (
    <header className="app-bar">
      <div className="brand-lockup">
        <h1 className="brand-title">波形分析</h1>
        <span className="brand-meta">
          {sampleCount != null && samplingRate != null
            ? `${sampleCount.toLocaleString()} 点 · ${samplingRate.toLocaleString()} Hz`
            : "Waveform Analysis"}
        </span>
      </div>
      <div className="toolbar-divider" />
      <div className="segmented" aria-label="交互工具">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            className="tool-button"
            data-active={tool === t.id}
            aria-pressed={tool === t.id}
            onClick={() => onTool(t.id)}
          >
            <Icon name={t.id} size={14} />
            <span>{t.label}</span>
          </button>
        ))}
        <span className="segmented-split" />
        <button type="button" className="tool-button" title="回退视图" onClick={onUndo}>
          <Icon name="undo" size={14} />
          <span>回退</span>
        </button>
        <button type="button" className="tool-button" title="复位视图" onClick={onReset}>
          <Icon name="reset" size={14} />
          <span>复位</span>
        </button>
      </div>
      <label className="switch-label">
        <input
          type="checkbox"
          aria-label="Y随窗"
          checked={yFollow}
          onChange={(e) => onYFollow((e.target as HTMLInputElement).checked)}
        />
        Y随窗
      </label>
      <span className="toolbar-spacer" />
      <div className="toolbar-actions">
        <button
          type="button"
          className="utility-button"
          title={scheme === "dark" ? "浅色主题" : "深色主题"}
          aria-label={scheme === "dark" ? "切换浅色主题" : "切换深色主题"}
          onClick={onScheme}
        >
          <Icon name={scheme === "dark" ? "sun" : "moon"} />
          <span>{scheme === "dark" ? "浅色" : "深色"}</span>
        </button>
        {embedded ? (
          <>
            <button
              type="button"
              className="utility-button"
              onClick={() => onDrawer(drawer === "channels" ? null : "channels")}
            >
              <Icon name="channels" />
              <span>通道</span>
            </button>
            <button
              type="button"
              className="utility-button"
              onClick={() => onDrawer(drawer === "cursors" ? null : "cursors")}
            >
              <Icon name="cursor" />
              <span>游标</span>
            </button>
          </>
        ) : null}
        <button type="button" className="utility-button primary" onClick={onFullscreen}>
          <Icon name={embedded ? "expand" : "collapse"} />
          <span>{embedded ? "全屏" : "退出"}</span>
        </button>
      </div>
    </header>
  );
}
