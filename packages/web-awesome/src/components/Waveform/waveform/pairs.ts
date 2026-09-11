import type { ChannelMeta } from "./types";

export type Pair = { id: string; channelIds: string[]; label: string };

export function pairsFromChannels(channels: ChannelMeta[]): Pair[] {
  const map = new Map<string, string[]>();
  const solo: Pair[] = [];
  for (const ch of channels) {
    if (ch.pairId) {
      const list = map.get(ch.pairId) ?? [];
      list.push(ch.id);
      map.set(ch.pairId, list);
    } else {
      solo.push({ id: `solo:${ch.id}`, channelIds: [ch.id], label: ch.id });
    }
  }
  const paired: Pair[] = [...map.entries()].map(([id, channelIds]) => ({
    id,
    channelIds,
    label: channelIds.join("-"),
  }));
  return [...paired, ...solo];
}

export function visibleChannelIds(pairs: Pair[], hiddenPairIds: ReadonlySet<string>): Set<string> {
  const vis = new Set<string>();
  for (const p of pairs) {
    if (!hiddenPairIds.has(p.id)) {
      for (const id of p.channelIds) vis.add(id);
    }
  }
  return vis;
}

export function togglePair(hidden: ReadonlySet<string>, pairId: string): Set<string> {
  const next = new Set(hidden);
  if (next.has(pairId)) next.delete(pairId);
  else next.add(pairId);
  return next;
}
