import { TABS, type TabId } from '../lib/state';

export function Tabs({ active, onChange }: { active: TabId; onChange: (t: TabId) => void }) {
  return (
    <nav className="tabs">
      <div className="container">
        {TABS.map((t) => (
          <button key={t.id} className={t.id === active ? 'active' : ''} onClick={() => onChange(t.id)}>
            <span aria-hidden="true">{t.icon}</span> {t.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
