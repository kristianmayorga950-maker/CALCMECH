import React from 'react';
import { FormulaDisplay } from '@/components/common/FormulaDisplay';
import type { TensionJointResults } from '@/modules/tensionJoint/types';

interface Props {
  results:    TensionJointResults;
  unitSystem: 'SI' | 'imperial';
}

export const GasketResultsSection: React.FC<Props> = ({ results, unitSystem }) => {
  const g = results.gasket;
  if (!g) return null;

  const imp = unitSystem === 'imperial';

  const fmtP   = (mpa: number) =>
    imp ? `${(mpa * 145.038).toFixed(2)} psi` : `${mpa.toFixed(3)} MPa`;
  const fmtA   = (mm2: number) =>
    imp ? `${(mm2 / 645.16).toFixed(5)} in²` : `${mm2.toFixed(2)} mm²`;
  const fmtLen = (mm: number) =>
    imp ? `${(mm / 25.4).toFixed(4)} in` : `${mm.toFixed(2)} mm`;
  const fmtK   = (nmm: number) =>
    nmm > 0 ? `${(nmm / 1000).toFixed(2)} kN/mm` : '—';

  const inp    = results.input;
  const d      = inp.boltDiameter;
  const Db     = inp.boltCircleDiameter;
  const N      = inp.numBolts;
  const sMax   = 2 * d + 6;
  const sBolt  = Db && N && N > 0 ? (Math.PI * Db) / N : null;
  const spacingOK = sBolt !== null ? sBolt <= sMax : null;

  const isUnconfined = g.gasketType === 'unconfined';

  return (
    <>
      {/* Badge + descripción */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-[11px] text-slate-500 flex-1">
        {isUnconfined
          ? 'Empaque no confinado: kg = Ag·Eg/tg en serie con km. C_eff = kb/(kb+km_eff) es mayor que C_metal → el perno absorbe más carga cíclica.'
          : 'Empaque confinado: las bridas contactan metal-metal. El empaque no entra en km; C es el valor metálico de la sección de rigidez.'}
        </p>
        <span className={[
          'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide shrink-0',
          isUnconfined ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'bg-emerald-100 text-emerald-700 border border-emerald-300',
        ].join(' ')}>
          {isUnconfined ? '🟡 No confinado' : '🔒 Confinado'}
        </span>
      </div>

      {/* ── Tarjetas de estado ── */}
      <div className={`grid gap-2 mt-2 ${isUnconfined ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'}`}>
        <div className="rounded-md border border-material-border bg-material-bg p-2 flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider text-slate-500">Ag — área/perno</span>
          <span className="text-sm font-bold font-mono text-material-dark">{fmtA(g.Ag)}</span>
        </div>

        <div className="rounded-md border border-material-border bg-material-bg p-2 flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider text-slate-500">Factor n</span>
          <span className="text-sm font-bold font-mono text-material-dark">{g.n}</span>
          <span className="text-[10px] text-slate-500">verificado a n×P</span>
        </div>

        {isUnconfined && g.kg !== undefined && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-2 flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wider text-amber-700">kg — rigidez empaque</span>
            <span className="text-sm font-bold font-mono text-amber-800">{fmtK(g.kg)}</span>
            <span className="text-[10px] text-amber-600">k_g = Ag·Eg/tg</span>
          </div>
        )}

        <div className={[
          'rounded-md border p-2 flex flex-col gap-0.5',
          g.sealed ? 'bg-emerald-50 border-emerald-300' : 'bg-red-50 border-red-300',
        ].join(' ')}>
          <span className={`text-[10px] uppercase tracking-wider ${g.sealed ? 'text-emerald-700' : 'text-red-700'}`}>
            Estado del sello
          </span>
          <span className={`text-sm font-bold ${g.sealed ? 'text-emerald-700' : 'text-red-700'}`}>
            {g.sealed ? '✓ SELLADO' : '✗ ABIERTO'}
          </span>
          <span className="text-[10px] text-slate-500">p_g {g.sealed ? '≥' : '<'} 0</span>
        </div>
      </div>

      {/* ── C_metal vs C_eff (empaque no confinado) ── */}
      {isUnconfined && g.C_metal !== undefined && g.C_eff !== undefined && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
          <p className="text-[11px] font-semibold text-amber-800 mb-2">
            Efecto del empaque no confinado en la constante de junta C
          </p>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-md border border-material-border bg-white py-1.5 px-1">
              <p className="text-sm font-bold font-mono text-slate-700">{g.C_metal.toFixed(4)}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">C_metal (sin empaque)</p>
            </div>
            <div className="flex items-center justify-center text-amber-600 font-bold text-base">→</div>
            <div className="rounded-md border border-amber-300 bg-amber-100 py-1.5 px-1">
              <p className="text-sm font-bold font-mono text-amber-800">{g.C_eff.toFixed(4)}</p>
              <p className="text-[10px] text-amber-700 mt-0.5">C_eff (con empaque)</p>
            </div>
          </div>
          <p className="text-[10px] text-amber-700 mt-1.5">
            ΔC = {(g.C_eff - g.C_metal).toFixed(4)} — el empaque {g.C_eff > g.C_metal ? 'aumenta' : 'no altera'} la fracción de carga que absorbe el perno.
          </p>
        </div>
      )}

      {/* ── Tabla de resultados ── */}
      <div className="overflow-x-auto mt-3">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[10px] text-slate-500 uppercase tracking-wider border-b border-material-border">
              <th className="text-left py-1 pr-3 font-medium">Parámetro</th>
              <th className="text-left py-1 pr-3 font-medium hidden sm:table-cell">Fórmula</th>
              <th className="text-right py-1 font-medium">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-material-border">
            <tr>
              <td className="py-1 pr-3 text-slate-600">p_i — presión inicial de asentamiento</td>
              <td className="py-1 pr-3 text-[11px] text-slate-500 hidden sm:table-cell">
                <FormulaDisplay latex="p_i = F_i / A_g" />
              </td>
              <td className="py-1 text-right font-mono text-material-dark">{fmtP(g.p_i)}</td>
            </tr>
            <tr>
              <td className="py-1 pr-3 text-slate-600">p_g — presión residual a n×P</td>
              <td className="py-1 pr-3 text-[11px] text-slate-500 hidden sm:table-cell">
                <FormulaDisplay latex={`p_g = \\dfrac{F_i - n(1-C)P}{A_g},\\; n=${g.n}`} />
              </td>
              <td className={`py-1 text-right font-mono font-semibold ${g.p_g >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                {fmtP(g.p_g)}
              </td>
            </tr>
            <tr>
              <td className="py-1 pr-3 text-slate-600">n_sello — factor de carga máx. con sello</td>
              <td className="py-1 pr-3 text-[11px] text-slate-500 hidden sm:table-cell">
                <FormulaDisplay latex="n_{sello} = F_i / [(1-C) \cdot P]" />
              </td>
              <td className="py-1 text-right font-mono text-material-dark">{g.n_seal.toFixed(3)}</td>
            </tr>
            {isUnconfined && g.kg !== undefined && (
              <tr>
                <td className="py-1 pr-3 text-slate-600">kg — rigidez del empaque</td>
                <td className="py-1 pr-3 text-[11px] text-slate-500 hidden sm:table-cell">
                  <FormulaDisplay latex="k_g = A_g \cdot E_g / t_g" />
                </td>
                <td className="py-1 text-right font-mono text-amber-700">{fmtK(g.kg)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Advertencia si no está sellado ── */}
      {!g.sealed && (
        <div className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <strong>⚠ El empaque pierde contacto a n = {g.n}×P.</strong>{' '}
          p_g = {fmtP(g.p_g)} &lt; 0. Aumente la precarga F_i o reduzca la carga P.
        </div>
      )}

      {/* ── Ec. 8-34 — Espaciado entre pernos ── */}
      {sBolt !== null && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-orange-600 mb-2">Ec. 8-34 — Verificación de espaciado entre pernos</p>
          <p className="text-[11px] text-slate-500 mb-2">
            Regla aproximada: c = π·D<sub>b</sub>/N ≤ 2d + 6 mm — evita deflexión excesiva de la brida entre pernos.
            <em> (Solo advertencia.)</em>
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center mb-2">
            {[
              { label: 'D_b',     val: fmtLen(Db!),       color: 'text-blue-600' },
              { label: 'N pernos', val: String(N),          color: 'text-slate-600' },
              { label: 'c = π·D_b/N', val: fmtLen(sBolt), color: spacingOK ? 'text-emerald-700' : 'text-amber-700' },
              { label: 's_máx = 2d+6', val: fmtLen(sMax), color: 'text-slate-600' },
            ].map(({ label, val, color }) => (
              <div key={label} className="rounded-md border border-material-border bg-material-bg py-1.5 px-1">
                <p className={`text-xs font-bold font-mono ${color}`}>{val}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          <div className={[
            'rounded-lg border px-3 py-2.5 text-sm font-medium',
            spacingOK ? 'border-emerald-400 bg-emerald-50 text-emerald-800' : 'border-amber-400 bg-amber-50 text-amber-800',
          ].join(' ')}>
            {spacingOK
              ? `✓ c = ${fmtLen(sBolt)} ≤ s_máx = ${fmtLen(sMax)} — Condición Ec. 8-34 cumplida.`
              : `⚠ c = ${fmtLen(sBolt)} > s_máx = ${fmtLen(sMax)} — Ec. 8-34 NO cumplida. Aumente N o reduzca D_b.`}
          </div>
        </div>
      )}
    </>
  );
};
