import type { ReactNode } from 'react';

export function Section({ title, subtitle, children, right }: { title: string; subtitle?: string; children?: ReactNode; right?: ReactNode }) {
  return (
    <section className="stack fade-in">
      <div className="section-title row spread">
        <div className="row" style={{ gap: 10 }}>
          <h2>{title}</h2>
          {subtitle && <span>{subtitle}</span>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

export function Card({ title, subtitle, children, right, className = '', style }: { title?: string; subtitle?: string; children?: ReactNode; right?: ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`card ${className}`} style={style}>
      {(title || right) && (
        <div className="card-head">
          <div>
            {title && <h3>{title}</h3>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

export function Callout({ children, kind = 'info', icon = '💡' }: { children: ReactNode; kind?: 'info' | 'warn'; icon?: string }) {
  return (
    <div className={`callout ${kind === 'warn' ? 'warn' : ''}`}>
      <span>{icon}</span>
      <div>{children}</div>
    </div>
  );
}
