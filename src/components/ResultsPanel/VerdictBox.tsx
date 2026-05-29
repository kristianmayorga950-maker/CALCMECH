import React from 'react';
import { useCalculator } from '@/context/CalculatorContext';

interface Props {
  results:    any;
  moduleType: 'power' | 'tension' | 'shear';
  unitSystem: 'SI' | 'imperial';
}

interface FactorItem {
  label:  string;
  value?: number;
  target: number;
}

/**
 * Construye la lista de factores reales vs objetivos según el módulo.
 * El veredicto se calcula comparando cada factor contra su objetivo propio
 * (definido por el usuario en el panel de entrada), no contra un umbral fijo.
 */
function buildFactors(moduleType: Props['moduleType'], results: any, t: any): FactorItem[] {
  if (moduleType === 'tension') {
    const list: FactorItem[] = [
      { label: 'np (carga, Ec. 8-29)', value: results.staticLoad?.np,       target: t.np },
      { label: 'n0 (separación)',      value: results.staticLoad?.n0,       target: t.n0 },
    ];
    if (results.fatigue) {
      list.push({ label: `nf (${results.fatigue.criterion})`, value: results.fatigue.nf,          target: t.nf });
      list.push({ label: 'ny (fluencia)',                     value: results.fatigue.np_fluencia, target: t.nYield });
    }
    return list;
  }
  if (moduleType === 'shear') {
    const list: FactorItem[] = [
      { label: 'n cortante',    value: results.nBoltShear, target: t.nShear },
      { label: 'n aplastam.',   value: results.nBearing,   target: t.nBearing },
    ];
    if (results.nNet != null) list.push({ label: 'n área neta', value: results.nNet, target: t.nShear });
    return list;
  }
  // power
  return [
    { label: 'n (Von Mises)', value: results.indicators?.safetyFactorYield, target: t.nYield },
  ];
}

/** Veredicto según ratio actual/objetivo del factor más crítico. */
function computeVerdict(factors: FactorItem[]): {
  verdict: 'valid' | 'marginal' | 'invalid';
  governing: string;
  minRatio: number;
  governingValue: number;
  governingTarget: number;
} {
  const usable = factors.filter(f => f.value != null && Number.isFinite(f.value) && f.target > 0);
  if (usable.length === 0)
    return { verdict: 'valid', governing: '—', minRatio: Infinity, governingValue: 0, governingTarget: 0 };

  let minRatio = Infinity;
  let governing = usable[0];
  for (const f of usable) {
    const r = (f.value as number) / f.target;
    if (r < minRatio) { minRatio = r; governing = f; }
  }
  const verdict: 'valid' | 'marginal' | 'invalid' =
    minRatio >= 1 ? 'valid' : minRatio >= 0.85 ? 'marginal' : 'invalid';
  return {
    verdict,
    governing: governing.label,
    minRatio,
    governingValue:  governing.value as number,
    governingTarget: governing.target,
  };
}

export const VerdictBox: React.FC<Props> = ({ results, moduleType }) => {
  const { state } = useCalculator();
  const targets = state.targetSafetyFactors;

  const factors  = buildFactors(moduleType, results, targets);
  const { verdict, governing, minRatio, governingValue, governingTarget } = computeVerdict(factors);

  const cfg = {
    valid:    { cls: 'verdict-valid',    icon: '✅', label: 'VÁLIDO' },
    marginal: { cls: 'verdict-marginal', icon: '⚠️', label: 'MARGINAL' },
    invalid:  { cls: 'verdict-invalid',  icon: '❌', label: 'INSUFICIENTE' },
  }[verdict];

  return (
    <div className={`${cfg.cls} p-3 mb-0`}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold tracking-wide">
          {cfg.icon} VEREDICTO — {cfg.label}
        </h2>
        <div className="text-right">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Factor gobernante</div>
          <div className="text-lg font-bold font-mono">
            {Number.isFinite(governingValue) ? governingValue.toFixed(2) : '—'}
            <span className="text-xs text-slate-400 font-normal"> / {governingTarget.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <p className="text-xs mt-0.5 opacity-80">
        Criterio gobernante: <strong>{governing}</strong>
        {Number.isFinite(minRatio) && (
          <span className="ml-2 text-[10px] opacity-70">
            (ratio vs. objetivo = {minRatio.toFixed(2)})
          </span>
        )}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-2">
        {factors.map((f, i) => <FactorPill key={i} item={f} />)}
        {moduleType === 'power' && results.indicators?.efficiencyPercent != null && (
          <div className="bg-navy-900/40 rounded-md px-2 py-1 text-center">
            <div className="text-[10px] text-slate-500 uppercase">Eficiencia</div>
            <div className="text-xs font-bold font-mono text-blue-400">{results.indicators.efficiencyPercent.toFixed(1)}%</div>
          </div>
        )}
        {moduleType === 'power' && results.indicators?.selfLocking != null && (
          <div className="bg-navy-900/40 rounded-md px-2 py-1 text-center">
            <div className="text-[10px] text-slate-500 uppercase">Autobloqueo</div>
            <div className="text-xs font-bold">{results.indicators.selfLocking ? 'Sí ✅' : 'No ⚠️'}</div>
          </div>
        )}
      </div>

      {results.warnings?.length > 0 && (
        <div className="mt-2 pt-1.5 border-t border-current/20">
          <ul className="text-[11px] space-y-0.5 opacity-80">
            {results.warnings.map((w: string, i: number) => <li key={i}>⚠️ {w}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
};

const FactorPill: React.FC<{ item: FactorItem }> = ({ item }) => {
  if (item.value == null || !Number.isFinite(item.value)) return null;
  const ratio = item.value / item.target;
  const color = ratio >= 1 ? 'text-emerald-400' : ratio >= 0.85 ? 'text-amber-400' : 'text-red-400';
  return (
    <div className="bg-navy-900/40 rounded-md px-2 py-1 text-center">
      <div className="text-[10px] text-slate-500 uppercase tracking-wider">{item.label}</div>
      <div className={`text-xs font-bold font-mono ${color}`}>
        {item.value.toFixed(2)}
        <span className="text-[10px] text-slate-500 font-normal"> / {item.target.toFixed(2)}</span>
      </div>
    </div>
  );
};
