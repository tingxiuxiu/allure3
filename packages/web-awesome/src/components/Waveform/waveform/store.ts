import { useSyncExternalStore } from "preact/compat";

import type { ColorScheme } from "../theme";
import type { NormalizedWaveform } from "./normalize";
import { pairsFromChannels } from "./pairs";
import { fullRange, type SampleRange } from "./viewRange";

export type Tool = "box" | "pan" | "cursor";

type State = {
  data: NormalizedWaveform | null;
  view: SampleRange;
  history: SampleRange[];
  tool: Tool;
  yFollow: boolean;
  hiddenPairs: string[];
  cursorA: number | null;
  cursorB: number | null;
  hoverIndex: number | null;
  scheme: ColorScheme;
};

type Actions = {
  setData: (data: NormalizedWaveform) => void;
  setTool: (tool: Tool) => void;
  setView: (view: SampleRange, pushHistory?: boolean) => void;
  snapshotView: () => void;
  undo: () => void;
  resetView: () => void;
  togglePair: (pairId: string) => void;
  setYFollow: (v: boolean) => void;
  setCursorA: (i: number | null) => void;
  setCursorB: (i: number | null) => void;
  setHoverIndex: (i: number | null) => void;
  setScheme: (scheme: ColorScheme) => void;
};

export type Store = State & Actions;

type Listener = (state: Store, prev: Store) => void;

type UseBoundStore = {
  <T>(selector: (state: Store) => T): T;
  getState: () => Store;
  setState: (partial: Partial<State>) => void;
  subscribe: (listener: Listener) => () => void;
};

/**
 * Minimal zustand-compatible store so the ported viewer keeps its imperative
 * `getState` / `setState` / `subscribe` usage without pulling zustand into the
 * report bundle. Selector reads go through `useSyncExternalStore` (preact/compat).
 */
const createStore = (init: (set: (partial: Partial<State>) => void, get: () => Store) => Store): UseBoundStore => {
  let state: Store;
  const listeners = new Set<Listener>();

  const set = (partial: Partial<State>) => {
    const prev = state;
    state = { ...state, ...partial };
    listeners.forEach((listener) => listener(state, prev));
  };

  const getState = () => state;
  const subscribe = (listener: Listener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  state = init(set, getState);

  const useStore = (<T>(selector: (state: Store) => T): T =>
    useSyncExternalStore(
      (onChange: () => void) => subscribe(() => onChange()),
      () => selector(state),
    )) as UseBoundStore;

  useStore.getState = getState;
  useStore.setState = set;
  useStore.subscribe = subscribe;

  return useStore;
};

export const useWaveformStore = createStore((set, get) => ({
  data: null,
  view: { i0: 0, i1: 0 },
  history: [],
  tool: "box",
  yFollow: false,
  hiddenPairs: [],
  cursorA: null,
  cursorB: null,
  hoverIndex: null,
  scheme: "light",
  setData: (data) =>
    set({
      data,
      view: fullRange(data.sampleCount),
      history: [],
      hiddenPairs: [],
      cursorA: null,
      cursorB: null,
      hoverIndex: null,
    }),
  setTool: (tool) => set({ tool, hoverIndex: null }),
  setView: (view, pushHistory = true) => {
    const { view: prev, history } = get();
    set({
      view,
      history: pushHistory ? [...history, prev].slice(-40) : history,
    });
  },
  snapshotView: () => {
    const { view, history } = get();
    set({ history: [...history, view].slice(-40) });
  },
  undo: () => {
    const { history } = get();
    if (!history.length) {
      return;
    }
    const view = history[history.length - 1];
    set({ view, history: history.slice(0, -1) });
  },
  resetView: () => {
    const n = get().data?.sampleCount ?? 0;
    set({ view: fullRange(n) });
  },
  togglePair: (pairId) => {
    const hidden = new Set(get().hiddenPairs);
    if (hidden.has(pairId)) {
      hidden.delete(pairId);
    } else {
      hidden.add(pairId);
    }
    set({ hiddenPairs: [...hidden] });
  },
  setYFollow: (yFollow) => set({ yFollow }),
  setCursorA: (cursorA) => set({ cursorA }),
  setCursorB: (cursorB) => set({ cursorB }),
  setHoverIndex: (hoverIndex) => set({ hoverIndex }),
  setScheme: (scheme) => set({ scheme }),
}));

export function currentPairs() {
  const data = useWaveformStore.getState().data;
  return data ? pairsFromChannels(data.channels) : [];
}
