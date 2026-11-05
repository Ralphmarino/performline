import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolvePeriods, labelRange } from '../src/periods.js';

const today = new Date('2026-11-05T12:00:00Z');

test('month over month = last full month vs the month before', () => {
  const p = resolvePeriods({ view: 'mom' }, today);
  assert.deepEqual([p.current.start, p.current.end], ['2026-10-01', '2026-10-31']);
  assert.deepEqual([p.compareRange.start, p.compareRange.end], ['2026-09-01', '2026-09-30']);
  assert.equal(p.current.label, 'Oct 2026');
});

test('quarter over quarter aligns to full quarters', () => {
  const p = resolvePeriods({ view: 'qoq' }, today);
  assert.deepEqual([p.current.start, p.current.end], ['2026-07-01', '2026-09-30']);
  assert.deepEqual([p.compareRange.start, p.compareRange.end], ['2026-04-01', '2026-06-30']);
  assert.equal(p.current.label, 'Q3 2026');
  assert.equal(p.compareRange.label, 'Q2 2026');
});

test('year over year compares the same month a year earlier', () => {
  const p = resolvePeriods({ view: 'yoy' }, today);
  assert.deepEqual([p.compareRange.start, p.compareRange.end], ['2025-10-01', '2025-10-31']);
});

test('6 months vs 6 months', () => {
  const p = resolvePeriods({ view: 'h6' }, today);
  assert.deepEqual([p.current.start, p.current.end], ['2026-05-01', '2026-10-31']);
  assert.deepEqual([p.compareRange.start, p.compareRange.end], ['2025-11-01', '2026-04-30']);
});

test('month to date compares the same day-span of the prior month', () => {
  const p = resolvePeriods({ preset: 'mtd' }, today);
  assert.deepEqual([p.current.start, p.current.end], ['2026-11-01', '2026-11-04']);
  assert.deepEqual([p.compareRange.start, p.compareRange.end], ['2026-10-01', '2026-10-04']);
});

test('custom range with previous period shifts by the same number of days', () => {
  const p = resolvePeriods({ preset: 'custom', start: '2026-09-10', end: '2026-09-19' }, today);
  assert.deepEqual([p.compareRange.start, p.compareRange.end], ['2026-08-31', '2026-09-09']);
});

test('custom range rejects bad input', () => {
  assert.throws(() => resolvePeriods({ preset: 'custom', start: '2026-09-19', end: '2026-09-10' }, today), /custom preset/);
});

test('labels', () => {
  assert.equal(labelRange({ start: '2026-05-01', end: '2026-10-31' }), 'May 2026 - Oct 2026');
  assert.equal(labelRange({ start: '2026-11-01', end: '2026-11-04' }), 'Nov 1 - Nov 4, 2026');
});
