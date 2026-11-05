import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolvePeriods } from '../src/periods.js';
import { demoGa4, demoGsc } from '../src/demo/generator.js';
import { classifyAi } from '../src/ai.js';

const periods = resolvePeriods({ view: 'mom' }, new Date('2026-11-05T12:00:00Z'));

test('demo GA4 payload is deterministic and well formed', () => {
  const a = demoGa4(periods);
  const b = demoGa4(periods);
  assert.deepEqual(a.totals, b.totals);
  assert.ok(a.daily.length > 0);
  assert.ok(a.daily.every((r) => ['current', 'compare'].includes(r.period) && /^\d{4}-\d{2}-\d{2}$/.test(r.date)));
  assert.ok(a.blog.every((r) => r.pagePath.startsWith('/blog')));
  assert.ok(a.keyEvents.some((r) => r.eventName === 'demo-submission' && r.count > 0));
  assert.ok(a.daily.some((r) => r.channel === 'AI Assistant'));
});

test('demo GSC payload totals reconcile with daily rows', () => {
  const g = demoGsc(periods);
  const cur = g.daily.filter((r) => r.period === 'current').reduce((s, r) => s + r.clicks, 0);
  assert.equal(cur, g.totals.find((t) => t.period === 'current').clicks);
});

test('AI classification', () => {
  assert.equal(classifyAi('chatgpt.com', 'referral', 'Referral'), 'ChatGPT');
  assert.equal(classifyAi('www.perplexity.ai', 'referral', 'Referral'), 'Perplexity');
  assert.equal(classifyAi('google', 'organic', 'Organic Search'), null);
  assert.equal(classifyAi('somebot.example', 'ai-assistant', 'AI Assistant'), 'Somebot');
});
