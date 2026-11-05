export type TabId = 'overview' | 'acquisition' | 'behavior' | 'ai' | 'search' | 'conversions' | 'blog' | 'differential';

export const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'overview', label: 'Executive Summary', icon: '✨' },
  { id: 'acquisition', label: 'Acquisition', icon: '🧭' },
  { id: 'behavior', label: 'Behavior', icon: '👣' },
  { id: 'ai', label: 'AI Visibility', icon: '🤖' },
  { id: 'search', label: 'Search Console', icon: '🔎' },
  { id: 'conversions', label: 'Key Events', icon: '🎯' },
  { id: 'blog', label: 'Blog Tracker', icon: '📝' },
  { id: 'differential', label: 'Differential', icon: '⚖️' },
];

export interface AppState {
  view: string | null; // quick view id (mom|qoq|yoy|h6) or null when preset/compare are explicit
  preset: string;
  compare: string;
  start?: string;
  end?: string;
  tab: TabId;
  disabledChannels: string[];
  /** From a share link's `on=` list; resolved into disabledChannels once the channel list is known. */
  onlyChannels: string[] | null;
  print: boolean;
}

export const defaultState: AppState = { view: 'mom', preset: 'last_month', compare: 'previous_period', tab: 'overview', disabledChannels: [], onlyChannels: null, print: false };

export function readState(search = window.location.search): AppState {
  const q = new URLSearchParams(search);
  const tab = (q.get('tab') as TabId) || 'overview';
  return {
    view: q.get('view') || (q.get('preset') ? null : 'mom'),
    preset: q.get('preset') || 'last_month',
    compare: q.get('compare') || 'previous_period',
    start: q.get('start') || undefined,
    end: q.get('end') || undefined,
    tab: TABS.some((t) => t.id === tab) ? tab : 'overview',
    disabledChannels: (q.get('off') || '').split('|').filter(Boolean),
    onlyChannels: q.get('on') ? q.get('on')!.split('|').filter(Boolean) : null,
    print: q.get('print') === '1',
  };
}

export function stateToSearch(s: AppState, channels: string[] = []): string {
  const q = new URLSearchParams();
  if (s.view) q.set('view', s.view);
  else {
    q.set('preset', s.preset);
    q.set('compare', s.compare);
    if (s.preset === 'custom' && s.start && s.end) {
      q.set('start', s.start);
      q.set('end', s.end);
    }
  }
  if (s.tab !== 'overview') q.set('tab', s.tab);
  if (s.onlyChannels) q.set('on', s.onlyChannels.join('|'));
  else if (s.disabledChannels.length) {
    // Encode whichever list is shorter: `on=Organic Search` beats listing 13 channels as off.
    const on = channels.filter((ch) => !s.disabledChannels.includes(ch));
    if (channels.length && on.length < s.disabledChannels.length) q.set('on', on.join('|'));
    else q.set('off', s.disabledChannels.join('|'));
  }
  const str = q.toString();
  return str ? `?${str}` : '';
}

/** Query string for /api/report - only the period parts. */
export function reportQuery(s: AppState): string {
  const q = new URLSearchParams();
  if (s.view) q.set('view', s.view);
  else {
    q.set('preset', s.preset);
    q.set('compare', s.compare);
    if (s.preset === 'custom' && s.start && s.end) {
      q.set('start', s.start);
      q.set('end', s.end);
    }
  }
  return q.toString();
}
