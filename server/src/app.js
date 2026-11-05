import express from 'express';
import compression from 'compression';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { buildReport, describeConfig, clearCache, warmReports } from './report.js';

const __dirname = import.meta.url ? path.dirname(fileURLToPath(import.meta.url)) : process.cwd(); // import.meta.url is undefined in Netlify's CommonJS bundle

/**
 * Build the Express app. Used by the standalone server (src/index.js) and by the Netlify Function
 * (netlify/functions/api.js), which wraps it with serverless-http and serves no static files.
 */
export function createApp({ serveStatic = true, store = null } = {}) {
  const app = express();
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => res.json({ ok: true, mode: config.mode, platform: config.platform, time: new Date().toISOString() }));
  app.get('/api/config', (_req, res) => res.json(describeConfig()));

  app.get('/api/report', async (req, res, next) => {
    try {
      const refresh = req.query.refresh === '1';
      res.json(await buildReport(req.query, { store, refresh }));
    } catch (err) {
      next(err);
    }
  });

  // Re-fetch the standard views from GA4 / GSC and store them (what the daily schedule does).
  app.post('/api/refresh', async (_req, res, next) => {
    try {
      res.json(await warmReports({ store }));
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/cache/clear', (_req, res) => {
    clearCache();
    res.json({ ok: true });
  });

  app.post('/api/export/pdf', async (req, res, next) => {
    try {
      if (config.pdfExport !== 'server') {
        const err = new Error('Server-side PDF rendering is not available on this host - use the browser print fallback');
        err.status = 501;
        throw err;
      }
      const { renderPdf } = await import('./export.js');
      const { search = '', notes = {}, theme = 'light', filename = 'performline-insights.pdf' } = req.body || {};
      const pdf = await renderPdf({ baseUrl: `http://127.0.0.1:${config.port}/`, search, notes, theme });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/[^\w.-]/g, '_')}"`);
      res.send(pdf);
    } catch (err) {
      next(err);
    }
  });

  if (serveStatic) {
    const dist = path.resolve(__dirname, '../../client/dist');
    if (fs.existsSync(dist)) {
      app.use(express.static(dist, { maxAge: '1h', index: false }));
      app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
    }
  }

  app.use((err, _req, res, _next) => {
    const status = err.status || 500;
    if (status >= 500 && status !== 501) console.error(err);
    res.status(status).json({ error: err.message || 'Internal error', status });
  });

  return app;
}
