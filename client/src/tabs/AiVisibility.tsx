import { Callout, Card, Section } from '../components/Section';
import { KpiCard } from '../components/KpiCard';
import { CompareBars, TrendChart } from '../components/Charts';
import { DataTable } from '../components/DataTable';
import { Notes } from '../components/Notes';
import { conversionRate, engagementRate } from '../lib/compute';
import { fmtInt, fmtPct, fmtNum } from '../lib/format';
import { labels, metricColumns, type TabProps } from './common';

export function AiVisibility({ report, c, print }: TabProps) {
  const { cur, cmp } = labels(report);
  const k = c.kpis;
  const aiCr = conversionRate(c.ai.totals.current);
  const siteCr = conversionRate(c.ai.siteTotals.current);
  const aiSeries = c.buckets.map((b) => ({ idx: b.idx, label: b.label, currentDate: b.currentDate, compareDate: b.compareDate, current: b.currentDays >= b.fullDays ? b.currentAi : null, compare: b.compareDays >= b.fullDays ? b.compareAi : null }));
  return (
    <div className="stack">
      {!c.ai.enabled && !print && (
        <Callout kind="warn" icon="⚠️">The <b>AI Assistant</b> channel is switched off in the filter bar. This tab always shows AI traffic, but it is excluded from the other tabs' totals.</Callout>
      )}
      <div className="grid grid-4">
        <KpiCard label="AI assistant sessions" current={k.aiSessions.current} compare={k.aiSessions.compare} format={fmtInt} compareLabel={cmp} series={aiSeries} />
        <KpiCard label="Share of all sessions" current={k.aiShare.current} compare={k.aiShare.compare} format={(n) => fmtPct(n, 2)} compareLabel={cmp} />
        <KpiCard label="Key events from AI" current={k.aiKeyEvents.current} compare={k.aiKeyEvents.compare} format={fmtInt} compareLabel={cmp} />
        <KpiCard label="AI conversion rate" current={aiCr} compare={conversionRate(c.ai.totals.compare)} format={(n) => fmtPct(n, 2)} compareLabel={cmp} hint={`Site-wide conversion rate is ${fmtPct(siteCr, 2)}`} />
      </div>
      <Callout icon="🤖">
        <b>How this is measured.</b> Sessions whose source is an AI assistant (ChatGPT, Perplexity, Gemini, Claude, Copilot, Grok, Meta AI, DeepSeek, Mistral, You.com and others) are pulled out of Referral/Direct and reported as the <b>AI Assistant</b> channel. That matches the new GA4 "AI Assistant" grouping and also catches assistants GA4 does not label yet.
        {aiCr > siteCr * 1.2 && c.ai.totals.current.sessions > 20 ? <> AI visitors are converting <b>{fmtNum(aiCr / siteCr)}x</b> the site average - high-intent traffic worth nurturing.</> : null}
      </Callout>
      <div className="grid grid-2">
        <Card title="AI referral sessions over time" subtitle={`${cur} vs ${cmp}`}>
          <TrendChart data={aiSeries} currentLabel={cur} compareLabel={cmp} color={undefined} />
        </Card>
        <Card title="By assistant" subtitle="sessions, current vs comparison period">
          <CompareBars rows={c.ai.engines.slice(0, 8).map((e) => ({ name: e.engine, current: e.current.sessions, compare: e.compare.sessions }))} currentLabel={cur} compareLabel={cmp} />
        </Card>
      </div>
      <Section title="Assistants" subtitle="which assistants send visitors and how well they convert">
        <Card>
          <DataTable
            rows={c.ai.engines}
            rowKey={(r) => r.engine}
            csvName="ai-assistants"
            columns={[
              { key: 'engine', label: 'Assistant', align: 'left', value: (r) => r.engine, render: (r) => (<><b>{r.engine}</b> <span className="small muted">{fmtPct(c.ai.totals.current.sessions ? r.current.sessions / c.ai.totals.current.sessions : 0, 0)} of AI</span></>) },
              ...metricColumns(c.ai.engines, { newUsers: true, conversion: true }),
            ]}
          />
        </Card>
      </Section>
      <Card title="What AI assistants link to" subtitle="landing pages cited or recommended by assistants - these are the pages shaping how AI describes PerformLine">
        <DataTable
          rows={c.ai.landingPages}
          rowKey={(r) => r.landingPage}
          csvName="ai-landing-pages"
          pageSize={12}
          columns={[
            { key: 'page', label: 'Landing page', align: 'left', value: (r) => r.landingPage, render: (r) => (<><span className="ellipsis" title={r.landingPage}>{r.landingPage}</span>{r.engines.length ? <><br /><span className="small muted">{r.engines.join(', ')}</span></> : null}</>) },
            ...metricColumns(c.ai.landingPages, { users: false, conversion: true }),
            { key: 'er2', label: 'Engaged', value: (r) => engagementRate(r.current), render: (r) => fmtPct(engagementRate(r.current), 0) },
          ]}
        />
      </Card>
      <Notes id="ai" print={print} placeholder="Which prompts / questions is PerformLine showing up for? Any brand mentions to correct? Pages to optimise for AI citations..." />
    </div>
  );
}
