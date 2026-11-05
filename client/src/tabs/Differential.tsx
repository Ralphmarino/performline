import { Callout, Card } from '../components/Section';
import { Delta } from '../components/DeltaCell';
import { Notes } from '../components/Notes';
import { ExpandableList } from '../components/ExpandableList';
import { downloadCsv } from '../lib/api';
import { avgEngagement, conversionRate, engagementRate } from '../lib/compute';
import { delta, fmtDuration, fmtInt, fmtNum, fmtPct } from '../lib/format';
import { labels, type TabProps } from './common';

interface DiffRow { group: string; metric: string; current: number; compare: number; format: (n: number) => string; invert?: boolean; note?: string }

export function Differential({ report, c, print, onState }: TabProps) {
  const { cur, cmp } = labels(report);
  const k = c.kpis;
  const b = c.blog.totals;
  const ai = c.ai.totals;
  const rows: DiffRow[] = [
    { group: 'Audience', metric: 'Sessions', current: k.sessions.current, compare: k.sessions.compare, format: fmtInt },
    { group: 'Audience', metric: 'Users', current: k.users.current, compare: k.users.compare, format: fmtInt },
    { group: 'Audience', metric: 'New users', current: k.newUsers.current, compare: k.newUsers.compare, format: fmtInt },
    { group: 'Audience', metric: 'New user share', current: k.users.current ? k.newUsers.current / k.users.current : 0, compare: k.users.compare ? k.newUsers.compare / k.users.compare : 0, format: (n) => fmtPct(n, 1) },
    { group: 'Behavior', metric: 'Engaged sessions', current: k.engagedSessions.current, compare: k.engagedSessions.compare, format: fmtInt },
    { group: 'Behavior', metric: 'Engagement rate', current: k.engagementRate.current, compare: k.engagementRate.compare, format: (n) => fmtPct(n, 1) },
    { group: 'Behavior', metric: 'Avg. engagement time', current: k.avgEngagement.current, compare: k.avgEngagement.compare, format: fmtDuration },
    { group: 'Behavior', metric: 'Page views', current: k.pageViews.current, compare: k.pageViews.compare, format: fmtInt },
    { group: 'Behavior', metric: 'Views per session', current: k.pagesPerSession.current, compare: k.pagesPerSession.compare, format: (n) => fmtNum(n, 2) },
    { group: 'Behavior', metric: 'Event count', current: k.eventCount.current, compare: k.eventCount.compare, format: fmtInt },
    { group: 'Conversions', metric: 'Key events', current: k.keyEvents.current, compare: k.keyEvents.compare, format: fmtInt },
    { group: 'Conversions', metric: 'Conversion rate', current: k.conversionRate.current, compare: k.conversionRate.compare, format: (n) => fmtPct(n, 2) },
    ...c.keyEvents.filter((e) => e.current || e.compare).map((e) => ({ group: 'Conversions', metric: `· ${e.eventName}`, current: e.current, compare: e.compare, format: fmtInt })),
    { group: 'Search Console', metric: 'Clicks', current: k.gscClicks.current, compare: k.gscClicks.compare, format: fmtInt },
    { group: 'Search Console', metric: 'Impressions', current: k.gscImpressions.current, compare: k.gscImpressions.compare, format: fmtInt },
    { group: 'Search Console', metric: 'CTR', current: k.gscCtr.current, compare: k.gscCtr.compare, format: (n) => fmtPct(n, 2) },
    { group: 'Search Console', metric: 'Avg. position', current: k.gscPosition.current, compare: k.gscPosition.compare, format: (n) => fmtNum(n, 1), invert: true, note: 'lower is better' },
    { group: 'Search Console', metric: 'Branded clicks', current: c.gsc.branded.current.clicks, compare: c.gsc.branded.compare.clicks, format: fmtInt },
    { group: 'Search Console', metric: 'Non-branded clicks', current: c.gsc.nonBranded.current.clicks, compare: c.gsc.nonBranded.compare.clicks, format: fmtInt },
    { group: 'AI visibility', metric: 'AI assistant sessions', current: ai.current.sessions, compare: ai.compare.sessions, format: fmtInt },
    { group: 'AI visibility', metric: 'AI share of sessions', current: k.aiShare.current, compare: k.aiShare.compare, format: (n) => fmtPct(n, 2) },
    { group: 'AI visibility', metric: 'AI key events', current: ai.current.keyEvents, compare: ai.compare.keyEvents, format: fmtInt },
    { group: 'AI visibility', metric: 'AI conversion rate', current: conversionRate(ai.current), compare: conversionRate(ai.compare), format: (n) => fmtPct(n, 2) },
    { group: 'Blog', metric: 'Blog sessions', current: b.current.sessions, compare: b.compare.sessions, format: fmtInt },
    { group: 'Blog', metric: 'Blog users', current: b.current.users, compare: b.compare.users, format: fmtInt },
    { group: 'Blog', metric: 'Blog engagement rate', current: engagementRate(b.current), compare: engagementRate(b.compare), format: (n) => fmtPct(n, 1) },
    { group: 'Blog', metric: 'Blog avg. engagement time', current: avgEngagement(b.current), compare: avgEngagement(b.compare), format: fmtDuration },
    { group: 'Blog', metric: 'Blog key events', current: b.current.keyEvents, compare: b.compare.keyEvents, format: fmtInt },
    ...c.channels.map((ch) => ({ group: 'Channels (sessions)', metric: ch.channel, current: ch.current.sessions, compare: ch.compare.sessions, format: fmtInt })),
  ];
  const maxAbs = Math.max(0.01, ...rows.map((r) => Math.abs(delta(r.current, r.compare) ?? 0)).filter((x) => Number.isFinite(x) && x < 5));
  const groups = [...new Set(rows.map((r) => r.group))];
  const exportCsv = () => downloadCsv('differential.csv', ['Group', 'Metric', cur, cmp, 'Change', 'Change %'], rows.map((r) => [r.group, r.metric, r.current, r.compare, r.current - r.compare, delta(r.current, r.compare) === null ? 'new' : ((delta(r.current, r.compare) as number) * 100).toFixed(1)]));

  const quick = report.meta.periods;
  const winners = (list: { name: string; current: number; compare: number }[]) => {
    const scored = list.filter((x) => x.current + x.compare > 30).map((x) => ({ ...x, change: x.current - x.compare, pct: delta(x.current, x.compare) }));
    return { up: [...scored].sort((a, b2) => b2.change - a.change).filter((x) => x.change > 0), down: [...scored].sort((a, b2) => a.change - b2.change).filter((x) => x.change < 0) };
  };
  const lp = winners(c.landingPages.map((l) => ({ name: l.landingPage, current: l.current.sessions, compare: l.compare.sessions })));
  const q = winners(c.gsc.queries.map((x) => ({ name: x.query, current: x.current.clicks, compare: x.compare.clicks })));
  const bp = winners(c.blog.posts.map((p) => ({ name: p.title, current: p.current.sessions, compare: p.compare.sessions })));
  const src = winners(c.sources.map((s) => ({ name: `${s.source} / ${s.medium}`, current: s.current.sessions, compare: s.compare.sessions })));

  return (
    <div className="stack">
      {!print && onState && (
        <div className="row spread controls">
          <div className="seg">
            {Object.entries({ mom: '1 month vs 1 month', qoq: 'Quarter vs quarter', yoy: 'Month vs same month last year', h6: '6 months vs 6 months' }).map(([id, label]) => (
              <button key={id} className={quick.preset === ({ mom: 'last_month', qoq: 'last_quarter', yoy: 'last_month', h6: 'last_6_months' } as any)[id] && quick.compare === (id === 'yoy' ? 'previous_year' : 'previous_period') ? 'active' : ''} onClick={() => onState({ view: id, preset: '', compare: '' })}>{label}</button>
            ))}
          </div>
          <button className="btn" onClick={exportCsv}>⬇ Export differential CSV</button>
        </div>
      )}
      <Callout icon="⚖️">
        <b>{cur}</b> against <b>{cmp}</b>. Every metric across GA4, Search Console, AI referrals and the blog in one place, so period-over-period movement is obvious. Bars are scaled to the biggest relative change on the page.
      </Callout>
      <Card title="Differential analysis" subtitle={`${cur} vs ${cmp}`}>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th className="left">Metric</th>
                <th>{cur}</th>
                <th>{cmp}</th>
                <th>Change</th>
                <th>Change %</th>
                <th style={{ textAlign: 'center' }}>Direction</th>
              </tr>
            </thead>
            {groups.map((g) => (
              <tbody key={g}>
                <tr>
                  <td colSpan={6} className="left" style={{ background: 'var(--surface-2)', fontWeight: 800, fontSize: 11.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-2)' }}>{g}</td>
                </tr>
                {rows.filter((r) => r.group === g).map((r) => {
                  const d = delta(r.current, r.compare);
                  const good = d === null ? true : (d >= 0) !== Boolean(r.invert);
                  const w = d === null ? 80 : Math.max(3, Math.min(80, Math.sqrt(Math.min(Math.abs(d), 5) / maxAbs) * 80));
                  return (
                    <tr key={r.metric} className="diff-row">
                      <td className="metric">{r.metric}{r.note && <span className="small muted"> ({r.note})</span>}</td>
                      <td><b>{r.format(r.current)}</b></td>
                      <td className="dim">{r.format(r.compare)}</td>
                      <td className={d === null ? 'muted' : good ? 'good' : 'bad'}>{r.current - r.compare > 0 ? '+' : ''}{r.format === fmtInt ? fmtInt(r.current - r.compare) : r.format(r.current - r.compare)}</td>
                      <td><Delta current={r.current} compare={r.compare} invert={r.invert} /></td>
                      <td>
                        <span className="diff-track">
                          <span className="l">{!good && d !== null && <span className="diff-bar down" style={{ width: w }} />}</span>
                          <span className="r">{good && <span className="diff-bar up" style={{ width: w }} />}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            ))}
          </table>
        </div>
      </Card>
      <div className="grid grid-2">
        <MoverCard title="Landing pages" up={lp.up} down={lp.down} unit="sessions" print={print} />
        <MoverCard title="Search queries" up={q.up} down={q.down} unit="clicks" print={print} />
        <MoverCard title="Blog posts" up={bp.up} down={bp.down} unit="sessions" print={print} />
        <MoverCard title="Sources / mediums" up={src.up} down={src.down} unit="sessions" print={print} />
      </div>
      <Notes id="differential" print={print} />
    </div>
  );
}

type Mover = { name: string; change: number; pct: number | null };
function MoverCard({ title, up, down, unit, print }: { title: string; up: Mover[]; down: Mover[]; unit: string; print?: boolean }) {
  return (
    <Card title={`${title}: winners & losers`} subtitle={`largest absolute change in ${unit} · ${up.length} up, ${down.length} down`}>
      <div className="winners">
        <div>
          <ExpandableList items={up} print={print} empty="No gainers" render={(x) => (
            <li key={x.name}><span className="name" title={x.name}>{x.name}</span><span className="good nowrap">+{fmtInt(x.change)} <span className="muted small">({x.pct === null ? 'new' : fmtPct(x.pct, 0)})</span></span></li>
          )} />
        </div>
        <div>
          <ExpandableList items={down} print={print} empty="No decliners" render={(x) => (
            <li key={x.name}><span className="name" title={x.name}>{x.name}</span><span className="bad nowrap">{fmtInt(x.change)} <span className="muted small">({fmtPct(x.pct ?? 0, 0)})</span></span></li>
          )} />
        </div>
      </div>
    </Card>
  );
}
