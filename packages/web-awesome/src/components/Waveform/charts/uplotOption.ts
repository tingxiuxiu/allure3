import uPlot from "uplot";

import type { ColorScheme } from "../theme";
import { formatAxisTime } from "../waveform/timeline";
import type { ChartModel } from "./chartModel";

const CHROME: Record<ColorScheme, { label: string; axis: string; grid: string }> = {
  dark: { label: "#86868b", axis: "#3a3a3c", grid: "#2c2c2e" },
  light: { label: "#86868b", axis: "#d2d2d7", grid: "#f0f0f0" },
};

const FONT = "10px SF Pro Text, Inter, system-ui, sans-serif";

export function toAligned(model: ChartModel): uPlot.AlignedData {
  if (!model.traces.length) {
    return [
      [model.xMin, model.xMax],
      [null, null],
    ];
  }
  const xs = model.traces[0].points.map((p) => p[0]);
  return [xs, ...model.traces.map((t) => t.points.map((p) => p[1]))];
}

export function uplotOptions(
  model: ChartModel,
  scheme: ColorScheme,
  width: number,
  height: number,
  xUnit = "s",
): uPlot.Options {
  const chrome = CHROME[scheme];
  const traces = model.traces;
  const yMin = model.yMin;
  const yMax = model.yMax;
  const axis: uPlot.Axis = {
    stroke: chrome.axis,
    ticks: { stroke: chrome.axis, width: 1 },
    grid: { stroke: chrome.grid, width: 1 },
    font: FONT,
  };

  return {
    width,
    height,
    pxAlign: 0,
    legend: { show: false },
    cursor: { show: false, drag: { x: false, y: false, setScale: false } },
    padding: [8, 12, 4, 4],
    scales: {
      x: { time: false, min: model.xMin, max: model.xMax },
      y: yMin != null && yMax != null ? { auto: false, min: yMin, max: yMax } : { auto: true },
    },
    axes: [
      {
        ...axis,
        size: 28,
        values: (_u, vals) => vals.map((v) => formatAxisTime(v, xUnit)),
      },
      {
        ...axis,
        size: 48,
        values: (_u, vals) => vals.map((v) => Number(v).toPrecision(4)),
      },
    ],
    series: [
      {},
      ...(traces.length
        ? traces.map((t) => ({
            stroke: t.color,
            width: 1.5,
            spanGaps: false,
            points: { show: false as const },
          }))
        : [{ stroke: chrome.axis, width: 1, points: { show: false as const } }]),
    ],
  };
}

/** CSS px from the left of `.u-over` — the coordinate space of `posToVal` / `valToPos`. */
export function plotX(plot: uPlot, clientX: number): number {
  return clientX - plot.over.getBoundingClientRect().left;
}

export function timeAtClientX(plot: uPlot, clientX: number): number {
  return plot.posToVal(plotX(plot, clientX), "x");
}

export function posAtTime(plot: uPlot, t: number): number {
  return plot.valToPos(t, "x");
}

export function posOfSample(plot: uPlot, t: number): number | null {
  const px = posAtTime(plot, t);
  const w = plot.over.clientWidth;
  if (!Number.isFinite(px) || px < 0 || px > w) return null;
  return px;
}

export function clearSelect(plot: uPlot) {
  plot.setSelect({ left: 0, top: 0, width: 0, height: 0 }, false);
}

export function setSelectX(plot: uPlot, x0: number, x1: number) {
  plot.setSelect(
    {
      left: Math.min(x0, x1),
      top: 0,
      width: Math.abs(x1 - x0),
      height: plot.over.clientHeight,
    },
    false,
  );
}
