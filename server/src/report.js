import { config } from './config.js';
import { TtlCache } from './cache.js';
import { resolvePeriods, PRESETS, COMPARE_MODES, QUICK_VIEWS } from './periods.js';
import { AI_ENGINES, AI_CHANNEL } from './ai.js';

const cache = new TtlCache(config.cacheTtlMs);

async function loadGa4(periods) {
  if (config.mode === 'live') {
    const { fetchGa4 } = await import('./connectors/ga4.js');
    return fetchGa4(periods);
  }
  const { demoGa4 } = await import('./demo/generator.js');
  return demoGa4(periods);
}

async function loadGsc(periods) {
  if (config.mode === 'live') {
    const { fetchGsc } = await import('./connectors/gsc.js');
    return fetchGsc(periods);
  }
  const { demoGsc } = await import('./demo/generator.js');
  return demoGsc(periods);
}

/** Resolve the key event list: explicit config wins, else whatever the data contains. */
function keyEventNames(ga4) {
  const found = [...new Set(ga4.keyEvents.map((r) => r.eventName))];
  if (config.keyEvents.length) return [...new Set([...config.keyEvents, ...found])];
  return found.sort();
}

export function describeConfig() {
  return {
    mode: config.mode,
    modeReason: config.modeReason,
    platform: config.platform,
    pdfExport: config.pdfExport,
    reportMaxAgeHours: config.reportMaxAgeHours,
    brand: config.brand,
    ga4PropertyId: config.mode === 'live' ? config.ga4PropertyId : 'demo',
    gscSiteUrl: config.gscSiteUrl,
    blogPrefix: config.blogPrefix,
    keyEvents: config.keyEvents,
    presets: PRESETS,
    compareModes: COMPARE_MODES,
    quickViews: QUICK_VIEWS,
    aiEngines: AI_ENGINES.map((e) => e.name),
    aiChannel: AI_CHANNEL,
  };
}

const reportKey = (periods) => `${config.mode}|${periods.current.start}_${periods.current.end}|${periods.compareRange.start}_${periods.compareRange.end}`;
const ageHours = (iso) => (Date.now() - new Date(iso).getTime()) / 3_600_000;

/**
 * Build (or serve) the report for a query.
 *  1. in-memory cache (minutes)  2. persistent store (daily refresh)  3. live GA4 + GSC fetch, then stored.
 * Demo data is never stored - it is instant anyway.
 */
export async function buildReport(query, { store = null, refresh = false } = {}) {
  const periods = resolvePeriods(query);
  const key = reportKey(periods);
  if (refresh) cache.store.delete(key);
  return cache.wrap(key, async () => {
    if (store && config.mode === 'live' && !refresh) {
      const stored = await store.get(key);
      if (stored && ageHours(stored.meta.generatedAt) < config.reportMaxAgeHours) return stored;
    }
    const report = await fetchReport(periods);
    if (store && config.mode === 'live') await store.set(key, report);
    return report;
  });
}

/** Pre-build the standard views so the dashboard opens instantly. Called by the daily schedule. */
export async function warmReports({ store = null } = {}) {
  const started = Date.now();
  const results = [];
  for (const view of config.warmViews) {
    const query = QUICK_VIEWS[view] ? { view } : { preset: view };
    try {
      const report = await buildReport(query, { store, refresh: true });
      results.push({ view, ok: true, label: `${report.meta.periods.current.label} vs ${report.meta.periods.compareRange.label}` });
    } catch (err) {
      results.push({ view, ok: false, error: err.message });
    }
  }
  return { refreshedAt: new Date().toISOString(), mode: config.mode, ms: Date.now() - started, results };
}

async function fetchReport(periods) {
    const [ga4, gsc] = await Promise.all([loadGa4(periods), loadGsc(periods)]);
    const channels = [...new Set(ga4.daily.map((r) => r.channel))].sort((a, b) => {
      const sa = ga4.daily.filter((r) => r.channel === a && r.period === 'current').reduce((s, r) => s + r.sessions, 0);
      const sb = ga4.daily.filter((r) => r.channel === b && r.period === 'current').reduce((s, r) => s + r.sessions, 0);
      return sb - sa;
    });
    return {
      meta: {
        generatedAt: new Date().toISOString(),
        mode: config.mode,
        modeReason: config.modeReason,
        brand: config.brand,
        blogPrefix: config.blogPrefix,
        aiChannel: AI_CHANNEL,
        periods,
        channels,
        keyEventNames: keyEventNames(ga4),
      },
      ga4,
      gsc,
    };
}

export const clearCache = () => cache.clear();
