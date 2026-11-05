import { Callout, Card } from '../components/Section';
import { KpiCard } from '../components/KpiCard';
import { CompareBars, TrendChart } from '../components/Charts';
import { DataTable } from '../components/DataTable';
import { Delta } from '../components/DeltaCell';
import { Notes } from '../components/Notes';
import { seriesOf } from '../lib/compute';
import { fmtInt, fmtPct } from '../lib/format';
import { labels, type TabProps } from './common';

export function Conversions({ report, c, print }: TabProps) {
  const { cur, cmp } = labels(report);
  const k = c.kpis;
  const top = [...c.keyEvents].sort((a, b) => b.current - a.current)[0];
  const demo = c.keyEvents.find((e) => /demo/i.test(e.eventName));
  const names = report.meta.keyEventNames;
  const totalCur = c.keyEvents.reduce((s, e) => s + e.current, 0) || 1;
  return (
    <div className="stack">
      <div className="grid grid-4">
        <KpiCard label="Key events (all)" current={k.keyEvents.current} compare={k.keyEvents.compare} format={fmtInt} compareLabel={cmp} series={seriesOf(c.buckets, (m) => m.keyEvents)} />
        <KpiCard label="Conversion rate" current={k.conversionRate.current} compare={k.conversionRate.compare} format={(n) => fmtPct(n, 2)} compareLabel={cmp} hint="Key events ÷ sessions" series={seriesOf(c.buckets, (m) => (m.sessions ? m.keyEvents / m.sessions : 0))} />
        {demo && <KpiCard label={demo.eventName} current={demo.current} compare={demo.compare} format={fmtInt} compareLabel={cmp} hint="Demo requests - the key event that matters most" />}
        {top && top !== demo && <KpiCard label={`Top event: ${top.eventName}`} current={top.current} compare={top.compare} format={fmtInt} compareLabel={cmp} />}
      </div>
      <Callout icon="🎯">
        <b>Key events are GA4's conversions.</b> This property marks <b>{names.join(', ')}</b> as key events. Channel toggles apply here too, so you can see which channels drive demo requests and form submissions.
      </Callout>
      <div className="grid grid-2">
        <Card title="Key events over time" subtitle={`${cur} vs ${cmp}`}>
          <TrendChart data={seriesOf(c.buckets, (m) => m.keyEvents)} currentLabel={cur} compareLabel={cmp} />
        </Card>
        <Card title="By event" subtitle="current vs comparison period">
          <CompareBars rows={c.keyEvents.map((e) => ({ name: e.eventName, current: e.current, compare: e.compare }))} currentLabel={cur} compareLabel={cmp} />
        </Card>
      </div>
      <Card title="Key events by name" subtitle="which conversions moved">
        <DataTable
          rows={c.keyEvents}
          rowKey={(r) => r.eventName}
          csvName="key-events"
          columns={[
            { key: 'event', label: 'Key event', align: 'left', value: (r) => r.eventName, render: (r) => (<><b>{r.eventName}</b> <span className="small muted">{fmtPct(r.current / totalCur, 0)}</span></>) },
            { key: 'current', label: cur, value: (r) => r.current, render: (r) => fmtInt(r.current) },
            { key: 'compare', label: cmp, value: (r) => r.compare, render: (r) => <span className="dim">{fmtInt(r.compare)}</span> },
            { key: 'delta', label: 'Δ %', value: (r) => (r.compare ? (r.current - r.compare) / r.compare : r.current ? 1e9 : 0), render: (r) => <Delta current={r.current} compare={r.compare} /> },
            { key: 'rate', label: 'Per 100 sessions', value: (r) => (k.sessions.current ? (r.current / k.sessions.current) * 100 : 0), render: (r) => (k.sessions.current ? ((r.current / k.sessions.current) * 100).toFixed(2) : '-') },
            { key: 'top', label: 'Top channel', align: 'right', value: (r) => Object.entries(r.byChannel).sort((a, b) => b[1].current - a[1].current)[0]?.[0] || '', render: (r) => Object.entries(r.byChannel).sort((a, b) => b[1].current - a[1].current)[0]?.[0] || '-' },
          ]}
        />
      </Card>
      <Card title="Key events by channel" subtitle="conversion matrix: channel × event, with change vs the comparison period">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th className="left">Channel</th>
                <th>Total</th>
                <th>Δ %</th>
                <th>Conv. rate</th>
                {names.map((n) => <th key={n}>{n}</th>)}
              </tr>
            </thead>
            <tbody>
              {c.keyEventsByChannel.map((row) => {
                const ch = c.channels.find((x) => x.channel === row.channel);
                const cr = ch?.current.sessions ? row.total.current / ch.current.sessions : 0;
                return (
                  <tr key={row.channel}>
                    <td className="left"><b>{row.channel}</b></td>
                    <td>{fmtInt(row.total.current)}</td>
                    <td><Delta current={row.total.current} compare={row.total.compare} /></td>
                    <td>{fmtPct(cr, 2)}</td>
                    {names.map((n) => (
                      <td key={n}>{row.events[n]?.current ? (<>{fmtInt(row.events[n].current)} <Delta current={row.events[n].current} compare={row.events[n].compare} className="small" /></>) : <span className="dim">-</span>}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td>{fmtInt(k.keyEvents.current)}</td>
                <td><Delta current={k.keyEvents.current} compare={k.keyEvents.compare} /></td>
                <td>{fmtPct(k.conversionRate.current, 2)}</td>
                {names.map((n) => { const e = c.keyEvents.find((x) => x.eventName === n); return <td key={n}>{fmtInt(e?.current || 0)}</td>; })}
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
      <Notes id="conversions" print={print} />
    </div>
  );
}
