import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchConfig, fetchReport, downloadPdf } from './lib/api';
import type { AppConfig, Report } from './lib/types';
import { readState, stateToSearch, reportQuery, type AppState, type TabId } from './lib/state';
import { compute } from './lib/compute';
import { buildSummary } from './lib/summary';
import { getTheme, setTheme } from './lib/theme';
import { Header } from './components/Header';
import { Tabs } from './components/Tabs';
import { ChannelFilter } from './components/ChannelFilter';
import { loadNotes } from './components/Notes';
import { PrintView } from './PrintView';
import { Overview, Acquisition, Behavior, AiVisibility, SearchConsole, Conversions, BlogTracker, Differential } from './tabs';

const TAB_COMPONENTS = { overview: Overview, acquisition: Acquisition, behavior: Behavior, ai: AiVisibility, search: SearchConsole, conversions: Conversions, blog: BlogTracker, differential: Differential } as const;

export default function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [state, setState] = useState<AppState>(() => readState());
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchConfig().then(setConfig).catch((e) => setError(e.message));
  }, []);

  // Sync URL with state so views are shareable and the PDF renderer can reproduce them.
  useEffect(() => {
    if (state.print) return;
    const next = stateToSearch(state);
    if (next !== window.location.search) window.history.replaceState(null, '', `${window.location.pathname}${next}`);
  }, [state]);

  const query = reportQuery(state);
  useEffect(() => {
    if (state.preset === 'custom' && !(state.start && state.end)) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchReport(query)
      .then((r) => {
        if (cancelled) return;
        setReport(r);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [query, state.preset, state.start, state.end]);

  const patch = useCallback((p: Partial<AppState>) => setState((s) => ({ ...s, ...p })), []);
  const onPeriod = useCallback((p: { view: string | null; preset: string; compare: string }) => {
    setState((s) => {
      if (p.view && config?.quickViews[p.view]) return { ...s, view: p.view, preset: config.quickViews[p.view].preset, compare: config.quickViews[p.view].compare };
      return { ...s, view: null, preset: p.preset || s.preset, compare: p.compare || s.compare };
    });
  }, [config]);

  const computed = useMemo(() => (report ? compute(report, state.disabledChannels) : null), [report, state.disabledChannels]);
  const summary = useMemo(() => (report && computed ? buildSummary(computed, report.meta) : null), [report, computed]);

  const onExportPdf = async () => {
    setExporting(true);
    try {
      const label = report ? `${report.meta.periods.current.label} vs ${report.meta.periods.compareRange.label}` : 'report';
      await downloadPdf(stateToSearch(state), loadNotes(), getTheme(), `PerformLine Insights - ${label}.pdf`.replace(/[^\w .-]/g, ''));
    } catch (e: any) {
      if (e.status === 501) {
        alert('Server-side PDF rendering is not available on this deployment - opening the browser print dialog instead. Choose "Save as PDF".');
        onPrint();
      } else alert(`PDF export failed: ${e.message}`);
    } finally {
      setExporting(false);
    }
  };
  const onPrint = () => {
    const url = `${window.location.pathname}${stateToSearch(state)}${stateToSearch(state) ? '&' : '?'}print=1&theme=${getTheme()}`;
    const w = window.open(url, '_blank');
    if (!w) alert('Pop-up blocked - allow pop-ups for this site to print.');
  };

  useEffect(() => {
    if (state.print) {
      const t = new URLSearchParams(window.location.search).get('theme');
      if (t === 'light' || t === 'dark') setTheme(t);
      const onReady = () => {
        if (!(window as any).__PRINT_THEME) setTimeout(() => window.print(), 1500);
      };
      if (document.readyState === 'complete') onReady();
      else window.addEventListener('load', onReady);
      return () => window.removeEventListener('load', onReady);
    }
  }, [state.print]);

  if (error && !report) return <div className="container"><div className="error" style={{ marginTop: 40 }}>⚠️ {error}</div></div>;
  if (!config || !report || !computed || !summary) {
    return (
      <div className="loading">
        <div className="spinner" />
        <div>Loading PerformLine Insights…</div>
      </div>
    );
  }

  const tabProps = { report, c: computed, summary, onState: onPeriod };
  if (state.print) return <PrintView {...tabProps} />;

  const Active = TAB_COMPONENTS[state.tab];
  return (
    <div className="app">
      <Header config={config} meta={report.meta} state={state} onState={patch} onExportPdf={onExportPdf} onPrint={onPrint} exporting={exporting} />
      <Tabs active={state.tab} onChange={(tab: TabId) => patch({ tab })} />
      <main className="main">
        <div className="container stack">
          <div className="row spread">
            <ChannelFilter channels={report.meta.channels} disabled={state.disabledChannels} onChange={(d) => patch({ disabledChannels: d })} />
            <span className="small muted no-print">{loading ? 'Refreshing…' : `${report.meta.mode === 'demo' ? 'Demo data' : 'Live data'} · updated ${new Date(report.meta.generatedAt).toLocaleTimeString()}`}</span>
          </div>
          {error && <div className="error">⚠️ {error}</div>}
          <div key={state.tab} style={{ opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s' }}>
            <Active {...tabProps} />
          </div>
        </div>
      </main>
      <footer className="footer container">
        {config.brand.name} Insights · GA4 property {config.ga4PropertyId} · Search Console {config.gscSiteUrl} · {config.modeReason}
      </footer>
    </div>
  );
}
