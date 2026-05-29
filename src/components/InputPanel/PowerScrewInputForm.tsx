import React, { useState } from 'react';
import { useCalculator } from '@/context/CalculatorContext';
import { UnitInput } from '@/components/common/UnitInput';
import { CollapsibleSection } from '@/components/common/CollapsibleSection';
import { DesignModeToggle } from './DesignModeToggle';
import { getAllDiameters, getThreadData } from '@/utils/threadTables';
import { POWER_SCREW_MATERIALS } from '@/utils/materialDatabase';
import type { PowerScrewInput } from '@/modules/powerScrew/types';

/**
 * Captura los datos que Shigley §8-1 y §8-2 requieren para cualquier problema de
 * tornillo de potencia, independientemente del contexto.
 */
export const PowerScrewInputForm: React.FC = () => {
  const { state, updateInputs, setTargets, calculate } = useCalculator();
  const inputs = state.powerInputs as Partial<PowerScrewInput>;
  const auto = state.autoMode.power;

  const [tableStd, setTableStd] = useState<'acme' | 'unc' | 'iso'>('acme');
  const [useTable, setUseTable] = useState(false);
  const [nominal, setNominal]   = useState('1-1/4');
  const [customMaterial, setCustomMaterial] = useState(false);

  // Conversión automática según sistema de unidades global (Header).
  const isImperial = state.unitSystem === 'imperial';
  const L = isImperial
    ? { u: 'in',   to: (mm: number) => mm / 25.4,   from: (v: number) => v * 25.4 }
    : { u: 'mm',   to: (mm: number) => mm,          from: (v: number) => v };
  const F = isImperial
    ? { u: 'lbf',  to: (N: number)  => N  / 4.44822, from: (v: number) => v * 4.44822 }
    : { u: 'N',    to: (N: number)  => N,            from: (v: number) => v };
  const S = isImperial
    ? { u: 'kpsi', to: (MPa: number) => MPa / 6.89476, from: (v: number) => v * 6.89476 }
    : { u: 'MPa',  to: (MPa: number) => MPa,           from: (v: number) => v };

  const loadFromTable = (nom: string) => {
    const td = getThreadData(tableStd, nom);
    if (!td) return;
    updateInputs({
      majorDiameter: td.dM,
      pitch:         td.pitch,
    });
  };

  const handleMaterial = (name: string) => {
    const m = POWER_SCREW_MATERIALS.find(x => x.name === name);
    if (!m) return;
    if (m.name === 'Personalizado') { setCustomMaterial(true); return; }
    setCustomMaterial(false);
    updateInputs({ material: m as any });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <DesignModeToggle tab="power" />

      <div className="card lg:col-span-2">
        <p className="text-xs text-slate-400 mb-2">
          <strong className="text-orange-300">Datos necesarios</strong> — {auto
            ? 'tipo de rosca, n° de entradas, carga, fricción y collarín. La app barre las cuerdas Acme estándar × materiales y recomienda la más pequeña que cumple el factor objetivo.'
            : 'Dimensiones de la rosca, torques de subida/bajada, esfuerzos en el cuerpo (Von Mises) y en el filete. Rellene cada campo con independencia del contexto del problema.'}
        </p>
      </div>

      {/* ── 1. Rosca ───────────────────────────────────────────── */}
      <CollapsibleSection
        title={auto ? '1. Tipo de rosca' : '1. Geometría de la rosca'}
        className="lg:col-span-2"
        extra={auto ? undefined : (
          <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
            <input type="checkbox" checked={useTable} onChange={e => setUseTable(e.target.checked)} className="rounded" />
            Cargar de tabla
          </label>
        )}
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Tipo de rosca</label>
            <select
              className="input-field"
              value={inputs.threadType ?? 'acme'}
              onChange={e => updateInputs({ threadType: e.target.value })}
            >
              <option value="acme">Acme (α = 14.5°)</option>
              <option value="square">Cuadrada (α = 0°)</option>
            </select>
          </div>
          <div>
            <label className="label">N° de entradas n (lead = n·p)</label>
            <select
              className="input-field"
              value={inputs.numberOfStarts ?? 1}
              onChange={e => updateInputs({ numberOfStarts: Number(e.target.value) })}
            >
              {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}{n === 1 ? ' (simple)' : ''}</option>)}
            </select>
          </div>

          {!auto && useTable && (
            <>
              <div>
                <label className="label">Tabla</label>
                <select className="input-field" value={tableStd} onChange={e => setTableStd(e.target.value as any)}>
                  <option value="acme">Acme (in)</option>
                  <option value="unc">UNC (in) — Shigley Tab. 8-1</option>
                  <option value="iso">ISO métrico — Shigley Tab. 8-2</option>
                </select>
              </div>
              <div>
                <label className="label">Diámetro nominal</label>
                <select className="input-field" value={nominal} onChange={e => { setNominal(e.target.value); loadFromTable(e.target.value); }}>
                  {getAllDiameters(tableStd).map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </>
          )}

          {!auto && (
            <>
              <UnitInput
                label={`Diámetro mayor d (${L.u})`}
                value={L.to(inputs.majorDiameter ?? 0)}
                onChange={v => updateInputs({ majorDiameter: L.from(v) })}
                tooltip="Shigley Eq. 8-1: dm = d − p/2, dr = d − p"
                reference="§8-1"
              />
              <UnitInput
                label={`Paso p (${L.u})`}
                value={L.to(inputs.pitch ?? 0)}
                onChange={v => updateInputs({ pitch: L.from(v) })}
                tooltip="Distancia axial entre filetes consecutivos"
              />
            </>
          )}
        </div>

        {!auto && inputs.majorDiameter && inputs.pitch && (
          <div className="mt-2 text-xs text-slate-500 bg-slate-900/30 rounded-lg p-2 space-x-4">
            <span>dm = {L.to(inputs.majorDiameter - inputs.pitch / 2).toFixed(3)} {L.u}</span>
            <span>dr = {L.to(inputs.majorDiameter - inputs.pitch).toFixed(3)} {L.u}</span>
            <span>L = {L.to((inputs.numberOfStarts ?? 1) * inputs.pitch).toFixed(3)} {L.u}</span>
          </div>
        )}
        {auto && (
          <p className="mt-2 text-[11px]" style={{ color: 'var(--c-text-dim)' }}>
            En modo automático no se fija un diámetro: se barren todas las cuerdas Acme estándar (1/2″ … 2″).
          </p>
        )}
      </CollapsibleSection>

      {/* ── 2. Carga ───────────────────────────────────────────── */}
      <CollapsibleSection title="2. Carga axial">
        <UnitInput
          label={`Fuerza axial F (${F.u})`}
          value={F.to(inputs.axialLoad ?? 0)}
          onChange={v => updateInputs({ axialLoad: F.from(v) })}
          tooltip="Carga que el tornillo debe elevar, sostener o aplicar (§8-2)"
          reference="§8-2"
        />
      </CollapsibleSection>

      {/* ── 3. Fricción ────────────────────────────────────────── */}
      <CollapsibleSection title="3. Fricción y collarín">
        <div className="grid grid-cols-2 gap-3">
          <UnitInput
            label="Coef. fricción rosca f"
            value={inputs.frictionCoefficient ?? 0.08}
            onChange={v => updateInputs({ frictionCoefficient: v })}
            step={0.01}
            tooltip="Shigley §8-2: 0.08 lubricado, 0.15 seco"
          />
          <UnitInput
            label="Filetes en contacto nt"
            value={inputs.engagedThreads ?? 2}
            onChange={v => updateInputs({ engagedThreads: Math.round(v) })}
            min={1}
            tooltip="Usado para σ de aplastamiento y flexión del filete (Eqs. 8-11 a 8-13)"
          />

          <div className="col-span-2 flex items-center gap-2">
            <input
              id="pc-collar"
              type="checkbox"
              checked={inputs.hasCollar ?? false}
              onChange={e => updateInputs({ hasCollar: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="pc-collar" className="text-sm text-slate-300">¿Hay collarín de empuje?</label>
          </div>

          {inputs.hasCollar && (
            <>
              <UnitInput
                label={`Diámetro medio del collarín dc (${L.u})`}
                value={L.to(inputs.collarDiameter ?? 0)}
                onChange={v => updateInputs({ collarDiameter: L.from(v) })}
                tooltip="Eq. 8-7: Tc = F·fc·dc/2"
                reference="§8-2"
              />
              <UnitInput
                label="Coef. fricción collarín fc"
                value={inputs.collarFriction ?? 0.08}
                onChange={v => updateInputs({ collarFriction: v })}
                step={0.01}
                tooltip="0.01 cojinete de bolas; 0.08–0.15 empuje deslizante"
              />
            </>
          )}
        </div>
      </CollapsibleSection>

      {/* ── 4. Material (opcional) ─────────────────────────────── */}
      {!auto && (
      <CollapsibleSection title="4. Material del tornillo (opcional)" className="lg:col-span-2" defaultOpen={false}>
        <p className="text-xs text-slate-500 mb-2">
          Shigley pide Sy sólo si se desea calcular un factor de seguridad contra el Von Mises del cuerpo.
        </p>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="label">Material</label>
            <select className="input-field" onChange={e => handleMaterial(e.target.value)} defaultValue="">
              <option value="">— Sin especificar —</option>
              {POWER_SCREW_MATERIALS.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
            </select>
          </div>
          {customMaterial && (
            <div className="grid grid-cols-3 gap-2">
              <UnitInput label={`Sy (${S.u})`}  value={S.to(inputs.material?.Sy ?? 0)}  onChange={v => updateInputs({ material: { ...(inputs.material as any), name: 'Personalizado', Sy: S.from(v) } })} />
              <UnitInput label={`Sut (${S.u})`} value={S.to(inputs.material?.Sut ?? 0)} onChange={v => updateInputs({ material: { ...(inputs.material as any), Sut: S.from(v) } })} />
              <UnitInput label={isImperial ? 'E (Mpsi)' : 'E (GPa)'} value={isImperial ? (inputs.material?.E ?? 207) / 6.89476 : (inputs.material?.E ?? 207)} onChange={v => updateInputs({ material: { ...(inputs.material as any), E: isImperial ? v * 6.89476 : v } })} />
            </div>
          )}
          {inputs.material && (
            <div className="text-xs text-slate-500 bg-slate-900/30 rounded p-2">
              {inputs.material.name} — Sy = {inputs.material.Sy} MPa, Sut = {inputs.material.Sut} MPa
            </div>
          )}
        </div>
      </CollapsibleSection>
      )}

      {/* ── Factores de seguridad objetivo ──────────────────────── */}
      <CollapsibleSection title={auto ? 'Factor de seguridad objetivo (define la recomendación)' : 'Factor de seguridad objetivo'} defaultOpen={auto}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">n fluencia mín</label>
            <input type="number" step="0.1" min="0.5" max="10" className="input-field"
              value={state.targetSafetyFactors.nYield}
              onChange={e => setTargets({ nYield: parseFloat(e.target.value) || 1 })}
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
