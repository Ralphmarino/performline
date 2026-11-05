import { google } from 'googleapis';
import { config } from '../config.js';

let client;
function getClient() {
  if (!client) {
    const auth = new google.auth.GoogleAuth({
      ...config.googleCredentials(),
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });
    client = google.searchconsole({ version: 'v1', auth });
  }
  return client;
}

async function query({ start, end, dimensions = [], rowLimit = 1000, type = 'web' }) {
  const res = await getClient().searchanalytics.query({
    siteUrl: config.gscSiteUrl,
    requestBody: { startDate: start, endDate: end, dimensions, rowLimit, type, dataState: 'final' },
  });
  return (res.data.rows || []).map((r) => ({
    keys: r.keys || [],
    clicks: r.clicks || 0,
    impressions: r.impressions || 0,
    ctr: r.ctr || 0,
    position: r.position || 0,
  }));
}

async function both(periods, opts, mapRow) {
  const [cur, cmp] = await Promise.all([
    query({ start: periods.current.start, end: periods.current.end, ...opts }),
    query({ start: periods.compareRange.start, end: periods.compareRange.end, ...opts }),
  ]);
  return [...cur.map((r) => ({ period: 'current', ...mapRow(r) })), ...cmp.map((r) => ({ period: 'compare', ...mapRow(r) }))];
}

const metrics = (r) => ({ clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position });

export async function fetchGsc(periods) {
  const [totals, daily, queries, pages, devices, countries] = await Promise.all([
    both(periods, { dimensions: [] }, (r) => metrics(r)),
    both(periods, { dimensions: ['date'] }, (r) => ({ date: r.keys[0], ...metrics(r) })),
    both(periods, { dimensions: ['query'], rowLimit: 2000 }, (r) => ({ query: r.keys[0], ...metrics(r) })),
    both(periods, { dimensions: ['page'], rowLimit: 2000 }, (r) => ({ page: r.keys[0], ...metrics(r) })),
    both(periods, { dimensions: ['device'] }, (r) => ({ device: r.keys[0], ...metrics(r) })),
    both(periods, { dimensions: ['country'], rowLimit: 50 }, (r) => ({ country: r.keys[0], ...metrics(r) })),
  ]);
  return { totals, daily, queries, pages, devices, countries };
}
