/**
 * Netlify Scheduled Function: rebuild the standard report views from GA4 + Search Console every day
 * and store them in Netlify Blobs, so the dashboard always opens with yesterday's complete data.
 * Schedule is UTC; 10:00 UTC = after Google has finalised the previous day in most time zones.
 */
import * as blobs from '@netlify/blobs';
import { warmReports } from '../../server/src/report.js';
import { createStore } from '../../server/src/store.js';

export default async () => {
  const result = await warmReports({ store: createStore({ blobs }) });
  console.log('daily refresh', JSON.stringify(result));
  return new Response(JSON.stringify(result), { headers: { 'content-type': 'application/json' } });
};

export const config = { schedule: '0 10 * * *' };
