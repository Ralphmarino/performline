/**
 * Runtime-agnostic password gate shared by the Express middleware (Node) and the Netlify Edge Function (Deno).
 * Only Web APIs are used here: crypto.subtle, TextEncoder, URL, Request/Response-free helpers.
 */
export const COOKIE = 'pl_auth';
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
export const PUBLIC_PATHS = ['/logo.png', '/favicon.png', '/login', '/logout', '/api/health'];

const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

/** Deterministic session token: HMAC-SHA256("performline-insights:v1", password + secret). */
export async function signToken(password, secret = '') {
  const key = await crypto.subtle.importKey('raw', enc.encode(`${password}\u0000${secret}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode('performline-insights:v1')));
}

export function timingSafeEqual(a = '', b = '') {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export const isPublicPath = (pathname) => PUBLIC_PATHS.includes(pathname);

export function cookieHeader(token, { secure = true, maxAge = COOKIE_MAX_AGE } = {}) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}

/** Decide what to do with a request. Returns { action: 'pass' | 'login' | 'set-cookie' | 'clear-cookie', ... } */
export async function evaluate({ method, pathname, cookieHeader: cookies, formPassword, password, secret }) {
  if (!password) return { action: 'pass' };
  if (pathname === '/logout') return { action: 'clear-cookie' };
  const expected = await signToken(password, secret);
  if (pathname === '/login' && method === 'POST') {
    if (typeof formPassword === 'string' && timingSafeEqual(formPassword, password)) return { action: 'set-cookie', token: expected };
    return { action: 'login', error: 'That password is not right. Try again.' };
  }
  if (isPublicPath(pathname) && pathname !== '/login') return { action: 'pass' };
  const token = parseCookies(cookies)[COOKIE];
  if (token && timingSafeEqual(token, expected)) return { action: 'pass' };
  return { action: 'login', error: '' };
}

export function loginPage({ error = '', next = '/', brand = 'PerformLine' } = {}) {
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(brand)} Insights - Sign in</title><link rel="icon" href="/favicon.png">
<style>
  :root{color-scheme:light dark;--bg:#f3f6fa;--surface:#fff;--text:#0f1c2e;--muted:#7b8798;--border:#dbe3ec;--brand:#0096d6;--bad:#d93025}
  @media(prefers-color-scheme:dark){:root{--bg:#0a1424;--surface:#0f1c2e;--text:#eef3f8;--muted:#8795a6;--border:#243852;--brand:#00aaed;--bad:#ff7b72}}
  *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--bg);color:var(--text);font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
  .card{width:min(400px,calc(100% - 32px));background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:28px;box-shadow:0 4px 20px rgba(15,28,46,.08)}
  .bar{height:6px;border-radius:6px;background:linear-gradient(90deg,#00aaed,#00cfe7 55%,#5fcc12);margin:-28px -28px 24px;border-radius:16px 16px 0 0}
  img{height:34px;display:block}h1{font-size:18px;margin:18px 0 4px}p{margin:0 0 18px;color:var(--muted);font-size:13.5px}
  label{font-size:12.5px;font-weight:600;display:block;margin-bottom:6px}
  input{width:100%;font:inherit;padding:11px 12px;border:1px solid var(--border);border-radius:10px;background:var(--bg);color:var(--text)}
  input:focus{outline:2px solid var(--brand);outline-offset:-1px}
  button{margin-top:14px;width:100%;font:inherit;font-weight:700;padding:11px;border:0;border-radius:10px;background:var(--brand);color:#fff;cursor:pointer}
  .err{color:var(--bad);font-size:13px;margin:10px 0 0}
</style></head><body>
<form class="card" method="post" action="/login">
  <div class="bar"></div>
  <img src="/logo.png" alt="${esc(brand)}">
  <h1>Acquisition &amp; Visibility Report</h1>
  <p>This report is private. Enter the team password to continue.</p>
  <label for="pw">Password</label>
  <input id="pw" name="password" type="password" autocomplete="current-password" autofocus required>
  <input type="hidden" name="next" value="${esc(next)}">
  <button type="submit">Open report</button>
  ${error ? `<div class="err">${esc(error)}</div>` : ''}
</form></body></html>`;
}
