import { useEffect } from 'react';
import { TABS } from './lib/state';
import type { TabProps } from './tabs/common';
import { Overview, Acquisition, Behavior, AiVisibility, SearchConsole, Conversions, BlogTracker, Differential } from './tabs';
import { Logo } from './components/Logo';

const COMPONENTS = { overview: Overview, acquisition: Acquisition, behavior: Behavior, ai: AiVisibility, search: SearchConsole, conversions: Conversions, blog: BlogTracker, differential: Differential } as const;

/** All sections stacked with page breaks - used by the PDF exporter and the browser print dialog. */
export function PrintView(props: TabProps) {
  const { report } = props;
  useEffect(() => {
    document.body.classList.add('print-mode');
    // Let charts measure their containers before signalling readiness to the PDF renderer.
    const t = setTimeout(() => {
      (window as any).__REPORT_READY = true;
    }, 1200);
    return () => {
      clearTimeout(t);
      document.body.classList.remove('print-mode');
    };
  }, []);
  const off = report.meta.channels.filter((ch) => !props.c.enabled.has(ch));
  return (
    <div className="container">
      {TABS.map((t) => {
        const Cmp = COMPONENTS[t.id];
        return (
          <div className="print-page" key={t.id}>
            <div className="print-head">
              <div className="row" style={{ gap: 16 }}>
                <Logo name={report.meta.brand.name} />
                <div>
                  <div className="title">{t.icon} {t.label}</div>
                  <div className="small muted">Acquisition &amp; Visibility Report · {report.meta.periods.current.label} vs {report.meta.periods.compareRange.label}</div>
                </div>
              </div>
              <div className="meta">
                {off.length > 0 && <div>Channels excluded: {off.join(', ')}</div>}
                <div>{report.meta.mode === 'demo' ? 'Demo data' : 'GA4 + Search Console'} · generated {new Date(report.meta.generatedAt).toLocaleDateString()}</div>
              </div>
            </div>
            <Cmp {...props} print />
          </div>
        );
      })}
    </div>
  );
}
