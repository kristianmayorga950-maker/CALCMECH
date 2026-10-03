import type { ReactNode } from 'react';

interface Opt<T extends string | number | boolean> { value: T; label: ReactNode }

interface Props<T extends string | number | boolean> {
  legend: ReactNode;
  value: T;
  options: Opt<T>[];
  onChange: (v: T) => void;
  /** Columnas de la rejilla; por defecto, todas las opciones en una fila. */
  columns?: number;
}

export function Segmented<T extends string | number | boolean>({ legend, value, options, onChange, columns }: Props<T>) {
  return (
    <div className="ps-seg-wrap" role="group">
      <div className="ps-seg-legend">{legend}</div>
      <div className="ps-seg" style={{ gridTemplateColumns: `repeat(${columns ?? options.length}, minmax(0, 1fr))` }}>
        {options.map(o => (
          <button
            key={String(o.value)}
            type="button"
            className="ps-seg-btn"
            aria-pressed={o.value === value}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
