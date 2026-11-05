import { useEffect, useRef, useState } from 'react';
import type { AppConfig, ReportMeta } from '../lib/types';
import type { AppState } from '../lib/state';
import { getTheme, setTheme, type Theme } from '../lib/theme';
import { Logo } from './Logo';

interface Props {
  config: AppConfig;
  meta: ReportMeta | null;
  state: AppState;
  onState: (patch: Partial<AppState>) => void;
  onExportPdf: () => Promise<void>;
  onPrint: () => void;
  exporting: boolean;
}

export function Header({ config, meta, state, onState, onExportPdf, onPrint, exporting }: Props) {
  const [theme, setThemeState] = useState<Theme>(getTheme());
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    setThemeState(next);
  };
  const quick = Object.entries(config.quickViews);
  const title = state.view ? config.quickViews[state.view]?.label : `${config.presets[state.preset]} vs ${config.compareModes[state.compare].toLowerCase()}`;

  return (
    <>
      <header className="topbar">
        <div className="container">
          <Logo name={config.brand.name} />
          <span className={`mode-pill ${config.mode}`} title={config.modeReason}>{config.mode === 'live' ? 'Live GA4 + GSC' : 'Demo data'}</span>
          <span className="spacer" />
          <div className="row controls">
            <div className="seg" role="tablist" aria-label="Quick comparison">
              {quick.map(([id, v]) => (
                <button key={id} className={state.view === id ? 'active' : ''} onClick={() => onState({ view: id, preset: v.preset, compare: v.compare })}>{v.label}</button>
              ))}
            </div>
            <select value={state.preset} onChange={(e) => onState({ view: null, preset: e.target.value })} aria-label="Period">
              {Object.entries(config.presets).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <select value={state.compare} onChange={(e) => onState({ view: null, compare: e.target.value })} aria-label="Compare to">
              {Object.entries(config.compareModes).map(([k, v]) => (
                <option key={k} value={k}>vs {v}</option>
              ))}
            </select>
            {state.preset === 'custom' && (
              <>
                <input type="date" value={state.start || ''} onChange={(e) => onState({ view: null, start: e.target.value })} aria-label="Start date" />
                <input type="date" value={state.end || ''} onChange={(e) => onState({ view: null, end: e.target.value })} aria-label="End date" />
              </>
            )}
            <button className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title={`${theme === 'dark' ? 'Light' : 'Dark'} mode`} />
            <div className="menu" ref={menuRef}>
              <button className="btn primary" onClick={() => setOpen(!open)} disabled={exporting}>{exporting ? 'Rendering…' : '⬇ Export'}</button>
              {open && (
                <div className="dropdown">
                  <button onClick={() => { setOpen(false); void onExportPdf(); }}>
                    <span>📄</span>
                    <span>Export PDF<small>{config.pdfExport === 'server' ? 'Full report, all sections, rendered server-side' : 'Full report, all sections - choose "Save as PDF" in the print dialog'}</small></span>
                  </button>
                  {config.pdfExport === 'server' && (
                    <button onClick={() => { setOpen(false); onPrint(); }}>
                      <span>🖨️</span>
                      <span>Print<small>Opens the browser print dialog</small></span>
                    </button>
                  )}
                  <button onClick={() => { setOpen(false); void navigator.clipboard?.writeText(window.location.href); }}>
                    <span>🔗</span>
                    <span>Copy share link<small>Keeps period, channels and tab</small></span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      <div className="banner">
        <div className="container">
          <h1>Acquisition &amp; Visibility Report <span style={{ opacity: 0.8 }}>//</span> {title}</h1>
          {meta && (
            <div className="range">
              <b>{meta.periods.current.label}</b> vs {meta.periods.compareRange.label}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
