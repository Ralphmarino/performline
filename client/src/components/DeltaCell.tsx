import { delta, fmtDelta } from '../lib/format';

/** Relative change badge. `invert` for metrics where lower is better (average position). */
export function Delta({ current, compare, invert = false, className = '' }: { current: number; compare: number; invert?: boolean; className?: string }) {
  const d = delta(current, compare);
  const dir = d === null ? 'new' : Math.abs(d) < 0.0005 ? 'flat' : (d > 0) !== invert ? 'up' : 'down';
  const arrow = d === null ? '✦' : dir === 'flat' ? '•' : d > 0 ? '▲' : '▼';
  return (
    <span className={`delta-cell ${dir} ${className}`} title={`${compare.toLocaleString()} → ${current.toLocaleString()}`}>
      {arrow} {fmtDelta(d)}
    </span>
  );
}
