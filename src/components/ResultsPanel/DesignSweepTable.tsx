import React from 'react';
import type { PowerScrewSweepResult } from '@/modules/powerScrew/design';
import type { ShearJointSweepResult } from '@/modules/shearJoint/design';

interface Props {
  sweep:      PowerScrewSweepResult | ShearJointSweepResult;
  moduleType: 'power' | 'shear';
}

const HeaderNote: React.FC<{ sweep: Props['sweep'] }> = ({ sweep }) => {
  const rec = sweep.recommendedKey;
  return (
    <div className="mb-3">
      <p className="text-xs" style={{ color: 'var(--c-text-muted)' }}>
        Barrido iterativo — se evaluó cada combinación con los cálculos del libro y se ordenó por
        diámetro. <strong>Recomendado = el menor tamaño que cumple n ≥ {sweep.targetN.toFixed(2)}.</strong>
      </p>
      {rec ? (
        <p className="text-sm font-semibold mt-1" style={{ color: 'var(--c-primary)' }}>
          ✅ Recomendado: {rec}
        </p>
      ) : (
        <p className="text-sm font-semibold mt-1 text-red-500">
          ⚠ Ninguna combinación alcanza n ≥ {sweep.targetN.toFixed(2)} — aumente tamaños, baje la carga
          o el factor objetivo.
        </p>
      )}
    </div>
  );
};

const PowerTable: React.FC<{ sweep: PowerScrewSweepResult }> = ({ sweep }) => (
  <table className="w-full text-xs">
    <thead>
      <tr className="text-[10px] uppercase tracking-wider border-b" style={{ color: 'var(--c-text-dim)', borderColor: 'var(--c-border)' }}>
        <th className="text-left  py-1 pr-2">Cuerda</th>
        <th className="text-left  py-1 pr-2">Material</th>
        <th className="text-right py-1 pr-2">d (mm)</th>
        <th className="text-right py-1 pr-2">T (N·m)</th>
        <th className="text-right py-1 pr-2">η (%)</th>
        <th className="text-right py-1 pr-2">Autobloq.</th>
        <th className="text-right py-1">n (Sy/σ′)</th>
      </tr>
    </thead>
    <tbody>
      {sweep.candidates.map((c) => {
        const isRec = c.key === sweep.recommendedKey;
        return (
          <tr
            key={c.key}
            className="border-b"
            style={{
              borderColor: 'var(--c-border)',
              background: isRec ? 'var(--c-valid-bg, rgba(16,185,129,0.12))' : undefined,
              opacity: c.viable ? 1 : 0.5,
            }}
          >
            <td className="py-1 pr-2 font-medium" style={{ color: 'var(--c-text)' }}>
              {isRec && '★ '}{c.nominal}
            </td>
            <td className="py-1 pr-2" style={{ color: 'var(--c-text-muted)' }}>{c.materialName}</td>
            <td className="py-1 pr-2 text-right font-mono" style={{ color: 'var(--c-text-muted)' }}>{c.dM.toFixed(2)}</td>
            <td className="py-1 pr-2 text-right font-mono" style={{ color: 'var(--c-text-muted)' }}>{c.TtotalNm.toFixed(2)}</td>
            <td className="py-1 pr-2 text-right font-mono" style={{ color: 'var(--c-text-muted)' }}>{c.efficiencyPercent.toFixed(1)}</td>
            <td className="py-1 pr-2 text-right">{c.selfLocking ? '✅' : '⚠️'}</td>
            <td className="py-1 text-right font-mono font-semibold" style={{ color: c.viable ? 'var(--c-primary)' : 'var(--c-text-dim)' }}>
              {c.n.toFixed(2)}
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>
);

const ShearTable: React.FC<{ sweep: ShearJointSweepResult }> = ({ sweep }) => (
  <table className="w-full text-xs">
    <thead>
      <tr className="text-[10px] uppercase tracking-wider border-b" style={{ color: 'var(--c-text-dim)', borderColor: 'var(--c-border)' }}>
        <th className="text-left  py-1 pr-2">Perno</th>
        <th className="text-left  py-1 pr-2">Grado</th>
        <th className="text-right py-1 pr-2">d (mm)</th>
        <th className="text-right py-1 pr-2">n cortante</th>
        <th className="text-right py-1 pr-2">n aplast.</th>
        <th className="text-right py-1 pr-2">n á.neta</th>
        <th className="text-right py-1">n gob.</th>
      </tr>
    </thead>
    <tbody>
      {sweep.candidates.map((c) => {
        const isRec = c.key === sweep.recommendedKey;
        return (
          <tr
            key={c.key}
            className="border-b"
            style={{
              borderColor: 'var(--c-border)',
              background: isRec ? 'var(--c-valid-bg, rgba(16,185,129,0.12))' : undefined,
              opacity: c.viable ? 1 : 0.5,
            }}
          >
            <td className="py-1 pr-2 font-medium" style={{ color: 'var(--c-text)' }}>
              {isRec && '★ '}{c.nominal}
            </td>
            <td className="py-1 pr-2" style={{ color: 'var(--c-text-muted)' }}>{c.gradeName}</td>
            <td className="py-1 pr-2 text-right font-mono" style={{ color: 'var(--c-text-muted)' }}>{c.dM.toFixed(2)}</td>
            <td className="py-1 pr-2 text-right font-mono" style={{ color: 'var(--c-text-muted)' }}>{c.nBoltShear.toFixed(2)}</td>
            <td className="py-1 pr-2 text-right font-mono" style={{ color: 'var(--c-text-muted)' }}>{c.nBearing.toFixed(2)}</td>
            <td className="py-1 pr-2 text-right font-mono" style={{ color: 'var(--c-text-muted)' }}>{c.nNet != null ? c.nNet.toFixed(2) : '—'}</td>
            <td className="py-1 text-right font-mono font-semibold" style={{ color: c.viable ? 'var(--c-primary)' : 'var(--c-text-dim)' }}>
              {c.n.toFixed(2)}
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>
);

export const DesignSweepTable: React.FC<Props> = ({ sweep, moduleType }) => {
  if (!sweep || sweep.candidates.length === 0) {
    return <p className="text-sm" style={{ color: 'var(--c-text-muted)' }}>Sin candidatos para barrer.</p>;
  }
  return (
    <div>
      <HeaderNote sweep={sweep} />
      <div className="overflow-x-auto">
        {moduleType === 'power'
          ? <PowerTable sweep={sweep as PowerScrewSweepResult} />
          : <ShearTable sweep={sweep as ShearJointSweepResult} />}
      </div>
    </div>
  );
};
