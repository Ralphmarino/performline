import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

const env = (key, fallback) => (process.env[key] === undefined || process.env[key] === '' ? fallback : process.env[key]);

const DEFAULT_KEY_EVENTS = ['demo-submission', 'form_submit', 'form_start', 'file_download', 'click', 'purchase'];

function hasCredentials() {
  if (env('GOOGLE_SERVICE_ACCOUNT_JSON')) return true;
  const p = env('GOOGLE_APPLICATION_CREDENTIALS');
  return Boolean(p && fs.existsSync(path.resolve(p)));
}

const requestedMode = env('DATA_MODE', 'demo').toLowerCase();
const liveReady = hasCredentials() && env('GA4_PROPERTY_ID') && env('GSC_SITE_URL');
const mode = requestedMode === 'live' && liveReady ? 'live' : 'demo';
const modeReason =
  requestedMode === 'live' && !liveReady
    ? 'DATA_MODE=live requested but credentials, GA4_PROPERTY_ID or GSC_SITE_URL are missing - serving demo data instead'
    : requestedMode === 'live'
      ? 'Live Google Analytics 4 + Search Console data'
      : 'Demo data (set DATA_MODE=live with credentials to connect GA4 + GSC)';

export const config = {
  port: Number(env('PORT', 8787)),
  mode,
  modeReason,
  cacheTtlMs: Number(env('CACHE_TTL_MINUTES', 15)) * 60 * 1000,
  ga4PropertyId: env('GA4_PROPERTY_ID', ''),
  gscSiteUrl: env('GSC_SITE_URL', 'sc-domain:performline.com'),
  keyEvents: env('GA4_KEY_EVENTS', DEFAULT_KEY_EVENTS.join(','))
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  blogPrefix: env('BLOG_PATH_PREFIX', '/blog'),
  brand: {
    name: env('BRAND_NAME', 'PerformLine'),
    site: env('BRAND_SITE', 'https://performline.com'),
  },
  googleCredentials() {
    const inline = env('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (inline) return { credentials: JSON.parse(inline) };
    const p = env('GOOGLE_APPLICATION_CREDENTIALS');
    if (p) return { keyFile: path.resolve(p) };
    return {};
  },
};
