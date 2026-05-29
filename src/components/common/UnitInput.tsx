import React, { useEffect, useRef, useState } from 'react';

interface UnitInputProps {
  label:        string;
  value:        number | string;
  onChange:     (val: number) => void;
  units?:       string[];
  selectedUnit?: string;
  onUnitChange?: (unit: string) => void;
  min?:         number;
  max?:         number;
  step?:        number;
  error?:       string;
  warning?:     string;
  tooltip?:     string;
  reference?:   string;
  disabled?:    boolean;
  /** Text shown below the input to display the equivalent in the other unit system. */
  altDisplay?:  string;
  /**
   * Number of significant digits used when formatting the external value for display.
   * Defaults to 7. Use lower values (e.g. 4) for derived/converted quantities.
   */
  sigFigs?:     number;
}

/** Format a number for display: uses dot as decimal separator, strips trailing zeros. */
function fmtDisplay(n: number, sigFigs = 7): string {
  if (!isFinite(n)) return '';
  // toPrecision may produce scientific notation for very large/small values — that is fine.
  return parseFloat(n.toPrecision(sigFigs)).toString();
}

export const UnitInput: React.FC<UnitInputProps> = ({
  label, value, onChange, units, selectedUnit, onUnitChange,
  min, max, step: _step, error, warning, tooltip, reference,
  disabled, altDisplay, sigFigs = 7,
}) => {
  const [localValue, setLocalValue] = useState<string>(() => {
    const n = typeof value === 'number' ? value : parseFloat(String(value));
    return isNaN(n) ? '' : fmtDisplay(n, sigFigs);
  });
  const [commaWarning, setCommaWarning] = useState(false);
  const isFocused = useRef(false);

  // Sync external value only while the field is not being actively edited.
  useEffect(() => {
    if (!isFocused.current) {
      const n = typeof value === 'number' ? value : parseFloat(String(value));
      setLocalValue(isNaN(n) ? '' : fmtDisplay(n, sigFigs));
    }
  }, [value, sigFigs]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setLocalValue(raw);

    const hasComma = raw.includes(',');
    setCommaWarning(hasComma);

    const parsed = parseFloat(hasComma ? raw.replace(',', '.') : raw);
    if (!isNaN(parsed)) onChange(parsed);
  };

  const handleFocus = () => {
    isFocused.current = true;
  };

  const handleBlur = () => {
    isFocused.current = false;
    setCommaWarning(false);

    // Normalize any comma to dot, then reformat on exit.
    const normalized = localValue.replace(',', '.');
    const parsed = parseFloat(normalized);
    if (isNaN(parsed) || normalized.trim() === '') {
      // Restore last known good external value
      const n = typeof value === 'number' ? value : parseFloat(String(value));
      setLocalValue(isNaN(n) ? '' : fmtDisplay(n, sigFigs));
    } else {
      setLocalValue(fmtDisplay(parsed, sigFigs));
    }
  };

  return (
    <div className="mb-2">
      <label className="label">
        {label}
        {(tooltip || reference) && (
          <span
            className="ml-1 text-orange-400 cursor-help"
            title={`${tooltip ?? ''}${tooltip && reference ? ' — ' : ''}${reference ?? ''}`}
          >ⓘ</span>
        )}
      </label>
      <div className="flex gap-1">
        <input
          type="text"
          inputMode="decimal"
          value={localValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          min={min}
          max={max}
          disabled={disabled}
          className={`input-field flex-1 ${error ? 'input-field-error' : ''}`}
        />
        {units && units.length > 0 && (
          <select
            value={selectedUnit}
            onChange={e => onUnitChange?.(e.target.value)}
            className="rounded-md border border-slate-700/60 bg-navy-900/70 px-2 py-1.5
                       text-sm text-slate-300 focus:border-orange-500 focus:outline-none
                       transition-colors hover:border-slate-600/80"
          >
            {units.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        )}
      </div>

      {/* Comma warning — highest priority */}
      {commaWarning && (
        <p className="mt-1 text-xs text-amber-400 font-medium">
          ⚠ Usa punto (.) como separador decimal, no coma (,).
        </p>
      )}

      {/* Alt-unit display — shown when no comma warning */}
      {altDisplay && !commaWarning && (
        <p className="mt-1 text-[11px] text-slate-500 font-mono">{altDisplay}</p>
      )}

      {error   && <p className="mt-1 text-xs text-red-400">{error}</p>}
      {warning && !error && <p className="mt-1 text-xs text-amber-400">{warning}</p>}
    </div>
  );
};
