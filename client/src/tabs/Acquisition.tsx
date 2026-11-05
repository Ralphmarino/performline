import { Card, Section } from '../components/Section';
import { KpiCard } from '../components/KpiCard';
import { ChannelStack, CompareBars, TrendChart } from '../components/Charts';
import { DataTable } from '../components/DataTable';
import { Delta } from '../components/DeltaCell';
import { Notes } from '../components/Notes';
import { seriesOf } from '../lib/compute';
import { fmtInt, fmtPct, titleCase } from '../lib/format';
import { labels, metricColumns, type TabProps } from './common';

export function Acquisition({ report, c, print }: TabProps) {
  const { cur, cmp } = labels(report);
  const k = c.kpis;
  const spark = (pick: Parameters<typeof seriesOf>[1]) => seriesOf(c.buckets, pick);
  const total = k.sessions.current || 1;
  return (
    <div className="stack">
      <div className="grid grid-4">
        <KpiCard label="Sessions" current={k.sessions.current} compare={k.sessions.compare} format={fmtInt} compareLabel={cmp} series={spark((m) => m.sessions)} />
        <KpiCard label="Users" current={k.users.current} compare={k.users.compare} format={fmtInt} compareLabel={cmp} series={spark((m) => m.users)} />
        <KpiCard label="New users" current={k.newUsers.current} compare={k.newUsers.compare} format={fmtInt} compareLabel={cmp} series={spark((m) => m.newUsers)} />
        <KpiCard label="Key events" current={k.keyEvents.current} compare={k.keyEvents.compare} format={fmtInt} compareLabel={cmp} series={spark((m) => m.keyEvents)} />
      </div>
      <Section title="Channel mix" subtitle="toggle channels in the filter bar to isolate any mix">
        <div className="grid grid-2">
          <Card title={`Sessions by channel · ${cur}`} subtitle={`stacked by ${c.granularity}`}>
            <ChannelStack buckets={c.buckets} channels={report.meta.channels} enabled={c.enabled} />
          </Card>
          <Card title="Channel comparison" subtitle="sessions, current vs comparison period">
            <CompareBars rows={c.channels.map((ch) => ({ name: ch.channel, current: ch.current.sessions, compare: ch.compare.sessions }))} currentLabel={cur} compareLabel={cmp} />
          </Card>
        </div>
      </Section>
      <Card title="Channel performance" subtitle="session default channel group, AI assistant referrals broken out as their own channel">
        <DataTable
          rows={c.channels}
          rowKey={(r) => r.channel}
          csvName="channels"
          pageSize={12}
          columns={[
            { key: 'channel', label: 'Channel', align: 'left', value: (r) => r.channel, render: (r) => (<><b>{r.channel}</b> <span className="small muted">{fmtPct(r.current.sessions / total, 0)}</span></>) },
            ...metricColumns(c.channels, { newUsers: true, conversion: true }),
          ]}
          footer={
            <tr>
              <td>Total</td>
              <td>{fmtInt(k.sessions.current)}</td>
              <td className="dim">{fmtInt(k.sessions.compare)}</td>
              <td><Delta current={k.sessions.current} compare={k.sessions.compare} /></td>
              <td>{fmtInt(k.users.current)}</td>
              <td>{fmtInt(k.newUsers.current)}</td>
              <td>{fmtPct(k.engagementRate.current, 0)}</td>
              <td>{fmtInt(k.keyEvents.current)}</td>
              <td>{fmtPct(k.conversionRate.current, 2)}</td>
            </tr>
          }
        />
      </Card>
      <div className="grid grid-2">
        <Card title="Sources & mediums" subtitle="who is actually sending the traffic">
          <DataTable
            rows={c.sources}
            rowKey={(r) => `${r.channel}|${r.source}|${r.medium}`}
            csvName="sources"
            columns={[
              { key: 'source', label: 'Source / medium', align: 'left', value: (r) => `${r.source} / ${r.medium}`, render: (r) => (<><b>{r.source}</b> <span className="muted">/ {r.medium}</span><br /><span className="small muted">{r.channel}</span></>) },
              ...metricColumns(c.sources, { users: false, engagement: false }),
            ]}
          />
        </Card>
        <Card title="New vs returning & devices" subtitle="how the audience is shifting">
          <TrendChart data={seriesOf(c.buckets, (m) => m.newUsers)} currentLabel={`New users · ${cur}`} compareLabel={cmp} height={170} />
          <DataTable
            rows={c.devices}
            rowKey={(r) => r.device}
            pageSize={5}
            columns={[
              { key: 'device', label: 'Device', align: 'left', value: (r) => r.device, render: (r) => titleCase(r.device) },
              ...metricColumns(c.devices, { users: false, keyEvents: true }),
            ]}
          />
        </Card>
      </div>
      <Notes id="acquisition" print={print} />
    </div>
  );
}
