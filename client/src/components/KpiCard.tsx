import { useEffect, useRef, useState } from 'react';
import { delta, fmtDelta } from '../lib/format';
import { useThemeColors } from '../lib/theme';

interface Props {
  label: string;
  current: number;
  compare: number;
  format: (n: number) => string;
  compareLabel: string;
  series?: { current: number | null; compare: number | null }[];
  invert?: boolean;
  hint?: string;
}

function useCountUp(target: number, duration = 700) {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = performance.now();
    const begin = from.current;
    if (begin === target) return;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(begin + (target - begin) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

export function Sparkline({ series, height = 38, stroke, compareStroke }: { series: { current: number | null; compare: number | null }[]; height?: number; stroke: string; compareStroke: string }) {
  const w = 200;
  const vals = series.flatMap((s) => [s.current, s.compare]).filter((v): v is number => v !== null);
  if (!vals.length) return null;
  const max = Math.max(...vals) || 1;
  const min = Math.min(0, ...vals);
  const n = series.length;
  const x = (i: number) => (n > 1 ? (i / (n - 1)) * w : w / 2);
  const y = (v: number) => height - 3 - ((v - min) / (max - min || 1)) * (height - 6);
  const path = (pick: (s: { current: number | null; compare: number | null }) => number | null) =>
    series.map((s, i) => ({ v: pick(s), i })).filter((p) => p.v !== null).map((p, idx) => `${idx === 0 ? 'M' : 'L'}${x(p.i).toFixed(1)},${y(p.v as number).toFixed(1)}`).join(' ');
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" width="100%" height={height} aria-hidden="true">
      <path d={path((s) => s.compare)} fill="none" stroke={compareStroke} strokeWidth="1.5" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
      <path d={path((s) => s.current)} fill="none" stroke={stroke} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

export function KpiCard({ label, current, compare, format, compareLabel, series, invert = false, hint }: Props) {
  const colors = useThemeColors();
  const animated = useCountUp(current);
  const d = delta(current, compare);
  const dir = d === null ? 'up' : Math.abs(d) < 0.0005 ? 'flat' : (d > 0) !== invert ? 'up' : 'down';
  return (
    <div className="card kpi">
      <div className="label">{label}</div>
      {hint && <span className="hint" title={hint}>ⓘ</span>}
      <div className="value">{format(animated)}</div>
      <div>
        <span className={`delta ${dir}`}>{d === null ? '✦' : d > 0 ? '▲' : d < 0 ? '▼' : '•'} {fmtDelta(d)}</span>
        <span className="vs">vs {format(compare)} · {compareLabel}</span>
      </div>
      {series && <Sparkline series={series} stroke={colors.series[0]} compareStroke={colors.compare} />}
    </div>
  );
}
