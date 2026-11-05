import type { Computed } from './compute';
import { conversionRate, engagementRate } from './compute';
import { delta, fmtDelta, fmtInt, fmtPct, fmtNum } from './format';
import type { ReportMeta } from './types';

export type InsightKind = 'win' | 'watch' | 'opportunity' | 'note';
export interface Insight { kind: InsightKind; icon: string; title: string; detail: string }
export interface Summary {
  score: number;
  grade: string;
  mood: string;
  headline: string;
  narrative: string;
  insights: Insight[];
  drivers: { channel: string; change: number }[];
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const d = (p: { current: number; compare: number }) => delta(p.current, p.compare);
const safe = (x: number | null) => (x === null || !Number.isFinite(x) ? 0 : x);
const upDown = (x: number | null) => (x === null ? 'is new' : x > 0.005 ? `up ${fmtDelta(x)}` : x < -0.005 ? `down ${fmtDelta(x).replace('-', '')}` : 'flat');

export function buildSummary(c: Computed, meta: ReportMeta): Summary {
  const k = c.kpis;
  const cmpLabel = meta.periods.compareRange.label;
  const insights: Insight[] = [];

  const dS = d(k.sessions), dU = d(k.users), dKE = d(k.keyEvents), dCR = d(k.conversionRate), dER = d(k.engagementRate);
  const dClicks = d(k.gscClicks), dImp = d(k.gscImpressions), dCtr = d(k.gscCtr), dAI = d(k.aiSessions);
  const posChange = k.gscPosition.compare ? k.gscPosition.compare - k.gscPosition.current : 0; // positive = improved

  /* score */
  const parts: [number | null, number][] = [[dS, 0.22], [dU, 0.08], [dKE, 0.25], [dCR, 0.08], [dClicks, 0.15], [dAI, 0.1], [dER, 0.07], [posChange / 10, 0.05]];
  const score = Math.round(clamp(50 + parts.reduce((s, [v, w]) => s + w * clamp(safe(v) / 0.3, -1, 1) * 50, 0), 0, 100));
  const grade = score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : score >= 40 ? 'D' : 'F';
  const mood = score >= 80 ? '🚀' : score >= 65 ? '😊' : score >= 50 ? '😐' : score >= 35 ? '😬' : '🧯';

  /* channel drivers */
  const drivers = c.channels
    .map((ch) => ({ channel: ch.channel, change: ch.current.sessions - ch.compare.sessions, pct: d({ current: ch.current.sessions, compare: ch.compare.sessions }) }))
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  const gainers = drivers.filter((x) => x.change > 0);
  const losers = drivers.filter((x) => x.change < 0);
  const totalChange = Math.abs(k.sessions.current - k.sessions.compare) || 1;

  if (gainers[0] && gainers[0].change / totalChange > 0.15) {
    insights.push({ kind: 'win', icon: '📈', title: `${gainers[0].channel} led growth`, detail: `+${fmtInt(gainers[0].change)} sessions (${fmtDelta(gainers[0].pct)}) vs ${cmpLabel}${gainers[1] ? `, followed by ${gainers[1].channel} (+${fmtInt(gainers[1].change)})` : ''}.` });
  }
  if (losers[0] && Math.abs(losers[0].change) / totalChange > 0.15) {
    insights.push({ kind: 'watch', icon: '📉', title: `${losers[0].channel} slipped`, detail: `${fmtInt(losers[0].change)} sessions (${fmtDelta(losers[0].pct)}) vs ${cmpLabel}. Worth checking campaign pacing or tracking for this channel.` });
  }

  /* conversions */
  const topEvent = [...c.keyEvents].sort((a, b) => b.current - a.current)[0];
  if (dKE !== null && dS !== null) {
    if (dKE - dS > 0.05) insights.push({ kind: 'win', icon: '🎯', title: 'Converting more efficiently', detail: `Key events ${upDown(dKE)} while sessions are ${upDown(dS)}; conversion rate moved from ${fmtPct(k.conversionRate.compare, 2)} to ${fmtPct(k.conversionRate.current, 2)}.` });
    else if (dS - dKE > 0.05 && k.sessions.current > k.sessions.compare) insights.push({ kind: 'watch', icon: '🪣', title: 'Traffic grew faster than conversions', detail: `Sessions ${upDown(dS)} but key events only ${upDown(dKE)}. The new traffic is lower intent - check landing-page fit and whether the growth is from low-engagement channels.` });
  }
  if (topEvent && topEvent.current) {
    const demo = c.keyEvents.find((e) => /demo/i.test(e.eventName));
    const ev = demo && demo.current ? demo : topEvent;
    insights.push({ kind: ev.current >= ev.compare ? 'win' : 'watch', icon: '🏁', title: `${ev.eventName}: ${fmtInt(ev.current)} (${fmtDelta(d(ev))})`, detail: `Top converting channel for ${ev.eventName}: ${topChannelFor(ev.byChannel)}.` });
  }

  /* AI */
  if (k.aiSessions.current || k.aiSessions.compare) {
    const aiCr = conversionRate(c.ai.totals.current);
    const siteCr = conversionRate(c.ai.siteTotals.current);
    const topEngine = c.ai.engines[0];
    insights.push({
      kind: safe(dAI) >= 0 ? 'win' : 'watch',
      icon: '🤖',
      title: `AI assistant referrals ${upDown(dAI)}`,
      detail: `${fmtInt(k.aiSessions.current)} sessions, ${fmtPct(k.aiShare.current)} of all traffic${topEngine ? `; ${topEngine.engine} sends ${fmtPct(c.ai.totals.current.sessions ? topEngine.current.sessions / c.ai.totals.current.sessions : 0, 0)} of it` : ''}.${aiCr > siteCr * 1.3 && c.ai.totals.current.sessions > 20 ? ` AI visitors convert at ${fmtPct(aiCr, 2)} vs ${fmtPct(siteCr, 2)} site-wide - ${fmtNum(aiCr / siteCr)}x better.` : ''}`,
    });
  }

  /* Search Console */
  if (k.gscClicks.current || k.gscClicks.compare) {
    if (dImp !== null && dCtr !== null && dImp > 0.05 && dCtr < -0.05) {
      insights.push({ kind: 'watch', icon: '🫥', title: 'More impressions, fewer clicks per impression', detail: `Impressions ${upDown(dImp)} but CTR ${upDown(dCtr)} (${fmtPct(k.gscCtr.compare, 2)} to ${fmtPct(k.gscCtr.current, 2)}). Typical of AI Overviews and zero-click results - track which queries lost CTR.` });
    } else {
      insights.push({ kind: safe(dClicks) >= 0 ? 'win' : 'watch', icon: '🔎', title: `Organic clicks ${upDown(dClicks)}`, detail: `${fmtInt(k.gscClicks.current)} clicks from ${fmtInt(k.gscImpressions.current)} impressions; average position ${fmtNum(k.gscPosition.current)} (${posChange >= 0 ? 'improved' : 'dropped'} ${fmtNum(Math.abs(posChange))}).` });
    }
    const striking = c.gsc.queries.filter((q) => !q.branded && q.current.position >= 4 && q.current.position <= 15 && q.current.impressions > 200).sort((a, b) => b.current.impressions - a.current.impressions).slice(0, 3);
    if (striking.length) insights.push({ kind: 'opportunity', icon: '🎣', title: 'Striking-distance keywords', detail: `${striking.map((q) => `"${q.query}" (pos ${fmtNum(q.current.position)}, ${fmtInt(q.current.impressions)} impr.)`).join(', ')} - small on-page lifts here move real clicks.` });
    const rising = c.gsc.queries.filter((q) => !q.branded && q.compare.clicks >= 5).map((q) => ({ q, ch: d({ current: q.current.clicks, compare: q.compare.clicks }) })).sort((a, b) => safe(b.ch) - safe(a.ch))[0];
    if (rising && safe(rising.ch) > 0.25) insights.push({ kind: 'win', icon: '🌱', title: `"${rising.q.query}" is climbing`, detail: `Clicks ${upDown(rising.ch)} to ${fmtInt(rising.q.current.clicks)} with position ${fmtNum(rising.q.current.position)}.` });
  }

  /* landing pages */
  const movers = c.landingPages.filter((p) => p.current.sessions + p.compare.sessions > 40).map((p) => ({ p, change: p.current.sessions - p.compare.sessions, pct: d({ current: p.current.sessions, compare: p.compare.sessions }) })).sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  const riser = movers.find((m) => m.change > 0);
  const faller = movers.find((m) => m.change < 0);
  if (riser && riser.change / totalChange > 0.1) {
    const suspicious = (riser.pct !== null && riser.pct > 5) || engagementRate(riser.p.current) < 0.2 || /privacy|not set|login/.test(riser.p.landingPage);
    insights.push(
      suspicious
        ? { kind: 'watch', icon: '🕵️', title: `Unusual spike on ${riser.p.landingPage}`, detail: `+${fmtInt(riser.change)} sessions (${fmtDelta(riser.pct)}) with ${fmtPct(engagementRate(riser.p.current), 0)} engagement, mostly ${riser.p.topChannel}. Looks like bot or referral-spam traffic - consider a GA4 filter before reading the totals.` }
        : { kind: 'win', icon: '🏄', title: `${riser.p.landingPage} is pulling more visitors`, detail: `+${fmtInt(riser.change)} sessions (${fmtDelta(riser.pct)}), mostly from ${riser.p.topChannel}.` },
    );
  }
  if (faller && Math.abs(faller.change) / totalChange > 0.1) insights.push({ kind: 'watch', icon: '🧊', title: `${faller.p.landingPage} is cooling off`, detail: `${fmtInt(faller.change)} sessions (${fmtDelta(faller.pct)}). Check rankings, internal links and whether a campaign ended.` });

  /* blog */
  if (c.blog.posts.length) {
    const dBlog = d(k.blogSessions);
    const top = c.blog.posts[0];
    insights.push({ kind: safe(dBlog) >= 0 ? 'win' : 'watch', icon: '📝', title: `Blog traffic ${upDown(dBlog)}`, detail: `${fmtInt(k.blogSessions.current)} blog sessions, ${fmtPct(c.blog.organicShare.current, 0)} of organic search lands on the blog. Top post: "${top.title}" (${fmtInt(top.current.sessions)}).${c.blog.newPosts.length ? ` ${c.blog.newPosts.length} new post${c.blog.newPosts.length > 1 ? 's' : ''} picked up ${fmtInt(c.blog.newPosts.reduce((s, p) => s + p.current.sessions, 0))} sessions.` : ''}` });
  }

  /* engagement */
  if (dER !== null && dER < -0.1) {
    const unassigned = c.channels.find((ch) => ch.channel === 'Unassigned');
    const un = unassigned ? d({ current: unassigned.current.sessions, compare: unassigned.compare.sessions }) : null;
    insights.push({ kind: 'watch', icon: '🫠', title: 'Engagement rate fell', detail: `${fmtPct(k.engagementRate.compare, 0)} to ${fmtPct(k.engagementRate.current, 0)}.${un !== null && un > 0.2 ? ` Unassigned traffic is ${upDown(un)}, which usually means untagged campaigns or bots dragging the average down.` : ' Review which channels brought the least-engaged sessions.'}` });
  } else if (dER !== null && dER > 0.08) insights.push({ kind: 'win', icon: '💪', title: 'Visitors are more engaged', detail: `Engagement rate climbed from ${fmtPct(k.engagementRate.compare, 0)} to ${fmtPct(k.engagementRate.current, 0)}.` });

  const newShare = k.sessions.current ? k.newUsers.current / k.users.current : 0;
  insights.push({ kind: 'note', icon: '🧑‍🤝‍🧑', title: `${fmtPct(newShare, 0)} of users were new`, detail: `${fmtInt(k.newUsers.current)} new users out of ${fmtInt(k.users.current)}${c.usersApprox ? ' (approximate while channels are filtered)' : ''}.` });

  /* headline + narrative */
  const driverText = gainers.length && safe(dS) >= 0 ? `driven by ${gainers.slice(0, 2).map((g) => g.channel).join(' and ')}` : losers.length && safe(dS) < 0 ? `with ${losers.slice(0, 2).map((g) => g.channel).join(' and ')} down the most` : '';
  const headline = `Sessions ${upDown(dS)} vs ${cmpLabel}${driverText ? `, ${driverText}` : ''}`;
  const narrative = `${meta.periods.current.label} brought ${fmtInt(k.sessions.current)} sessions from ${fmtInt(k.users.current)} users (${upDown(dU)}), generating ${fmtInt(k.keyEvents.current)} key events (${upDown(dKE)}). Organic search delivered ${fmtInt(k.gscClicks.current)} clicks (${upDown(dClicks)}) and AI assistants sent ${fmtInt(k.aiSessions.current)} sessions (${upDown(dAI)}), now ${fmtPct(k.aiShare.current)} of all traffic. Engagement rate sits at ${fmtPct(k.engagementRate.current, 0)}.`;

  const order: InsightKind[] = ['win', 'watch', 'opportunity', 'note'];
  insights.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
  return { score, grade, mood, headline, narrative, insights, drivers: drivers.slice(0, 5) };
}

function topChannelFor(byChannel: Record<string, { current: number }>) {
  const e = Object.entries(byChannel).sort((a, b) => b[1].current - a[1].current)[0];
  return e ? `${e[0]} (${fmtInt(e[1].current)})` : '-';
}
