import React from 'react';
import type { PowerScrewResults } from '@/modules/powerScrew/types';
import type { TensionJointResults } from '@/modules/tensionJoint/types';
import type { ShearJointResults } from '@/modules/shearJoint/types';
import { displayValue, mmToDisplay, NmmToDisplay, convertValueByUnit } from '@/utils/unitConverter';
import { CollapsibleSection } from '@/components/common/CollapsibleSection';

interface Props {
  results:    PowerScrewResults | TensionJointResults | ShearJointResults | any;
  unitSystem: 'SI' | 'imperial';
  moduleType: 'power' | 'tension' | 'shear';
}

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <tr>
    <td className="py-1 text-slate-400 pr-3 w-1/2 text-xs">{label}</td>
    <td className="py-1 font-medium text-slate-100 text-xs">{value}</td>
  </tr>
);

export const ParametersSection: React.FC<Props> = ({ results, unitSystem, moduleType }) => {
  const imp = unitSystem === 'imperial';

  if (moduleType === 'power') {
    const r = results as PowerScrewResults;
    const i = r.input;
    const g = r.geometry;
    return (
      <CollapsibleSection title="Parámetros confirmados">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-slate-800/60">
            <Row label="Tipo de rosca"      value={i.threadType === 'acme' ? 'Acme (α=14.5°)' : 'Cuadrada (α=0°)'} />
            <Row label="Diámetro mayor d"   value={mmToDisplay(g.d, unitSystem)} />
            <Row label="Diámetro medio dm"  value={mmToDisplay(g.dm, unitSystem)} />
            <Row label="Diámetro menor dr"  value={mmToDisplay(g.dr, unitSystem)} />
            <Row label="Paso p"             value={mmToDisplay(g.p, unitSystem)} />
            <Row label="Avance L (n·p)"     value={imp ? `${(g.lead/25.4).toFixed(4)} in (n=${i.numberOfStarts})` : `${g.lead.toFixed(3)} mm (n=${i.numberOfStarts})`} />
            <Row label="Ángulo de avance λ" value={`${g.leadAngleDeg.toFixed(3)}°`} />
            <Row label="Carga axial F"      value={displayValue(i.axialLoad, 'force', unitSystem)} />
            <Row label="μ rosca"            value={i.frictionCoefficient.toString()} />
            <Row label="Collarín"           value={i.hasCollar
              ? `dc=${mmToDisplay(i.collarDiameter ?? 0, unitSystem)}, fc=${i.collarFriction}`
              : '—'} />
            <Row label="Filetes en contacto nt" value={i.engagedThreads.toString()} />
            {i.material && <Row label="Material" value={`${i.material.name} — Sy=${imp ? `${(i.material.Sy * 145.038).toFixed(0)} psi` : `${i.material.Sy} MPa`}`} />}
          </tbody>
        </table>
      </CollapsibleSection>
    );
  }

  if (moduleType === 'tension') {
    const r = results as TensionJointResults;
    const i = r.input;
    const fmtMPa = (v: number) => imp ? `${(v * 145.038).toFixed(0)} psi` : `${v} MPa`;
    const fmtMm  = (v: number) => mmToDisplay(v, unitSystem);
    const fmtMm2 = (v: number) => imp
      ? `${(v / 645.16).toFixed(5)} in²`
      : `${v.toFixed(2)} mm²`;
    const fmtN   = (v: number) => displayValue(v, 'force', unitSystem);

    return (
      <CollapsibleSection title="Parámetros confirmados">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-slate-800/60">
            <Row label="Clase / grado"       value={i.grade.designation} />
            <Row label="Sp / Sy / Sut / Se"  value={`${fmtMPa(i.grade.Sp)} / ${fmtMPa(i.grade.Sy)} / ${fmtMPa(i.grade.Sut)} / ${fmtMPa(i.grade.Se)}`} />
            <Row label="Diámetro d"          value={fmtMm(i.boltDiameter)} />
            <Row label="Paso p"              value={fmtMm(i.pitch)} />
            <Row label="At"                  value={fmtMm2(i.tensileArea)} />
            <Row label="Grip l"              value={fmtMm(i.grip)} />
            <Row label="ld / lt (en grip)"   value={`${fmtMm(i.unthreadedLengthInGrip)} / ${fmtMm(i.threadedLengthInGrip)}`} />
            {(i.kmMethod ?? 'cornwell') === 'cornwell' && i.cornwellPlates?.length ? (
              <>
                <Row label="Método km" value="Cornwell FEA (Norton §11.8, Tabla 11-8)" />
                <Row label="Placas (E, t)" value={
                  (i.cornwellPlates as any[]).map((p: any, idx: number) =>
                    `${idx === 0 ? 'TL' : 'TH'}: E=${p.E_GPa} GPa, t=${fmtMm(p.thickness)}`
                  ).join(' | ')
                } />
              </>
            ) : (
              <>
                <Row label="Método km"          value="Wileman (Ec. 8-23)" />
                <Row label="Material elemento"  value={`${i.memberMaterial} — E=${i.memberE} GPa`} />
                <Row label="Wileman A / B"      value={`${i.wilemanA?.toFixed(5)} / ${i.wilemanB?.toFixed(5)}`} />
              </>
            )}
            <Row label="Tipo de unión"       value={i.permanence === 'reusable' ? 'Reutilizable (Fi=0.75 Fp)' : 'Permanente (Fi=0.90 Fp)'} />
            <Row label="Factor K"            value={i.K.toString()} />
            <Row label="Carga externa P"     value={fmtN(i.externalLoad)} />
            <Row label="Tipo de carga"       value={i.loadType === 'static' ? 'Estática' : 'Fatiga'} />
            {i.loadType === 'fatigue' && (
              <>
                <Row label="Pmin / Pmax" value={`${fmtN(i.Pmin ?? 0)} / ${fmtN(i.Pmax ?? 0)}`} />
                <Row label="Criterio"    value={i.fatigueCriterion ?? 'goodman'} />
              </>
            )}
            {i.hasGasket && (
              <>
                <Row label="— §8-10 Empaque —" value="" />
                <Row label="Ag — área por perno" value={fmtMm2(i.gasketArea ?? 0)} />
                <Row label="n — factor de carga" value={String(i.gasketLoadFactor ?? 1)} />
                {i.boltCircleDiameter != null && (
                  <Row label="Db — Ø círculo de pernos" value={fmtMm(i.boltCircleDiameter)} />
                )}
                {i.numBolts != null && (
                  <Row label="N pernos (Ec. 8-34)" value={String(i.numBolts)} />
                )}
              </>
            )}
          </tbody>
        </table>
      </CollapsibleSection>
    );
  }

  if (moduleType === 'shear') {
    const r = results as ShearJointResults;
    const i = r.input;
    const fmtMPa = (v: number) => imp ? `${(v * 145.038).toFixed(0)} psi` : `${v} MPa`;
    const fmtMm2 = (v: number) => imp ? `${(v / 645.16).toFixed(5)} in²` : `${v.toFixed(2)} mm²`;
    return (
      <CollapsibleSection title="Parámetros confirmados">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-slate-800/60">
            <Row label="N° de pernos"         value={i.bolts.length.toString()} />
            <Row label="Patrón"               value={i.bolts.map((b: any) => `${b.id}(${b.x},${b.y})`).join(', ')} />
            <Row label="Centroide"            value={`(${mmToDisplay(r.centroid.x, unitSystem)}, ${mmToDisplay(r.centroid.y, unitSystem)})`} />
            <Row label="Diámetro d"           value={mmToDisplay(i.boltDiameter, unitSystem)} />
            <Row label="Área a cortante"      value={fmtMm2(i.shearArea)} />
            <Row label="Cortante"             value={i.doubleShear ? 'Doble (2 planos)' : 'Simple'} />
            <Row label="Sp/Sy/Sut perno"      value={`${fmtMPa(i.boltSp)} / ${fmtMPa(i.boltSy)} / ${fmtMPa(i.boltSut)}`} />
            <Row label="Carga V"              value={displayValue(i.V, 'force', unitSystem)} />
            <Row label="Dirección (Vx, Vy)"   value={`(${i.Vx}, ${i.Vy})`} />
            <Row label="Punto de aplicación"  value={`(${mmToDisplay(i.applicationX, unitSystem)}, ${mmToDisplay(i.applicationY, unitSystem)})`} />
            <Row label="Momento M"            value={NmmToDisplay(r.M, unitSystem)} />
            <Row label="Placa t / w"          value={`${mmToDisplay(i.plateThickness, unitSystem)} / ${i.plateWidth != null ? mmToDisplay(i.plateWidth, unitSystem) : '—'}`} />
            <Row label="Sy / Sut placa"       value={`${fmtMPa(i.plateSy)} / ${fmtMPa(i.plateSut)}`} />
          </tbody>
        </table>
      </CollapsibleSection>
    );
  }

  return null;
};
