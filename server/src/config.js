import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

const env = (key, fallback) => (process.env[key] === undefined || process.env[key] === '' ? fallback : process.env[key]);

const DEFAULT_KEY_EVENTS = ['demo-submission', 'form_submit', 'form_start', 'file_download', 'click', 'purchase'];

function inlineCredentials() {
  const raw = env('GOOGLE_SERVICE_ACCOUNT_JSON');
  if (raw) return raw;
  const b64 = env('GOOGLE_SERVICE_ACCOUNT_JSON_BASE64');
  return b64 ? Buffer.from(b64, 'base64').toString('utf8') : '';
}

function hasCredentials() {
  if (inlineCredentials()) return true;
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

const isNetlify = env('NETLIFY') === 'true';

export const config = {
  port: Number(env('PORT', 8787)),
  mode,
  modeReason,
  platform: isNetlify ? 'netlify' : 'node',
  // Password protection for the whole report (blank = open). Netlify enforces it in netlify/edge-functions/auth.js.
  sitePassword: env('SITE_PASSWORD', ''),
  sessionSecret: env('SESSION_SECRET', ''),
  // Chromium cannot run inside a Netlify Function; the UI then uses the browser's print-to-PDF with the same layout.
  pdfExport: env('PDF_EXPORT', isNetlify ? 'browser' : 'server'),
  // Stored reports older than this are refreshed from GA4 / GSC on the next request.
  reportMaxAgeHours: Number(env('REPORT_MAX_AGE_HOURS', 24)),
  // Views the daily refresh pre-builds so the dashboard opens instantly.
  warmViews: env('WARM_VIEWS', 'mom,qoq,yoy,h6,mtd,last_12_months').split(',').map((s) => s.trim()).filter(Boolean),
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
    const inline = inlineCredentials();
    if (inline) return { credentials: JSON.parse(inline) };
    const p = env('GOOGLE_APPLICATION_CREDENTIALS');
    if (p) return { keyFile: path.resolve(p) };
    return {};
  },
};
