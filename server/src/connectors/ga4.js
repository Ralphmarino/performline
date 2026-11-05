import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { config } from '../config.js';
import { classifyAi, AI_CHANNEL } from '../ai.js';

let client;
function getClient() {
  if (!client) client = new BetaAnalyticsDataClient(config.googleCredentials());
  return client;
}

const num = (v) => (v === undefined || v === null || v === '' ? 0 : Number(v));

/**
 * Run one GA4 report across both periods. Rows come back flattened:
 * { period: 'current'|'compare', <dimension>: string, <metric>: number }
 */
async function runReport({ periods, dimensions, metrics, dimensionFilter, limit = 10000, orderBys }) {
  const [response] = await getClient().runReport({
    property: `properties/${config.ga4PropertyId}`,
    dateRanges: [
      { startDate: periods.current.start, endDate: periods.current.end, name: 'current' },
      { startDate: periods.compareRange.start, endDate: periods.compareRange.end, name: 'compare' },
    ],
    dimensions: dimensions.map((name) => ({ name })),
    metrics: metrics.map((name) => ({ name })),
    dimensionFilter,
    limit,
    orderBys,
    keepEmptyRows: false,
  });
  const dimNames = (response.dimensionHeaders || []).map((h) => h.name);
  const metNames = (response.metricHeaders || []).map((h) => h.name);
  return (response.rows || []).map((row) => {
    const out = {};
    row.dimensionValues.forEach((v, i) => {
      out[dimNames[i]] = v.value;
    });
    row.metricValues.forEach((v, i) => {
      out[metNames[i]] = num(v.value);
    });
    out.period = out.dateRange === 'compare' ? 'compare' : 'current';
    delete out.dateRange;
    return out;
  });
}

const BASE_METRICS = ['sessions', 'totalUsers', 'newUsers', 'engagedSessions', 'eventCount', 'keyEvents', 'screenPageViews', 'userEngagementDuration'];
const gaDate = (yyyymmdd) => `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;

const renameMetrics = (r) => ({
  sessions: r.sessions,
  users: r.totalUsers,
  newUsers: r.newUsers,
  engagedSessions: r.engagedSessions,
  eventCount: r.eventCount,
  keyEvents: r.keyEvents,
  pageViews: r.screenPageViews,
  engagementSeconds: r.userEngagementDuration,
});

export async function fetchGa4(periods) {
  const keyEventFilter = config.keyEvents.length
    ? { filter: { fieldName: 'eventName', inListFilter: { values: config.keyEvents } } }
    : undefined;

  const [totals, daily, sources, landing, keyEvents, blog, devices] = await Promise.all([
    runReport({ periods, dimensions: [], metrics: BASE_METRICS }),
    runReport({ periods, dimensions: ['date', 'sessionDefaultChannelGroup', 'sessionSource', 'sessionMedium'], metrics: BASE_METRICS, limit: 100000 }),
    runReport({ periods, dimensions: ['sessionDefaultChannelGroup', 'sessionSource', 'sessionMedium'], metrics: BASE_METRICS, limit: 5000 }),
    runReport({ periods, dimensions: ['landingPage', 'sessionDefaultChannelGroup', 'sessionSource', 'sessionMedium'], metrics: BASE_METRICS, limit: 20000 }),
    runReport({ periods, dimensions: ['eventName', 'sessionDefaultChannelGroup', 'sessionSource', 'sessionMedium'], metrics: ['keyEvents'], dimensionFilter: keyEventFilter, limit: 20000 }),
    runReport({
      periods,
      dimensions: ['pagePath', 'pageTitle', 'sessionDefaultChannelGroup', 'sessionSource', 'sessionMedium'],
      metrics: BASE_METRICS,
      dimensionFilter: { filter: { fieldName: 'pagePath', stringFilter: { matchType: 'BEGINS_WITH', value: config.blogPrefix } } },
      limit: 20000,
    }),
    runReport({ periods, dimensions: ['deviceCategory'], metrics: BASE_METRICS }),
  ]);

  // Re-channel AI assistant referrals so the dashboard can treat them as a first-class channel.
  const channelOf = (r) => classifyAi(r.sessionSource, r.sessionMedium, r.sessionDefaultChannelGroup) ? AI_CHANNEL : r.sessionDefaultChannelGroup;
  const engineOf = (r) => classifyAi(r.sessionSource, r.sessionMedium, r.sessionDefaultChannelGroup);

  return {
    totals: totals.map((r) => ({ period: r.period, ...renameMetrics(r) })),
    daily: rollup(daily.map((r) => ({ period: r.period, date: gaDate(r.date), channel: channelOf(r), aiEngine: engineOf(r), ...renameMetrics(r) })), ['period', 'date', 'channel', 'aiEngine']),
    sources: rollup(sources.map((r) => ({ period: r.period, channel: channelOf(r), source: r.sessionSource, medium: r.sessionMedium, aiEngine: engineOf(r), ...renameMetrics(r) })), ['period', 'channel', 'source', 'medium', 'aiEngine']),
    landingPages: rollup(landing.map((r) => ({ period: r.period, landingPage: r.landingPage, channel: channelOf(r), aiEngine: engineOf(r), ...renameMetrics(r) })), ['period', 'landingPage', 'channel', 'aiEngine']),
    keyEvents: rollup(keyEvents.map((r) => ({ period: r.period, eventName: r.eventName, channel: channelOf(r), count: r.keyEvents })), ['period', 'eventName', 'channel']),
    blog: rollup(blog.map((r) => ({ period: r.period, pagePath: r.pagePath, pageTitle: r.pageTitle, channel: channelOf(r), ...renameMetrics(r) })), ['period', 'pagePath', 'pageTitle', 'channel']),
    devices: devices.map((r) => ({ period: r.period, device: r.deviceCategory, ...renameMetrics(r) })),
  };
}

/** Sum numeric fields for rows that share the same key dimensions. */
export function rollup(rows, keys) {
  const map = new Map();
  for (const row of rows) {
    const k = keys.map((key) => row[key] ?? '').join('\u0001');
    const existing = map.get(k);
    if (!existing) {
      const copy = { ...row };
      for (const key of Object.keys(copy)) if (!keys.includes(key) && typeof copy[key] !== 'number') delete copy[key];
      map.set(k, copy);
      continue;
    }
    for (const [key, value] of Object.entries(row)) {
      if (typeof value === 'number' && !keys.includes(key)) existing[key] = (existing[key] || 0) + value;
    }
  }
  return [...map.values()];
}

/** Discover the key events configured on the property (used when GA4_KEY_EVENTS is blank). */
export async function listKeyEvents(periods) {
  const rows = await runReport({ periods, dimensions: ['eventName'], metrics: ['keyEvents'], limit: 500 });
  return [...new Set(rows.filter((r) => r.keyEvents > 0).map((r) => r.eventName))].sort();
}
