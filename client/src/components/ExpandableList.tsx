import { useState, type ReactNode } from 'react';

/** Renders the first `initial` items with a "show all" toggle. Print shows `printCount`. */
export function ExpandableList<T>({ items, initial = 8, printCount = 10, print = false, render, empty }: { items: T[]; initial?: number; printCount?: number; print?: boolean; render: (item: T, i: number) => ReactNode; empty?: ReactNode }) {
  const [all, setAll] = useState(false);
  const shown = print ? items.slice(0, printCount) : all ? items : items.slice(0, initial);
  return (
    <>
      <ul className="mini-list">
        {items.length === 0 && <li className="muted">{empty || 'Nothing here'}</li>}
        {shown.map(render)}
      </ul>
      {!print && items.length > initial && (
        <button className="btn sm no-print" style={{ marginTop: 8 }} onClick={() => setAll(!all)}>{all ? `Show top ${initial}` : `Show all ${items.length}`}</button>
      )}
    </>
  );
}
