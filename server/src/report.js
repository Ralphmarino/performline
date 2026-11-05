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

export async function buildReport(query) {
  const periods = resolvePeriods(query);
  const key = JSON.stringify([config.mode, periods.current, periods.compareRange]);
  return cache.wrap(key, async () => {
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
  });
}

export const clearCache = () => cache.clear();
