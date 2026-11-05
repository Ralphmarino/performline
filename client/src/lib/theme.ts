import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

export function getTheme(): Theme {
  return (document.documentElement.getAttribute('data-theme') as Theme) || 'light';
}
export function setTheme(t: Theme) {
  document.documentElement.setAttribute('data-theme', t);
  try {
    localStorage.setItem('pl-theme', t);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent('pl-theme'));
}

export interface ThemeColors {
  series: string[];
  compare: string;
  text: string;
  text2: string;
  muted: string;
  grid: string;
  surface: string;
  brand: string;
  good: string;
  bad: string;
  warn: string;
}

function readColors(): ThemeColors {
  const cs = getComputedStyle(document.documentElement);
  const v = (name: string) => cs.getPropertyValue(name).trim();
  return {
    series: [1, 2, 3, 4, 5, 6, 7, 8].map((i) => v(`--series-${i}`)),
    compare: v('--series-compare'),
    text: v('--text'),
    text2: v('--text-2'),
    muted: v('--muted'),
    grid: v('--grid'),
    surface: v('--surface'),
    brand: v('--brand'),
    good: v('--good'),
    bad: v('--bad'),
    warn: v('--warn'),
  };
}

/** Chart colors resolved from the CSS custom properties - SVG attributes cannot read var() directly. */
export function useThemeColors(): ThemeColors & { theme: Theme } {
  const [colors, setColors] = useState(() => ({ ...readColors(), theme: getTheme() }));
  useEffect(() => {
    const update = () => setColors({ ...readColors(), theme: getTheme() });
    window.addEventListener('pl-theme', update);
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', update);
    return () => {
      window.removeEventListener('pl-theme', update);
      mq.removeEventListener('change', update);
    };
  }, []);
  return colors;
}

/** Stable channel -> color assignment: fixed order by the report's channel list, never cycled. */
export function channelColor(channel: string, channels: string[], colors: ThemeColors): string {
  const i = channels.indexOf(channel);
  if (i < 0 || i >= colors.series.length) return colors.muted;
  return colors.series[i];
}
