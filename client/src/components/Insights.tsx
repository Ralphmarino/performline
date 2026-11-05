import type { Insight, Summary } from '../lib/summary';
import { useThemeColors } from '../lib/theme';

const KIND_LABEL: Record<Insight['kind'], string> = { win: 'Win', watch: 'Watch', opportunity: 'Opportunity', note: 'Context' };

export function InsightList({ insights, limit }: { insights: Insight[]; limit?: number }) {
  const list = limit ? insights.slice(0, limit) : insights;
  return (
    <div className="insights">
      {list.map((i, idx) => (
        <div className={`insight ${i.kind}`} key={idx}>
          <div className="icon">{i.icon}</div>
          <div>
            <div className="tag">{KIND_LABEL[i.kind]}</div>
            <div className="title">{i.title}</div>
            <div className="detail">{i.detail}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ScoreRing({ score, grade }: { score: number; grade: string }) {
  const c = useThemeColors();
  const r = 50;
  const circ = 2 * Math.PI * r;
  const color = score >= 70 ? c.good : score >= 50 ? c.warn : c.bad;
  return (
    <div className="score-ring" title="Momentum score: a weighted blend of sessions, users, key events, conversion rate, organic clicks, AI referrals, engagement and ranking movement. 50 = flat.">
      <svg viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke={c.grid} strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(score / 100) * circ} ${circ}`} transform="rotate(-90 60 60)" style={{ transition: 'stroke-dasharray 0.8s ease-out' }} />
      </svg>
      <div style={{ textAlign: 'center' }}>
        <div className="num">{score}</div>
        <div className="grade">Grade {grade}</div>
      </div>
    </div>
  );
}

export function SummaryCard({ summary, periodLabel }: { summary: Summary; periodLabel: string }) {
  return (
    <div className="card score-card">
      <ScoreRing score={summary.score} grade={summary.grade} />
      <div>
        <div className="row" style={{ gap: 8, marginBottom: 4 }}>
          <span className="pill brand">Momentum · {periodLabel}</span>
          <span style={{ fontSize: 20 }}>{summary.mood}</span>
        </div>
        <div className="headline">{summary.headline}</div>
        <p className="narrative">{summary.narrative}</p>
      </div>
    </div>
  );
}
