import { useCallback, useEffect, useMemo, useRef, useState } from "preact/compat";

import { ChartGroup } from "../charts/ChartGroup";
import { Icon } from "../components/Icon";
import { CORE_GROUPS, GROUP_LABELS, channelColor } from "../theme";
import type { NormalizedWaveform } from "../waveform/normalize";
import { pairsFromChannels, visibleChannelIds } from "../waveform/pairs";
import { useWaveformStore } from "../waveform/store";
import { timeAt, timelineUnit } from "../waveform/timeline";
import { computeWindowStats, sampleAt } from "../waveform/windowStats";
import { AppBar } from "./AppBar";
import { ChannelPanel } from "./ChannelPanel";
import { CursorPanel } from "./CursorPanel";
import { StatsFooter } from "./StatsFooter";

type Props = {
  data: NormalizedWaveform;
  onToggleTheme: () => void;
};

export function WaveformPage({ data, onToggleTheme }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const setData = useWaveformStore((s) => s.setData);
  const tool = useWaveformStore((s) => s.tool);
  const setTool = useWaveformStore((s) => s.setTool);
  const undo = useWaveformStore((s) => s.undo);
  const resetView = useWaveformStore((s) => s.resetView);
  const yFollow = useWaveformStore((s) => s.yFollow);
  const setYFollow = useWaveformStore((s) => s.setYFollow);
  const hiddenPairs = useWaveformStore((s) => s.hiddenPairs);
  const togglePair = useWaveformStore((s) => s.togglePair);
  const cursorA = useWaveformStore((s) => s.cursorA);
  const cursorB = useWaveformStore((s) => s.cursorB);
  const setCursorA = useWaveformStore((s) => s.setCursorA);
  const setCursorB = useWaveformStore((s) => s.setCursorB);
  const scheme = useWaveformStore((s) => s.scheme);
  const [density, setDensity] = useState<"embedded" | "fullscreen">("embedded");
  const [drawer, setDrawer] = useState<null | "channels" | "cursors">(null);

  useEffect(() => {
    setData(data);
  }, [data, setData]);

  const toggleFullscreen = useCallback(async () => {
    const el = rootRef.current;
    if (!el) {
      return;
    }
    if (!document.fullscreenElement) {
      await el.requestFullscreen();
      setDensity("fullscreen");
    } else {
      await document.exitFullscreen();
      setDensity("embedded");
    }
  }, []);

  useEffect(() => {
    const onFs = () => setDensity(document.fullscreenElement === rootRef.current ? "fullscreen" : "embedded");
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const abReady = cursorA != null && cursorB != null;
  const win = useMemo(() => {
    if (!data || !abReady) {
      return null;
    }
    return computeWindowStats(data.groups, cursorA as number, cursorB as number);
  }, [data, cursorA, cursorB, abReady]);

  const pairs = useMemo(() => (data ? pairsFromChannels(data.channels) : []), [data]);
  const visible = useMemo(() => visibleChannelIds(pairs, new Set(hiddenPairs)), [pairs, hiddenPairs]);
  const embedded = density === "embedded";
  const groups = useMemo(() => {
    if (!data) {
      return [];
    }
    const keys = Object.keys(data.groups);
    const core = new Set<string>(CORE_GROUPS);
    const ordered = [...CORE_GROUPS.filter((g) => keys.includes(g)), ...keys.filter((g) => !core.has(g))];
    if (embedded) {
      return ordered.filter((g) => core.has(g));
    }
    return ordered;
  }, [data, embedded]);

  const aVals = data && cursorA != null ? sampleAt(data.groups, cursorA) : {};
  const bVals = data && cursorB != null ? sampleAt(data.groups, cursorB) : {};
  const voltageImb = win ? win.voltageImbalance : (data?.statsFull.voltageImbalance as number | null | undefined);
  const currentImb = win ? win.currentImbalance : (data?.statsFull.currentImbalance as number | null | undefined);

  const channelPanel = <ChannelPanel pairs={pairs} hiddenPairs={hiddenPairs} onToggle={togglePair} />;
  const cursorPanel = (
    <CursorPanel
      timeAt={(i) => (data ? timeAt(data.timeline, i) : 0)}
      unit={data ? timelineUnit(data.timeline) : "s"}
      cursorA={cursorA}
      cursorB={cursorB}
      channels={data?.channels ?? []}
      aVals={aVals}
      bVals={bVals}
      onClearA={() => setCursorA(null)}
      onClearB={() => setCursorB(null)}
    />
  );

  return (
    <div ref={rootRef} id="waveform-root" className="waveform-root" data-density={density} data-theme={scheme}>
      <AppBar
        sampleCount={data?.sampleCount}
        samplingRate={data?.samplingRate}
        tool={tool}
        yFollow={yFollow}
        embedded={embedded}
        drawer={drawer}
        scheme={scheme}
        onTool={setTool}
        onUndo={undo}
        onReset={resetView}
        onYFollow={setYFollow}
        onDrawer={setDrawer}
        onFullscreen={() => void toggleFullscreen()}
        onScheme={onToggleTheme}
      />

      {data?.warnings.length ? (
        <div className="notice">
          <Icon name="warning" size={14} />
          {data.warnings.map((w) => w.message ?? `${w.channel} 长度 ${w.actual} / 期望 ${w.expected}`).join("；")}
        </div>
      ) : null}

      <div className="workspace">
        <main
          className="chart-stack"
          style={{ gridTemplateRows: `repeat(${Math.max(1, groups.length)}, minmax(0, 1fr))` }}
        >
          {data
            ? groups.map((g) => {
                const groupChannels = data.channels.filter((ch) => ch.group === g && visible.has(ch.id));
                return (
                  <section key={g} className="chart-card">
                    <header className="chart-card-header">
                      <h2 className="chart-title">{GROUP_LABELS[g] ?? g}</h2>
                      <div className="channel-legend">
                        {groupChannels.map((ch, index) => (
                          <span className="legend-item" key={ch.id}>
                            <span className="legend-dot" style={{ background: channelColor(ch.id, index, scheme) }} />
                            {ch.id}
                          </span>
                        ))}
                      </div>
                    </header>
                    <div className="chart-region">
                      <ChartGroup group={g} data={data} visible={visible} />
                    </div>
                  </section>
                );
              })
            : null}
        </main>
        {!embedded ? (
          <aside className="side-panel">
            <section className="panel-card">
              <h2 className="panel-title">通道</h2>
              <p className="panel-caption">成对控制三相电压与电流</p>
              {channelPanel}
            </section>
            <section className="panel-card">
              <h2 className="panel-title">A/B 游标</h2>
              <p className="panel-caption">游标模式点击波形放置，可拖动微调</p>
              {cursorPanel}
            </section>
          </aside>
        ) : null}
        {embedded && drawer ? (
          <aside className="drawer">
            <h2 className="panel-title">{drawer === "channels" ? "通道" : "A/B 游标"}</h2>
            {drawer === "channels" ? channelPanel : cursorPanel}
          </aside>
        ) : null}
      </div>

      <StatsFooter
        embedded={embedded}
        abReady={abReady}
        sampleCount={data?.sampleCount}
        samplingRate={data?.samplingRate}
        statsFull={data?.statsFull}
        windowChannels={win?.channels ?? null}
        voltageImb={voltageImb}
        currentImb={currentImb}
      />
    </div>
  );
}
