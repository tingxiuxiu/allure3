import type { VNode } from "preact";
import { createPortal, flushSync, useEffect, useRef, useState } from "preact/compat";
import uPlot from "uplot";

import "uplot/dist/uPlot.min.css";
import { channelColor, channelFill, type ColorScheme } from "../theme";
import type { NormalizedWaveform } from "../waveform/normalize";
import { useWaveformStore } from "../waveform/store";
import { formatAxisTime, timeAtInterp, timelineUnit } from "../waveform/timeline";
import { clampRange, panRange, zoomAt } from "../waveform/viewRange";
import { buildChartModel } from "./chartModel";
import { clearSelect, plotX, posOfSample, setSelectX, timeAtClientX, toAligned, uplotOptions } from "./uplotOption";

type Props = {
  group: string;
  data: NormalizedWaveform;
  visible: Set<string>;
};

type Drag = {
  clientX0: number;
  plotX0: number;
  panAcc: number;
  cursorTarget: "A" | "B" | null;
};

function pickCursorTarget(a: number | null, b: number | null, idx: number): "A" | "B" {
  if (a == null) return "A";
  if (b == null) return "B";
  return Math.abs(idx - a) <= Math.abs(idx - b) ? "A" : "B";
}

type ChannelReadoutsProps = {
  leftPx: number;
  frac: number;
  index: number;
  ids: string[];
  group: string;
  data: NormalizedWaveform;
  tag?: "A" | "B";
  preferLeft?: boolean;
  scheme: ColorScheme;
};

function ChannelReadouts({
  leftPx,
  frac,
  index,
  ids,
  group,
  data,
  tag,
  preferLeft,
  scheme,
}: ChannelReadoutsProps): VNode {
  const goLeft = preferLeft ? frac >= 0.28 : frac > 0.72;
  return (
    <div
      className="channel-readouts"
      data-tag={tag ?? "hover"}
      style={{
        left: leftPx,
        transform: goLeft ? "translateX(calc(-100% - 8px))" : "translateX(8px)",
      }}
    >
      {tag ? <span className="channel-readouts-tag">{tag}</span> : null}
      {ids.map((id, i) => {
        const raw = data.groups[group]?.[id]?.[index];
        const text = typeof raw === "number" && Number.isFinite(raw) ? raw.toFixed(2) : "—";
        return (
          <span
            key={id}
            className="channel-readout"
            style={{ background: channelFill(id, i, 0.22, scheme), color: channelColor(id, i, scheme) }}
          >
            {text}
          </span>
        );
      })}
    </div>
  );
}

type PlotOverlayProps = {
  over: HTMLDivElement;
  plot: uPlot;
  group: string;
  data: NormalizedWaveform;
  visible: Set<string>;
};

function PlotOverlay({ over, plot, group, data, visible }: PlotOverlayProps): VNode {
  const hoverIndex = useWaveformStore((s) => s.hoverIndex);
  const cursorA = useWaveformStore((s) => s.cursorA);
  const cursorB = useWaveformStore((s) => s.cursorB);
  const scheme = useWaveformStore((s) => s.scheme);
  // Subscribe to `view` so cursor pixel positions recompute after the x-scale changes.
  useWaveformStore((s) => s.view);

  const plotW = plot.over.clientWidth || 1;
  // Charts are drawn against the sample index, so cursor lines are positioned by index.
  const hoverPx = hoverIndex != null ? posOfSample(plot, hoverIndex) : null;
  const aPx = cursorA != null ? posOfSample(plot, cursorA) : null;
  const bPx = cursorB != null ? posOfSample(plot, cursorB) : null;
  const showHover = hoverPx != null && hoverIndex != null && hoverIndex !== cursorA && hoverIndex !== cursorB;
  const groupIds = Object.keys(data.groups[group] ?? {}).filter((id) => visible.has(id));

  return createPortal(
    <div className="plot-layer">
      {showHover && hoverIndex != null && hoverPx != null ? (
        <>
          <div className="cursor-line cursor-line-follow" style={{ left: hoverPx }} />
          <ChannelReadouts
            leftPx={hoverPx}
            frac={hoverPx / plotW}
            index={hoverIndex}
            ids={groupIds}
            group={group}
            data={data}
            scheme={scheme}
          />
        </>
      ) : null}
      {aPx != null && cursorA != null ? (
        <>
          <div className="cursor-line cursor-line-a" style={{ left: aPx }} />
          <ChannelReadouts
            leftPx={aPx}
            frac={aPx / plotW}
            index={cursorA}
            ids={groupIds}
            group={group}
            data={data}
            scheme={scheme}
            tag="A"
            preferLeft
          />
        </>
      ) : null}
      {bPx != null && cursorB != null ? (
        <>
          <div className="cursor-line cursor-line-b" style={{ left: bPx }} />
          <ChannelReadouts
            leftPx={bPx}
            frac={bPx / plotW}
            index={cursorB}
            ids={groupIds}
            group={group}
            data={data}
            scheme={scheme}
            tag="B"
          />
        </>
      ) : null}
    </div>,
    over,
  );
}

export function ChartGroup({ group, data, visible }: Props): VNode {
  const canvasRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);
  const seriesKeyRef = useRef("");
  const dragRef = useRef<Drag | null>(null);
  const eventsRef = useRef<AbortController | null>(null);
  const [over, setOver] = useState<HTMLDivElement | null>(null);

  // One effect owns the uPlot lifetime for this (group, data, visible). `visible` is
  // memoized by WaveformPage, so its identity changes only when the channel set does
  // (which requires a plot rebuild anyway). Every reactive update (view / yFollow /
  // scheme / tool) is applied imperatively by a single store subscription that reads
  // fresh state via getState(), so ChartGroup itself never re-renders on store changes.
  useEffect(() => {
    const host = canvasRef.current;
    if (!host) return;

    const sampleCount = data.sampleCount;

    const attachInteractions = (plot: uPlot): void => {
      eventsRef.current?.abort();
      const controller = new AbortController();
      eventsRef.current = controller;
      const { signal } = controller;
      const hit = plot.over;

      // X is the sample index, so client X -> sample index is a rounded posToVal.
      const idxAt = (clientX: number): number =>
        Math.max(0, Math.min(sampleCount - 1, Math.round(timeAtClientX(plot, clientX))));

      const endDrag = (): void => {
        clearSelect(plot);
        dragRef.current = null;
      };

      hit.addEventListener(
        "pointerdown",
        (ev: PointerEvent) => {
          if (ev.button !== 0) return;
          ev.preventDefault();
          const st = useWaveformStore.getState();
          const drag: Drag = { clientX0: ev.clientX, plotX0: plotX(plot, ev.clientX), panAcc: 0, cursorTarget: null };
          if (st.data) st.setHoverIndex(idxAt(ev.clientX));
          if (st.tool === "pan") st.snapshotView();
          if (st.tool === "cursor") {
            const idx = idxAt(ev.clientX);
            drag.cursorTarget = pickCursorTarget(st.cursorA, st.cursorB, idx);
            if (drag.cursorTarget === "A") st.setCursorA(idx);
            else st.setCursorB(idx);
            st.setHoverIndex(idx);
          }
          dragRef.current = drag;
          try {
            hit.setPointerCapture(ev.pointerId);
          } catch {
            /* already captured */
          }
        },
        { signal, capture: true },
      );

      hit.addEventListener(
        "pointermove",
        (ev: PointerEvent) => {
          const st = useWaveformStore.getState();
          if (st.data) {
            const idx = idxAt(ev.clientX);
            st.setHoverIndex(idx);
            const start = dragRef.current;
            if (st.tool === "cursor" && start?.cursorTarget === "A") st.setCursorA(idx);
            else if (st.tool === "cursor" && start?.cursorTarget === "B") st.setCursorB(idx);
          }
          const start = dragRef.current;
          if (!start) return;
          if (st.tool === "pan" && st.data) {
            const t0 = timeAtClientX(plot, start.clientX0);
            const t1 = timeAtClientX(plot, ev.clientX);
            start.panAcc += t0 - t1;
            start.clientX0 = ev.clientX;
            const step = start.panAcc > 0 ? Math.floor(start.panAcc) : Math.ceil(start.panAcc);
            if (step !== 0) {
              start.panAcc -= step;
              st.setView(panRange(st.view, step, st.data.sampleCount), false);
            }
            return;
          }
          if (st.tool === "box") setSelectX(plot, start.plotX0, plotX(plot, ev.clientX));
        },
        { signal, capture: true },
      );

      hit.addEventListener(
        "pointerup",
        (ev: PointerEvent) => {
          const start = dragRef.current;
          endDrag();
          if (!start) return;
          const st = useWaveformStore.getState();
          if (st.tool !== "box") return;
          const t0 = plot.posToVal(start.plotX0, "x");
          const t1 = timeAtClientX(plot, ev.clientX);
          if (Math.abs(plotX(plot, ev.clientX) - start.plotX0) > 4) {
            st.setView(clampRange(Math.round(t0), Math.round(t1), sampleCount));
          }
        },
        { signal, capture: true },
      );

      hit.addEventListener("pointercancel", endDrag, { signal, capture: true });
      hit.addEventListener(
        "pointerleave",
        () => {
          if (dragRef.current) return;
          useWaveformStore.getState().setHoverIndex(null);
        },
        { signal },
      );
      hit.addEventListener(
        "wheel",
        (ev: WheelEvent) => {
          if (!ev.ctrlKey) return;
          ev.preventDefault();
          const st = useWaveformStore.getState();
          const min = plot.scales.x.min;
          const max = plot.scales.x.max;
          if (min == null || max == null || max === min) return;
          const frac = (timeAtClientX(plot, ev.clientX) - min) / (max - min);
          st.setView(zoomAt(st.view, frac, ev.deltaY > 0 ? 1.2 : 0.8, sampleCount));
        },
        { signal, passive: false },
      );
    };

    const render = (): void => {
      const st = useWaveformStore.getState();
      const w = Math.max(32, host.clientWidth);
      const h = Math.max(32, host.clientHeight);
      const model = buildChartModel(data, group, visible, st.view.i0, st.view.i1, w, st.yFollow, st.scheme);
      const key = `${st.scheme}|${model.traces.map((t) => `${t.id}:${t.color}`).join("|")}`;
      const aligned = toAligned(model);
      const existing = plotRef.current;
      // Series count and colors are fixed at creation time, so a change of channel
      // set or theme requires a fresh uPlot; everything else is an in-place update.
      if (!existing || seriesKeyRef.current !== key) {
        eventsRef.current?.abort();
        flushSync(() => setOver(null));
        existing?.destroy();
        const unit = timelineUnit(data.timeline);
        const fmtX = (v: number): string => formatAxisTime(timeAtInterp(data.timeline, v), unit);
        const plot = new uPlot(uplotOptions(model, st.scheme, w, h, fmtX), aligned, host);
        plot.over.dataset.tool = st.tool;
        plotRef.current = plot;
        seriesKeyRef.current = key;
        setOver(plot.over);
        attachInteractions(plot);
      } else {
        existing.setSize({ width: w, height: h });
        existing.setData(aligned, false);
        existing.setScale("x", { min: model.xMin, max: model.xMax });
        if (model.yMin != null && model.yMax != null) existing.setScale("y", { min: model.yMin, max: model.yMax });
        else existing.redraw();
      }
    };

    render();
    const resizeObserver = new ResizeObserver(() => render());
    resizeObserver.observe(host);
    const unsubscribe = useWaveformStore.subscribe((next, prev) => {
      if (next.view !== prev.view || next.yFollow !== prev.yFollow || next.scheme !== prev.scheme) {
        render();
      }
      if (next.tool !== prev.tool) {
        const overEl = plotRef.current?.over;
        if (overEl) overEl.dataset.tool = next.tool;
      }
    });

    return () => {
      unsubscribe();
      resizeObserver.disconnect();
      eventsRef.current?.abort();
      setOver(null);
      plotRef.current?.destroy();
      plotRef.current = null;
      seriesKeyRef.current = "";
    };
  }, [group, data, visible]);

  const plot = plotRef.current;

  return (
    <div className="plot-host">
      <div ref={canvasRef} className="plot-canvas" />
      {over && plot ? <PlotOverlay over={over} plot={plot} group={group} data={data} visible={visible} /> : null}
    </div>
  );
}
