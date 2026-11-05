import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, signToken, cookieHeader, loginPage } from '../src/auth-core.js';

const base = { password: 'hunter2', secret: 's' };

test('no password configured = open', async () => {
  assert.equal((await evaluate({ method: 'GET', pathname: '/', cookieHeader: '', password: '' })).action, 'pass');
});
test('unauthenticated page request gets the login page, api gets login action too', async () => {
  assert.equal((await evaluate({ ...base, method: 'GET', pathname: '/', cookieHeader: '' })).action, 'login');
  assert.equal((await evaluate({ ...base, method: 'GET', pathname: '/api/report', cookieHeader: '' })).action, 'login');
});
test('assets needed by the login page are public', async () => {
  assert.equal((await evaluate({ ...base, method: 'GET', pathname: '/logo.png', cookieHeader: '' })).action, 'pass');
});
test('correct password sets a cookie that then passes; wrong password does not', async () => {
  const ok = await evaluate({ ...base, method: 'POST', pathname: '/login', cookieHeader: '', formPassword: 'hunter2' });
  assert.equal(ok.action, 'set-cookie');
  assert.equal(ok.token, await signToken('hunter2', 's'));
  const cookie = cookieHeader(ok.token).split(';')[0];
  assert.equal((await evaluate({ ...base, method: 'GET', pathname: '/api/report', cookieHeader: cookie })).action, 'pass');
  const bad = await evaluate({ ...base, method: 'POST', pathname: '/login', cookieHeader: '', formPassword: 'nope' });
  assert.equal(bad.action, 'login');
  assert.match(bad.error, /not right/);
  assert.equal((await evaluate({ ...base, method: 'GET', pathname: '/', cookieHeader: 'pl_auth=deadbeef' })).action, 'login');
});
test('changing the secret invalidates old cookies', async () => {
  const token = await signToken('hunter2', 'old');
  assert.equal((await evaluate({ ...base, secret: 'new', method: 'GET', pathname: '/', cookieHeader: `pl_auth=${token}` })).action, 'login');
});
test('login page escapes untrusted values', () => {
  assert.ok(loginPage({ next: '/?x=<script>' }).includes('&lt;script&gt;'));
});
