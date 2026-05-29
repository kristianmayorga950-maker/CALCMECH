import React, { useState } from 'react';
import { FormulaDisplay } from '@/components/common/FormulaDisplay';
import { convertValueByUnit } from '@/utils/unitConverter';

interface Props {
  results:    any;
  unitSystem: 'SI' | 'imperial';
  moduleType: 'power' | 'tension' | 'shear';
}

export const CalculationsSection: React.FC<Props> = ({ results, unitSystem }) => {
  const [expanded, setExpanded] = useState(true);
  const calcs: Record<string, { formula: string; value: number; unit: string; ref?: string }> =
    results.calculations ?? {};

  return (
    <div className="card">
      <button
        className="w-full flex justify-between items-center text-left"
        onClick={() => setExpanded(v => !v)}
      >
        <h3 className="section-title mb-0">Desarrollo de cálculos</h3>
        <span
          className="text-slate-500 text-xs transition-transform duration-300"
          style={{ display: 'inline-block', transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
        >
          ▼
        </span>
      </button>

      {expanded && (
        <table className="w-full text-xs mt-2">
          <thead>
            <tr className="text-[10px] text-slate-500 uppercase tracking-wider">
              <th className="text-left py-1 pr-3 font-medium">Parámetro</th>
              <th className="text-left py-1 pr-3 font-medium">Fórmula</th>
              <th className="text-right py-1 font-medium">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {Object.entries(calcs).map(([key, entry]) => {
              const { display, unit: displayUnit } = convertValueByUnit(entry.value, entry.unit, unitSystem);
              return (
                <tr key={key}>
                  <td className="py-1 pr-3 text-slate-300 text-xs">{key}</td>
                  <td className="py-1 pr-3 text-[11px] text-slate-500">
                    <FormulaDisplay latex={entry.formula} />
                  </td>
                  <td className="py-1 text-right font-mono text-slate-100 text-xs">
                    {typeof entry.value === 'number' ? display : entry.value}
                    {' '}
                    <span className="text-[10px] text-slate-400">{displayUnit}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};
