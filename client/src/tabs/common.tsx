import type { Column } from '../components/DataTable';
import { Bar } from '../components/DataTable';
import { Delta } from '../components/DeltaCell';
import type { Computed, MetricPair } from '../lib/compute';
import { avgEngagement, conversionRate, engagementRate } from '../lib/compute';
import { fmtDuration, fmtInt, fmtPct } from '../lib/format';
import type { Summary } from '../lib/summary';
import type { Report } from '../lib/types';

export interface TabProps {
  report: Report;
  c: Computed;
  summary: Summary;
  print?: boolean;
  onState?: (patch: { view: string | null; preset: string; compare: string }) => void;
}

export const labels = (report: Report) => ({ cur: report.meta.periods.current.label, cmp: report.meta.periods.compareRange.label });

/** Standard GA4 metric columns for any row that carries { current, compare } Metrics. */
export function metricColumns<T extends MetricPair>(rows: T[], opts: { users?: boolean; newUsers?: boolean; engagement?: boolean; keyEvents?: boolean; conversion?: boolean; avgTime?: boolean; pageViews?: boolean } = {}): Column<T>[] {
  const max = Math.max(1, ...rows.map((r) => Math.max(r.current.sessions, r.compare.sessions)));
  const cols: Column<T>[] = [
    { key: 'sessions', label: 'Sessions', value: (r) => r.current.sessions, render: (r) => (<><Bar value={r.current.sessions} max={max} />{fmtInt(r.current.sessions)}</>) },
    { key: 'sessionsPrev', label: 'Prev', value: (r) => r.compare.sessions, render: (r) => <span className="dim">{fmtInt(r.compare.sessions)}</span> },
    { key: 'sessionsDelta', label: 'Δ %', value: (r) => (r.compare.sessions ? (r.current.sessions - r.compare.sessions) / r.compare.sessions : r.current.sessions ? 1e9 : 0), render: (r) => <Delta current={r.current.sessions} compare={r.compare.sessions} /> },
  ];
  if (opts.users !== false) cols.push({ key: 'users', label: 'Users', value: (r) => r.current.users, render: (r) => fmtInt(r.current.users) });
  if (opts.newUsers) cols.push({ key: 'newUsers', label: 'New users', value: (r) => r.current.newUsers, render: (r) => fmtInt(r.current.newUsers) });
  if (opts.pageViews) cols.push({ key: 'pageViews', label: 'Views', value: (r) => r.current.pageViews, render: (r) => fmtInt(r.current.pageViews) });
  if (opts.engagement !== false) cols.push({ key: 'er', label: 'Engagement', value: (r) => engagementRate(r.current), render: (r) => (<>{fmtPct(engagementRate(r.current), 0)} <Delta current={engagementRate(r.current)} compare={engagementRate(r.compare)} className="small" /></>) });
  if (opts.avgTime) cols.push({ key: 'avgTime', label: 'Avg. time', value: (r) => avgEngagement(r.current), render: (r) => fmtDuration(avgEngagement(r.current)) });
  if (opts.keyEvents !== false) cols.push({ key: 'keyEvents', label: 'Key events', value: (r) => r.current.keyEvents, render: (r) => (<>{fmtInt(r.current.keyEvents)} <Delta current={r.current.keyEvents} compare={r.compare.keyEvents} className="small" /></>) });
  if (opts.conversion) cols.push({ key: 'cr', label: 'Conv. rate', value: (r) => conversionRate(r.current), render: (r) => fmtPct(conversionRate(r.current), 2) });
  return cols;
}
