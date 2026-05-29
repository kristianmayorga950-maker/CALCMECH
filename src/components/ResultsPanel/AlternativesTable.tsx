import React from 'react';
import { getAllDiameters, getThreadData } from '@/utils/threadTables';
import { PowerScrewCalculator } from '@/modules/powerScrew/calculations';
import type { PowerScrewResults } from '@/modules/powerScrew/types';

interface Props { results: any; moduleType: 'power' | 'tension' | 'shear'; }

export const AlternativesTable: React.FC<Props> = ({ results, moduleType }) => {
  if (moduleType !== 'power') return null;

  const r   = results as PowerScrewResults;
  const std = r.input.threadType === 'acme' ? 'acme' : 'acme';
  const all = getAllDiameters(std);
  const idx = all.findIndex(d => {
    const td = getThreadData(std, d);
    return td && Math.abs(td.dM - r.input.majorDiameter) < 0.5;
  });

  const candidates: string[] = [];
  if (idx > 0)                candidates.push(all[idx - 1]);
  if (idx < all.length - 1)   candidates.push(all[idx + 1]);

  const rows = candidates.map(nom => {
    const td = getThreadData(std, nom);
    if (!td) return null;
    try {
      const res = new PowerScrewCalculator({
        ...r.input,
        majorDiameter: td.dM,
        pitch:         td.pitch,
      }).calculate();
      return {
        nom,
        dM: td.dM.toFixed(2),
        sf: res.indicators.safetyFactorYield?.toFixed(2) ?? '—',
        eff: (res.indicators.efficiencyPercent).toFixed(1),
        selfLock: res.indicators.selfLocking,
        torque: (res.torques.Ttotal / 1000).toFixed(3),
      };
    } catch { return null; }
  }).filter(Boolean) as any[];

  if (rows.length === 0) return null;

  return (
    <table className="w-full text-xs">
        <thead>
          <tr className="text-[10px] text-slate-500 uppercase tracking-wider border-b border-slate-800/60">
            <th className="text-left py-1 pr-2">Opción</th>
            <th className="text-right py-1 pr-2">d_M (mm)</th>
            <th className="text-right py-1 pr-2">T_total (N·m)</th>
            <th className="text-right py-1 pr-2">η (%)</th>
            <th className="text-right py-1 pr-2">Autobloqueo</th>
            <th className="text-right py-1">n (Sy/σ')</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/50">
          <tr className="bg-orange-500/10 border-l-2 border-orange-500">
            <td className="py-1 pr-2 font-semibold text-orange-300">Actual</td>
            <td className="py-1 pr-2 text-right font-mono text-slate-200">{r.input.majorDiameter.toFixed(2)}</td>
            <td className="py-1 pr-2 text-right font-mono text-slate-200">{(r.torques.Ttotal / 1000).toFixed(3)}</td>
            <td className="py-1 pr-2 text-right font-mono text-slate-200">{r.indicators.efficiencyPercent.toFixed(1)}</td>
            <td className="py-1 pr-2 text-right font-mono text-slate-200">{r.indicators.selfLocking ? '✅' : '⚠️'}</td>
            <td className="py-1 text-right font-mono text-slate-200">{r.indicators.safetyFactorYield?.toFixed(2) ?? '—'}</td>
          </tr>
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-navy-800/30">
              <td className="py-1 pr-2 text-slate-300">{row.nom}</td>
              <td className="py-1 pr-2 text-right font-mono text-slate-400">{row.dM}</td>
              <td className="py-1 pr-2 text-right font-mono text-slate-400">{row.torque}</td>
              <td className="py-1 pr-2 text-right font-mono text-slate-400">{row.eff}</td>
              <td className="py-1 pr-2 text-right font-mono text-slate-400">{row.selfLock ? '✅' : '⚠️'}</td>
              <td className="py-1 text-right font-mono text-slate-400">{row.sf}</td>
            </tr>
          ))}
        </tbody>
      </table>
  );
};
