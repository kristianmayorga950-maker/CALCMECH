import React, { useState, useEffect, useRef } from 'react';
import { useCalculator } from '@/context/CalculatorContext';
import { UnitInput } from '@/components/common/UnitInput';
import { CollapsibleSection } from '@/components/common/CollapsibleSection';
import { getAllThreads, getThreadData } from '@/utils/threadTables';
import {
  getAllISOClasses,
  getAllSAEGrades,
  getAllWilemanConstants,
  getTorqueFactors,
} from '@/utils/materialDatabase';
import type { TensionJointInput, CornwellPlate } from '@/modules/tensionJoint/types';

/** Controlled numeric text input with comma-warning and alt-unit hint. */
const MemberEField: React.FC<{
  displayValue: number;
  onCommit: (v: number) => void;
  altText: string;
}> = ({ displayValue, onCommit, altText }) => {
  const fmt = (n: number) => parseFloat(n.toPrecision(7)).toString();
  const [local, setLocal] = useState(() => fmt(displayValue));
  const [commaWarn, setCommaWarn] = useState(false);
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setLocal(fmt(displayValue));
  }, [displayValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setLocal(raw);
    const hasComma = raw.includes(',');
    setCommaWarn(hasComma);
    const parsed = parseFloat(hasComma ? raw.replace(',', '.') : raw);
    if (!isNaN(parsed)) onCommit(parsed);
  };

  const handleBlur = () => {
    focused.current = false;
    setCommaWarn(false);
    const parsed = parseFloat(local.replace(',', '.'));
    if (isNaN(parsed) || local.trim() === '') {
      setLocal(fmt(displayValue));
    } else {
      setLocal(fmt(parsed));
    }
  };

  return (
    <div>
      <input
        type="text"
        inputMode="decimal"
        value={local}
        className="input-field w-full"
        onChange={handleChange}
        onFocus={() => { focused.current = true; }}
        onBlur={handleBlur}
      />
      {commaWarn
        ? <p className="mt-1 text-xs text-amber-400 font-medium">⚠ Usa punto (.) como separador decimal, no coma (,).</p>
        : <p className="mt-1 text-[11px] text-slate-500 font-mono">{altText}</p>
      }
    </div>
  );
};

// ─── Norton Tabla 11-10 — Materiales de empaque ──────────────────────────────
const GASKET_MATERIALS = [
  { id: 'cork',              name: 'Corcho (cork)',                     Eg_MPa: 0.52      },
  { id: 'flat_rubber',       name: 'Caucho plano (flat rubber)',        Eg_MPa: 0.01      },
  { id: 'compressed_asb',    name: 'Asbesto comprimido',                Eg_MPa: 70        },
  { id: 'vegetable_fiber',   name: 'Fibra vegetal',                     Eg_MPa: 170       },
  { id: 'teflon',            name: 'Teflón (PTFE)',                     Eg_MPa: 350       },
  { id: 'spiral_wound',      name: 'Espiral devanada (spiral wound)',   Eg_MPa: 140       },
  { id: 'asbestos_copper',   name: 'Asbesto-cobre',                     Eg_MPa: 13500     },
  { id: 'pure_copper',       name: 'Cobre puro',                       Eg_MPa: 17500     },
  { id: 'custom',            name: 'Personalizado',                     Eg_MPa: 0         },
];

// ─── Materiales para placas Cornwell ─────────────────────────────────────────
const PLATE_MATERIALS = [
  { id: 'steel',      name: 'Acero (207 GPa)',          E_GPa: 207  },
  { id: 'aluminum',   name: 'Aluminio (71.7 GPa)',      E_GPa: 71.7 },
  { id: 'copper',     name: 'Cobre (119 GPa)',          E_GPa: 119  },
  { id: 'cast_iron',  name: 'Hierro colado (100 GPa)',  E_GPa: 100  },
  { id: 'titanium',   name: 'Titanio (114 GPa)',        E_GPa: 114  },
  { id: 'custom',     name: 'Personalizado',            E_GPa: 0    },
];

/**
 * Junta atornillada a tensión — Norton §11 + Shigley §8-3 a §8-11.
 */
export const TensionJointInputForm: React.FC = () => {
  const { state, updateInputs, setTargets, calculate } = useCalculator();
  const inputs = state.tensionInputs as Partial<TensionJointInput>;

  const [gradeStd, setGradeStd]   = useState<'iso' | 'sae'>('iso');
  const [threadStd, setThreadStd] = useState<'iso' | 'unc' | 'unf'>('iso');
  const [threadNom, setThreadNom] = useState('M12');

  const [gradeStressUnit, setGradeStressUnit] = useState<'MPa' | 'kpsi'>('MPa');
  const [gripUnit, setGripUnit] = useState<'mm' | 'in'>('mm');

  const [memberEUnit, setMemberEUnit] = useState<'GPa' | 'MPa' | 'Mpsi'>('GPa');
  const GPa_PER_MPSI = 6.89476;
  const toMemberEDisp = (gpa: number) =>
    memberEUnit === 'MPa'  ? gpa * 1000         :
    memberEUnit === 'Mpsi' ? gpa / GPa_PER_MPSI :
    gpa;
  const fromMemberEDisp = (v: number) =>
    memberEUnit === 'MPa'  ? v / 1000           :
    memberEUnit === 'Mpsi' ? v * GPa_PER_MPSI   :
    v;

  const [useTable87, setUseTable87] = useState(false);
  const [boltLengthL, setBoltLengthL] = useState(0);

  const computeTable87 = (d: number, L: number, l: number, std: 'iso' | 'unc' | 'unf') => {
    let LT: number;
    let formula: string;
    if (std === 'iso') {
      if (L <= 125)       { LT = 2 * d + 6;  formula = 'LT = 2d + 6 mm   (L ≤ 125 mm)'; }
      else if (L <= 200)  { LT = 2 * d + 12; formula = 'LT = 2d + 12 mm  (125 < L ≤ 200 mm)'; }
      else                { LT = 2 * d + 25; formula = 'LT = 2d + 25 mm  (L > 200 mm)'; }
    } else {
      const d_in = d / 25.4, L_in = L / 25.4;
      const LT_in = L_in <= 6 ? 2 * d_in + 0.25 : 2 * d_in + 0.5;
      LT = LT_in * 25.4;
      formula = L_in <= 6 ? 'LT = 2d + 1/4 in  (L ≤ 6 in)' : 'LT = 2d + 1/2 in  (L > 6 in)';
    }
    const ldTotal = Math.max(0, L - LT);
    const ld = Math.min(ldTotal, l);
    const lt = Math.max(0, l - ld);
    const warning = LT >= L ? 'LT ≥ L: perno completamente roscado en la longitud dada.' : undefined;
    return { LT, ld, lt, formula, warning };
  };

  const d87 = inputs.boltDiameter ?? 0;
  const l87 = inputs.grip ?? 0;
  useEffect(() => {
    if (!useTable87 || d87 <= 0 || boltLengthL <= 0 || l87 <= 0) return;
    const r = computeTable87(d87, boltLengthL, l87, threadStd);
    updateInputs({ unthreadedLengthInGrip: r.ld, threadedLengthInGrip: r.lt });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useTable87, d87, boltLengthL, l87, threadStd]);

  // ── Section 7 — gasket ────────────────────────────────────────────────────
  const [hasGasket, setHasGasket] = useState(false);
  const [gasketType, setGasketTypeLocal] = useState<'confined' | 'unconfined'>('confined');
  const [gasketMatId, setGasketMatId] = useState<string>('cork');
  const [gasketNStr,  setGasketNStr]  = useState('1');
  const [gasketDbStr, setGasketDbStr] = useState('');
  const [gasketNbStr, setGasketNbStr] = useState('');
  const [gasketEgStr, setGasketEgStr] = useState('');  // MPa, string for custom
  const [gasketTgStr, setGasketTgStr] = useState('3'); // mm

  const switchGasketMat = (id: string) => {
    setGasketMatId(id);
    const mat = GASKET_MATERIALS.find(m => m.id === id);
    if (mat && id !== 'custom') {
      setGasketEgStr(String(mat.Eg_MPa));
      updateInputs({ gasketEg_MPa: mat.Eg_MPa });
    }
  };

  const setGasketType = (t: 'confined' | 'unconfined') => {
    setGasketTypeLocal(t);
    updateInputs({ gasketType: t });
    if (t === 'confined') {
      updateInputs({ gasketEg_MPa: undefined, gasketThickness_mm: undefined });
    }
  };

  // ── Section 6 — load division ─────────────────────────────────────────────
  const [useLoadDivision, setUseLoadDivision] = useState(false);
  const [pTotal, setPTotal]   = useState(0);
  const [numBolts, setNumBolts] = useState(1);
  const [numBoltsStr, setNumBoltsStr] = useState('1');

  useEffect(() => {
    if (!useLoadDivision || numBolts <= 0) return;
    updateInputs({ externalLoad: pTotal / numBolts });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useLoadDivision, pTotal, numBolts]);

  // ── Section 5 — preload unit ──────────────────────────────────────────────
  type PreloadUnit = 'N' | 'kN' | 'lbf' | 'kips' | 'kgf' | 'tf';
  const [preloadUnit, setPreloadUnit] = useState<PreloadUnit>('N');
  const preloadToN: Record<PreloadUnit, number> = { N: 1, kN: 1000, lbf: 4.44822, kips: 4448.22, kgf: 9.80665, tf: 9806.65 };
  const toPreloadDisplay = (n: number) => n / preloadToN[preloadUnit];
  const fromPreload      = (v: number) => v * preloadToN[preloadUnit];
  const [customPctStr, setCustomPctStr] = useState<string>(
    String(((inputs.preloadFactor ?? 0.75) * 100).toFixed(1)),
  );

  // ── Section 4 — km method ─────────────────────────────────────────────────
  const [kmMethod, setKmMethod] = useState<'wileman' | 'cornwell'>(
    (inputs.kmMethod as any) === 'rotscher' ? 'wileman' : (inputs.kmMethod ?? 'cornwell'),
  );

  // Default Cornwell plates: one steel plate (same material case)
  const defaultPlates: CornwellPlate[] = inputs.cornwellPlates?.length
    ? inputs.cornwellPlates
    : [{ E_GPa: 207, thickness: inputs.grip ?? 30, label: 'Placa inferior (acero)' }];

  const [cornwellPlates, setCornwellPlates] = useState<CornwellPlate[]>(defaultPlates);
  const [twoPlateCornwell, setTwoPlateCornwell] = useState(defaultPlates.length > 1);

  const [cornwellEUnit, setCornwellEUnit] = useState<'GPa' | 'MPa' | 'Mpsi'>('GPa');
  const toCornwellEDisp = (gpa: number) =>
    cornwellEUnit === 'MPa'  ? gpa * 1000         :
    cornwellEUnit === 'Mpsi' ? gpa / GPa_PER_MPSI :
    gpa;
  const fromCornwellEDisp = (v: number) =>
    cornwellEUnit === 'MPa'  ? v / 1000           :
    cornwellEUnit === 'Mpsi' ? v * GPa_PER_MPSI   :
    v;

  const handleKmMethod = (method: 'wileman' | 'cornwell') => {
    setKmMethod(method);
    updateInputs({ kmMethod: method });
  };

  const updateCornwellPlate = (idx: number, field: keyof CornwellPlate, raw: number) => {
    let val: number;
    if (field === 'E_GPa') {
      val = fromCornwellEDisp(raw);
    } else if (field === 'thickness' && gripUnit === 'in') {
      val = raw * 25.4;
    } else {
      val = raw;
    }
    const updated = cornwellPlates.map((p, i) => i === idx ? { ...p, [field]: val } : p);
    setCornwellPlates(updated);
    updateInputs({ cornwellPlates: updated });
  };

  const setCornwellPlateMaterial = (idx: number, matId: string) => {
    const mat = PLATE_MATERIALS.find(m => m.id === matId);
    if (!mat || mat.id === 'custom') return;
    const label = mat.id === 'custom' ? cornwellPlates[idx]?.label : mat.name;
    const updated = cornwellPlates.map((p, i) => i === idx ? { ...p, E_GPa: mat.E_GPa, label: label ?? '' } : p);
    setCornwellPlates(updated);
    updateInputs({ cornwellPlates: updated });
  };

  const enableTwoPlate = (enable: boolean) => {
    setTwoPlateCornwell(enable);
    if (enable && cornwellPlates.length < 2) {
      const updated = [
        cornwellPlates[0] ?? { E_GPa: 207, thickness: (inputs.grip ?? 30) * 0.5, label: 'Placa inferior' },
        { E_GPa: 207, thickness: (inputs.grip ?? 30) * 0.5, label: 'Placa superior' },
      ];
      setCornwellPlates(updated);
      updateInputs({ cornwellPlates: updated });
    } else if (!enable) {
      const single = [cornwellPlates[0] ?? { E_GPa: 207, thickness: inputs.grip ?? 30, label: '' }];
      setCornwellPlates(single);
      updateInputs({ cornwellPlates: single });
    }
  };

  // ── Unit conversion helpers ───────────────────────────────────────────────
  const isImperial = state.unitSystem === 'imperial';
  const lenUnit   = isImperial ? 'in'  : 'mm';
  const forceUnit = isImperial ? 'lbf' : 'N';
  const areaUnit  = isImperial ? 'in²' : 'mm²';

  const toLenDisplay   = (mm: number)  => isImperial ? mm / 25.4     : mm;
  const toForceDisplay = (N: number)   => isImperial ? N  / 4.44822  : N;
  const toAreaDisplay  = (mm2: number) => isImperial ? mm2 / 645.16  : mm2;

  const fromLen   = (v: number) => isImperial ? v * 25.4    : v;
  const fromForce = (v: number) => isImperial ? v * 4.44822 : v;
  const fromArea  = (v: number) => isImperial ? v * 645.16  : v;

  const loadThread = (nom: string) => {
    const td = getThreadData(threadStd, nom);
    if (!td) return;
    updateInputs({ boltDiameter: td.dM, pitch: td.pitch, tensileArea: td.At });
  };

  const handleGrade = (designation: string) => {
    const list = gradeStd === 'iso' ? getAllISOClasses() : getAllSAEGrades();
    const g = list.find(m => m.grade === designation);
    if (!g) return;
    updateInputs({ grade: { designation: g.designation, Sut: g.Sut, Sy: g.Sy, Sp: g.Sp, Se: g.Se, E: g.E, sizeRange: g.sizeRange, head: g.head } });
  };

  const handleMemberMaterial = (mat: string) => {
    if (mat === 'custom') { updateInputs({ memberMaterial: 'custom' }); return; }
    const w = getAllWilemanConstants().find(x => x.material === mat);
    if (!w) return;
    updateInputs({ memberMaterial: w.material, memberE: w.E, wilemanA: w.A, wilemanB: w.B });
  };

  const threads  = getAllThreads(threadStd);
  const isoList  = getAllISOClasses();
  const saeList  = getAllSAEGrades();
  const wilemans = getAllWilemanConstants();
  const torqueKs = getTorqueFactors();

  // Derived for Cornwell preview
  const j_preview = (inputs.boltDiameter ?? 0) > 0 && (inputs.grip ?? 0) > 0
    ? ((inputs.boltDiameter ?? 0) / (inputs.grip ?? 1)).toFixed(3)
    : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <div className="card lg:col-span-2">
        <p className="text-xs text-slate-400">
          <strong className="text-orange-300">Datos necesarios</strong> — Geometría del perno, grado del material,
          longitudes de agarre, rigidez del paquete (Cornwell FEA o Wileman), factor K del apriete y carga por perno.
        </p>
      </div>

      {/* ── 1. Perno ──────────────────────────────────────────────── */}
      <CollapsibleSection title="1. Geometría del perno">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Estándar de rosca</label>
            <select className="input-field" value={threadStd} onChange={e => setThreadStd(e.target.value as any)}>
              <option value="iso">ISO métrico — Tab. 8-2</option>
              <option value="unc">UNC — Series gruesas (in)</option>
              <option value="unf">UNF — Series finas (in)</option>
            </select>
          </div>
          <div>
            <label className="label">Designación</label>
            <select className="input-field" value={threadNom}
              onChange={e => { setThreadNom(e.target.value); loadThread(e.target.value); }}>
              <option value="">— Personalizado —</option>
              {threads.map(t => (
                <option key={t.nominal} value={t.nominal}>
                  {t.nominal} (At = {t.At} mm²)
                </option>
              ))}
            </select>
          </div>

          <UnitInput
            label={`Diámetro d (${lenUnit})`}
            value={toLenDisplay(inputs.boltDiameter ?? 0)}
            onChange={v => updateInputs({ boltDiameter: fromLen(v) })}
            reference="§8-3"
            altDisplay={isImperial ? `= ${(inputs.boltDiameter ?? 0).toFixed(3)} mm` : `= ${((inputs.boltDiameter ?? 0) / 25.4).toFixed(5)} in`}
          />
          <UnitInput
            label={`Paso p (${lenUnit})`}
            value={toLenDisplay(inputs.pitch ?? 0)}
            onChange={v => updateInputs({ pitch: fromLen(v) })}
            altDisplay={isImperial ? `= ${(inputs.pitch ?? 0).toFixed(3)} mm` : `= ${((inputs.pitch ?? 0) / 25.4).toFixed(5)} in`}
          />
          <UnitInput
            label={`Área de tensión At (${areaUnit})`}
            value={toAreaDisplay(inputs.tensileArea ?? 0)}
            onChange={v => updateInputs({ tensileArea: fromArea(v) })}
            tooltip="Tabla 8-1 / 8-2 de Shigley"
            reference="§8-3"
            altDisplay={isImperial ? `= ${(inputs.tensileArea ?? 0).toFixed(3)} mm²` : `= ${((inputs.tensileArea ?? 0) / 645.16).toFixed(6)} in²`}
          />
        </div>
      </CollapsibleSection>

      {/* ── 2. Grado del perno ──────────────────────────────────────── */}
      <CollapsibleSection
        title="2. Grado / clase"
        extra={
          <div className="flex rounded-md overflow-hidden border border-material-border">
            {(['MPa', 'kpsi'] as const).map((u, i) => (
              <button key={u} onClick={() => setGradeStressUnit(u)}
                className={['px-3 py-1 text-xs font-semibold transition-all duration-150',
                  i === 1 ? 'border-l border-material-border' : '',
                  gradeStressUnit === u ? 'bg-orange-500 text-white' : 'bg-material-card text-slate-600 hover:text-material-dark hover:bg-material-bg',
                ].join(' ')}>{u}</button>
            ))}
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Sistema</label>
            <select className="input-field" value={gradeStd} onChange={e => setGradeStd(e.target.value as any)}>
              <option value="iso">ISO métrico — Tab. 8-11</option>
              <option value="sae">SAE — Tab. 8-9</option>
            </select>
          </div>
          <div>
            <label className="label">Clase / Grado</label>
            <select className="input-field" value={inputs.grade?.designation ?? ''}
              onChange={e => handleGrade(e.target.value)}>
              <option value="">— Seleccione —</option>
              {(gradeStd === 'iso' ? isoList : saeList).map(g => {
                const sp  = gradeStressUnit === 'kpsi' ? `${(g.Sp  * 0.145038).toFixed(1)} kpsi` : `${g.Sp} MPa`;
                const sy  = gradeStressUnit === 'kpsi' ? `${(g.Sy  * 0.145038).toFixed(1)} kpsi` : `${g.Sy} MPa`;
                const sut = gradeStressUnit === 'kpsi' ? `${(g.Sut * 0.145038).toFixed(1)} kpsi` : `${g.Sut} MPa`;
                return <option key={g.grade} value={g.grade}>{g.grade} — Sp {sp} / Sy {sy} / Sut {sut}</option>;
              })}
            </select>
          </div>
        </div>
        {inputs.grade && (() => {
          const fmt = (v: number) =>
            gradeStressUnit === 'kpsi' ? `${(v * 0.145038).toFixed(1)} kpsi` : `${v} MPa`;
          return (
            <div className="mt-2 text-xs text-slate-500 bg-material-bg rounded p-2 space-y-0.5">
              <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                <span>Sp = <strong className="text-material-dark">{fmt(inputs.grade.Sp)}</strong></span>
                <span>Sy = <strong className="text-material-dark">{fmt(inputs.grade.Sy)}</strong></span>
                <span>Sut = <strong className="text-material-dark">{fmt(inputs.grade.Sut)}</strong></span>
                <span>Se = <strong className="text-material-dark">{fmt(inputs.grade.Se)}</strong></span>
              </div>
              <div className="text-slate-400">{inputs.grade.designation}{inputs.grade.sizeRange ? ` — ${inputs.grade.sizeRange}` : ''}</div>
            </div>
          );
        })()}
      </CollapsibleSection>

      {/* ── 3. Grip / longitudes ──────────────────────────────────── */}
      <CollapsibleSection
        title="3. Longitud de agarre"
        className="lg:col-span-2"
        extra={
          <div className="flex rounded-md overflow-hidden border border-material-border">
            {(['mm', 'in'] as const).map((u, i) => (
              <button key={u} onClick={() => setGripUnit(u)}
                className={['px-3 py-1 text-xs font-semibold transition-all duration-150',
                  i === 1 ? 'border-l border-material-border' : '',
                  gripUnit === u ? 'bg-orange-500 text-white' : 'bg-material-card text-slate-600 hover:text-material-dark hover:bg-material-bg',
                ].join(' ')}>{u}</button>
            ))}
          </div>
        }
      >

        <div className="flex gap-2 mb-3">
          {[
            { val: false, label: 'Manual — ingresar ld y lt' },
            { val: true,  label: 'Auto — Tabla 8-7 (solo L y l)' },
          ].map(({ val, label }) => (
            <button key={label} onClick={() => setUseTable87(val)}
              className={['flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-200',
                useTable87 === val ? 'bg-orange-500 text-white border-orange-500' : 'bg-material-card text-slate-600 border-material-border hover:border-orange-400 hover:text-material-dark',
              ].join(' ')}>{label}</button>
          ))}
        </div>

        {(() => {
          const toDisp   = (mm: number) => gripUnit === 'in' ? mm / 25.4 : mm;
          const fromDisp = (v: number)  => gripUnit === 'in' ? v  * 25.4 : v;
          const fmt      = (mm: number) => toDisp(mm).toFixed(gripUnit === 'in' ? 4 : 2);

          if (!useTable87) {
            return (
              <>
                <p className="text-xs text-slate-500 mb-2">
                  Eq. 8-17: kb = (Ad·At·E) / (Ad·lt + At·ld). Divida el grip en parte sin rosca (ld) y parte roscada (lt).
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <UnitInput label={`Grip l (${gripUnit})`} value={toDisp(inputs.grip ?? 0)} onChange={v => updateInputs({ grip: fromDisp(v) })} tooltip="Espesor total del material apretado" reference="§8-4" />
                  <UnitInput label={`ld — sin rosca en grip (${gripUnit})`} value={toDisp(inputs.unthreadedLengthInGrip ?? 0)} onChange={v => updateInputs({ unthreadedLengthInGrip: fromDisp(v) })} tooltip="Si todo está roscado, ponga 0" />
                  <UnitInput label={`lt — roscado en grip (${gripUnit})`} value={toDisp(inputs.threadedLengthInGrip ?? 0)} onChange={v => updateInputs({ threadedLengthInGrip: fromDisp(v) })} />
                </div>
              </>
            );
          }

          const d = inputs.boltDiameter ?? 0;
          const l = inputs.grip ?? 0;
          const result = d > 0 && boltLengthL > 0 && l > 0 ? computeTable87(d, boltLengthL, l, threadStd) : null;

          return (
            <>
              <p className="text-xs text-slate-500 mb-3">
                Shigley Tab. 8-7 — calcula la longitud de rosca estándar LT en función del diámetro d y la longitud total del perno L.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <UnitInput label={`Grip l — espesor total (${gripUnit})`} value={toDisp(l)} onChange={v => updateInputs({ grip: fromDisp(v) })} tooltip="Espesor total entre cara del perno y tuerca" reference="§8-4" />
                <UnitInput label={`Longitud del perno L (${gripUnit})`} value={toDisp(boltLengthL)} onChange={v => setBoltLengthL(fromDisp(v))} tooltip="Longitud total del perno (sin contar la cabeza)" reference="Tab. 8-7" />
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Diámetro d: <strong className="text-material-dark">{toDisp(d).toFixed(gripUnit === 'in' ? 4 : 2)} {gripUnit}</strong>
                {' · '}Estándar: <strong className="text-material-dark">{threadStd === 'iso' ? 'ISO métrico' : threadStd === 'unc' ? 'UNC' : 'UNF'}</strong>
              </div>
              {result ? (
                <div className="mt-3 rounded-lg border border-material-border bg-material-bg overflow-hidden">
                  <div className="px-3 py-2 border-b border-material-border text-[11px] text-slate-500">
                    <span className="text-orange-600 font-semibold">Tab. 8-7 </span>{result.formula}
                  </div>
                  <div className="grid grid-cols-3 divide-x divide-material-border">
                    {[
                      { sym: 'LT', label: 'Rosca estándar',    val: result.LT, color: 'text-blue-600' },
                      { sym: 'ld', label: 'Sin rosca en grip', val: result.ld, color: 'text-emerald-600' },
                      { sym: 'lt', label: 'Roscado en grip',   val: result.lt, color: 'text-orange-600' },
                    ].map(({ sym, label, val, color }) => (
                      <div key={sym} className="flex flex-col items-center py-2.5 px-1">
                        <span className={`text-base font-bold font-mono ${color}`}>{fmt(val)} <span className="text-xs font-normal">{gripUnit}</span></span>
                        <span className={`text-[11px] font-semibold ${color} opacity-80`}>{sym}</span>
                        <span className="text-[10px] text-slate-500 mt-0.5 text-center leading-tight">{label}</span>
                      </div>
                    ))}
                  </div>
                  {result.warning && (
                    <div className="px-3 py-1.5 border-t border-amber-300/40 bg-amber-50 text-[11px] text-amber-700">⚠ {result.warning}</div>
                  )}
                </div>
              ) : (
                <div className="mt-3 rounded-lg border border-material-border bg-material-bg px-3 py-3 text-xs text-slate-500 text-center">
                  Ingrese l, L y seleccione d en §8-3 para calcular.
                </div>
              )}
            </>
          );
        })()}
      </CollapsibleSection>

      {/* ── 4. Rigidez del elemento ────────────────────────────────── */}
      <CollapsibleSection title="4. Rigidez del paquete" className="lg:col-span-2">

        {/* Method toggle */}
        <div className="flex gap-2 mb-3">
          <button onClick={() => handleKmMethod('cornwell')}
            className={['flex-1 py-2 text-xs font-semibold rounded-lg border transition-all duration-200',
              kmMethod === 'cornwell' ? 'bg-orange-500 text-white border-orange-500' : 'bg-material-card text-slate-600 border-material-border hover:border-orange-400 hover:text-material-dark',
            ].join(' ')}>
            ⚡ Cornwell FEA — recomendado
          </button>
          <button onClick={() => handleKmMethod('wileman')}
            className={['flex-1 py-2 text-xs font-semibold rounded-lg border transition-all duration-200',
              kmMethod === 'wileman' ? 'bg-orange-500 text-white border-orange-500' : 'bg-material-card text-slate-600 border-material-border hover:border-orange-400 hover:text-material-dark',
            ].join(' ')}>
            Wileman
          </button>
        </div>

        {kmMethod === 'cornwell' ? (
          <>
            <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 mb-3 text-xs text-orange-800">
              <strong>Método Cornwell FEA</strong> — da la constante C = k<sub>b</sub>/(k<sub>b</sub>+k<sub>m</sub>) directamente
              mediante regresión FEA. Solo requiere los módulos E de las placas y su espesor. Válido para j = d/l ∈ [0.10, 2.00].
            </div>

            {/* j preview */}
            {j_preview && (
              <div className="mb-3 flex items-center gap-2 text-xs text-slate-600">
                <span className="font-semibold text-orange-600">j = d/l =</span>
                <span className="font-mono font-bold text-material-dark">{j_preview}</span>
                {parseFloat(j_preview) < 0.10 || parseFloat(j_preview) > 2.00
                  ? <span className="text-amber-600 font-medium">⚠ Fuera del rango [0.10, 2.00] de la Tabla 11-8</span>
                  : <span className="text-emerald-600">✓ dentro del rango de la tabla</span>
                }
              </div>
            )}

            {/* Mismo material / Dos materiales toggle */}
            <div className="flex gap-2 mb-4">
              <button onClick={() => enableTwoPlate(false)}
                className={['flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-200',
                  !twoPlateCornwell ? 'bg-blue-600 text-white border-blue-600' : 'bg-material-card text-slate-600 border-material-border hover:border-blue-400',
                ].join(' ')}>
                Mismo material (una placa)
              </button>
              <button onClick={() => enableTwoPlate(true)}
                className={['flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-200',
                  twoPlateCornwell ? 'bg-blue-600 text-white border-blue-600' : 'bg-material-card text-slate-600 border-material-border hover:border-blue-400',
                ].join(' ')}>
                Dos materiales (Ec. 11.22)
              </button>
            </div>

            {/* E unit toggle */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] text-slate-500">Unidad E:</span>
              <div className="flex rounded-md overflow-hidden border border-material-border">
                {(['GPa', 'MPa', 'Mpsi'] as const).map((u, i) => (
                  <button key={u} type="button" onClick={() => setCornwellEUnit(u)}
                    className={['px-3 py-0.5 text-xs font-semibold transition-all duration-150',
                      i > 0 ? 'border-l border-material-border' : '',
                      cornwellEUnit === u ? 'bg-orange-500 text-white' : 'bg-material-card text-slate-600 hover:text-material-dark hover:bg-material-bg',
                    ].join(' ')}>{u}</button>
                ))}
              </div>
            </div>

            {/* Plates */}
            <div className="space-y-3">
              {cornwellPlates.slice(0, twoPlateCornwell ? 2 : 1).map((plate, idx) => {
                const toDisp   = (mm: number) => gripUnit === 'in' ? mm / 25.4 : mm;
                const fromDisp = (v: number)  => gripUnit === 'in' ? v * 25.4  : v;
                const label = idx === 0 ? 'Placa inferior (TL)' : 'Placa superior (TH)';
                return (
                  <div key={idx} className={['rounded-lg border p-3', idx === 0 ? 'border-orange-200 bg-orange-50/50' : 'border-blue-200 bg-blue-50/50'].join(' ')}>
                    <p className={['text-[11px] font-bold uppercase tracking-wider mb-2', idx === 0 ? 'text-orange-700' : 'text-blue-700'].join(' ')}>{label}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="label">Material</label>
                        <select className="input-field" defaultValue=""
                          onChange={e => { if (e.target.value) setCornwellPlateMaterial(idx, e.target.value); e.target.value = ''; }}>
                          <option value="">— seleccionar —</option>
                          {PLATE_MATERIALS.filter(m => m.id !== 'custom').map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label">E ({cornwellEUnit})</label>
                        <input type="number" className="input-field" step="any"
                          value={+toCornwellEDisp(plate.E_GPa).toPrecision(7)}
                          onChange={e => updateCornwellPlate(idx, 'E_GPa', parseFloat(e.target.value) || 0)} />
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Módulo elástico de la placa {idx === 0 ? 'inferior' : 'superior'}
                        </p>
                      </div>
                      <div>
                        <label className="label">Espesor T{idx === 0 ? 'L' : 'H'} ({gripUnit})</label>
                        <input type="number" className="input-field" step="any"
                          value={+(toDisp(plate.thickness)).toPrecision(6)}
                          onChange={e => updateCornwellPlate(idx, 'thickness', fromDisp(parseFloat(e.target.value) || 0))} />
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {twoPlateCornwell ? (idx === 0 ? 'TL — placa inferior' : 'TH — placa superior') : 'Espesor total del paquete (= grip l)'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* t ratio preview for two-plate case */}
            {twoPlateCornwell && cornwellPlates.length >= 2 && (() => {
              const TL = cornwellPlates[0].thickness;
              const TH = cornwellPlates[1].thickness;
              const total = TL + TH;
              const t = total > 0 ? (TL / total).toFixed(3) : '—';
              const rL = (cornwellPlates[0].E_GPa / (inputs.grade?.E ?? 207)).toFixed(3);
              const rH = (cornwellPlates[1].E_GPa / (inputs.grade?.E ?? 207)).toFixed(3);
              return (
                <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                  {[
                    { label: 'rL = EL/Eb', val: rL, color: 'text-orange-600' },
                    { label: 'rH = EH/Eb', val: rH, color: 'text-blue-600' },
                    { label: 't = TL/(TL+TH)', val: t, color: 'text-slate-600' },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="rounded-md border border-material-border bg-material-bg py-1.5 px-1">
                      <p className={`text-sm font-bold font-mono ${color}`}>{val}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              );
            })()}

            <p className="text-[10px] text-slate-400 mt-2 italic">
              Tabla 11-8 interpolada por j = d/l. C_metal = CL + t·(CH − CL) (Ec. 11.22).
              km se deduce: km = kb·(1−C)/C.
            </p>
          </>
        ) : (
          /* ── Wileman ── */
          <>
            <p className="text-xs text-slate-500 mb-2">
              Ec. 8-23: km = E·d·A·exp(B·d/l) — todos los elementos del mismo material.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="label">Material del elemento</label>
                <select className="input-field" value={inputs.memberMaterial ?? 'steel'} onChange={e => handleMemberMaterial(e.target.value)}>
                  {wilemans.map(w => (
                    <option key={w.material} value={w.material}>
                      {w.name} — E = {w.E} GPa ({(w.E / GPa_PER_MPSI).toFixed(4)} Mpsi), A = {w.A}, B = {w.B}
                    </option>
                  ))}
                  <option value="custom">Personalizado</option>
                </select>
              </div>

              <div className="sm:col-span-2 mb-3">
                <div className="flex items-center justify-between mb-1">
                  <label className="label mb-0">
                    E elemento ({memberEUnit})
                    <span className="ml-1 text-blue-500 cursor-help" title="Módulo de elasticidad del material del elemento sujetado">ⓘ</span>
                  </label>
                  <div className="flex rounded-md overflow-hidden border border-material-border">
                    {(['GPa', 'MPa', 'Mpsi'] as const).map((u, i) => (
                      <button key={u} type="button" onClick={() => setMemberEUnit(u)}
                        className={['px-3 py-0.5 text-xs font-semibold transition-all duration-150',
                          i > 0 ? 'border-l border-material-border' : '',
                          memberEUnit === u ? 'bg-orange-500 text-white' : 'bg-material-card text-slate-600 hover:text-material-dark hover:bg-material-bg',
                        ].join(' ')}>{u}</button>
                    ))}
                  </div>
                </div>
                <MemberEField
                  displayValue={toMemberEDisp(inputs.memberE ?? 207)}
                  onCommit={v => updateInputs({ memberE: fromMemberEDisp(v) })}
                  altText={(() => {
                    const gpa = inputs.memberE ?? 207;
                    if (memberEUnit === 'GPa')  return `= ${(gpa * 1000).toFixed(0)} MPa  |  ${(gpa / GPa_PER_MPSI).toFixed(4)} Mpsi`;
                    if (memberEUnit === 'MPa')  return `= ${gpa.toFixed(3)} GPa  |  ${(gpa / GPa_PER_MPSI).toFixed(4)} Mpsi`;
                    return `= ${gpa.toFixed(3)} GPa  |  ${(gpa * 1000).toFixed(0)} MPa`;
                  })()}
                />
              </div>
              <UnitInput label="Wileman A" value={inputs.wilemanA ?? 0.78715} onChange={v => updateInputs({ wilemanA: v })} step={0.00001} />
              <UnitInput label="Wileman B" value={inputs.wilemanB ?? 0.62873} onChange={v => updateInputs({ wilemanB: v })} step={0.00001} />
            </div>
          </>
        )}
      </CollapsibleSection>

      {/* ── 5. Apriete ────────────────────────────────────────────── */}
      <CollapsibleSection
        title="5. Precarga y apriete"
        extra={
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500">Fi:</span>
            <select className="input-field py-0.5 px-2 text-xs h-7 w-auto" value={preloadUnit}
              onChange={e => setPreloadUnit(e.target.value as PreloadUnit)}>
              <option value="N">N</option>
              <option value="kN">kN</option>
              <option value="lbf">lbf</option>
              <option value="kips">kips</option>
              <option value="kgf">kgf</option>
              <option value="tf">tf</option>
            </select>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Tipo de unión</label>
            <select className="input-field" value={inputs.permanence ?? 'reusable'}
              onChange={e => updateInputs({ permanence: e.target.value })}>
              <option value="reusable">Reutilizable — Fi = 0.75 Fp</option>
              <option value="permanent">Permanente — Fi = 0.90 Fp</option>
              <option value="custom_pct">Personalizado — Fi = X% Fp</option>
            </select>
            {inputs.permanence === 'custom_pct' && (
              <div className="mt-2">
                <label className="label mb-1">Porcentaje de Fp (%)</label>
                <div className="flex items-center gap-2">
                  <input type="number" className="input-field flex-1" min={1} max={100} step={0.5}
                    value={customPctStr}
                    onChange={e => {
                      setCustomPctStr(e.target.value);
                      const pct = parseFloat(e.target.value.replace(',', '.'));
                      if (!isNaN(pct) && pct > 0 && pct <= 100) updateInputs({ preloadFactor: pct / 100 });
                    }}
                    onBlur={() => {
                      const pct = parseFloat(customPctStr.replace(',', '.'));
                      if (!isNaN(pct) && pct > 0 && pct <= 100) { setCustomPctStr(pct.toFixed(1)); updateInputs({ preloadFactor: pct / 100 }); }
                      else { setCustomPctStr('75.0'); updateInputs({ preloadFactor: 0.75 }); }
                    }} />
                  <span className="text-xs text-slate-500 whitespace-nowrap">
                    Fi = {(parseFloat(customPctStr) || 75).toFixed(1)}% · Fp
                  </span>
                </div>
              </div>
            )}
          </div>
          <UnitInput
            label={`Precarga Fi fija (${preloadUnit})`}
            value={toPreloadDisplay(inputs.preloadCustom ?? 0)}
            onChange={v => updateInputs({ preloadCustom: v > 0 ? fromPreload(v) : undefined })}
            tooltip="Valor fijo de Fi (anula el % de Fp). Deje en 0 para usar el porcentaje."
          />
          <div>
            <label className="label">Factor K del par de apriete</label>
            <select className="input-field" value={String(inputs.K ?? 0.2)}
              onChange={e => updateInputs({ K: Number(e.target.value) })}>
              {torqueKs.map(k => (
                <option key={k.condition} value={k.K}>{k.name} — K = {k.K}</option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">Shigley Tabla 8-15</p>
          </div>
          <UnitInput label="K personalizado" value={inputs.K ?? 0.2} onChange={v => updateInputs({ K: v })} step={0.01} tooltip="Eq. 8-27: T = K·Fi·d" reference="§8-8" />
        </div>
      </CollapsibleSection>

      {/* ── 6. Carga externa ──────────────────────────────────────── */}
      <CollapsibleSection title="6. Carga externa">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="label">Tipo de carga</label>
            <select className="input-field" value={inputs.loadType ?? 'static'}
              onChange={e => { updateInputs({ loadType: e.target.value }); if (e.target.value !== 'static') setUseLoadDivision(false); }}>
              <option value="static">Estática (§8-9)</option>
              <option value="fatigue">Fatiga (§8-11)</option>
            </select>
          </div>
          {inputs.loadType === 'fatigue' && (
            <div>
              <label className="label">Criterio de fatiga</label>
              <select className="input-field" value={inputs.fatigueCriterion ?? 'goodman'}
                onChange={e => updateInputs({ fatigueCriterion: e.target.value })}>
                <option value="goodman">Goodman (Eq. 8-38)</option>
                <option value="gerber">Gerber (Eq. 8-39)</option>
                <option value="asme_elliptic">ASME-elíptica (Eq. 8-40)</option>
              </select>
            </div>
          )}
        </div>

        {(inputs.loadType ?? 'static') === 'static' && (
          <>
            <div className="flex gap-2 mb-3">
              {[
                { val: false, label: 'P por perno (directo)' },
                { val: true,  label: 'P total ÷ N pernos' },
              ].map(({ val, label }) => (
                <button key={label} onClick={() => setUseLoadDivision(val)}
                  className={['flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-200',
                    useLoadDivision === val ? 'bg-orange-500 text-white border-orange-500' : 'bg-material-card text-slate-600 border-material-border hover:border-orange-400 hover:text-material-dark',
                  ].join(' ')}>{label}</button>
              ))}
            </div>

            {!useLoadDivision ? (
              <UnitInput label={`Carga externa por perno P (${forceUnit})`} value={toForceDisplay(inputs.externalLoad ?? 0)} onChange={v => updateInputs({ externalLoad: fromForce(v) })} tooltip="Eq. 8-25/8-26: Fb = C·P + Fi" reference="§8-7" />
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <UnitInput label={`P total (${forceUnit})`} value={toForceDisplay(pTotal)} onChange={v => setPTotal(fromForce(v))} tooltip="Carga total de la junta" reference="§8-7" />
                  <div>
                    <label className="label">N — número de pernos</label>
                    <input type="text" inputMode="numeric" className="input-field w-full" value={numBoltsStr}
                      onChange={e => { setNumBoltsStr(e.target.value); const v = parseInt(e.target.value, 10); if (!isNaN(v) && v > 0) setNumBolts(v); }}
                      onBlur={() => { const v = parseInt(numBoltsStr, 10); if (isNaN(v) || v <= 0) { setNumBolts(1); setNumBoltsStr('1'); } else setNumBoltsStr(String(v)); }} />
                  </div>
                </div>
                {numBolts > 0 && pTotal > 0 && (
                  <div className="rounded-lg border border-material-border bg-material-bg overflow-hidden mt-2">
                    <div className="grid grid-cols-3 divide-x divide-material-border">
                      {[
                        { label: 'P total', val: toForceDisplay(pTotal).toFixed(3), unit: forceUnit, color: 'text-blue-600' },
                        { label: 'N pernos', val: String(numBolts), unit: 'uds.', color: 'text-slate-600' },
                        { label: 'P / perno', val: toForceDisplay(pTotal / numBolts).toFixed(3), unit: forceUnit, color: 'text-emerald-600' },
                      ].map(({ label, val, unit, color }) => (
                        <div key={label} className="flex flex-col items-center py-2.5 px-1">
                          <span className={`text-base font-bold font-mono ${color}`}>{val} <span className="text-xs font-normal">{unit}</span></span>
                          <span className="text-[10px] text-slate-500 mt-0.5 text-center leading-tight">{label}</span>
                        </div>
                      ))}
                    </div>
                    <div className="px-3 py-1.5 border-t border-material-border text-[11px] text-slate-500">
                      P por perno = {toForceDisplay(pTotal).toFixed(3)} / {numBolts} = <strong className="text-emerald-600">{toForceDisplay(pTotal / numBolts).toFixed(3)} {forceUnit}</strong>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {inputs.loadType === 'fatigue' && (
          <>
            <UnitInput label={`Carga externa por perno P (${forceUnit})`} value={toForceDisplay(inputs.externalLoad ?? 0)} onChange={v => updateInputs({ externalLoad: fromForce(v) })} tooltip="Eq. 8-25/8-26: Fb = C·P + Fi" reference="§8-7" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              <UnitInput label={`Pmin por perno (${forceUnit})`} value={toForceDisplay(inputs.Pmin ?? 0)} onChange={v => updateInputs({ Pmin: fromForce(v) })} />
              <UnitInput label={`Pmax por perno (${forceUnit})`} value={toForceDisplay(inputs.Pmax ?? 0)} onChange={v => updateInputs({ Pmax: fromForce(v) })} />
            </div>
          </>
        )}
      </CollapsibleSection>

      {/* ── 7. Unión con empaque (§8-10 + Norton §11.8) ─────────── */}
      <CollapsibleSection
        title="7. Unión con empaque"
        className="lg:col-span-2"
        extra={
          <button type="button"
            onClick={() => {
              const next = !hasGasket;
              setHasGasket(next);
              updateInputs({ hasGasket: next });
              if (!next) updateInputs({ gasketArea: undefined, gasketLoadFactor: undefined, boltCircleDiameter: undefined, numBolts: undefined, gasketType: undefined, gasketEg_MPa: undefined, gasketThickness_mm: undefined });
            }}
            className={['px-3 py-1 text-xs font-semibold rounded-lg border transition-all duration-200',
              hasGasket ? 'bg-orange-500 text-white border-orange-500' : 'bg-material-card text-slate-600 border-material-border hover:border-orange-400 hover:text-material-dark',
            ].join(' ')}>
            {hasGasket ? 'Habilitado' : 'Habilitar'}
          </button>
        }
      >

        {hasGasket && (
          <>
            {/* Confined / Unconfined toggle */}
            <div className="mt-3 mb-3">
              <p className="text-[11px] text-slate-500 mb-2 font-semibold uppercase tracking-wider">Tipo de empaque</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setGasketType('confined')}
                  className={['flex-1 py-2 text-xs font-semibold rounded-lg border transition-all duration-200',
                    gasketType === 'confined' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-material-card text-slate-600 border-material-border hover:border-emerald-400',
                  ].join(' ')}>
                  🔒 Confinado
                  <span className="block text-[10px] font-normal opacity-80">Metal-metal; empaque no altera km</span>
                </button>
                <button type="button" onClick={() => setGasketType('unconfined')}
                  className={['flex-1 py-2 text-xs font-semibold rounded-lg border transition-all duration-200',
                    gasketType === 'unconfined' ? 'bg-amber-500 text-white border-amber-500' : 'bg-material-card text-slate-600 border-material-border hover:border-amber-400',
                  ].join(' ')}>
                  🟡 No confinado
                  <span className="block text-[10px] font-normal opacity-80">kg en serie con km → C_eff</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                {gasketType === 'confined'
                  ? 'Empaque confinado: las bridas contactan metal-metal. El empaque no entra en el cálculo de km. C se calcula con el método de rigidez seleccionado.'
                  : 'Empaque no confinado: material blando separa las bridas. kg = Ag·Eg/tg se combina en serie con km. C_eff = kb/(kb+km_eff) reemplaza a C en los cálculos.'}
              </p>
            </div>

            {/* Parámetros del empaque */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <UnitInput
                label={`Ag — área del empaque por perno (${areaUnit})`}
                value={toAreaDisplay(inputs.gasketArea ?? 0)}
                onChange={v => updateInputs({ gasketArea: fromArea(v) })}
                tooltip="Área del empaque asignada a cada perno (área total / N)"
                reference="§8-10"
              />
              <div>
                <label className="label">
                  n — factor de carga
                  <span className="ml-1 text-blue-500 cursor-help" title="Factor por el que se multiplica P para verificar el sellado.">ⓘ</span>
                </label>
                <input type="text" inputMode="decimal" className="input-field w-full" value={gasketNStr}
                  onChange={e => { setGasketNStr(e.target.value); const v = parseFloat(e.target.value.replace(',', '.')); if (!isNaN(v) && v > 0) updateInputs({ gasketLoadFactor: v }); }}
                  onBlur={() => { const v = parseFloat(gasketNStr.replace(',', '.')); if (isNaN(v) || v <= 0) { setGasketNStr('1'); updateInputs({ gasketLoadFactor: 1 }); } else setGasketNStr(String(v)); }}
                  placeholder="1" />
                <p className="mt-1 text-[11px] text-slate-500">Sellado verificado a n × P (§8-10)</p>
              </div>
            </div>

            {/* Parámetros adicionales para empaque no confinado */}
            {gasketType === 'unconfined' && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-3">
                <p className="text-[11px] text-amber-800 font-semibold">
                  Empaque no confinado — Norton §11.8: kg = Ag·Eg/tg.
                  Los materiales y módulos son de la Tabla 11-10 de Norton.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="label">Material del empaque (Tabla 11-10)</label>
                    <select className="input-field" value={gasketMatId} onChange={e => switchGasketMat(e.target.value)}>
                      {GASKET_MATERIALS.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Eg — módulo del empaque (MPa)</label>
                    <input type="text" inputMode="decimal" className="input-field w-full" value={gasketEgStr}
                      onChange={e => {
                        setGasketEgStr(e.target.value);
                        const v = parseFloat(e.target.value.replace(',', '.'));
                        if (!isNaN(v) && v > 0) updateInputs({ gasketEg_MPa: v });
                      }}
                      onBlur={() => {
                        const v = parseFloat(gasketEgStr.replace(',', '.'));
                        if (isNaN(v) || v <= 0) { setGasketEgStr('0.52'); updateInputs({ gasketEg_MPa: 0.52 }); }
                        else setGasketEgStr(String(v));
                      }}
                      placeholder="MPa" />
                    <p className="text-[10px] text-amber-700 mt-0.5">Norton Tabla 11-10</p>
                  </div>
                  <div>
                    <label className="label">tg — espesor del empaque ({gripUnit})</label>
                    <input type="text" inputMode="decimal" className="input-field w-full" value={gasketTgStr}
                      onChange={e => {
                        setGasketTgStr(e.target.value);
                        const v = parseFloat(e.target.value.replace(',', '.'));
                        if (!isNaN(v) && v > 0) {
                          const mm = gripUnit === 'in' ? v * 25.4 : v;
                          updateInputs({ gasketThickness_mm: mm });
                        }
                      }}
                      onBlur={() => {
                        const v = parseFloat(gasketTgStr.replace(',', '.'));
                        if (isNaN(v) || v <= 0) { setGasketTgStr('3'); updateInputs({ gasketThickness_mm: 3 }); }
                        else setGasketTgStr(String(v));
                      }}
                      placeholder={gripUnit === 'in' ? 'ej. 0.12' : 'ej. 3'} />
                    <p className="text-[10px] text-amber-700 mt-0.5">Espesor del material del empaque</p>
                  </div>
                </div>
                {/* kg preview */}
                {(() => {
                  const Ag  = inputs.gasketArea ?? 0;
                  const Eg  = parseFloat(gasketEgStr) || 0;
                  const tg  = gripUnit === 'in' ? (parseFloat(gasketTgStr) || 0) * 25.4 : parseFloat(gasketTgStr) || 0;
                  if (Ag <= 0 || Eg <= 0 || tg <= 0) return null;
                  const kg  = (Ag * Eg) / tg;
                  return (
                    <div className="rounded-md border border-amber-300/60 bg-amber-100 px-3 py-2 text-xs text-amber-900">
                      <strong>kg</strong> = Ag·Eg/tg = {Ag.toFixed(1)} × {Eg} / {tg.toFixed(2)} = <strong className="text-amber-700">{kg.toFixed(0)} N/mm</strong>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Ec. 8-34 — Espaciado entre pernos */}
            <div className="mt-3 rounded-lg border border-material-border bg-material-bg p-3 space-y-3">
              <div>
                <p className="text-xs font-semibold text-orange-600 mb-0.5">Ec. 8-34 — Espaciado entre pernos</p>
                <p className="text-[11px] text-slate-500">
                  c = π·D<sub>b</sub>/N ≤ 2d + 6 mm. Solo genera advertencia; no altera el cálculo.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">D<sub>b</sub> — Ø círculo de pernos ({gripUnit})</label>
                  <input type="text" inputMode="decimal" className="input-field w-full" value={gasketDbStr}
                    placeholder={gripUnit === 'in' ? 'ej. 4.72' : 'ej. 120'}
                    onChange={e => { setGasketDbStr(e.target.value); const v = parseFloat(e.target.value.replace(',', '.')); if (!isNaN(v) && v > 0) updateInputs({ boltCircleDiameter: gripUnit === 'in' ? v * 25.4 : v }); }}
                    onBlur={() => { const v = parseFloat(gasketDbStr.replace(',', '.')); if (!isNaN(v) && v > 0) { setGasketDbStr(String(v)); updateInputs({ boltCircleDiameter: gripUnit === 'in' ? v * 25.4 : v }); } }} />
                </div>
                <div>
                  <label className="label">N — número de pernos</label>
                  <input type="text" inputMode="numeric" className="input-field w-full" value={gasketNbStr}
                    placeholder="ej. 8"
                    onChange={e => { setGasketNbStr(e.target.value); const v = parseInt(e.target.value, 10); if (!isNaN(v) && v > 0) updateInputs({ numBolts: v }); }}
                    onBlur={() => { const v = parseInt(gasketNbStr, 10); if (!isNaN(v) && v > 0) { setGasketNbStr(String(v)); updateInputs({ numBolts: v }); } else { setGasketNbStr(''); updateInputs({ numBolts: undefined }); } }} />
                </div>
              </div>
              {(() => {
                const d    = inputs.boltDiameter ?? 0;
                const Db_mm = gripUnit === 'in' ? (parseFloat(gasketDbStr) || 0) * 25.4 : parseFloat(gasketDbStr) || 0;
                const Nb   = parseInt(gasketNbStr, 10);
                if (d <= 0) return null;
                const s_max  = 2 * d + 6;
                const s_bolt = (!isNaN(Nb) && Nb > 0 && Db_mm > 0) ? (Math.PI * Db_mm) / Nb : null;
                const toGD   = (mm: number) => gripUnit === 'in' ? mm / 25.4 : mm;
                const gu     = gripUnit;
                return (
                  <div>
                    <p className="text-[11px] text-slate-500 mb-1.5">
                      d = <strong className="text-material-dark">{toGD(d).toFixed(gu === 'in' ? 4 : 2)} {gu}</strong>
                      {' '}→ s<sub>máx</sub> = 2d+6 = <strong className="text-material-dark">{toGD(s_max).toFixed(2)} {gu}</strong>
                    </p>
                    {s_bolt !== null ? (
                      <div className={['rounded-lg border px-3 py-2 text-sm font-medium',
                        s_bolt <= s_max ? 'border-emerald-400 bg-emerald-50 text-emerald-800' : 'border-amber-400 bg-amber-50 text-amber-800',
                      ].join(' ')}>
                        {s_bolt <= s_max ? '✓' : '⚠'}{' '}
                        c = {toGD(s_bolt).toFixed(2)} {gu} {s_bolt <= s_max ? '≤' : '>'} s<sub>máx</sub> = {toGD(s_max).toFixed(2)} {gu}
                        {s_bolt <= s_max ? ' — Ec. 8-34 cumplida.' : ' — Ec. 8-34 NO cumplida.'}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500">Ingrese D<sub>b</sub> y N para verificar la condición.</p>
                    )}
                  </div>
                );
              })()}
            </div>
          </>
        )}
      </CollapsibleSection>

      {/* ── Factores de seguridad objetivo ──────────────────────── */}
      <CollapsibleSection title="Factores de seguridad objetivo" className="lg:col-span-2" defaultOpen={false}>
        <p className="text-[11px] text-slate-500 mb-3">
          Defina los factores mínimos deseados. El dashboard comparará el resultado contra estos valores.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="label">n<sub>p</sub> mín</label>
            <input type="number" step="0.1" min="0.5" max="10" className="input-field"
              value={state.targetSafetyFactors.np}
              onChange={e => setTargets({ np: parseFloat(e.target.value) || 1 })} />
          </div>
          <div>
            <label className="label">n<sub>0</sub> mín</label>
            <input type="number" step="0.1" min="0.5" max="10" className="input-field"
              value={state.targetSafetyFactors.n0}
              onChange={e => setTargets({ n0: parseFloat(e.target.value) || 1 })} />
          </div>
          {inputs.loadType === 'fatigue' && (
            <div>
              <label className="label">n<sub>f</sub> mín</label>
              <input type="number" step="0.1" min="0.5" max="10" className="input-field"
                value={state.targetSafetyFactors.nf}
                onChange={e => setTargets({ nf: parseFloat(e.target.value) || 1 })} />
            </div>
          )}
          <div>
            <label className="label">n<sub>y</sub> mín</label>
            <input type="number" step="0.1" min="0.5" max="10" className="input-field"
              value={state.targetSafetyFactors.nYield}
              onChange={e => setTargets({ nYield: parseFloat(e.target.value) || 1 })} />
          </div>
        </div>
      </CollapsibleSection>

      <button
        className="btn-primary w-full py-3 text-sm font-bold tracking-wide animate-pulse-glow lg:col-span-2"
        onClick={calculate}
        disabled={state.loading}
      >
        {state.loading ? '⏳ Calculando…' : '⚡ CALCULAR'}
      </button>
    </div>
  );
};
