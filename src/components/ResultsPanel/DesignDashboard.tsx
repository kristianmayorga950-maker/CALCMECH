import React, { useState, useEffect, useRef } from 'react';
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts';
import { pdf } from '@react-pdf/renderer';
import { useCalculator, type TargetSafetyFactors } from '@/context/CalculatorContext';
import { displayValue } from '@/utils/unitConverter';
import { DashboardPDF } from './DashboardPDF';

interface Props {
  results:    any;
  moduleType: 'power' | 'tension' | 'shear';
  unitSystem: 'SI' | 'imperial';
}

/* ── Helpers de formato ──────────────────────────────────── */
const fmtMm  = (v: number, imp: boolean) => imp ? `${(v / 25.4).toFixed(3)} in` : `${v.toFixed(2)} mm`;
const fmtMm2 = (v: number, imp: boolean) => imp ? `${(v / 645.16).toFixed(4)} in²` : `${v.toFixed(2)} mm²`;

/* ── Gauge individual ─────────────────────────────────────── */
interface GaugeProps {
  label: string;
  value: number;
  target: number;
  delay?: number;
}

const SafetyGauge: React.FC<GaugeProps> = ({ label, value, target, delay = 0 }) => {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const ratio = Math.min(value / target, 2);
  const pct = Math.round(ratio * 100);
  const color = value >= target ? '#2e7d32' : value >= target * 0.7 ? '#ef6c00' : '#c62828';
  const bgColor = value >= target ? 'bg-emerald-950/30' : value >= target * 0.7 ? 'bg-amber-950/30' : 'bg-red-950/30';
  const icon = value >= target ? '✓' : '✗';

  return (
    <div className={`${bgColor} rounded-lg p-3 border border-slate-700/30 transition-all duration-700 hover:scale-[1.02] hover:shadow-lg`}
         style={{ opacity: animated ? 1 : 0, transform: animated ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.6s cubic-bezier(.4,0,.2,1)' }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
        <span className="text-lg font-bold" style={{ color }}>{icon}</span>
      </div>
      <div className="flex items-end gap-2 mb-2">
        <span className="text-2xl font-bold font-mono" style={{ color }}>{value.toFixed(2)}</span>
        <span className="text-[10px] text-slate-500 mb-0.5">/ {target.toFixed(1)} min</span>
      </div>
      <div className="h-1.5 bg-navy-900 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000 ease-out"
             style={{
               width: animated ? `${Math.min(pct, 100)}%` : '0%',
               backgroundColor: color,
               boxShadow: `0 0 8px ${color}60`,
               transitionDelay: `${delay + 200}ms`,
             }} />
      </div>
      <div className="flex justify-between mt-0.5">
        <span className="text-[10px] text-slate-600">0</span>
        <span className="text-[10px] text-slate-600">{(target * 2).toFixed(1)}</span>
      </div>
    </div>
  );
};

/* ── Target editor ────────────────────────────────────────── */
interface TargetEditorProps {
  targets: TargetSafetyFactors;
  fields: Array<{ key: keyof TargetSafetyFactors; label: string }>;
}

const TargetEditor: React.FC<TargetEditorProps> = ({ targets, fields }) => {
  const { setTargets } = useCalculator();
  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {fields.map(f => (
        <div key={f.key} className="flex items-center gap-1.5">
          <label className="text-[10px] text-slate-500 uppercase tracking-wider whitespace-nowrap">{f.label}</label>
          <input
            type="number"
            step="0.1"
            min="0.5"
            max="10"
            className="w-14 input-field text-center !py-0.5 !text-xs"
            value={targets[f.key]}
            onChange={e => setTargets({ [f.key]: parseFloat(e.target.value) || 1 })}
          />
        </div>
      ))}
    </div>
  );
};

/* ── Metric card ──────────────────────────────────────────── */
const MetricCard: React.FC<{ label: string; value: string; sub?: string; delay?: number; accent?: boolean }> = ({ label, value, sub, delay = 0, accent }) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div className={`${accent ? 'bg-orange-950/25 border-orange-600/30' : 'bg-navy-800/40 border-slate-700/20'} rounded-md p-2.5 border transition-all duration-500`}
         style={{ opacity: visible ? 1 : 0, transform: visible ? 'scale(1)' : 'scale(0.9)', transition: 'all 0.5s cubic-bezier(.4,0,.2,1)' }}>
      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">{label}</div>
      <div className={`text-sm font-bold font-mono ${accent ? 'text-orange-300' : 'text-slate-100'}`}>{value}</div>
      {sub && <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
};

/* ── Sub-section wrapper ──────────────────────────────────── */
const SubSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-4">
    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 border-l-2 border-orange-500 pl-2">
      {title}
    </div>
    {children}
  </div>
);

/* ── Dashboard principal ──────────────────────────────────── */
export const DesignDashboard: React.FC<Props> = ({ results, moduleType, unitSystem }) => {
  const { state } = useCalculator();
  const targets = state.targetSafetyFactors;
  const dashRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const fmtF = (N: number) => displayValue(N, 'force', unitSystem);
  const fmtS = (mpa: number) => displayValue(mpa, 'stress', unitSystem);

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const blob = await pdf(
        <DashboardPDF results={results} moduleType={moduleType} unitSystem={unitSystem} />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href    = url;
      a.download = `diseno_final_${moduleType}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exportando PDF', err);
      alert('No se pudo generar el PDF. Revise la consola.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div ref={dashRef} className="card overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="section-title mb-0">Diseño Final</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">Resumen consolidado — materiales, dimensiones y factores de seguridad</p>
        </div>
        <button
          onClick={handleExportPDF}
          disabled={exporting}
          className="btn-secondary !py-1.5 !px-3 !text-xs flex items-center gap-1.5 disabled:opacity-60"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {exporting ? 'Generando…' : 'Exportar PDF'}
        </button>
      </div>

      {moduleType === 'tension' && <TensionDashboard results={results} targets={targets} unitSystem={unitSystem} fmtF={fmtF} fmtS={fmtS} />}
      {moduleType === 'shear'  && <ShearDashboard results={results} targets={targets} unitSystem={unitSystem} fmtF={fmtF} fmtS={fmtS} />}
      {moduleType === 'power'  && <PowerDashboard results={results} targets={targets} unitSystem={unitSystem} />}
    </div>
  );
};

/* ── Tension Dashboard ───────────────────────────────────── */
const TensionDashboard: React.FC<{
  results: any; targets: TargetSafetyFactors; unitSystem: 'SI' | 'imperial';
  fmtF: (n: number) => string; fmtS: (n: number) => string;
}> = ({ results, targets, unitSystem, fmtF, fmtS }) => {
  const imp = unitSystem === 'imperial';
  const i  = results.input;
  const s  = results.staticLoad;
  const st = results.stiffness;
  const f  = results.fatigue;
  const rotEl: Array<{ E_GPa: number; thickness: number; kind?: string; label?: string }> = i.cornwellPlates ?? [];

  const targetFields: Array<{ key: keyof TargetSafetyFactors; label: string }> = [
    { key: 'np', label: 'n_p mín' },
    { key: 'n0', label: 'n_0 mín' },
  ];
  if (f) targetFields.push({ key: 'nf', label: 'n_f mín' });

  const compareData = [
    { name: 'np', actual: s.np, target: targets.np, label: 'Carga' },
    { name: 'n0', actual: s.n0, target: targets.n0, label: 'Separación' },
  ];
  if (f) compareData.push({ name: 'nf', actual: f.nf, target: targets.nf, label: 'Fatiga' });
  if (f) compareData.push({ name: 'ny', actual: f.np_fluencia, target: targets.nYield, label: 'Fluencia' });

  return (
    <>
      <TargetEditor targets={targets} fields={targetFields} />

      {/* Factores de seguridad */}
      <SubSection title="Factores de seguridad">
        <div className="grid grid-cols-2 gap-2.5">
          <SafetyGauge label="Factor de carga (np)"      value={s.np} target={targets.np} delay={0} />
          <SafetyGauge label="Factor de separación (n0)" value={s.n0} target={targets.n0} delay={100} />
          {f && <SafetyGauge label={`Factor de fatiga (${f.criterion})`} value={f.nf} target={targets.nf} delay={200} />}
          {f && <SafetyGauge label="Fluencia (Sp/σmax)" value={f.np_fluencia} target={targets.nYield} delay={300} />}
        </div>
      </SubSection>

      {/* Cargas y precarga */}
      <SubSection title="Cargas y precarga">
        <div className="grid grid-cols-4 gap-1.5">
          <MetricCard accent label="Constante C"         value={st.C.toFixed(4)}        sub={st.C < 0.2 ? 'Excelente' : st.C < 0.35 ? 'Bueno' : 'Alto'} delay={50} />
          <MetricCard accent label="Precarga Fi"         value={fmtF(s.Fi)}             sub={s.FiMethod?.split('(')[0]} delay={100} />
          <MetricCard accent label="Carga por perno Fb"  value={fmtF(s.Fb)}             sub="Ec. 8-25" delay={150} />
          <MetricCard accent label="Torque T"            value={`${s.T.toFixed(1)} N·m`} sub="Ec. 8-27" delay={200} />
          <MetricCard label="Fuerza de prueba Fp" value={fmtF(s.Fp)}          sub="At · Sp" delay={250} />
          <MetricCard label="Carga externa P"     value={fmtF(i.externalLoad)} sub="por perno" delay={300} />
          <MetricCard label="Fm (miembro)"         value={fmtF(s.Fm)}          sub={s.Fm < 0 ? 'Compresión' : 'Separado!'} delay={350} />
          <MetricCard label="kb / km"              value={`${(st.kb/1000).toFixed(0)}/${(st.km/1000).toFixed(0)}`} sub="kN/mm" delay={400} />
        </div>
      </SubSection>

      {/* Dimensiones del tornillo */}
      <SubSection title="Dimensiones del tornillo">
        <div className="grid grid-cols-4 gap-1.5">
          <MetricCard label="Diámetro d" value={fmtMm(i.boltDiameter, imp)} sub={i.grade?.designation} delay={50} />
          <MetricCard label="Paso p"     value={fmtMm(i.pitch, imp)}        delay={100} />
          <MetricCard label="Área At"    value={fmtMm2(i.tensileArea, imp)} delay={150} />
          <MetricCard label="Grip l"     value={fmtMm(i.grip, imp)}         sub={`ld=${fmtMm(i.unthreadedLengthInGrip, imp)} lt=${fmtMm(i.threadedLengthInGrip, imp)}`} delay={200} />
        </div>
      </SubSection>

      {/* Materiales y espesores del paquete */}
      <SubSection title="Materiales y espesores del paquete">
        {rotEl.length > 0 ? (
          <div className="rounded-md border border-slate-700/40 bg-slate-900/40 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 uppercase tracking-wider border-b border-slate-700/40 bg-slate-900/60">
                  <th className="text-left  py-1.5 px-2 font-medium">#</th>
                  <th className="text-left  py-1.5 px-2 font-medium">Elemento</th>
                  <th className="text-left  py-1.5 px-2 font-medium">Tipo</th>
                  <th className="text-right py-1.5 px-2 font-medium">E (GPa)</th>
                  <th className="text-right py-1.5 px-2 font-medium">Espesor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {rotEl.map((el, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30">
                    <td className="py-1 px-2 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-1 px-2 text-slate-200">{el.label ?? (el.kind === 'washer' ? 'Arandela' : `Placa ${idx + 1}`)}</td>
                    <td className="py-1 px-2 text-slate-400 italic">{el.kind === 'washer' ? 'Arandela' : 'Placa'}</td>
                    <td className="py-1 px-2 text-right text-slate-200 font-mono">{el.E_GPa.toFixed(0)}</td>
                    <td className="py-1 px-2 text-right text-orange-300 font-mono font-semibold">{fmtMm(el.thickness, imp)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-900/60 border-t border-orange-500/20">
                  <td colSpan={4} className="py-1 px-2 text-right text-slate-500 uppercase text-[10px]">Espesor total</td>
                  <td className="py-1 px-2 text-right text-orange-400 font-mono font-bold">
                    {fmtMm(rotEl.reduce((s, e) => s + e.thickness, 0), imp)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            <MetricCard label="Material"       value={String(i.memberMaterial)}     sub={`E = ${i.memberE} GPa`} delay={50} />
            <MetricCard label="Wileman A"      value={i.wilemanA?.toFixed(5) ?? '—'} delay={100} />
            <MetricCard label="Wileman B"      value={i.wilemanB?.toFixed(5) ?? '—'} delay={150} />
          </div>
        )}
      </SubSection>

      {/* Comparativa */}
      <SubSection title="Factores vs objetivo">
        <div className="bg-navy-800/30 rounded-md p-2 border border-slate-700/20">
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={compareData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#616161' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#616161' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e0e0e0', borderRadius: '6px', color: '#212121', fontSize: 11 }}
                cursor={{ fill: '#ff980018' }}
              />
              <Bar dataKey="actual" name="Actual" radius={[3,3,0,0]}>
                {compareData.map((d, i) => (
                  <Cell key={i} fill={d.actual >= d.target ? '#2e7d32' : d.actual >= d.target * 0.7 ? '#ef6c00' : '#c62828'} />
                ))}
              </Bar>
              <Bar dataKey="target" name="Objetivo" fill="#bdbdbd" fillOpacity={0.6} stroke="#9e9e9e" strokeWidth={1} radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SubSection>
    </>
  );
};

/* ── Shear Dashboard ─────────────────────────────────────── */
const ShearDashboard: React.FC<{
  results: any; targets: TargetSafetyFactors; unitSystem: 'SI' | 'imperial';
  fmtF: (n: number) => string; fmtS: (n: number) => string;
}> = ({ results, targets, unitSystem, fmtF, fmtS }) => {
  const imp = unitSystem === 'imperial';
  const i = results.input;

  const targetFields: Array<{ key: keyof TargetSafetyFactors; label: string }> = [
    { key: 'nShear', label: 'n cortante mín' },
    { key: 'nBearing', label: 'n aplast. mín' },
  ];

  const forceData = (results.forces ?? []).map((f: any) => ({
    name: f.id,
    F: Math.round(f.F),
    F_direct: Math.round(Math.hypot(f.Fpx, f.Fpy)),
    F_moment: Math.round(Math.hypot(f.Fmx, f.Fmy)),
  }));

  return (
    <>
      <TargetEditor targets={targets} fields={targetFields} />

      <SubSection title="Factores de seguridad">
        <div className="grid grid-cols-2 gap-2.5">
          <SafetyGauge label="Cortante del perno" value={results.nBoltShear} target={targets.nShear} delay={0} />
          <SafetyGauge label="Aplastamiento"       value={results.nBearing}  target={targets.nBearing} delay={100} />
          {results.nNet != null && (
            <SafetyGauge label="Tensión área neta" value={results.nNet} target={targets.nBearing} delay={200} />
          )}
        </div>
      </SubSection>

      <SubSection title="Cargas y esfuerzos">
        <div className="grid grid-cols-4 gap-1.5">
          <MetricCard accent label="Perno crítico" value={results.maxBolt?.id ?? '—'} sub={`F = ${fmtF(results.maxBolt?.F ?? 0)}`} delay={50} />
          <MetricCard accent label="V total"       value={fmtF(i.V)} delay={100} />
          <MetricCard accent label="Momento M"     value={`${((results.M ?? 0) / 1000).toFixed(1)} N·m`} sub={Math.abs(results.M) < 1 ? 'Sin excentr.' : 'Excéntrica'} delay={150} />
          <MetricCard accent label="τ perno"       value={fmtS(results.tauBolt ?? 0)} sub={`τ_adm = ${fmtS(results.tauBoltAllow ?? 0)}`} delay={200} />
          <MetricCard label="σ aplastam."          value={fmtS(results.sigmaBearing ?? 0)} sub={`adm = ${fmtS(results.sigmaBearingAllow ?? 0)}`} delay={250} />
          {results.sigmaNet != null && (
            <MetricCard label="σ área neta"        value={fmtS(results.sigmaNet)} sub={`adm = ${fmtS(results.sigmaNetAllow ?? 0)}`} delay={300} />
          )}
          <MetricCard label="Centroide"            value={`(${results.centroid.x.toFixed(0)},${results.centroid.y.toFixed(0)})`} delay={350} />
          <MetricCard label="Σ r²"                 value={`${results.sumR2?.toFixed(0)} mm²`} delay={400} />
        </div>
      </SubSection>

      <SubSection title="Dimensiones del tornillo y placa">
        <div className="grid grid-cols-4 gap-1.5">
          <MetricCard label="N° pernos"       value={i.bolts.length.toString()} delay={50} />
          <MetricCard label="Diámetro d"      value={fmtMm(i.boltDiameter, imp)} sub={i.doubleShear ? 'Doble cortante' : 'Cortante simple'} delay={100} />
          <MetricCard label="Área a cortante" value={fmtMm2(i.shearArea, imp)} delay={150} />
          <MetricCard label="Espesor placa t" value={fmtMm(i.plateThickness, imp)} sub={i.plateWidth != null ? `w = ${fmtMm(i.plateWidth, imp)}` : undefined} delay={200} />
        </div>
      </SubSection>

      <SubSection title="Materiales">
        <div className="grid grid-cols-2 gap-1.5">
          <MetricCard label="Perno Sp/Sy/Sut" value={`${i.boltSp}/${i.boltSy}/${i.boltSut} MPa`} delay={50} />
          <MetricCard label="Placa Sy/Sut"    value={`${i.plateSy}/${i.plateSut} MPa`} delay={100} />
        </div>
      </SubSection>

      {forceData.length > 0 && (
        <SubSection title="Distribución de fuerza por perno">
          <div className="bg-navy-800/30 rounded-md p-2 border border-slate-700/20">
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={forceData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#616161' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#616161' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e0e0e0', borderRadius: '6px', color: '#212121', fontSize: 11 }}
                  formatter={(v: number) => [`${v} N`, '']}
                  cursor={{ fill: '#ff980018' }}
                />
                <Bar dataKey="F_direct" name="F' directo" stackId="a" fill="#212121" radius={[0,0,0,0]} />
                <Bar dataKey="F_moment" name="F'' momento" stackId="a" fill="#ff9800" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SubSection>
      )}
    </>
  );
};

/* ── Power Screw Dashboard ───────────────────────────────── */
const PowerDashboard: React.FC<{
  results: any; targets: TargetSafetyFactors; unitSystem: 'SI' | 'imperial';
}> = ({ results, targets, unitSystem }) => {
  const imp = unitSystem === 'imperial';
  const i  = results.input;
  const g  = results.geometry;
  const ind = results.indicators;
  const torques = results.torques;
  const b = results.bodyStress;
  const ts = results.threadStress;

  const targetFields: Array<{ key: keyof TargetSafetyFactors; label: string }> = [
    { key: 'nYield', label: 'n fluencia mín' },
  ];

  return (
    <>
      <TargetEditor targets={targets} fields={targetFields} />

      <SubSection title="Factores clave">
        <div className="grid grid-cols-2 gap-2.5">
          <SafetyGauge label="Factor de seguridad (Von Mises)" value={ind?.safetyFactorYield ?? 0} target={targets.nYield} delay={0} />
          <div className="bg-navy-800/40 rounded-lg p-3 border border-slate-700/30">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Eficiencia</div>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-2xl font-bold font-mono text-blue-400">{ind?.efficiencyPercent?.toFixed(1)}%</span>
            </div>
            <div className="h-1.5 bg-navy-900 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-blue-500 transition-all duration-1000"
                   style={{ width: `${Math.min(ind?.efficiencyPercent ?? 0, 100)}%`, boxShadow: '0 0 8px #2196f380' }} />
            </div>
          </div>
        </div>
      </SubSection>

      <SubSection title="Torques y autobloqueo">
        <div className="grid grid-cols-4 gap-1.5">
          <MetricCard accent label="Autobloqueo" value={ind?.selfLocking ? 'Sí' : 'No'} sub={ind?.selfLocking ? 'Seguro' : 'Requiere freno'} delay={50} />
          <MetricCard accent label="T subida"    value={`${(torques?.TR / 1000).toFixed(2)} N·m`}    delay={100} />
          <MetricCard accent label="T bajada"    value={`${(torques?.TL / 1000).toFixed(2)} N·m`}    delay={150} />
          <MetricCard accent label="T total"     value={`${(torques?.Ttotal / 1000).toFixed(2)} N·m`} delay={200} />
        </div>
      </SubSection>

      <SubSection title="Dimensiones del tornillo">
        <div className="grid grid-cols-4 gap-1.5">
          <MetricCard label="Diámetro mayor d"  value={fmtMm(g.d, imp)}  sub={i.threadType === 'acme' ? 'Acme' : 'Cuadrada'} delay={50} />
          <MetricCard label="Diámetro medio dm" value={fmtMm(g.dm, imp)} delay={100} />
          <MetricCard label="Diámetro menor dr" value={fmtMm(g.dr, imp)} delay={150} />
          <MetricCard label="Paso p"            value={fmtMm(g.p, imp)}  delay={200} />
          <MetricCard label="Avance L"          value={fmtMm(g.lead, imp)} sub={`n = ${i.numberOfStarts}`} delay={250} />
          <MetricCard label="Ángulo λ"          value={`${g.leadAngleDeg.toFixed(2)}°`} delay={300} />
          <MetricCard label="Filetes nt"        value={i.engagedThreads.toString()} delay={350} />
          <MetricCard label="Carga axial F"     value={`${i.axialLoad.toFixed(0)} N`} delay={400} />
        </div>
      </SubSection>

      <SubSection title="Esfuerzos">
        <div className="grid grid-cols-3 gap-1.5">
          <MetricCard label="σ axial cuerpo" value={`${b.sigmaAxial.toFixed(1)} MPa`}    delay={50} />
          <MetricCard label="τ torsión"      value={`${b.tauTorsion.toFixed(1)} MPa`}    delay={100} />
          <MetricCard label="σ' Von Mises"   value={`${b.sigmaVonMises.toFixed(1)} MPa`} delay={150} />
          <MetricCard label="σ aplast. filete" value={`${ts.bearing.toFixed(1)} MPa`}    delay={200} />
          <MetricCard label="σ flex. filete"   value={`${ts.bending.toFixed(1)} MPa`}    delay={250} />
          <MetricCard label="τ cortante filete" value={`${ts.shear.toFixed(1)} MPa`}     delay={300} />
        </div>
      </SubSection>

      {i.material && (
        <SubSection title="Material">
          <div className="grid grid-cols-3 gap-1.5">
            <MetricCard label="Material" value={i.material.name} delay={50} />
            <MetricCard label="Sy / Sut" value={`${i.material.Sy} / ${i.material.Sut} MPa`} delay={100} />
            <MetricCard label="E"        value={`${i.material.E} GPa`} delay={150} />
          </div>
        </SubSection>
      )}
    </>
  );
};
