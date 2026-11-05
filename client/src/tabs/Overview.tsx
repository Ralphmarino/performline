import { Callout, Card, Section } from '../components/Section';
import { KpiCard } from '../components/KpiCard';
import { TrendChart, CompareBars } from '../components/Charts';
import { InsightList, SummaryCard } from '../components/Insights';
import { DataTable } from '../components/DataTable';
import { Delta } from '../components/DeltaCell';
import { Notes } from '../components/Notes';
import { seriesOf, gscSeriesOf } from '../lib/compute';
import { fmtInt, fmtPct, fmtCompact } from '../lib/format';
import { labels, type TabProps } from './common';

export function Overview({ report, c, summary, print }: TabProps) {
  const { cur, cmp } = labels(report);
  const k = c.kpis;
  const spark = (pick: Parameters<typeof seriesOf>[1]) => seriesOf(c.buckets, pick);
  const landingMax = Math.max(1, ...c.landingPages.slice(0, 12).map((l) => l.current.sessions));
  return (
    <div className="stack">
      <SummaryCard summary={summary} periodLabel={cur} />
      <div className="grid grid-4">
        <KpiCard label="Sessions" current={k.sessions.current} compare={k.sessions.compare} format={fmtInt} compareLabel={cmp} series={spark((m) => m.sessions)} />
        <KpiCard label="Users" current={k.users.current} compare={k.users.compare} format={fmtInt} compareLabel={cmp} series={spark((m) => m.users)} hint={c.usersApprox ? 'Approximate while channels are filtered (users are summed across channels)' : 'Unique users for the period'} />
        <KpiCard label="New users" current={k.newUsers.current} compare={k.newUsers.compare} format={fmtInt} compareLabel={cmp} series={spark((m) => m.newUsers)} />
        <KpiCard label="Key events" current={k.keyEvents.current} compare={k.keyEvents.compare} format={fmtInt} compareLabel={cmp} series={spark((m) => m.keyEvents)} hint="Conversions: all GA4 key events (demo-submission, form_submit, file_download...)" />
        <KpiCard label="Engagement rate" current={k.engagementRate.current} compare={k.engagementRate.compare} format={(n) => fmtPct(n, 1)} compareLabel={cmp} series={spark((m) => (m.sessions ? m.engagedSessions / m.sessions : 0))} />
        <KpiCard label="Organic clicks" current={k.gscClicks.current} compare={k.gscClicks.compare} format={fmtInt} compareLabel={cmp} series={gscSeriesOf(c.buckets, (g) => g.clicks)} hint="Google Search Console clicks" />
        <KpiCard label="Search impressions" current={k.gscImpressions.current} compare={k.gscImpressions.compare} format={fmtCompact} compareLabel={cmp} series={gscSeriesOf(c.buckets, (g) => g.impressions)} />
        <KpiCard label="AI assistant sessions" current={k.aiSessions.current} compare={k.aiSessions.compare} format={fmtInt} compareLabel={cmp} series={c.buckets.map((b) => ({ current: b.currentDays >= b.fullDays ? b.currentAi : null, compare: b.compareDays >= b.fullDays ? b.compareAi : null }))} hint="Referrals from ChatGPT, Perplexity, Gemini, Claude, Copilot and other assistants" />
      </div>

      <Section title="Highlights" subtitle="auto-generated from the data - wins, watch-outs and opportunities">
        <InsightList insights={summary.insights} limit={print ? 8 : undefined} />
      </Section>

      <div className="grid grid-2">
        <Card title="Sessions over time" subtitle={`${cur} vs ${cmp}, aligned by ${c.granularity}`}>
          <TrendChart data={seriesOf(c.buckets, (m) => m.sessions)} currentLabel={cur} compareLabel={cmp} />
        </Card>
        <Card title="What changed by channel" subtitle="sessions, current vs comparison period">
          <CompareBars rows={c.channels.slice(0, 8).map((ch) => ({ name: ch.channel, current: ch.current.sessions, compare: ch.compare.sessions }))} currentLabel={cur} compareLabel={cmp} />
        </Card>
      </div>

      <div className="grid grid-2">
        <Card title="Where do your visitors land?" subtitle="top landing pages by sessions">
          <DataTable
            rows={c.landingPages.slice(0, 12)}
            rowKey={(r) => r.landingPage}
            pageSize={10}
            defaultSort="sessions"
            columns={[
              { key: 'page', label: 'Landing page', align: 'left', value: (r) => r.landingPage, render: (r) => <span className="ellipsis" title={r.landingPage}>{r.landingPage}</span> },
              { key: 'sessions', label: 'Sessions', value: (r) => r.current.sessions, render: (r) => (<><span className="bar" style={{ width: Math.max(2, (r.current.sessions / landingMax) * 60) }} />{fmtInt(r.current.sessions)}</>) },
              { key: 'delta', label: 'Δ %', value: (r) => (r.compare.sessions ? (r.current.sessions - r.compare.sessions) / r.compare.sessions : 1e9), render: (r) => <Delta current={r.current.sessions} compare={r.compare.sessions} /> },
            ]}
          />
        </Card>
        <Card title="What are your top drivers of traffic?" subtitle="channel and medium by sessions">
          <DataTable
            rows={c.sources.slice(0, 12)}
            rowKey={(r) => `${r.channel}|${r.source}|${r.medium}`}
            pageSize={10}
            defaultSort="sessions"
            columns={[
              { key: 'channel', label: 'Channel', align: 'left', value: (r) => r.channel, render: (r) => r.channel },
              { key: 'source', label: 'Source / medium', align: 'left', value: (r) => `${r.source} / ${r.medium}`, render: (r) => <span className="text-2">{r.source} / {r.medium}</span> },
              { key: 'sessions', label: 'Sessions', value: (r) => r.current.sessions, render: (r) => fmtInt(r.current.sessions) },
              { key: 'delta', label: 'Δ %', value: (r) => (r.compare.sessions ? (r.current.sessions - r.compare.sessions) / r.compare.sessions : 1e9), render: (r) => <Delta current={r.current.sessions} compare={r.compare.sessions} /> },
            ]}
            footer={
              <tr>
                <td>Grand total</td>
                <td />
                <td>{fmtInt(k.sessions.current)}</td>
                <td><Delta current={k.sessions.current} compare={k.sessions.compare} /></td>
              </tr>
            }
          />
        </Card>
      </div>
      {report.meta.mode === 'demo' && !print && (
        <Callout icon="🧪">
          <b>You are looking at demo data.</b> Numbers are generated to look like PerformLine's traffic so every view works out of the box. Connect GA4 + Search Console (see <code>docs/SETUP.md</code>) and set <code>DATA_MODE=live</code> to switch to real data.
        </Callout>
      )}
      <Notes id="overview" title="Executive notes" print={print} placeholder="What should leadership take away this period? Campaign context, launches, anomalies, next steps..." />
    </div>
  );
}
