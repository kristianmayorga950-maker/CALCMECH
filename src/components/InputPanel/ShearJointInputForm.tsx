import React from 'react';
import { useCalculator } from '@/context/CalculatorContext';
import { UnitInput } from '@/components/common/UnitInput';
import { CollapsibleSection } from '@/components/common/CollapsibleSection';
import { DesignModeToggle } from './DesignModeToggle';
import { getAllISOClasses } from '@/utils/materialDatabase';
import type { ShearJointInput, ShearBolt } from '@/modules/shearJoint/types';

/**
 * Junta atornillada a cortante — Shigley §8-12.
 * Captura patrón de pernos, carga aplicada y propiedades de placa.
 */
export const ShearJointInputForm: React.FC = () => {
  const { state, updateInputs, setTargets, setSweepOptions, calculate } = useCalculator();
  const inputs = state.shearInputs as Partial<ShearJointInput>;
  const bolts  = (inputs.bolts ?? []) as ShearBolt[];
  const auto = state.autoMode.shear;

  const updateBolt = (i: number, patch: Partial<ShearBolt>) => {
    const next = bolts.map((b, j) => (j === i ? { ...b, ...patch } : b));
    updateInputs({ bolts: next });
  };

  const addBolt = () => {
    const nextId = String.fromCharCode(65 + bolts.length);
    updateInputs({ bolts: [...bolts, { id: nextId, x: 0, y: 0 }] });
  };

  const removeBolt = (i: number) => {
    if (bolts.length <= 1) return;
    updateInputs({ bolts: bolts.filter((_, j) => j !== i) });
  };

  const handleGrade = (designation: string) => {
    const g = getAllISOClasses().find(m => m.grade === designation);
    if (!g) return;
    updateInputs({ boltSp: g.Sp, boltSy: g.Sy, boltSut: g.Sut });
  };

  // Conversión automática según el sistema de unidades global.
  const isImperial = state.unitSystem === 'imperial';
  const L = isImperial
    ? { u: 'in',   to: (mm: number) => mm / 25.4,    from: (v: number) => v * 25.4 }
    : { u: 'mm',   to: (mm: number) => mm,           from: (v: number) => v };
  const F = isImperial
    ? { u: 'lbf',  to: (N: number)  => N  / 4.44822, from: (v: number) => v * 4.44822 }
    : { u: 'N',    to: (N: number)  => N,            from: (v: number) => v };
  const S = isImperial
    ? { u: 'kpsi', to: (MPa: number) => MPa / 6.89476, from: (v: number) => v * 6.89476 }
    : { u: 'MPa',  to: (MPa: number) => MPa,           from: (v: number) => v };
  const A = isImperial
    ? { u: 'in²',  to: (mm2: number) => mm2 / 645.16, from: (v: number) => v * 645.16 }
    : { u: 'mm²',  to: (mm2: number) => mm2,           from: (v: number) => v };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <DesignModeToggle tab="shear" />

      <div className="card lg:col-span-2">
        <p className="text-xs text-slate-400">
          <strong className="text-orange-300">Datos necesarios</strong> — {auto
            ? 'patrón de pernos, carga V y su punto de aplicación, y propiedades de la placa. La app barre tamaños de perno × grados y recomienda el menor que cumple el factor objetivo.'
            : 'Patrón de pernos (coordenadas), carga V y su punto de aplicación, grado del perno y propiedades de la placa para verificar cortante, aplastamiento y tensión en el área neta.'}
        </p>
      </div>

      {auto && (
        <CollapsibleSection title="Opciones de barrido" className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Tabla de pernos a barrer</label>
              <select
                className="input-field"
                value={state.sweepOptions.shearStandard}
                onChange={e => setSweepOptions({ shearStandard: e.target.value as 'iso' | 'unc' })}
              >
                <option value="iso">ISO métrico (clases 3.6 … 12.9)</option>
                <option value="unc">UNC (grados SAE 1 … 8.2)</option>
              </select>
            </div>
            <div>
              <label className="label">Área de corte</label>
              <select
                className="input-field"
                value={state.sweepOptions.shearAreaMode}
                onChange={e => setSweepOptions({ shearAreaMode: e.target.value as 'thread' | 'shank' })}
              >
                <option value="thread">Roscas en el plano de corte (At)</option>
                <option value="shank">Vástago en el plano de corte (πd²/4)</option>
              </select>
            </div>
          </div>
        </CollapsibleSection>
      )}

      {/* ── 1. Patrón de pernos ─────────────────────────────────── */}
      <CollapsibleSection
        title="1. Patrón de pernos"
        className="lg:col-span-2"
        extra={
          <button
            onClick={addBolt}
            className="text-xs px-2 py-1 rounded border border-orange-500/40 text-orange-300 hover:bg-orange-500/10"
          >
            + Agregar
          </button>
        }
      >
        <div className="space-y-2">
          {bolts.map((b, i) => (
            <div key={i} className="grid grid-cols-[60px_1fr_1fr_auto] gap-2 items-end">
              <input
                className="input-field"
                value={b.id}
                onChange={e => updateBolt(i, { id: e.target.value })}
              />
              <UnitInput
                label={`x${i + 1} (${L.u})`}
                value={L.to(b.x)}
                onChange={v => updateBolt(i, { x: L.from(v) })}
              />
              <UnitInput
                label={`y${i + 1} (${L.u})`}
                value={L.to(b.y)}
                onChange={v => updateBolt(i, { y: L.from(v) })}
              />
              <button
                onClick={() => removeBolt(i)}
                disabled={bolts.length <= 1}
                className="text-xs px-2 py-2 rounded text-red-400 hover:bg-red-500/10 disabled:opacity-30"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* ── 2. Perno ─────────────────────────────────────────────── */}
      <CollapsibleSection title="2. Perno">
        <div className="grid grid-cols-2 gap-3">
          {!auto && (
            <>
              <UnitInput
                label={`Diámetro d (${L.u})`}
                value={L.to(inputs.boltDiameter ?? 0)}
                onChange={v => updateInputs({ boltDiameter: L.from(v) })}
              />
              <UnitInput
                label={`Área a cortante (${A.u})`}
                value={A.to(inputs.shearArea ?? 0)}
                onChange={v => updateInputs({ shearArea: A.from(v) })}
                tooltip="At si las roscas están en el plano de corte, πd²/4 si solo el vástago"
                reference="§8-12"
              />
            </>
          )}

          <div className="col-span-2 flex items-center gap-2">
            <input
              id="sj-double"
              type="checkbox"
              checked={inputs.doubleShear ?? false}
              onChange={e => updateInputs({ doubleShear: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="sj-double" className="text-sm text-slate-300">Cortante doble (2 planos)</label>
          </div>

          {!auto && (
            <>
              <div className="col-span-2">
                <label className="label">Clase ISO del perno (Tab. 8-11)</label>
                <select className="input-field" onChange={e => handleGrade(e.target.value)} defaultValue="">
                  <option value="">— Personalizado —</option>
                  {getAllISOClasses().map(g => (
                    <option key={g.grade} value={g.grade}>
                      {g.grade} — Sp {g.Sp} / Sy {g.Sy} / Sut {g.Sut} MPa
                    </option>
                  ))}
                </select>
              </div>

              <UnitInput
                label={`Sp del perno (${S.u})`}
                value={S.to(inputs.boltSp ?? 0)}
                onChange={v => updateInputs({ boltSp: S.from(v) })}
                tooltip="τ admisible = 0.577·Sp (criterio de distorsión)"
              />
              <UnitInput
                label={`Sy del perno (${S.u})`}
                value={S.to(inputs.boltSy ?? 0)}
                onChange={v => updateInputs({ boltSy: S.from(v) })}
              />
              <UnitInput
                label={`Sut del perno (${S.u})`}
                value={S.to(inputs.boltSut ?? 0)}
                onChange={v => updateInputs({ boltSut: S.from(v) })}
              />
            </>
          )}

          {auto && (
            <p className="col-span-2 text-[11px]" style={{ color: 'var(--c-text-dim)' }}>
              En modo automático el diámetro, el área y el grado se barren automáticamente (ver "Opciones de barrido").
            </p>
          )}
        </div>
      </CollapsibleSection>

      {/* ── 3. Carga ─────────────────────────────────────────────── */}
      <CollapsibleSection title="3. Carga aplicada V">
        <div className="grid grid-cols-2 gap-3">
          <UnitInput
            label={`Magnitud V (${F.u})`}
            value={F.to(inputs.V ?? 0)}
            onChange={v => updateInputs({ V: F.from(v) })}
            reference="§8-12"
          />
          <div /> {/* spacer */}
          <UnitInput
            label="Dirección Vx (unitario)"
            value={inputs.Vx ?? 0}
            onChange={v => updateInputs({ Vx: v })}
            step={0.01}
            tooltip="Componente X del vector unitario de V"
          />
          <UnitInput
            label="Dirección Vy (unitario)"
            value={inputs.Vy ?? -1}
            onChange={v => updateInputs({ Vy: v })}
            step={0.01}
          />
          <UnitInput
            label={`Punto de aplicación x (${L.u})`}
            value={L.to(inputs.applicationX ?? 0)}
            onChange={v => updateInputs({ applicationX: L.from(v) })}
            tooltip="Si coincide con el centroide, no hay momento (cortante directo puro)"
          />
          <UnitInput
            label={`Punto de aplicación y (${L.u})`}
            value={L.to(inputs.applicationY ?? 0)}
            onChange={v => updateInputs({ applicationY: L.from(v) })}
          />
        </div>
      </CollapsibleSection>

      {/* ── 4. Placa ─────────────────────────────────────────────── */}
      <CollapsibleSection title="4. Placa / elemento sujetado">
        <div className="grid grid-cols-2 gap-3">
          <UnitInput
            label={`Espesor t (${L.u})`}
            value={L.to(inputs.plateThickness ?? 0)}
            onChange={v => updateInputs({ plateThickness: L.from(v) })}
            tooltip="Eq. 8-49: σbearing = F/(t·d)"
          />
          <UnitInput
            label={`Ancho w (${L.u})`}
            value={L.to(inputs.plateWidth ?? 0)}
            onChange={v => updateInputs({ plateWidth: L.from(v) })}
            tooltip="Opcional — activa la verificación de tensión en el área neta"
          />
          <UnitInput
            label={`Sy placa (${S.u})`}
            value={S.to(inputs.plateSy ?? 0)}
            onChange={v => updateInputs({ plateSy: S.from(v) })}
            tooltip="σ aplastamiento admisible = 0.9·Sy; tensión admisible = 0.6·Sy"
          />
          <UnitInput
            label={`Sut placa (${S.u})`}
            value={S.to(inputs.plateSut ?? 0)}
            onChange={v => updateInputs({ plateSut: S.from(v) })}
          />
        </div>
      </CollapsibleSection>

      {/* ── Factores de seguridad objetivo ──────────────────────── */}
      <CollapsibleSection title={auto ? 'Factores de seguridad objetivo (n cortante define la recomendación)' : 'Factores de seguridad objetivo'} className="lg:col-span-2" defaultOpen={auto}>
        <p className="text-[11px] text-slate-500 mb-3">
          {auto
            ? 'El barrido recomienda el menor perno cuyo factor de seguridad gobernante cumple "n cortante mín".'
            : 'Defina los factores mínimos deseados para el dashboard.'}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">n cortante mín</label>
            <input type="number" step="0.1" min="0.5" max="10" className="input-field"
              value={state.targetSafetyFactors.nShear}
              onChange={e => setTargets({ nShear: parseFloat(e.target.value) || 1 })}
            />
          </div>
          <div>
            <label className="label">n aplastamiento mín</label>
            <input type="number" step="0.1" min="0.5" max="10" className="input-field"
              value={state.targetSafetyFactors.nBearing}
              onChange={e => setTargets({ nBearing: parseFloat(e.target.value) || 1 })}
            />
          </div>
        </div>
      </CollapsibleSection>

      <button
        className="btn-primary w-full py-2.5 text-sm font-bold tracking-wide animate-pulse-glow lg:col-span-2"
        onClick={calculate}
        disabled={state.loading}
      >
        {state.loading ? '⏳ Calculando…' : '⚡ CALCULAR'}
      </button>
    </div>
  );
};
