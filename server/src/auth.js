import express from 'express';
import { evaluate, loginPage, cookieHeader, COOKIE } from './auth-core.js';

/**
 * Express password gate. Enabled when SITE_PASSWORD is set; protects the dashboard and the API.
 * The Netlify deployment uses netlify/edge-functions/auth.js instead (same core, same cookie).
 */
export function passwordGate({ password = process.env.SITE_PASSWORD || '', secret = process.env.SESSION_SECRET || '', brand = 'PerformLine' } = {}) {
  const form = express.urlencoded({ extended: false });
  const safeNext = (n) => (typeof n === 'string' && n.startsWith('/') && !n.startsWith('//') ? n : '/');
  return [
    form,
    async (req, res, next) => {
      try {
        const secure = req.secure || req.headers['x-forwarded-proto'] === 'https';
        const result = await evaluate({ method: req.method, pathname: req.path, cookieHeader: req.headers.cookie, formPassword: req.body?.password, password, secret });
        if (result.action === 'pass') return next();
        if (result.action === 'set-cookie') {
          res.setHeader('Set-Cookie', cookieHeader(result.token, { secure }));
          return res.redirect(303, safeNext(req.body?.next));
        }
        if (result.action === 'clear-cookie') {
          res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; Max-Age=0`);
          return res.redirect(303, '/login');
        }
        if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Sign in required', status: 401 });
        const nextUrl = req.method === 'GET' && req.path !== '/login' ? req.originalUrl : safeNext(req.body?.next);
        return res.status(req.path === '/login' && req.method === 'POST' ? 401 : 200).type('html').send(loginPage({ error: result.error, next: nextUrl, brand }));
      } catch (err) {
        next(err);
      }
    },
  ];
}
