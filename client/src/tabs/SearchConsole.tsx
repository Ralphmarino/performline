import { Callout, Card } from '../components/Section';
import { KpiCard } from '../components/KpiCard';
import { CompareBars, TrendChart } from '../components/Charts';
import { DataTable, Bar } from '../components/DataTable';
import { Delta } from '../components/DeltaCell';
import { Notes } from '../components/Notes';
import { gscSeriesOf, type GscPair } from '../lib/compute';
import { fmtInt, fmtPct, fmtNum, fmtCompact, titleCase } from '../lib/format';
import type { Column } from '../components/DataTable';
import { labels, type TabProps } from './common';

function gscColumns<T extends GscPair>(rows: T[]): Column<T>[] {
  const max = Math.max(1, ...rows.map((r) => r.current.clicks));
  return [
    { key: 'clicks', label: 'Clicks', value: (r) => r.current.clicks, render: (r) => (<><Bar value={r.current.clicks} max={max} />{fmtInt(r.current.clicks)}</>) },
    { key: 'clicksPrev', label: 'Prev', value: (r) => r.compare.clicks, render: (r) => <span className="dim">{fmtInt(r.compare.clicks)}</span> },
    { key: 'clicksDelta', label: 'Δ %', value: (r) => (r.compare.clicks ? (r.current.clicks - r.compare.clicks) / r.compare.clicks : r.current.clicks ? 1e9 : 0), render: (r) => <Delta current={r.current.clicks} compare={r.compare.clicks} /> },
    { key: 'impressions', label: 'Impressions', value: (r) => r.current.impressions, render: (r) => (<>{fmtInt(r.current.impressions)} <Delta current={r.current.impressions} compare={r.compare.impressions} className="small" /></>) },
    { key: 'ctr', label: 'CTR', value: (r) => r.current.ctr, render: (r) => fmtPct(r.current.ctr, 1) },
    { key: 'position', label: 'Position', value: (r) => r.current.position, render: (r) => (<>{fmtNum(r.current.position)} <Delta current={r.current.position} compare={r.compare.position} invert className="small" /></>) },
  ];
}

export function SearchConsole({ report, c, print }: TabProps) {
  const { cur, cmp } = labels(report);
  const k = c.kpis;
  const striking = c.gsc.queries.filter((q) => !q.branded && q.current.position >= 4 && q.current.position <= 15 && q.current.impressions > 100).sort((a, b) => b.current.impressions - a.current.impressions);
  const brandedShare = c.gsc.totals.current.clicks ? c.gsc.branded.current.clicks / c.gsc.totals.current.clicks : 0;
  return (
    <div className="stack">
      <div className="grid grid-4">
        <KpiCard label="Clicks" current={k.gscClicks.current} compare={k.gscClicks.compare} format={fmtInt} compareLabel={cmp} series={gscSeriesOf(c.buckets, (g) => g.clicks)} />
        <KpiCard label="Impressions" current={k.gscImpressions.current} compare={k.gscImpressions.compare} format={fmtInt} compareLabel={cmp} series={gscSeriesOf(c.buckets, (g) => g.impressions)} />
        <KpiCard label="CTR" current={k.gscCtr.current} compare={k.gscCtr.compare} format={(n) => fmtPct(n, 2)} compareLabel={cmp} series={gscSeriesOf(c.buckets, (g) => g.ctr)} />
        <KpiCard label="Avg. position" current={k.gscPosition.current} compare={k.gscPosition.compare} format={(n) => fmtNum(n, 1)} compareLabel={cmp} invert series={gscSeriesOf(c.buckets, (g) => g.position)} hint="Lower is better" />
      </div>
      <Callout icon="🔎">
        Search Console covers Google organic search only and lags 2-3 days behind GA4. <b>{fmtPct(brandedShare, 0)}</b> of clicks come from branded queries ("performline", "comply summit"), the rest is non-branded demand - the part SEO and content can grow.
      </Callout>
      <div className="grid grid-2">
        <Card title="Clicks over time" subtitle={`${cur} vs ${cmp}`}>
          <TrendChart data={gscSeriesOf(c.buckets, (g) => g.clicks)} currentLabel={cur} compareLabel={cmp} />
        </Card>
        <Card title="Impressions over time" subtitle="visibility in Google results">
          <TrendChart data={gscSeriesOf(c.buckets, (g) => g.impressions)} currentLabel={cur} compareLabel={cmp} format={fmtCompact} />
        </Card>
      </div>
      <div className="grid grid-2">
        <Card title="Branded vs non-branded" subtitle="clicks">
          <CompareBars rows={[{ name: 'Branded', current: c.gsc.branded.current.clicks, compare: c.gsc.branded.compare.clicks }, { name: 'Non-branded', current: c.gsc.nonBranded.current.clicks, compare: c.gsc.nonBranded.compare.clicks }]} currentLabel={cur} compareLabel={cmp} height={130} />
          <DataTable
            rows={c.gsc.devices}
            rowKey={(r) => r.device}
            pageSize={4}
            columns={[{ key: 'device', label: 'Device', align: 'left', value: (r) => r.device, render: (r) => titleCase(r.device.toLowerCase()) }, ...gscColumns(c.gsc.devices)]}
          />
        </Card>
        <Card title="Striking-distance keywords" subtitle="non-branded, position 4-15, 100+ impressions - the quickest wins">
          <DataTable
            rows={striking}
            rowKey={(r) => r.query}
            pageSize={8}
            csvName="striking-distance"
            columns={[
              { key: 'query', label: 'Query', align: 'left', value: (r) => r.query, render: (r) => r.query },
              { key: 'position', label: 'Position', value: (r) => r.current.position, render: (r) => fmtNum(r.current.position) },
              { key: 'impressions', label: 'Impressions', value: (r) => r.current.impressions, render: (r) => fmtInt(r.current.impressions) },
              { key: 'clicks', label: 'Clicks', value: (r) => r.current.clicks, render: (r) => fmtInt(r.current.clicks) },
              { key: 'ctr', label: 'CTR', value: (r) => r.current.ctr, render: (r) => fmtPct(r.current.ctr, 1) },
            ]}
          />
        </Card>
      </div>
      <Card title="Top queries" subtitle="what people searched before clicking through">
        <DataTable
          rows={c.gsc.queries}
          rowKey={(r) => r.query}
          csvName="queries"
          pageSize={15}
          columns={[{ key: 'query', label: 'Query', align: 'left', value: (r) => r.query, render: (r) => (<>{r.query} {r.branded && <span className="pill brand">brand</span>}</>) }, ...gscColumns(c.gsc.queries)]}
        />
      </Card>
      <Card title="Top pages in Google" subtitle="pages earning organic clicks">
        <DataTable
          rows={c.gsc.pages}
          rowKey={(r) => r.page}
          csvName="gsc-pages"
          pageSize={15}
          columns={[{ key: 'page', label: 'Page', align: 'left', value: (r) => r.path, render: (r) => <span className="ellipsis" title={r.page}>{r.path}</span> }, ...gscColumns(c.gsc.pages)]}
        />
      </Card>
      <Card title="Countries" subtitle="clicks by country">
        <DataTable
          rows={c.gsc.countries}
          rowKey={(r) => r.country}
          pageSize={6}
          columns={[{ key: 'country', label: 'Country', align: 'left', value: (r) => r.country, render: (r) => r.country.toUpperCase() }, ...gscColumns(c.gsc.countries)]}
        />
      </Card>
      <Notes id="search" print={print} />
    </div>
  );
}
