const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

export const fmtInt = (n: number) => nf0.format(Math.round(n || 0));
export const fmtNum = (n: number, digits = 1) => (digits === 2 ? nf2 : digits === 0 ? nf0 : nf1).format(n || 0);
export const fmtCompact = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${nf1.format(n / 1_000_000)}M`;
  if (a >= 10_000) return `${nf0.format(n / 1000)}K`;
  if (a >= 1000) return `${nf1.format(n / 1000)}K`;
  return fmtInt(n);
};
export const fmtPct = (ratio: number, digits = 1) => (Number.isFinite(ratio) ? `${(digits === 0 ? nf0 : nf1).format(ratio * 100)}%` : '-');
export const fmtDelta = (ratio: number | null) => {
  if (ratio === null || !Number.isFinite(ratio)) return 'new';
  const pct = ratio * 100;
  const abs = Math.abs(pct);
  const str = abs >= 1000 ? nf0.format(abs) : nf1.format(abs);
  return `${pct > 0 ? '+' : pct < 0 ? '-' : ''}${str}%`;
};
export const fmtDuration = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0s';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m ? `${m}m ${s.toString().padStart(2, '0')}s` : `${s}s`;
};
export const fmtPosition = (p: number) => (p ? nf1.format(p) : '-');

/** Relative change; null when the baseline is zero (rendered as "new"). */
export const delta = (current: number, compare: number): number | null => (compare ? (current - compare) / compare : current ? null : 0);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const fmtDate = (iso: string, withYear = false) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}${withYear ? `, ${y}` : ''}`;
};
export const fmtMonth = (iso: string) => {
  const [y, m] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${String(y).slice(2)}`;
};

export const pathLabel = (url: string) => {
  try {
    if (url.startsWith('http')) {
      const u = new URL(url);
      return u.pathname + u.search;
    }
  } catch {
    /* fall through */
  }
  return url;
};

export const titleCase = (s: string) => s.replace(/(^|[-_ ])(\w)/g, (_m, sep, c) => `${sep ? ' ' : ''}${c.toUpperCase()}`).trim();
