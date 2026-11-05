import { channelColor, useThemeColors } from '../lib/theme';

export function ChannelFilter({ channels, disabled, onChange }: { channels: string[]; disabled: string[]; onChange: (next: string[]) => void }) {
  const c = useThemeColors();
  const toggle = (ch: string) => onChange(disabled.includes(ch) ? disabled.filter((x) => x !== ch) : [...disabled, ch]);
  const only = (ch: string) => onChange(channels.filter((x) => x !== ch));
  return (
    <div className="chips controls">
      <span className="small muted" style={{ fontWeight: 600, marginRight: 4 }}>Channels</span>
      {channels.map((ch) => {
        const off = disabled.includes(ch);
        return (
          <button key={ch} className={`chip ${off ? 'off' : ''}`} onClick={() => toggle(ch)} onDoubleClick={() => only(ch)} title={`Click to toggle ${ch}. Double-click to show only ${ch}.`} aria-pressed={!off}>
            <span className="dot" style={{ background: channelColor(ch, channels, c) }} />
            {ch}
          </button>
        );
      })}
      {disabled.length > 0 && <button className="link" onClick={() => onChange([])}>Reset</button>}
    </div>
  );
}
