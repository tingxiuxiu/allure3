import type { Pair } from "../waveform/pairs";

type Props = {
  pairs: Pair[];
  hiddenPairs: string[];
  onToggle: (id: string) => void;
};

export function ChannelPanel({ pairs, hiddenPairs, onToggle }: Props) {
  return (
    <div className="channel-list">
      {pairs.map((p) => (
        <label key={p.id} className="channel-row">
          <input
            type="checkbox"
            aria-label={p.label}
            checked={!hiddenPairs.includes(p.id)}
            onChange={() => onToggle(p.id)}
          />
          {p.label}
        </label>
      ))}
    </div>
  );
}
