import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';

/* ───────────────────────── helpers de formato ───────────────────────── */
const fmtN   = (n: number, imp: boolean) => imp ? `${(n / 4.44822).toFixed(2)} lbf` : `${n.toFixed(1)} N`;
const fmtMPa = (v: number, imp: boolean) => imp ? `${(v * 145.038).toFixed(0)} psi` : `${v.toFixed(1)} MPa`;
const fmtMm  = (v: number, imp: boolean) => imp ? `${(v / 25.4).toFixed(3)} in` : `${v.toFixed(2)} mm`;
const fmtMm2 = (v: number, imp: boolean) => imp ? `${(v / 645.16).toFixed(4)} in²` : `${v.toFixed(2)} mm²`;
const fmtNm  = (v_Nmm: number, imp: boolean) => imp ? `${(v_Nmm * 0.008851).toFixed(3)} lbf·in` : `${(v_Nmm / 1000).toFixed(3)} N·m`;

/* ───────────────────────── estilos ───────────────────────── */
const styles = StyleSheet.create({
  page:       { padding: 36, paddingBottom: 60, fontSize: 9.5, fontFamily: 'Helvetica', color: '#212121' },
  headerBar:  { borderBottomWidth: 2, borderBottomColor: '#f57c00', paddingBottom: 6, marginBottom: 12 },
  title:      { fontSize: 18, fontWeight: 'bold', color: '#212121' },
  subtitle:   { fontSize: 10, color: '#616161', marginTop: 2 },
  section:    { marginTop: 10 },
  sectionTitle: {
    fontSize: 11, fontWeight: 'bold', color: '#ffffff',
    backgroundColor: '#212121', padding: 4, marginBottom: 6,
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  sectionTitleAccent: {
    fontSize: 11, fontWeight: 'bold', color: '#ffffff',
    backgroundColor: '#f57c00', padding: 4, marginBottom: 6,
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  row: {
    flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#e0e0e0',
    paddingVertical: 2.5, paddingHorizontal: 4,
  },
  rowLabel: { width: '55%', color: '#616161', paddingRight: 8 },
  rowValue: { width: '45%', fontWeight: 'bold' },

  gridRow:  { flexDirection: 'row', marginBottom: 6 },
  gridCol:  { flex: 1, marginHorizontal: 3 },
  kpiBox:   {
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 4,
    padding: 6, backgroundColor: '#fafafa',
  },
  kpiLabel: { fontSize: 7.5, color: '#9e9e9e', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.3 },
  kpiValue: { fontSize: 12, fontWeight: 'bold', color: '#212121' },
  kpiSub:   { fontSize: 7, color: '#757575', marginTop: 1 },

  /* Tabla */
  th: {
    flexDirection: 'row', backgroundColor: '#eeeeee',
    borderBottomWidth: 1, borderBottomColor: '#bdbdbd', paddingVertical: 3, paddingHorizontal: 4,
  },
  thCell: { fontWeight: 'bold', color: '#424242', fontSize: 8.5 },
  td: {
    flexDirection: 'row', borderBottomWidth: 0.4, borderBottomColor: '#eeeeee',
    paddingVertical: 2.5, paddingHorizontal: 4,
  },
  tdCell: { fontSize: 8.5, color: '#212121' },

  /* Veredicto */
  verdictValid:    { backgroundColor: '#2e7d32', color: '#ffffff', padding: 6, borderRadius: 4, textAlign: 'center' as const, fontWeight: 'bold', fontSize: 11 },
  verdictMarginal: { backgroundColor: '#ef6c00', color: '#ffffff', padding: 6, borderRadius: 4, textAlign: 'center' as const, fontWeight: 'bold', fontSize: 11 },
  verdictInvalid:  { backgroundColor: '#c62828', color: '#ffffff', padding: 6, borderRadius: 4, textAlign: 'center' as const, fontWeight: 'bold', fontSize: 11 },

  footer: {
    position: 'absolute', bottom: 24, left: 36, right: 36,
    fontSize: 7.5, color: '#9e9e9e', textAlign: 'center',
    borderTopWidth: 0.5, borderTopColor: '#e0e0e0', paddingTop: 4,
  },
});

/* ───────────────────────── componentes auxiliares ───────────────────────── */
const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value}</Text>
  </View>
);

const Kpi: React.FC<{ label: string; value: string; sub?: string }> = ({ label, value, sub }) => (
  <View style={styles.gridCol}>
    <View style={styles.kpiBox}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
      {sub && <Text style={styles.kpiSub}>{sub}</Text>}
    </View>
  </View>
);

const SectionTitle: React.FC<{ children: string; accent?: boolean }> = ({ children, accent }) => (
  <Text style={accent ? styles.sectionTitleAccent : styles.sectionTitle}>{children}</Text>
);

const Verdict: React.FC<{ v: 'valid' | 'marginal' | 'invalid'; text: string }> = ({ v, text }) => {
  const style =
    v === 'valid' ? styles.verdictValid :
    v === 'marginal' ? styles.verdictMarginal : styles.verdictInvalid;
  return <Text style={style}>{text}</Text>;
};

/* ───────────────────────── Tension PDF ───────────────────────── */
const TensionPDF: React.FC<{ r: any; imp: boolean }> = ({ r, imp }) => {
  const i  = r.input;
  const s  = r.staticLoad;
  const st = r.stiffness;
  const f  = r.fatigue;
  const rotEl = (i.cornwellPlates ?? []) as Array<{ E_GPa: number; thickness: number; kind?: string; label?: string }>;

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.headerBar}>
        <Text style={styles.title}>Diseño Final — Unión a Tensión</Text>
        <Text style={styles.subtitle}>Shigley 9ª ed. §8-3 a §8-11 · {new Date().toLocaleDateString('es-CO')}</Text>
      </View>

      <Verdict v={r.verdict.verdict} text={`Veredicto: ${r.verdict.verdict.toUpperCase()} — ${r.verdict.governing} (n = ${r.verdict.safetyFactor.toFixed(2)})`} />

      {/* Sujeción (tornillo) */}
      <View style={styles.section}>
        <SectionTitle accent>Tornillo (sujeción)</SectionTitle>
        <Row label="Clase / Grado"                  value={i.grade.designation} />
        <Row label="Sp / Sy / Sut / Se"             value={`${fmtMPa(i.grade.Sp, imp)} / ${fmtMPa(i.grade.Sy, imp)} / ${fmtMPa(i.grade.Sut, imp)} / ${fmtMPa(i.grade.Se, imp)}`} />
        <Row label="Diámetro mayor d"               value={fmtMm(i.boltDiameter, imp)} />
        <Row label="Paso p"                         value={fmtMm(i.pitch, imp)} />
        <Row label="Área de tensión At"             value={fmtMm2(i.tensileArea, imp)} />
        <Row label="Grip total l"                   value={fmtMm(i.grip, imp)} />
        <Row label="Longitud sin rosca / roscada"   value={`${fmtMm(i.unthreadedLengthInGrip, imp)} / ${fmtMm(i.threadedLengthInGrip, imp)}`} />
        <Row label="Tipo de unión"                  value={i.permanence === 'reusable' ? 'Reutilizable (Fi=0.75 Fp)' : i.permanence === 'permanent' ? 'Permanente (Fi=0.90 Fp)' : 'Personalizada'} />
        <Row label="Factor de par K"                value={i.K.toString()} />
      </View>

      {/* Materiales del paquete */}
      <View style={styles.section}>
        <SectionTitle>Materiales del paquete</SectionTitle>
        {rotEl.length > 0 ? (
          <>
            <View style={styles.th}>
              <Text style={[styles.thCell, { width: '10%' }]}>#</Text>
              <Text style={[styles.thCell, { width: '35%' }]}>Elemento</Text>
              <Text style={[styles.thCell, { width: '20%' }]}>Tipo</Text>
              <Text style={[styles.thCell, { width: '17%', textAlign: 'right' }]}>E (GPa)</Text>
              <Text style={[styles.thCell, { width: '18%', textAlign: 'right' }]}>Espesor</Text>
            </View>
            {rotEl.map((el, idx) => (
              <View key={idx} style={styles.td}>
                <Text style={[styles.tdCell, { width: '10%' }]}>{idx + 1}</Text>
                <Text style={[styles.tdCell, { width: '35%' }]}>{el.label ?? (el.kind === 'washer' ? 'Arandela' : `Placa ${idx + 1}`)}</Text>
                <Text style={[styles.tdCell, { width: '20%' }]}>{el.kind === 'washer' ? 'Arandela' : 'Placa'}</Text>
                <Text style={[styles.tdCell, { width: '17%', textAlign: 'right' }]}>{el.E_GPa.toFixed(0)}</Text>
                <Text style={[styles.tdCell, { width: '18%', textAlign: 'right' }]}>{fmtMm(el.thickness, imp)}</Text>
              </View>
            ))}
          </>
        ) : (
          <>
            <Row label="Material del elemento" value={`${i.memberMaterial} — E = ${i.memberE} GPa`} />
            <Row label="Wileman A / B"         value={`${i.wilemanA?.toFixed(5)} / ${i.wilemanB?.toFixed(5)}`} />
          </>
        )}
      </View>

      {/* Factores de seguridad */}
      <View style={styles.section}>
        <SectionTitle accent>Factores de seguridad</SectionTitle>
        <View style={styles.gridRow}>
          <Kpi label="n_p (carga)"        value={s.np.toFixed(2)}          sub="Ec. 8-29" />
          <Kpi label="n_0 (separación)"   value={s.n0.toFixed(2)}          sub="Ec. 8-30" />
          {f && <Kpi label={`n_f (${f.criterion})`} value={f.nf.toFixed(2)} sub="Ec. 8-38/39/40" />}
          {f && <Kpi label="n_fluencia"   value={f.np_fluencia.toFixed(2)} sub="Sp / σmax" />}
        </View>
      </View>

      {/* Cargas y Precarga */}
      <View style={styles.section}>
        <SectionTitle>Cargas y precarga</SectionTitle>
        <View style={styles.gridRow}>
          <Kpi label="Constante C"         value={st.C.toFixed(4)}         sub={st.C < 0.2 ? 'Excelente' : st.C < 0.35 ? 'Bueno' : 'Alto'} />
          <Kpi label="Precarga Fi"         value={fmtN(s.Fi, imp)}         sub={s.FiMethod?.split('(')[0] ?? ''} />
          <Kpi label="Carga por perno Fb"  value={fmtN(s.Fb, imp)}         sub="Ec. 8-25" />
          <Kpi label="Torque de apriete"   value={fmtNm(s.T * 1000, imp)}  sub="Ec. 8-27" />
        </View>
        <Row label="Fuerza de prueba Fp (= At·Sp)" value={fmtN(s.Fp, imp)} />
        <Row label="Carga externa P"               value={fmtN(i.externalLoad, imp)} />
        <Row label="Fm (compresión del miembro)"    value={fmtN(s.Fm, imp)} />
      </View>

      {/* Rigidez */}
      <View style={styles.section}>
        <SectionTitle>Rigidez de la unión</SectionTitle>
        <Row label="kb (perno)"   value={`${(st.kb / 1000).toFixed(1)} kN/mm`} />
        <Row label="km (miembro)" value={`${(st.km / 1000).toFixed(1)} kN/mm`} />
        <Row label="C = kb/(kb+km)" value={st.C.toFixed(4)} />
      </View>

      {f && (
        <View style={styles.section}>
          <SectionTitle>Fatiga</SectionTitle>
          <Row label="σi"  value={fmtMPa(f.sigma_i, imp)} />
          <Row label="σa"  value={fmtMPa(f.sigma_a, imp)} />
          <Row label="σm"  value={fmtMPa(f.sigma_m, imp)} />
          <Row label="Sa"  value={fmtMPa(f.Sa, imp)} />
          <Row label={`Criterio`} value={f.criterion} />
        </View>
      )}

      <Text style={styles.footer} fixed>
        Calculadora de Tornillos · Diseño II · Universidad · Ref. Shigley 9ª ed.
      </Text>
    </Page>
  );
};

/* ───────────────────────── Shear PDF ───────────────────────── */
const ShearPDF: React.FC<{ r: any; imp: boolean }> = ({ r, imp }) => {
  const i = r.input;
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.headerBar}>
        <Text style={styles.title}>Diseño Final — Unión a Cortante</Text>
        <Text style={styles.subtitle}>Shigley 9ª ed. §8-12 · {new Date().toLocaleDateString('es-CO')}</Text>
      </View>

      <Verdict v={r.verdict.verdict} text={`Veredicto: ${r.verdict.verdict.toUpperCase()} — ${r.verdict.governing} (n = ${r.verdict.safetyFactor.toFixed(2)})`} />

      <View style={styles.section}>
        <SectionTitle accent>Tornillos (sujeción)</SectionTitle>
        <Row label="Número de pernos" value={i.bolts.length.toString()} />
        <Row label="Diámetro d"       value={fmtMm(i.boltDiameter, imp)} />
        <Row label="Área a cortante"  value={fmtMm2(i.shearArea, imp)} />
        <Row label="Cortante"         value={i.doubleShear ? 'Doble (2 planos)' : 'Simple'} />
        <Row label="Sp / Sy / Sut"    value={`${fmtMPa(i.boltSp, imp)} / ${fmtMPa(i.boltSy, imp)} / ${fmtMPa(i.boltSut, imp)}`} />
      </View>

      <View style={styles.section}>
        <SectionTitle>Placa / materiales</SectionTitle>
        <Row label="Espesor t"      value={fmtMm(i.plateThickness, imp)} />
        <Row label="Ancho w"        value={i.plateWidth != null ? fmtMm(i.plateWidth, imp) : '—'} />
        <Row label="Sy / Sut placa" value={`${fmtMPa(i.plateSy, imp)} / ${fmtMPa(i.plateSut, imp)}`} />
      </View>

      <View style={styles.section}>
        <SectionTitle accent>Factores de seguridad</SectionTitle>
        <View style={styles.gridRow}>
          <Kpi label="n_cortante"    value={r.nBoltShear.toFixed(2)} sub="τ_adm=0.577·Sp" />
          <Kpi label="n_aplastam."   value={r.nBearing.toFixed(2)}  sub="σ_adm=0.9·Sy" />
          {r.nNet != null && <Kpi label="n_área neta" value={r.nNet.toFixed(2)} sub="σ=V/((w-nd)t)" />}
        </View>
      </View>

      <View style={styles.section}>
        <SectionTitle>Distribución de fuerzas</SectionTitle>
        <Row label="Perno crítico"     value={`${r.maxBolt?.id ?? '—'} — F = ${fmtN(r.maxBolt?.F ?? 0, imp)}`} />
        <Row label="Carga total V"     value={fmtN(i.V, imp)} />
        <Row label="Momento M"         value={fmtNm(r.M ?? 0, imp)} />
        <Row label="τ perno / admisible" value={`${fmtMPa(r.tauBolt ?? 0, imp)} / ${fmtMPa(r.tauBoltAllow ?? 0, imp)}`} />
        <Row label="σ aplastam / admis." value={`${fmtMPa(r.sigmaBearing ?? 0, imp)} / ${fmtMPa(r.sigmaBearingAllow ?? 0, imp)}`} />
      </View>

      <View style={styles.section}>
        <SectionTitle>Carga por perno</SectionTitle>
        <View style={styles.th}>
          <Text style={[styles.thCell, { width: '15%' }]}>Perno</Text>
          <Text style={[styles.thCell, { width: '25%', textAlign: 'right' }]}>Posición (x, y)</Text>
          <Text style={[styles.thCell, { width: '20%', textAlign: 'right' }]}>F' directo</Text>
          <Text style={[styles.thCell, { width: '20%', textAlign: 'right' }]}>F'' momento</Text>
          <Text style={[styles.thCell, { width: '20%', textAlign: 'right' }]}>F total</Text>
        </View>
        {(r.forces ?? []).map((fo: any, idx: number) => (
          <View key={idx} style={styles.td}>
            <Text style={[styles.tdCell, { width: '15%' }]}>{fo.id}</Text>
            <Text style={[styles.tdCell, { width: '25%', textAlign: 'right' }]}>
              ({fmtMm(fo.x, imp)}, {fmtMm(fo.y, imp)})
            </Text>
            <Text style={[styles.tdCell, { width: '20%', textAlign: 'right' }]}>{fmtN(Math.hypot(fo.Fpx, fo.Fpy), imp)}</Text>
            <Text style={[styles.tdCell, { width: '20%', textAlign: 'right' }]}>{fmtN(Math.hypot(fo.Fmx, fo.Fmy), imp)}</Text>
            <Text style={[styles.tdCell, { width: '20%', textAlign: 'right' }]}>{fmtN(fo.F, imp)}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.footer} fixed>
        Calculadora de Tornillos · Diseño II · Universidad · Ref. Shigley 9ª ed.
      </Text>
    </Page>
  );
};

/* ───────────────────────── Power Screw PDF ───────────────────────── */
const PowerPDF: React.FC<{ r: any; imp: boolean }> = ({ r, imp }) => {
  const i = r.input;
  const g = r.geometry;
  const t = r.torques;
  const b = r.bodyStress;
  const ts = r.threadStress;
  const ind = r.indicators;
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.headerBar}>
        <Text style={styles.title}>Diseño Final — Tornillo de Potencia</Text>
        <Text style={styles.subtitle}>Shigley 9ª ed. §8-1 y §8-2 · {new Date().toLocaleDateString('es-CO')}</Text>
      </View>

      <View style={styles.section}>
        <SectionTitle accent>Tornillo (sujeción)</SectionTitle>
        <Row label="Tipo de rosca"       value={i.threadType === 'acme' ? 'Acme (α=14.5°)' : 'Cuadrada (α=0°)'} />
        <Row label="Diámetro mayor d"    value={fmtMm(g.d, imp)} />
        <Row label="Diámetro medio dm"   value={fmtMm(g.dm, imp)} />
        <Row label="Diámetro menor dr"   value={fmtMm(g.dr, imp)} />
        <Row label="Paso p"              value={fmtMm(g.p, imp)} />
        <Row label="Avance L"            value={`${fmtMm(g.lead, imp)} (n = ${i.numberOfStarts})`} />
        <Row label="Ángulo de avance λ"  value={`${g.leadAngleDeg.toFixed(3)}°`} />
        <Row label="Filetes en contacto" value={i.engagedThreads.toString()} />
        {i.material && <Row label="Material"   value={`${i.material.name} — Sy = ${fmtMPa(i.material.Sy, imp)}`} />}
      </View>

      <View style={styles.section}>
        <SectionTitle>Carga y fricción</SectionTitle>
        <Row label="Carga axial F"       value={fmtN(i.axialLoad, imp)} />
        <Row label="μ rosca"             value={i.frictionCoefficient.toString()} />
        <Row label="Collarín"            value={i.hasCollar ? `dc = ${fmtMm(i.collarDiameter ?? 0, imp)}, fc = ${i.collarFriction}` : '—'} />
      </View>

      <View style={styles.section}>
        <SectionTitle accent>Factores clave</SectionTitle>
        <View style={styles.gridRow}>
          <Kpi label="n fluencia"  value={(ind?.safetyFactorYield ?? 0).toFixed(2)} sub="Sy / σ'" />
          <Kpi label="Eficiencia"  value={`${ind?.efficiencyPercent?.toFixed(1) ?? '—'} %`} sub="F·L / (2π·TR)" />
          <Kpi label="Autobloqueo" value={ind?.selfLocking ? 'Sí' : 'No'} sub={ind?.selfLocking ? 'Seguro' : 'Requiere freno'} />
        </View>
      </View>

      <View style={styles.section}>
        <SectionTitle>Torques</SectionTitle>
        <Row label="TR (subida)"       value={fmtNm(t.TR, imp)} />
        <Row label="TL (bajada)"       value={fmtNm(t.TL, imp)} />
        <Row label="Tc (collarín)"     value={fmtNm(t.Tc, imp)} />
        <Row label="T total (elevar)"  value={fmtNm(t.Ttotal, imp)} />
      </View>

      <View style={styles.section}>
        <SectionTitle>Esfuerzos</SectionTitle>
        <Row label="σ axial (cuerpo)"  value={fmtMPa(b.sigmaAxial, imp)} />
        <Row label="τ torsión (cuerpo)" value={fmtMPa(b.tauTorsion, imp)} />
        <Row label="σ' Von Mises"       value={fmtMPa(b.sigmaVonMises, imp)} />
        <Row label="σ aplastamiento filete" value={fmtMPa(ts.bearing, imp)} />
        <Row label="σ flexión filete"       value={fmtMPa(ts.bending, imp)} />
        <Row label="τ cortante filete"      value={fmtMPa(ts.shear, imp)} />
      </View>

      <Text style={styles.footer} fixed>
        Calculadora de Tornillos · Diseño II · Universidad · Ref. Shigley 9ª ed.
      </Text>
    </Page>
  );
};

/* ───────────────────────── Document principal ───────────────────────── */
export const DashboardPDF: React.FC<{
  results:    any;
  moduleType: 'power' | 'tension' | 'shear';
  unitSystem: 'SI' | 'imperial';
}> = ({ results, moduleType, unitSystem }) => {
  const imp = unitSystem === 'imperial';
  return (
    <Document
      title={`Diseño Final — ${moduleType}`}
      author="Tornillo Calculator"
      subject="Reporte de diseño de unión atornillada (Shigley 9ª ed.)"
    >
      {moduleType === 'tension' && <TensionPDF r={results} imp={imp} />}
      {moduleType === 'shear'   && <ShearPDF   r={results} imp={imp} />}
      {moduleType === 'power'   && <PowerPDF   r={results} imp={imp} />}
    </Document>
  );
};
