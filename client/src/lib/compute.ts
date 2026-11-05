import type { BlogRow, GscMetrics, Metrics, Pair, Report } from './types';
import { fmtDate, fmtMonth, pathLabel } from './format';

export const EMPTY_METRICS: Metrics = { sessions: 0, users: 0, newUsers: 0, engagedSessions: 0, eventCount: 0, keyEvents: 0, pageViews: 0, engagementSeconds: 0 };
export const EMPTY_GSC = { clicks: 0, impressions: 0, posWeighted: 0 };
const METRIC_KEYS = Object.keys(EMPTY_METRICS) as (keyof Metrics)[];

export function addMetrics(a: Metrics, b: Metrics): Metrics {
  const out = { ...a };
  for (const k of METRIC_KEYS) out[k] += b[k] || 0;
  return out;
}
export const sumMetrics = (rows: Metrics[]) => rows.reduce(addMetrics, { ...EMPTY_METRICS });

export const engagementRate = (m: Metrics) => (m.sessions ? m.engagedSessions / m.sessions : 0);
export const conversionRate = (m: Metrics) => (m.sessions ? m.keyEvents / m.sessions : 0);
export const avgEngagement = (m: Metrics) => (m.sessions ? m.engagementSeconds / m.sessions : 0);

export interface MetricPair { current: Metrics; compare: Metrics }
export interface GscAgg { clicks: number; impressions: number; ctr: number; position: number }
export interface GscPair { current: GscAgg; compare: GscAgg }

export type Granularity = 'day' | 'week' | 'month';
export interface Bucket {
  idx: number;
  label: string;
  currentDate: string;
  compareDate: string;
  current: Metrics;
  compare: Metrics;
  currentGsc: GscAgg;
  compareGsc: GscAgg;
  currentAi: number;
  compareAi: number;
  channels: Record<string, number>; // current-period sessions by channel
  currentDays: number;
  compareDays: number;
  fullDays: number; // expected days for a complete bucket (1 / 7 / days in month)
}

export interface ChannelAgg extends MetricPair { channel: string }
export interface SourceAgg extends MetricPair { source: string; medium: string; channel: string }
export interface LandingAgg extends MetricPair { landingPage: string; topChannel: string }
export interface EngineAgg extends MetricPair { engine: string }
export interface KeyEventAgg { eventName: string; current: number; compare: number; byChannel: Record<string, Pair> }
export interface BlogPost extends MetricPair { pagePath: string; title: string; topChannel: string; isNew: boolean; gsc: GscPair | null; aiSessions: Pair }
export interface QueryAgg extends GscPair { query: string; branded: boolean }
export interface PageAgg extends GscPair { page: string; path: string }

export interface Kpis {
  sessions: Pair; users: Pair; newUsers: Pair; engagedSessions: Pair; engagementRate: Pair; eventCount: Pair; keyEvents: Pair; conversionRate: Pair;
  pageViews: Pair; pagesPerSession: Pair; avgEngagement: Pair; gscClicks: Pair; gscImpressions: Pair; gscCtr: Pair; gscPosition: Pair; aiSessions: Pair; aiShare: Pair; aiKeyEvents: Pair; blogSessions: Pair;
}

export interface Computed {
  enabled: Set<string>;
  allEnabled: boolean;
  usersApprox: boolean;
  kpis: Kpis;
  granularity: Granularity;
  buckets: Bucket[];
  channels: ChannelAgg[];
  sources: SourceAgg[];
  landingPages: LandingAgg[];
  keyEvents: KeyEventAgg[];
  keyEventsByChannel: { channel: string; total: Pair; events: Record<string, Pair> }[];
  devices: { device: string; current: Metrics; compare: Metrics }[];
  ai: { enabled: boolean; engines: EngineAgg[]; landingPages: (LandingAgg & { engines: string[] })[]; totals: MetricPair; siteTotals: MetricPair };
  blog: { posts: BlogPost[]; totals: MetricPair; newPosts: BlogPost[]; organicShare: Pair; channels: ChannelAgg[] };
  gsc: { totals: GscPair; queries: QueryAgg[]; pages: PageAgg[]; devices: { device: string; current: GscAgg; compare: GscAgg }[]; countries: { country: string; current: GscAgg; compare: GscAgg }[]; branded: GscPair; nonBranded: GscPair };
}

const pair = (c: number, p: number): Pair => ({ current: c, compare: p });
const toAgg = (clicks: number, impressions: number, posWeighted: number): GscAgg => ({ clicks, impressions, ctr: impressions ? clicks / impressions : 0, position: impressions ? posWeighted / impressions : 0 });
const gscSum = (rows: GscMetrics[]): GscAgg => {
  let clicks = 0, impressions = 0, posW = 0;
  for (const r of rows) {
    clicks += r.clicks;
    impressions += r.impressions;
    posW += r.position * r.impressions;
  }
  return toAgg(clicks, impressions, posW);
};

function* eachDay(start: string, end: string) {
  const d = new Date(`${start}T00:00:00Z`);
  const e = new Date(`${end}T00:00:00Z`);
  for (; d <= e; d.setUTCDate(d.getUTCDate() + 1)) yield d.toISOString().slice(0, 10);
}
const daysInMonth = (iso: string) => {
  const [y, m] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};
const monthIndex = (iso: string, base: string) => {
  const [y, m] = iso.split('-').map(Number);
  const [by, bm] = base.split('-').map(Number);
  return (y - by) * 12 + (m - bm);
};

const BRAND_TERMS = ['performline', 'perform line', 'comply summit', 'performline comply'];

function groupBy<T, K extends string>(rows: T[], key: (r: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>();
  for (const r of rows) {
    const k = key(r);
    const arr = m.get(k);
    if (arr) arr.push(r);
    else m.set(k, [r]);
  }
  return m;
}

function pairMetrics<T extends Metrics & { period: string }>(rows: T[]): MetricPair {
  return { current: sumMetrics(rows.filter((r) => r.period === 'current')), compare: sumMetrics(rows.filter((r) => r.period === 'compare')) };
}
function pairGsc<T extends GscMetrics & { period: string }>(rows: T[]): GscPair {
  return { current: gscSum(rows.filter((r) => r.period === 'current')), compare: gscSum(rows.filter((r) => r.period === 'compare')) };
}
const topChannelOf = (rows: { channel: string; sessions: number; period: string }[]) => {
  const totals = new Map<string, number>();
  for (const r of rows) if (r.period === 'current') totals.set(r.channel, (totals.get(r.channel) || 0) + r.sessions);
  return [...totals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '';
};

export function compute(report: Report, disabledChannels: string[]): Computed {
  const { meta, ga4, gsc } = report;
  const enabled = new Set(meta.channels.filter((c) => !disabledChannels.includes(c)));
  const allEnabled = enabled.size === meta.channels.length;
  const on = <T extends { channel: string }>(rows: T[]) => (allEnabled ? rows : rows.filter((r) => enabled.has(r.channel)));

  const daily = on(ga4.daily);
  const totalsBase = pairMetrics(daily);
  // Users de-duplicate across channels/days only in the property-level totals - use those when nothing is filtered.
  const totals: MetricPair = allEnabled
    ? { current: ga4.totals.find((t) => t.period === 'current') || totalsBase.current, compare: ga4.totals.find((t) => t.period === 'compare') || totalsBase.compare }
    : totalsBase;

  /* ---------------- buckets (aligned by index between periods) */
  const cur = meta.periods.current;
  const cmp = meta.periods.compareRange;
  const granularity: Granularity = cur.days <= 62 ? 'day' : cur.days <= 200 ? 'week' : 'month';
  const bucketOf = (iso: string, start: string, idx: number) => (granularity === 'day' ? idx : granularity === 'week' ? Math.floor(idx / 7) : monthIndex(iso, start));
  const buckets: Bucket[] = [];
  const ensure = (b: number, currentDate: string, compareDate: string) => {
    while (buckets.length <= b) {
      const i = buckets.length;
      buckets.push({ idx: i, label: '', currentDate: '', compareDate: '', current: { ...EMPTY_METRICS }, compare: { ...EMPTY_METRICS }, currentGsc: toAgg(0, 0, 0), compareGsc: toAgg(0, 0, 0), currentAi: 0, compareAi: 0, channels: {}, currentDays: 0, compareDays: 0, fullDays: 1 });
    }
    const bk = buckets[b];
    if (currentDate) {
      if (!bk.currentDate) bk.currentDate = currentDate;
      bk.currentDays += 1;
    }
    if (compareDate) {
      if (!bk.compareDate) bk.compareDate = compareDate;
      bk.compareDays += 1;
    }
    return bk;
  };
  const curDays = [...eachDay(cur.start, cur.end)];
  const cmpDays = [...eachDay(cmp.start, cmp.end)];
  curDays.forEach((d, i) => ensure(bucketOf(d, cur.start, i), d, ''));
  cmpDays.forEach((d, i) => ensure(bucketOf(d, cmp.start, i), '', d));
  const curIdx = new Map(curDays.map((d, i) => [d, bucketOf(d, cur.start, i)]));
  const cmpIdx = new Map(cmpDays.map((d, i) => [d, bucketOf(d, cmp.start, i)]));
  const bucketFor = (r: { period: string; date: string }) => (r.period === 'current' ? curIdx.get(r.date) : cmpIdx.get(r.date));

  for (const r of daily) {
    const b = bucketFor(r);
    if (b === undefined) continue;
    const bk = buckets[b];
    if (r.period === 'current') {
      bk.current = addMetrics(bk.current, r);
      bk.channels[r.channel] = (bk.channels[r.channel] || 0) + r.sessions;
      if (r.channel === meta.aiChannel) bk.currentAi += r.sessions;
    } else {
      bk.compare = addMetrics(bk.compare, r);
      if (r.channel === meta.aiChannel) bk.compareAi += r.sessions;
    }
  }
  const gscBucketTmp = buckets.map(() => ({ c: { ...EMPTY_GSC }, p: { ...EMPTY_GSC } }));
  for (const r of gsc.daily) {
    const b = bucketFor(r);
    if (b === undefined) continue;
    const t = r.period === 'current' ? gscBucketTmp[b].c : gscBucketTmp[b].p;
    t.clicks += r.clicks;
    t.impressions += r.impressions;
    t.posWeighted += r.position * r.impressions;
  }
  buckets.forEach((bk, i) => {
    bk.currentGsc = toAgg(gscBucketTmp[i].c.clicks, gscBucketTmp[i].c.impressions, gscBucketTmp[i].c.posWeighted);
    bk.compareGsc = toAgg(gscBucketTmp[i].p.clicks, gscBucketTmp[i].p.impressions, gscBucketTmp[i].p.posWeighted);
    bk.label = granularity === 'day' ? fmtDate(bk.currentDate || bk.compareDate) : granularity === 'week' ? `Wk ${i + 1}` : fmtMonth(bk.currentDate || bk.compareDate);
    bk.fullDays = granularity === 'day' ? 1 : granularity === 'week' ? 7 : daysInMonth(bk.currentDate || bk.compareDate);
  });

  /* ---------------- channels / sources / landing pages */
  const channels: ChannelAgg[] = [...groupBy(daily, (r) => r.channel)].map(([channel, rows]) => ({ channel, ...pairMetrics(rows) })).sort((a, b) => b.current.sessions - a.current.sessions);
  const sources: SourceAgg[] = [...groupBy(on(ga4.sources), (r) => `${r.channel}\u0001${r.source}\u0001${r.medium}`)]
    .map(([, rows]) => ({ source: rows[0].source, medium: rows[0].medium, channel: rows[0].channel, ...pairMetrics(rows) }))
    .sort((a, b) => b.current.sessions - a.current.sessions);
  const landingPages: LandingAgg[] = [...groupBy(on(ga4.landingPages), (r) => r.landingPage)]
    .map(([landingPage, rows]) => ({ landingPage, topChannel: topChannelOf(rows), ...pairMetrics(rows) }))
    .sort((a, b) => b.current.sessions - a.current.sessions);

  /* ---------------- key events */
  const keRows = on(ga4.keyEvents);
  const keyEvents: KeyEventAgg[] = meta.keyEventNames.map((eventName) => {
    const rows = keRows.filter((r) => r.eventName === eventName);
    const byChannel: Record<string, Pair> = {};
    for (const r of rows) {
      byChannel[r.channel] ||= pair(0, 0);
      byChannel[r.channel][r.period] += r.count;
    }
    return { eventName, current: rows.filter((r) => r.period === 'current').reduce((s, r) => s + r.count, 0), compare: rows.filter((r) => r.period === 'compare').reduce((s, r) => s + r.count, 0), byChannel };
  });
  const keyEventsByChannel = channels.map((c) => {
    const events: Record<string, Pair> = {};
    const total = pair(0, 0);
    for (const ke of keyEvents) {
      const p = ke.byChannel[c.channel] || pair(0, 0);
      events[ke.eventName] = p;
      total.current += p.current;
      total.compare += p.compare;
    }
    return { channel: c.channel, total, events };
  });

  /* ---------------- AI */
  const aiRows = ga4.daily.filter((r) => r.channel === meta.aiChannel);
  const aiSourceRows = ga4.sources.filter((r) => r.channel === meta.aiChannel);
  const engines: EngineAgg[] = [...groupBy(aiSourceRows, (r) => r.aiEngine || r.source)].map(([engine, rows]) => ({ engine, ...pairMetrics(rows) })).sort((a, b) => b.current.sessions - a.current.sessions);
  const aiLanding = [...groupBy(ga4.landingPages.filter((r) => r.channel === meta.aiChannel), (r) => r.landingPage)]
    .map(([landingPage, rows]) => ({ landingPage, topChannel: meta.aiChannel, engines: [...new Set(rows.map((r) => r.aiEngine).filter(Boolean) as string[])], ...pairMetrics(rows) }))
    .sort((a, b) => b.current.sessions - a.current.sessions);
  const aiTotals = pairMetrics(aiRows);
  const siteTotals = pairMetrics(ga4.daily);

  /* ---------------- blog */
  const gscPageByPath = new Map<string, (GscMetrics & { period: 'current' | 'compare' })[]>();
  for (const p of gsc.pages) {
    const path = pathLabel(p.page).replace(/\/$/, '') || '/';
    const arr = gscPageByPath.get(path) || [];
    arr.push(p);
    gscPageByPath.set(path, arr);
  }
  const blogRows = on(ga4.blog);
  const blogAiByPath = groupBy(ga4.landingPages.filter((r) => r.channel === meta.aiChannel && r.landingPage.startsWith(meta.blogPrefix)), (r) => r.landingPage);
  const posts: BlogPost[] = [...groupBy(blogRows, (r) => r.pagePath)].map(([pagePath, rows]) => {
    const pm = pairMetrics(rows);
    const titleRow = rows.find((r) => r.period === 'current') || rows[0];
    const g = gscPageByPath.get(pagePath.replace(/\/$/, '') || '/');
    const ai = blogAiByPath.get(pagePath) || [];
    return {
      pagePath,
      title: cleanTitle(titleRow.pageTitle, meta.brand.name),
      topChannel: topChannelOf(rows),
      isNew: pm.compare.sessions === 0 && pm.current.sessions > 0,
      gsc: g ? pairGsc(g) : null,
      aiSessions: pair(ai.filter((r) => r.period === 'current').reduce((s, r) => s + r.sessions, 0), ai.filter((r) => r.period === 'compare').reduce((s, r) => s + r.sessions, 0)),
      ...pm,
    };
  }).sort((a, b) => b.current.sessions - a.current.sessions);
  const blogTotals = pairMetrics(blogRows);
  const blogChannels: ChannelAgg[] = [...groupBy(blogRows, (r: BlogRow) => r.channel)].map(([channel, rows]) => ({ channel, ...pairMetrics(rows) })).sort((a, b) => b.current.sessions - a.current.sessions);
  const organicBlog = blogChannels.find((c) => c.channel === 'Organic Search');
  const organicAll = channels.find((c) => c.channel === 'Organic Search');

  /* ---------------- GSC */
  const gscTotals: GscPair = {
    current: gsc.totals.find((t) => t.period === 'current') || gscSum(gsc.daily.filter((d) => d.period === 'current')),
    compare: gsc.totals.find((t) => t.period === 'compare') || gscSum(gsc.daily.filter((d) => d.period === 'compare')),
  };
  const queries: QueryAgg[] = [...groupBy(gsc.queries, (r) => r.query)].map(([query, rows]) => ({ query, branded: BRAND_TERMS.some((b) => query.toLowerCase().includes(b)), ...pairGsc(rows) })).sort((a, b) => b.current.clicks - a.current.clicks);
  const pages: PageAgg[] = [...groupBy(gsc.pages, (r) => r.page)].map(([page, rows]) => ({ page, path: pathLabel(page), ...pairGsc(rows) })).sort((a, b) => b.current.clicks - a.current.clicks);
  const branded = pairGsc(gsc.queries.filter((q) => BRAND_TERMS.some((b) => q.query.toLowerCase().includes(b))));
  const nonBranded = pairGsc(gsc.queries.filter((q) => !BRAND_TERMS.some((b) => q.query.toLowerCase().includes(b))));
  const gscDevices = [...groupBy(gsc.devices, (r) => r.device)].map(([device, rows]) => ({ device, ...pairGsc(rows) }));
  const gscCountries = [...groupBy(gsc.countries, (r) => r.country)].map(([country, rows]) => ({ country, ...pairGsc(rows) })).sort((a, b) => b.current.clicks - a.current.clicks);
  const devices = [...groupBy(ga4.devices, (r) => r.device)].map(([device, rows]) => ({ device, ...pairMetrics(rows) }));

  const m = (f: (x: Metrics) => number) => pair(f(totals.current), f(totals.compare));
  const kpis: Kpis = {
    sessions: m((x) => x.sessions),
    users: m((x) => x.users),
    newUsers: m((x) => x.newUsers),
    engagedSessions: m((x) => x.engagedSessions),
    engagementRate: m(engagementRate),
    eventCount: m((x) => x.eventCount),
    keyEvents: m((x) => x.keyEvents),
    conversionRate: m(conversionRate),
    pageViews: m((x) => x.pageViews),
    pagesPerSession: m((x) => (x.sessions ? x.pageViews / x.sessions : 0)),
    avgEngagement: m(avgEngagement),
    gscClicks: pair(gscTotals.current.clicks, gscTotals.compare.clicks),
    gscImpressions: pair(gscTotals.current.impressions, gscTotals.compare.impressions),
    gscCtr: pair(gscTotals.current.ctr, gscTotals.compare.ctr),
    gscPosition: pair(gscTotals.current.position, gscTotals.compare.position),
    aiSessions: pair(aiTotals.current.sessions, aiTotals.compare.sessions),
    aiShare: pair(siteTotals.current.sessions ? aiTotals.current.sessions / siteTotals.current.sessions : 0, siteTotals.compare.sessions ? aiTotals.compare.sessions / siteTotals.compare.sessions : 0),
    aiKeyEvents: pair(aiTotals.current.keyEvents, aiTotals.compare.keyEvents),
    blogSessions: pair(blogTotals.current.sessions, blogTotals.compare.sessions),
  };

  return {
    enabled,
    allEnabled,
    usersApprox: !allEnabled,
    kpis,
    granularity,
    buckets,
    channels,
    sources,
    landingPages,
    keyEvents,
    keyEventsByChannel,
    devices,
    ai: { enabled: enabled.has(meta.aiChannel), engines, landingPages: aiLanding, totals: aiTotals, siteTotals },
    blog: {
      posts,
      totals: blogTotals,
      newPosts: posts.filter((p) => p.isNew),
      organicShare: pair(organicAll?.current.sessions ? (organicBlog?.current.sessions || 0) / organicAll.current.sessions : 0, organicAll?.compare.sessions ? (organicBlog?.compare.sessions || 0) / organicAll.compare.sessions : 0),
      channels: blogChannels,
    },
    gsc: { totals: gscTotals, queries, pages, devices: gscDevices, countries: gscCountries, branded, nonBranded },
  };
}

function cleanTitle(title: string, brand: string) {
  return (title || '').replace(new RegExp(`\\s*[|\\-–]\\s*${brand}\\s*$`, 'i'), '').trim() || title;
}

/** Partial buckets (a trailing half-week, a month still in progress) are blanked so they don't read as a crash. */
const complete = (days: number, full: number) => days > 0 && (full === 1 || days >= full);
export const seriesOf = (buckets: Bucket[], pick: (m: Metrics) => number) =>
  buckets.map((b) => ({ idx: b.idx, label: b.label, currentDate: b.currentDate, compareDate: b.compareDate, current: complete(b.currentDays, b.fullDays) ? pick(b.current) : null, compare: complete(b.compareDays, b.fullDays) ? pick(b.compare) : null }));
export const gscSeriesOf = (buckets: Bucket[], pick: (m: GscAgg) => number) =>
  buckets.map((b) => ({ idx: b.idx, label: b.label, currentDate: b.currentDate, compareDate: b.compareDate, current: complete(b.currentDays, b.fullDays) ? pick(b.currentGsc) : null, compare: complete(b.compareDays, b.fullDays) ? pick(b.compareGsc) : null }));
export const completeBuckets = (buckets: Bucket[]) => buckets.filter((b) => complete(b.currentDays, b.fullDays));
