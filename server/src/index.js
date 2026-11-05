import express from 'express';
import compression from 'compression';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { buildReport, describeConfig, clearCache } from './report.js';
import { renderPdf } from './export.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(compression());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, mode: config.mode, time: new Date().toISOString() }));
app.get('/api/config', (_req, res) => res.json(describeConfig()));

app.get('/api/report', async (req, res, next) => {
  try {
    res.json(await buildReport(req.query));
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
    const { search = '', notes = {}, theme = 'light', filename = 'performline-insights.pdf' } = req.body || {};
    const pdf = await renderPdf({ baseUrl: `http://127.0.0.1:${config.port}/`, search, notes, theme });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/[^\w.-]/g, '_')}"`);
    res.send(pdf);
  } catch (err) {
    next(err);
  }
});

// Serve the built client in production.
const dist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist, { maxAge: '1h', index: false }));
  app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err.message || 'Internal error', status });
});

app.listen(config.port, () => {
  console.log(`PerformLine Insights server on http://localhost:${config.port}  [${config.mode}] ${config.modeReason}`);
});
