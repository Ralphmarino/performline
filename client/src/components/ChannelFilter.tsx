import { useEffect, useMemo, useRef, useState } from 'react';
import { channelColor, useThemeColors } from '../lib/theme';
import { fmtInt, fmtPct } from '../lib/format';

/** Channel groups offered as one-click presets. Matched by name against whatever channels the property reports. */
const PRESETS: { id: string; label: string; match: (ch: string) => boolean }[] = [
  { id: 'organic', label: 'Organic', match: (ch) => /^organic/i.test(ch) },
  { id: 'paid', label: 'Paid', match: (ch) => /^paid|cross-network|display/i.test(ch) },
  { id: 'social', label: 'Social', match: (ch) => /social/i.test(ch) },
  { id: 'search', label: 'Search', match: (ch) => /search/i.test(ch) && !/ai/i.test(ch) },
  { id: 'owned', label: 'Direct & Email', match: (ch) => /^(direct|email|sms|mobile push)/i.test(ch) },
  { id: 'ai', label: 'AI', match: (ch) => /^ai /i.test(ch) },
];

interface Props {
  channels: string[];
  disabled: string[];
  onChange: (next: string[]) => void;
  /** Current-period sessions per channel, shown in the picker. */
  stats?: Record<string, number>;
}

export function ChannelFilter({ channels, disabled, onChange, stats = {} }: Props) {
  const c = useThemeColors();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const enabled = useMemo(() => channels.filter((ch) => !disabled.includes(ch)), [channels, disabled]);
  const total = channels.reduce((s, ch) => s + (stats[ch] || 0), 0) || 1;
  const presets = PRESETS.map((p) => ({ ...p, members: channels.filter(p.match) })).filter((p) => p.members.length);
  const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));
  const activePreset = disabled.length === 0 ? 'all' : presets.find((p) => sameSet(p.members, enabled))?.id || (enabled.length === 1 ? 'one' : 'custom');
  const select = (members: string[]) => onChange(channels.filter((ch) => !members.includes(ch)));
  const only = (ch: string) => select([ch]);
  const toggle = (ch: string) => onChange(disabled.includes(ch) ? disabled.filter((x) => x !== ch) : [...disabled, ch]);

  const summary =
    disabled.length === 0 ? `All ${channels.length} channels` : enabled.length === 1 ? `Only ${enabled[0]}` : enabled.length <= 3 ? enabled.join(' + ') : `${enabled.length} of ${channels.length} channels`;

  return (
    <div className="channel-filter controls" ref={ref}>
      <span className="small muted" style={{ fontWeight: 600 }}>Channels</span>
      <div className="seg">
        <button className={activePreset === 'all' ? 'active' : ''} onClick={() => onChange([])}>All</button>
        {presets.map((p) => (
          <button key={p.id} className={activePreset === p.id ? 'active' : ''} onClick={() => select(p.members)} title={p.members.join(', ')}>{p.label}</button>
        ))}
      </div>
      <button className={`btn sm ${open ? 'open' : ''}`} onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="listbox">
        {summary} ▾
      </button>
      {disabled.length > 0 && !open && (
        <span className="chips">
          {enabled.slice(0, 4).map((ch) => (
            <span key={ch} className="chip static"><span className="dot" style={{ background: channelColor(ch, channels, c) }} />{ch}</span>
          ))}
          {enabled.length > 4 && <span className="small muted">+{enabled.length - 4} more</span>}
        </span>
      )}
      {open && (
        <div className="picker" role="listbox" aria-label="Channels">
          <div className="picker-head">
            <span>{enabled.length} of {channels.length} selected</span>
            <span>
              <button className="link" onClick={() => onChange([])}>All</button>
              <button className="link" onClick={() => onChange([...channels])}>None</button>
              <button className="link" onClick={() => onChange(enabled)}>Invert</button>
            </span>
          </div>
          {channels.map((ch) => {
            const on = !disabled.includes(ch);
            return (
              <div key={ch} className={`picker-row ${on ? '' : 'off'}`}>
                <label>
                  <input type="checkbox" checked={on} onChange={() => toggle(ch)} />
                  <span className="dot" style={{ background: channelColor(ch, channels, c) }} />
                  <span className="name">{ch}</span>
                </label>
                <span className="stat mono">{fmtInt(stats[ch] || 0)} <span className="muted">· {fmtPct((stats[ch] || 0) / total, 0)}</span></span>
                <button className="only" onClick={() => only(ch)}>only</button>
              </div>
            );
          })}
          <div className="picker-foot small muted">Tip: presets above select a whole group in one click.</div>
        </div>
      )}
    </div>
  );
}
