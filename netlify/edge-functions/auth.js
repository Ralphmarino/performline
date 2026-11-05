/**
 * Netlify Edge Function: password gate for the whole site (pages, assets and /api/*).
 * Set SITE_PASSWORD in the site's environment variables to enable it; unset = open.
 * Works on every Netlify plan (no Site Protection add-on needed).
 */
import { evaluate, loginPage, cookieHeader, COOKIE } from '../../server/src/auth-core.js';

const env = (key) => globalThis.Netlify?.env?.get(key) ?? globalThis.process?.env?.[key] ?? '';

export default async (request, context) => {
  const password = env('SITE_PASSWORD');
  if (!password) return context.next();
  const url = new URL(request.url);
  let formPassword;
  let nextPath = '/';
  if (request.method === 'POST' && url.pathname === '/login') {
    const form = await request.formData();
    formPassword = form.get('password');
    const n = form.get('next');
    if (typeof n === 'string' && n.startsWith('/') && !n.startsWith('//')) nextPath = n;
  }
  const result = await evaluate({ method: request.method, pathname: url.pathname, cookieHeader: request.headers.get('cookie') || '', formPassword, password, secret: env('SESSION_SECRET') });

  if (result.action === 'pass') return context.next();
  if (result.action === 'set-cookie') {
    return new Response(null, { status: 303, headers: { location: nextPath, 'set-cookie': cookieHeader(result.token, { secure: url.protocol === 'https:' }) } });
  }
  if (result.action === 'clear-cookie') {
    return new Response(null, { status: 303, headers: { location: '/login', 'set-cookie': `${COOKIE}=; Path=/; Max-Age=0` } });
  }
  if (url.pathname.startsWith('/api/')) {
    return new Response(JSON.stringify({ error: 'Sign in required', status: 401 }), { status: 401, headers: { 'content-type': 'application/json' } });
  }
  const next = request.method === 'GET' && url.pathname !== '/login' ? url.pathname + url.search : nextPath;
  const status = url.pathname === '/login' && request.method === 'POST' ? 401 : 200;
  return new Response(loginPage({ error: result.error, next, brand: env('BRAND_NAME') || 'PerformLine' }), { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
};

export const config = { path: '/*' };
