import { Callout, Card } from '../components/Section';
import { KpiCard } from '../components/KpiCard';
import { CompareBars } from '../components/Charts';
import { DataTable } from '../components/DataTable';
import { Delta } from '../components/DeltaCell';
import { Notes } from '../components/Notes';
import { avgEngagement, engagementRate } from '../lib/compute';
import { fmtInt, fmtPct, fmtDuration } from '../lib/format';
import { labels, type TabProps } from './common';

export function BlogTracker({ report, c, print }: TabProps) {
  const { cur, cmp } = labels(report);
  const b = c.blog;
  const posts = b.posts;
  const maxSessions = Math.max(1, ...posts.map((p) => p.current.sessions));
  const movers = posts.filter((p) => !p.isNew && p.current.sessions + p.compare.sessions > 30).map((p) => ({ p, change: p.current.sessions - p.compare.sessions }));
  const risers = [...movers].sort((a, b2) => b2.change - a.change).slice(0, 6);
  const fallers = [...movers].sort((a, b2) => a.change - b2.change).filter((m) => m.change < 0).slice(0, 6);
  return (
    <div className="stack">
      <div className="grid grid-4">
        <KpiCard label="Blog sessions" current={b.totals.current.sessions} compare={b.totals.compare.sessions} format={fmtInt} compareLabel={cmp} />
        <KpiCard label="Blog users" current={b.totals.current.users} compare={b.totals.compare.users} format={fmtInt} compareLabel={cmp} />
        <KpiCard label="Key events from blog" current={b.totals.current.keyEvents} compare={b.totals.compare.keyEvents} format={fmtInt} compareLabel={cmp} hint="Conversions in sessions that viewed a blog post" />
        <KpiCard label="Share of organic search" current={b.organicShare.current} compare={b.organicShare.compare} format={(n) => fmtPct(n, 0)} compareLabel={cmp} hint="Blog sessions ÷ all Organic Search sessions" />
      </div>
      <Callout icon="📝">
        Tracking <b>{posts.length}</b> posts under <b>{report.meta.blogPrefix}</b>{b.newPosts.length ? <>, including <b>{b.newPosts.length} new</b> this period ({fmtInt(b.newPosts.reduce((s, p) => s + p.current.sessions, 0))} sessions)</> : null}. Average engagement time on the blog is <b>{fmtDuration(avgEngagement(b.totals.current))}</b> with a {fmtPct(engagementRate(b.totals.current), 0)} engagement rate.
      </Callout>
      <div className="grid grid-2">
        <Card title="Blog traffic by channel" subtitle="where readers come from">
          <CompareBars rows={b.channels.slice(0, 8).map((ch) => ({ name: ch.channel, current: ch.current.sessions, compare: ch.compare.sessions }))} currentLabel={cur} compareLabel={cmp} />
        </Card>
        <Card title="Movers" subtitle="biggest session changes (existing posts)">
          <div className="winners">
            <div>
              <div className="small muted" style={{ fontWeight: 700, marginBottom: 6 }}>📈 Rising</div>
              <ul className="mini-list">
                {risers.map(({ p, change }) => (
                  <li key={p.pagePath}><span className="name" title={p.title}>{p.title}</span><span className="good nowrap">+{fmtInt(change)}</span></li>
                ))}
              </ul>
            </div>
            <div>
              <div className="small muted" style={{ fontWeight: 700, marginBottom: 6 }}>📉 Falling</div>
              <ul className="mini-list">
                {fallers.length === 0 && <li className="muted">Nothing falling - nice.</li>}
                {fallers.map(({ p, change }) => (
                  <li key={p.pagePath}><span className="name" title={p.title}>{p.title}</span><span className="bad nowrap">{fmtInt(change)}</span></li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      </div>
      <Card title="Blog post tracker" subtitle="every post with GA4 engagement, Search Console demand and AI referrals - sort any column">
        <DataTable
          rows={posts}
          rowKey={(r) => r.pagePath}
          csvName="blog-posts"
          pageSize={20}
          defaultSort="sessions"
          columns={[
            { key: 'title', label: 'Post', align: 'left', value: (r) => r.title, render: (r) => (<><span className="ellipsis" title={r.pagePath} style={{ maxWidth: 320 }}>{r.title}</span> {r.isNew && <span className="pill new">NEW</span>}<br /><span className="small muted">{r.pagePath.replace(report.meta.blogPrefix, '')} · {r.topChannel}</span></>) },
            { key: 'sessions', label: 'Sessions', value: (r) => r.current.sessions, render: (r) => (<><span className="bar" style={{ width: Math.max(2, (r.current.sessions / maxSessions) * 50) }} />{fmtInt(r.current.sessions)}</>) },
            { key: 'delta', label: 'Δ %', value: (r) => (r.compare.sessions ? (r.current.sessions - r.compare.sessions) / r.compare.sessions : r.current.sessions ? 1e9 : 0), render: (r) => <Delta current={r.current.sessions} compare={r.compare.sessions} /> },
            { key: 'users', label: 'Users', value: (r) => r.current.users, render: (r) => fmtInt(r.current.users) },
            { key: 'views', label: 'Views', value: (r) => r.current.pageViews, render: (r) => fmtInt(r.current.pageViews) },
            { key: 'time', label: 'Avg. time', value: (r) => avgEngagement(r.current), render: (r) => fmtDuration(avgEngagement(r.current)) },
            { key: 'er', label: 'Engaged', value: (r) => engagementRate(r.current), render: (r) => fmtPct(engagementRate(r.current), 0) },
            { key: 'ke', label: 'Key events', value: (r) => r.current.keyEvents, render: (r) => fmtInt(r.current.keyEvents) },
            { key: 'gclicks', label: 'GSC clicks', value: (r) => r.gsc?.current.clicks ?? 0, render: (r) => (r.gsc ? (<>{fmtInt(r.gsc.current.clicks)} <Delta current={r.gsc.current.clicks} compare={r.gsc.compare.clicks} className="small" /></>) : <span className="dim">-</span>) },
            { key: 'gimp', label: 'Impressions', value: (r) => r.gsc?.current.impressions ?? 0, render: (r) => (r.gsc ? fmtInt(r.gsc.current.impressions) : <span className="dim">-</span>) },
            { key: 'ai', label: 'AI sessions', value: (r) => r.aiSessions.current, render: (r) => (r.aiSessions.current ? (<>{fmtInt(r.aiSessions.current)} <Delta current={r.aiSessions.current} compare={r.aiSessions.compare} className="small" /></>) : <span className="dim">-</span>) },
          ]}
        />
      </Card>
      <Notes id="blog" print={print} placeholder="Editorial calendar context: what was published, what was refreshed, what to write next based on striking-distance queries..." />
    </div>
  );
}
