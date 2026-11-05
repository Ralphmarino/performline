import { useEffect, useState } from 'react';

const KEY = 'pl-notes';

export function loadNotes(): Record<string, string> {
  try {
    const injected = (window as any).__PRINT_NOTES;
    if (injected && typeof injected === 'object') return injected;
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}
export function saveNotes(notes: Record<string, string>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(notes));
  } catch {
    /* ignore */
  }
}

/** Analyst notes per section. Persisted in the browser and included in PDF exports. */
export function Notes({ id, title = 'Analyst notes & context', placeholder, print = false }: { id: string; title?: string; placeholder?: string; print?: boolean }) {
  const [value, setValue] = useState(() => loadNotes()[id] || '');
  const [savedAt, setSavedAt] = useState<number | null>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      const all = loadNotes();
      if ((all[id] || '') === value) return;
      all[id] = value;
      saveNotes(all);
      setSavedAt(Date.now());
    }, 400);
    return () => clearTimeout(t);
  }, [value, id]);
  if (print) {
    if (!value.trim()) return null;
    return (
      <div className="card notes">
        <h3 style={{ marginBottom: 8 }}>📝 {title}</h3>
        <div className="rendered">{value}</div>
      </div>
    );
  }
  return (
    <div className="card notes">
      <div className="card-head">
        <div>
          <h3>📝 {title}</h3>
          <p>Saved in this browser and included in PDF exports.</p>
        </div>
        <span className="saved">{savedAt ? 'Saved' : ''}</span>
      </div>
      <textarea value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder || 'Add context for the reader: campaigns that launched, site changes, tracking fixes, what to do next...'} />
    </div>
  );
}
