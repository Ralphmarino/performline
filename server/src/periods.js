/**
 * Period maths shared by live + demo modes.
 * All dates are ISO strings (YYYY-MM-DD) and all arithmetic is done in UTC to avoid DST surprises.
 */
const MS_DAY = 86_400_000;

export const PRESETS = {
  mtd: 'Month to date',
  last_month: 'Last full month',
  last_3_months: 'Last 3 months',
  qtd: 'Quarter to date',
  last_quarter: 'Last full quarter',
  last_6_months: 'Last 6 months',
  ytd: 'Year to date',
  last_12_months: 'Last 12 months',
  custom: 'Custom range',
};

export const COMPARE_MODES = {
  previous_period: 'Previous period',
  previous_year: 'Same period last year',
};

/** Quick buttons shown in the UI, mapped to preset + compare mode. */
export const QUICK_VIEWS = {
  mom: { label: 'Month over Month', preset: 'last_month', compare: 'previous_period' },
  qoq: { label: 'Quarter over Quarter', preset: 'last_quarter', compare: 'previous_period' },
  yoy: { label: 'Year over Year', preset: 'last_month', compare: 'previous_year' },
  h6: { label: '6 Months vs 6 Months', preset: 'last_6_months', compare: 'previous_period' },
};

export const toISO = (d) => d.toISOString().slice(0, 10);
export const fromISO = (s) => new Date(`${s}T00:00:00Z`);
export const addDays = (d, n) => new Date(d.getTime() + n * MS_DAY);
export const addMonths = (d, n) => {
  // Clamp the day so Oct 31 - 1 month is Sep 30, not Oct 1.
  const first = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(d.getUTCDate(), last));
  return first;
};
export const startOfMonth = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
export const endOfMonth = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
export const startOfQuarter = (d) => new Date(Date.UTC(d.getUTCFullYear(), Math.floor(d.getUTCMonth() / 3) * 3, 1));
export const daysBetween = (a, b) => Math.round((fromISO(b) - fromISO(a)) / MS_DAY) + 1;

export function* eachDay(start, end) {
  for (let d = fromISO(start); d <= fromISO(end); d = addDays(d, 1)) yield toISO(d);
}

const isValidISO = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(fromISO(s).getTime());

/**
 * Resolve the current reporting window for a preset.
 * `today` is the anchor; GA4 data for today is partial so the window ends yesterday.
 */
export function resolveCurrent(preset, { today = new Date(), start, end } = {}) {
  const t = fromISO(toISO(today));
  const yesterday = addDays(t, -1);
  switch (preset) {
    case 'mtd': {
      const s = startOfMonth(t);
      // On the 1st there is no MTD data yet - fall back to the previous full month.
      if (yesterday < s) return { start: toISO(startOfMonth(addMonths(t, -1))), end: toISO(endOfMonth(addMonths(t, -1))), aligned: 'month' };
      return { start: toISO(s), end: toISO(yesterday), aligned: 'month-partial' };
    }
    case 'last_month': {
      const lm = addMonths(startOfMonth(t), -1);
      return { start: toISO(lm), end: toISO(endOfMonth(lm)), aligned: 'month' };
    }
    case 'last_3_months': {
      const s = addMonths(startOfMonth(t), -3);
      return { start: toISO(s), end: toISO(endOfMonth(addMonths(startOfMonth(t), -1))), aligned: 'month' };
    }
    case 'qtd': {
      const s = startOfQuarter(t);
      if (yesterday < s) {
        const lq = addMonths(s, -3);
        return { start: toISO(lq), end: toISO(endOfMonth(addMonths(lq, 2))), aligned: 'month' };
      }
      return { start: toISO(s), end: toISO(yesterday), aligned: 'month-partial' };
    }
    case 'last_quarter': {
      const lq = addMonths(startOfQuarter(t), -3);
      return { start: toISO(lq), end: toISO(endOfMonth(addMonths(lq, 2))), aligned: 'month' };
    }
    case 'last_6_months': {
      const s = addMonths(startOfMonth(t), -6);
      return { start: toISO(s), end: toISO(endOfMonth(addMonths(startOfMonth(t), -1))), aligned: 'month' };
    }
    case 'ytd': {
      const s = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
      if (yesterday < s) return { start: toISO(new Date(Date.UTC(t.getUTCFullYear() - 1, 0, 1))), end: toISO(new Date(Date.UTC(t.getUTCFullYear() - 1, 11, 31))), aligned: 'month' };
      return { start: toISO(s), end: toISO(yesterday), aligned: 'month-partial' };
    }
    case 'last_12_months': {
      const s = addMonths(startOfMonth(t), -12);
      return { start: toISO(s), end: toISO(endOfMonth(addMonths(startOfMonth(t), -1))), aligned: 'month' };
    }
    case 'custom': {
      if (!isValidISO(start) || !isValidISO(end) || fromISO(start) > fromISO(end)) {
        throw Object.assign(new Error('custom preset needs valid start/end (YYYY-MM-DD, start <= end)'), { status: 400 });
      }
      return { start, end, aligned: 'none' };
    }
    default:
      throw Object.assign(new Error(`unknown preset "${preset}"`), { status: 400 });
  }
}

/** Resolve the comparison window for an already-resolved current window. */
export function resolveCompare(current, compareMode) {
  const s = fromISO(current.start);
  const e = fromISO(current.end);
  if (compareMode === 'previous_year') {
    return { start: toISO(addMonths(s, -12)), end: toISO(addMonths(e, -12)) };
  }
  // previous_period
  const length = daysBetween(current.start, current.end);
  if (current.aligned === 'month' || current.aligned === 'month-partial') {
    // Shift by the number of whole months the window spans; keeps "Oct 1-4 vs Sep 1-4" and "Q3 vs Q2" intact.
    const months = (e.getUTCFullYear() - s.getUTCFullYear()) * 12 + (e.getUTCMonth() - s.getUTCMonth()) + 1;
    const cs = addMonths(s, -months);
    const ce = current.aligned === 'month' ? endOfMonth(addMonths(startOfMonth(e), -months)) : addDays(cs, length - 1);
    return { start: toISO(cs), end: toISO(ce) };
  }
  return { start: toISO(addDays(s, -length)), end: toISO(addDays(s, -1)) };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function labelRange({ start, end }) {
  const s = fromISO(start);
  const e = fromISO(end);
  const sameYear = s.getUTCFullYear() === e.getUTCFullYear();
  const full = s.getUTCDate() === 1 && toISO(endOfMonth(e)) === end;
  if (full && s.getUTCMonth() === e.getUTCMonth() && sameYear) return `${MONTHS[s.getUTCMonth()]} ${s.getUTCFullYear()}`;
  if (full && sameYear && s.getUTCMonth() % 3 === 0 && e.getUTCMonth() - s.getUTCMonth() === 2) return `Q${s.getUTCMonth() / 3 + 1} ${s.getUTCFullYear()}`;
  if (full) return `${MONTHS[s.getUTCMonth()]} ${s.getUTCFullYear()} - ${MONTHS[e.getUTCMonth()]} ${e.getUTCFullYear()}`;
  const fmt = (d, year) => `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}${year ? `, ${d.getUTCFullYear()}` : ''}`;
  return `${fmt(s, !sameYear)} - ${fmt(e, true)}`;
}

export function resolvePeriods(query, today = new Date()) {
  let preset = query.preset || 'last_month';
  let compare = query.compare || 'previous_period';
  if (query.view && QUICK_VIEWS[query.view]) {
    preset = QUICK_VIEWS[query.view].preset;
    compare = QUICK_VIEWS[query.view].compare;
  }
  if (!PRESETS[preset]) throw Object.assign(new Error(`unknown preset "${preset}"`), { status: 400 });
  if (!COMPARE_MODES[compare]) throw Object.assign(new Error(`unknown compare mode "${compare}"`), { status: 400 });
  const current = resolveCurrent(preset, { today, start: query.start, end: query.end });
  const prior = resolveCompare(current, compare);
  return {
    preset,
    compare,
    current: { start: current.start, end: current.end, label: labelRange(current), days: daysBetween(current.start, current.end) },
    compareRange: { start: prior.start, end: prior.end, label: labelRange(prior), days: daysBetween(prior.start, prior.end) },
  };
}
