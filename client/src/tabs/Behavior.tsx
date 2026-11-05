import { Card } from '../components/Section';
import { KpiCard } from '../components/KpiCard';
import { TrendChart } from '../components/Charts';
import { DataTable } from '../components/DataTable';
import { Notes } from '../components/Notes';
import { ExpandableList } from '../components/ExpandableList';
import { seriesOf, engagementRate, avgEngagement } from '../lib/compute';
import { fmtInt, fmtPct, fmtDuration, fmtNum } from '../lib/format';
import { labels, metricColumns, type TabProps } from './common';

export function Behavior({ report, c, print }: TabProps) {
  const { cur, cmp } = labels(report);
  const k = c.kpis;
  const spark = (pick: Parameters<typeof seriesOf>[1]) => seriesOf(c.buckets, pick);
  const engaged = [...c.landingPages].filter((l) => l.current.sessions >= 20).sort((a, b) => engagementRate(b.current) - engagementRate(a.current));
  const bouncy = [...engaged].reverse();
  return (
    <div className="stack">
      <div className="grid grid-4">
        <KpiCard label="Engagement rate" current={k.engagementRate.current} compare={k.engagementRate.compare} format={(n) => fmtPct(n, 1)} compareLabel={cmp} series={spark((m) => (m.sessions ? m.engagedSessions / m.sessions : 0))} hint="Engaged sessions ÷ sessions. GA4 counts a session as engaged after 10s, a key event or 2+ page views." />
        <KpiCard label="Avg. engagement time" current={k.avgEngagement.current} compare={k.avgEngagement.compare} format={fmtDuration} compareLabel={cmp} series={spark(avgEngagement)} />
        <KpiCard label="Views per session" current={k.pagesPerSession.current} compare={k.pagesPerSession.compare} format={(n) => fmtNum(n, 2)} compareLabel={cmp} series={spark((m) => (m.sessions ? m.pageViews / m.sessions : 0))} />
        <KpiCard label="Event count" current={k.eventCount.current} compare={k.eventCount.compare} format={fmtInt} compareLabel={cmp} series={spark((m) => m.eventCount)} />
      </div>
      <div className="grid grid-2">
        <Card title="Engagement rate over time" subtitle="are visitors sticking around?">
          <TrendChart data={seriesOf(c.buckets, (m) => (m.sessions ? m.engagedSessions / m.sessions : 0))} format={(n) => fmtPct(n, 0)} currentLabel={cur} compareLabel={cmp} area={false} />
        </Card>
        <Card title="Page views over time">
          <TrendChart data={seriesOf(c.buckets, (m) => m.pageViews)} currentLabel={cur} compareLabel={cmp} />
        </Card>
      </div>
      <Card title="Landing page performance" subtitle="where sessions start, how engaged they are and what they convert">
        <DataTable
          rows={c.landingPages}
          rowKey={(r) => r.landingPage}
          csvName="landing-pages"
          pageSize={15}
          columns={[
            { key: 'page', label: 'Landing page', align: 'left', value: (r) => r.landingPage, render: (r) => (<><span className="ellipsis" title={r.landingPage}>{r.landingPage}</span><br /><span className="small muted">{r.topChannel}</span></>) },
            ...metricColumns(c.landingPages, { newUsers: true, avgTime: true, conversion: true }),
          ]}
        />
      </Card>
      <div className="grid grid-2">
        <Card title="Most engaging landing pages" subtitle="20+ sessions, ranked by engagement rate">
          <ExpandableList items={engaged} print={print} render={(l, i) => (
            <li key={l.landingPage}><span className="name"><span className="rank">{i + 1}</span>{l.landingPage}</span><span className="nowrap"><b>{fmtPct(engagementRate(l.current), 0)}</b> <span className="muted small">· {fmtInt(l.current.sessions)} sessions</span></span></li>
          )} />
        </Card>
        <Card title="Least engaging landing pages" subtitle="candidates for content or intent fixes">
          <ExpandableList items={bouncy} print={print} render={(l, i) => (
            <li key={l.landingPage}><span className="name"><span className="rank">{i + 1}</span>{l.landingPage}</span><span className="nowrap"><b className="bad">{fmtPct(engagementRate(l.current), 0)}</b> <span className="muted small">· {fmtInt(l.current.sessions)} sessions</span></span></li>
          )} />
        </Card>
      </div>
      <Notes id="behavior" print={print} />
    </div>
  );
}
