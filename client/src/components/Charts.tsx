import { Area, Bar, BarChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fmtCompact, fmtDate } from '../lib/format';
import { useThemeColors, channelColor } from '../lib/theme';
import type { Bucket } from '../lib/compute';

export interface SeriesPoint { idx: number; label: string; currentDate: string; compareDate: string; current: number | null; compare: number | null }

function TooltipBox({ active, payload, label, format, currentLabel, compareLabel }: { active?: boolean; payload?: any[]; label?: string; format: (n: number) => string; currentLabel: string; compareLabel: string }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as SeriesPoint;
  return (
    <div className="tooltip">
      <div className="t">{label}</div>
      {p.current !== null && (
        <div className="r"><span><i style={{ background: payload.find((x) => x.dataKey === 'current')?.stroke }} />{currentLabel}{p.currentDate ? ` · ${fmtDate(p.currentDate)}` : ''}</span><b>{format(p.current)}</b></div>
      )}
      {p.compare !== null && (
        <div className="r"><span><i style={{ background: payload.find((x) => x.dataKey === 'compare')?.stroke }} />{compareLabel}{p.compareDate ? ` · ${fmtDate(p.compareDate)}` : ''}</span><b>{format(p.compare)}</b></div>
      )}
    </div>
  );
}

/** Current vs comparison line chart, aligned by day/week/month index. */
export function TrendChart({ data, format = fmtCompact, currentLabel, compareLabel, height = 260, area = true, color }: { data: SeriesPoint[]; format?: (n: number) => string; currentLabel: string; compareLabel: string; height?: number; area?: boolean; color?: string }) {
  const c = useThemeColors();
  const stroke = color || c.series[0];
  const tick = { fill: c.muted, fontSize: 11 };
  return (
    <div>
      <div className="legend">
        <span><i style={{ background: stroke }} />{currentLabel}</span>
        <span><i className="dashed" style={{ color: c.compare }} />{compareLabel}</span>
      </div>
      <div className="chart" style={{ height }}>
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${stroke.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.22} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={c.grid} vertical={false} />
            <XAxis dataKey="label" tick={tick} axisLine={{ stroke: c.grid }} tickLine={false} minTickGap={24} />
            <YAxis tick={tick} axisLine={false} tickLine={false} tickFormatter={(v) => format(v)} width={56} />
            <Tooltip content={<TooltipBox format={format} currentLabel={currentLabel} compareLabel={compareLabel} />} cursor={{ stroke: c.muted, strokeDasharray: '3 3' }} />
            {area && <Area type="monotone" dataKey="current" stroke="none" fill={`url(#grad-${stroke.replace('#', '')})`} isAnimationActive={false} connectNulls />}
            <Line type="monotone" dataKey="compare" stroke={c.compare} strokeWidth={2} strokeDasharray="4 4" dot={false} activeDot={{ r: 4 }} isAnimationActive={false} connectNulls />
            <Line type="monotone" dataKey="current" stroke={stroke} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} isAnimationActive={false} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function StackTooltip({ active, payload, label, channels, colors }: { active?: boolean; payload?: any[]; label?: string; channels: string[]; colors: ReturnType<typeof useThemeColors> }) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => p.value).sort((a, b) => b.value - a.value);
  const total = rows.reduce((s, r) => s + r.value, 0);
  return (
    <div className="tooltip">
      <div className="t">{label} · {fmtCompact(total)} sessions</div>
      {rows.map((r) => (
        <div className="r" key={r.dataKey}><span><i style={{ background: channelColor(r.dataKey, channels, colors) }} />{r.dataKey}</span><b>{fmtCompact(r.value)}</b></div>
      ))}
    </div>
  );
}

/** Stacked sessions by channel for the current period. */
export function ChannelStack({ buckets, channels, enabled, height = 280 }: { buckets: Bucket[]; channels: string[]; enabled: Set<string>; height?: number }) {
  const c = useThemeColors();
  const shown = channels.filter((ch) => enabled.has(ch)).slice(0, 8);
  const other = channels.filter((ch) => enabled.has(ch)).slice(8);
  const data = buckets.filter((b) => b.currentDays > 0 && (b.fullDays === 1 || b.currentDays >= b.fullDays)).map((b) => ({ label: b.label, ...Object.fromEntries(shown.map((ch) => [ch, b.channels[ch] || 0])), ...(other.length ? { Other: other.reduce((s, ch) => s + (b.channels[ch] || 0), 0) } : {}) }));
  const keys = other.length ? [...shown, 'Other'] : shown;
  const tick = { fill: c.muted, fontSize: 11 };
  return (
    <div>
      <div className="legend">
        {keys.map((k) => (
          <span key={k}><i style={{ background: k === 'Other' ? c.muted : channelColor(k, channels, c), height: 10, width: 10, borderRadius: 3 }} />{k}</span>
        ))}
      </div>
      <div className="chart" style={{ height }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} barCategoryGap="25%">
            <CartesianGrid stroke={c.grid} vertical={false} />
            <XAxis dataKey="label" tick={tick} axisLine={{ stroke: c.grid }} tickLine={false} minTickGap={24} />
            <YAxis tick={tick} axisLine={false} tickLine={false} tickFormatter={(v) => fmtCompact(v)} width={56} />
            <Tooltip content={<StackTooltip channels={channels} colors={c} />} cursor={{ fill: c.grid, opacity: 0.5 }} />
            {keys.map((k, i) => (
              <Bar key={k} dataKey={k} stackId="a" fill={k === 'Other' ? c.muted : channelColor(k, channels, c)} stroke={c.surface} strokeWidth={1} isAnimationActive={false} radius={i === keys.length - 1 ? [4, 4, 0, 0] : 0} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Horizontal grouped bars: current vs compare for a list of named rows. */
export function CompareBars({ rows, currentLabel, compareLabel, format = fmtCompact, height, color }: { rows: { name: string; current: number; compare: number }[]; currentLabel: string; compareLabel: string; format?: (n: number) => string; height?: number; color?: string }) {
  const c = useThemeColors();
  const stroke = color || c.series[0];
  const tick = { fill: c.muted, fontSize: 11 };
  const h = height || Math.max(160, rows.length * 34 + 30);
  return (
    <div>
      <div className="legend">
        <span><i style={{ background: stroke, height: 10, width: 10, borderRadius: 3 }} />{currentLabel}</span>
        <span><i style={{ background: c.compare, height: 10, width: 10, borderRadius: 3 }} />{compareLabel}</span>
      </div>
      <div className="chart" style={{ height: h }}>
        <ResponsiveContainer>
          <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 40, left: 8, bottom: 0 }} barCategoryGap="28%" barGap={2}>
            <CartesianGrid stroke={c.grid} horizontal={false} />
            <XAxis type="number" tick={tick} axisLine={false} tickLine={false} tickFormatter={(v) => format(v)} />
            <YAxis type="category" dataKey="name" tick={{ ...tick, fill: c.text2, fontSize: 12 }} axisLine={false} tickLine={false} width={130} />
            <Tooltip
              cursor={{ fill: c.grid, opacity: 0.5 }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <div className="tooltip">
                    <div className="t">{label}</div>
                    <div className="r"><span><i style={{ background: stroke }} />{currentLabel}</span><b>{format(payload[0].payload.current)}</b></div>
                    <div className="r"><span><i style={{ background: c.compare }} />{compareLabel}</span><b>{format(payload[0].payload.compare)}</b></div>
                  </div>
                ) : null
              }
            />
            <Bar dataKey="compare" fill={c.compare} radius={[0, 4, 4, 0]} isAnimationActive={false} />
            <Bar dataKey="current" fill={stroke} radius={[0, 4, 4, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
