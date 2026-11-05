import { useMemo, useState, type ReactNode } from 'react';
import { downloadCsv } from '../lib/api';

export interface Column<T> {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  value?: (row: T) => number | string; // used for sorting + CSV
  align?: 'left' | 'right';
  width?: number | string;
}

interface Props<T> {
  rows: T[];
  columns: Column<T>[];
  defaultSort?: string;
  defaultDir?: 'asc' | 'desc';
  pageSize?: number;
  csvName?: string;
  footer?: ReactNode;
  rowKey: (row: T) => string;
  empty?: string;
}

export function DataTable<T>({ rows, columns, defaultSort, defaultDir = 'desc', pageSize = 12, csvName, footer, rowKey, empty = 'No data for this selection.' }: Props<T>) {
  const [sort, setSort] = useState(defaultSort || columns[1]?.key || columns[0].key);
  const [dir, setDir] = useState<'asc' | 'desc'>(defaultDir);
  const [showAll, setShowAll] = useState(false);

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sort);
    if (!col?.value) return rows;
    const v = col.value;
    return [...rows].sort((a, b) => {
      const x = v(a);
      const y = v(b);
      const r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
      return dir === 'asc' ? r : -r;
    });
  }, [rows, columns, sort, dir]);

  const visible = showAll ? sorted : sorted.slice(0, pageSize);
  const onSort = (key: string) => {
    if (sort === key) setDir(dir === 'asc' ? 'desc' : 'asc');
    else {
      setSort(key);
      setDir('desc');
    }
  };
  const exportCsv = () => downloadCsv(`${csvName || 'table'}.csv`, columns.map((c) => c.label), sorted.map((r) => columns.map((c) => (c.value ? c.value(r) : ''))));

  return (
    <div>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={`${c.align === 'left' ? 'left' : ''} ${sort === c.key ? 'sorted' : ''}`} style={{ width: c.width }} onClick={() => c.value && onSort(c.key)}>
                  {c.label}
                  {sort === c.key ? (dir === 'desc' ? ' ▾' : ' ▴') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="dim" style={{ textAlign: 'center', padding: 20 }}>{empty}</td>
              </tr>
            )}
            {visible.map((r) => (
              <tr key={rowKey(r)}>
                {columns.map((c) => (
                  <td key={c.key} className={c.align === 'left' ? 'left' : ''}>{c.render(r)}</td>
                ))}
              </tr>
            ))}
          </tbody>
          {footer && <tfoot>{footer}</tfoot>}
        </table>
      </div>
      <div className="table-foot no-print">
        <span>
          {sorted.length > pageSize && (
            <button className="btn sm" onClick={() => setShowAll(!showAll)}>{showAll ? `Show top ${pageSize}` : `Show all ${sorted.length}`}</button>
          )}
        </span>
        <span>{csvName && <button className="btn sm" onClick={exportCsv}>⬇ CSV</button>}</span>
      </div>
    </div>
  );
}

/** Inline proportional bar for a value against the column max. */
export function Bar({ value, max, compare = false }: { value: number; max: number; compare?: boolean }) {
  const w = max ? Math.max(2, Math.round((value / max) * 70)) : 0;
  return <span className={`bar ${compare ? 'cmp' : ''}`} style={{ width: w }} />;
}
