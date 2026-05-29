/**
 * Junta atornillada a tensión — Norton §11 + Shigley 9ª ed., §8-3 a §8-11.
 *
 * Rigidez del paquete (km):
 *   - Método 'cornwell' → Norton §11.8 FEA (Cornwell). Tabla 11-8.  [Por defecto]
 *   - Método 'wileman'  → Shigley Eq. 8-23 (correlación empírica).
 *
 * Empaques no confinados: kg = Ag·Eg/tg en serie con km → C_eff.
 */

import type {
  TensionJointInput,
  TensionJointResults,
  StiffnessResults,
  StaticLoadResults,
  FatigueResults,
  GasketResults,
  FatigueCriterion,
  CornwellPlate,
} from './types';

// ─── Tabla 11-8 — Coeficientes de Cornwell (Norton §11.8) ────────────────────
//
// Cr = p3·r³ + p2·r² + p1·r + p0   (Eq. 11.19)
//
// r = E_miembro / E_perno  (relación de módulos)
// j = d / l                (relación de aspecto: d = diámetro perno, l = grip)
//
// Filas: [p0, p1, p2, p3]
const TABLE_11_8: Array<{ j: number; p: [number, number, number, number] }> = [
  { j: 0.10, p: [0.4389, -0.9197,  0.8901, -0.3187] },
  { j: 0.20, p: [0.6118, -1.1715,  1.0875, -0.3806] },
  { j: 0.30, p: [0.6932, -1.2426,  1.1177, -0.3845] },
  { j: 0.40, p: [0.7351, -1.2612,  1.1111, -0.3779] },
  { j: 0.50, p: [0.7580, -1.2632,  1.0979, -0.3708] },
  { j: 0.60, p: [0.7709, -1.2600,  1.0851, -0.3647] },
  { j: 0.70, p: [0.7773, -1.2543,  1.0735, -0.3595] },
  { j: 0.80, p: [0.7800, -1.2503,  1.0672, -0.3571] },
  { j: 0.90, p: [0.7797, -1.2458,  1.0620, -0.3552] },
  { j: 1.00, p: [0.7774, -1.2413,  1.0577, -0.3537] },
  { j: 1.25, p: [0.7667, -1.2333,  1.0548, -0.3535] },
  { j: 1.50, p: [0.7518, -1.2264,  1.0554, -0.3550] },
  { j: 1.75, p: [0.7350, -1.2202,  1.0581, -0.3574] },
  { j: 2.00, p: [0.7175, -1.2133,  1.0604, -0.3596] },
];

// ─── Funciones puras ──────────────────────────────────────────────────────────

/**
 * Rigidez del perno — Norton Eq. 11.11a / Shigley Eq. 8-17:
 *   kb = (Ad·At·E) / (Ad·lt + At·ld)
 *
 * @param E_MPa  Módulo elástico en MPa (N/mm²).
 */
export function boltStiffness(
  d: number, At: number, ld: number, lt: number, E_MPa: number,
): number {
  const Ad = (Math.PI / 4) * d * d;
  if (ld <= 0) return (At * E_MPa) / lt;
  if (lt <= 0) return (Ad * E_MPa) / ld;
  return (Ad * At * E_MPa) / (Ad * lt + At * ld);
}

/**
 * Rigidez del elemento — Shigley Eq. 8-23 (Wileman):
 *   km = E·d·A·exp(B·d/l)
 *
 * @param E_MPa  Módulo elástico en MPa (N/mm²).
 */
export function memberStiffnessWileman(
  E_MPa: number, d: number, l: number, A: number, B: number,
): number {
  return E_MPa * d * A * Math.exp((B * d) / l);
}

/**
 * Interpolación lineal entre las dos filas de TABLE_11_8 que rodean j_target.
 * Devuelve los coeficientes [p0, p1, p2, p3] interpolados.
 */
function interpolateCoeffs(j_target: number): [number, number, number, number] {
  const tbl = TABLE_11_8;

  // Clampear al rango de la tabla
  if (j_target <= tbl[0].j) return [...tbl[0].p] as [number, number, number, number];
  if (j_target >= tbl[tbl.length - 1].j) return [...tbl[tbl.length - 1].p] as [number, number, number, number];

  // Encontrar las dos filas que rodean j_target
  let lo = tbl[0], hi = tbl[1];
  for (let k = 0; k < tbl.length - 1; k++) {
    if (tbl[k].j <= j_target && tbl[k + 1].j >= j_target) {
      lo = tbl[k];
      hi = tbl[k + 1];
      break;
    }
  }

  const t = (j_target - lo.j) / (hi.j - lo.j);
  return [
    lo.p[0] + t * (hi.p[0] - lo.p[0]),
    lo.p[1] + t * (hi.p[1] - lo.p[1]),
    lo.p[2] + t * (hi.p[2] - lo.p[2]),
    lo.p[3] + t * (hi.p[3] - lo.p[3]),
  ];
}

/**
 * Evalúa Cr para un valor r con coeficientes [p0, p1, p2, p3].
 * Eq. 11.19: Cr = p3·r³ + p2·r² + p1·r + p0
 */
function evalCr(p: [number, number, number, number], r: number): number {
  return p[3] * r ** 3 + p[2] * r ** 2 + p[1] * r + p[0];
}

/**
 * Método de Cornwell (Norton §11.8) — calcula C = kb/(kb+km) directamente.
 *
 * Caso mismo material (una placa) o dos placas (caso general).
 * En el caso de dos placas con distinto material se aplica la interpolación
 * lineal de Eq. 11.22:  C = CL + t·(CH − CL)
 * donde t = TL / (TL + TH) y CL, CH son los Cr evaluados con rL y rH.
 *
 * @param d_mm     Diámetro del perno [mm]
 * @param l_mm     Grip total [mm]
 * @param Eb_GPa   Módulo del perno [GPa]
 * @param plates   Arreglo de placas: [placa_inferior, placa_superior?]
 */
export function cornwellJointC(
  d_mm: number,
  l_mm: number,
  Eb_GPa: number,
  plates: CornwellPlate[],
): {
  C_metal: number;
  j: number;
  rL: number;
  rH: number;
  t: number;
  CL: number;
  CH: number;
} {
  const j = d_mm / l_mm;

  // Interpolar coeficientes para este j
  const p = interpolateCoeffs(j);

  let CL: number, CH: number, rL: number, rH: number, t: number;

  if (plates.length === 1 || !plates[1]) {
    // Mismo material: r = EL/Eb; t no aplica (resultado = Cr directamente)
    rL = plates[0].E_GPa / Eb_GPa;
    rH = rL;
    t  = 0.5; // arbitrario cuando CL = CH
    CL = evalCr(p, rL);
    CH = CL;
  } else {
    rL = plates[0].E_GPa / Eb_GPa;
    rH = plates[1].E_GPa / Eb_GPa;
    const TL = plates[0].thickness;
    const TH = plates[1].thickness;
    t  = TL / (TL + TH);
    CL = evalCr(p, rL);
    CH = evalCr(p, rH);
  }

  // Eq. 11.22 (diferente material) o directamente CL cuando mismo material
  const C_metal = CL + t * (CH - CL);

  return { C_metal, j, rL, rH, t, CL, CH };
}

/**
 * Rigidez del empaque — Norton §11.8 (empaque no confinado):
 *   kg = Ag · Eg / tg
 *
 * @param Ag_mm2     Área del empaque asignada al perno [mm²]
 * @param Eg_MPa     Módulo del empaque [MPa]
 * @param tg_mm      Espesor del empaque [mm]
 */
export function gasketStiffness(Ag_mm2: number, Eg_MPa: number, tg_mm: number): number {
  if (tg_mm <= 0 || Ag_mm2 <= 0) return Infinity;
  return (Ag_mm2 * Eg_MPa) / tg_mm;
}

/**
 * Constante de rigidez de la junta — Shigley Eq. 8-24:  C = kb/(kb+km).
 */
export function jointConstantC(kb: number, km: number): number {
  return kb / (kb + km);
}

/** Par de apriete — Eq. 8-27:  T = K·Fi·d  (devuelve N·m cuando d en mm y Fi en N). */
export function wrenchTorque(K: number, Fi: number, d_mm: number): number {
  return (K * Fi * d_mm) / 1000;
}

/**
 * Factor de seguridad a fatiga — Shigley Ec. 8-38/8-39/8-40.
 */
export function fatigueSa(
  criterion: FatigueCriterion,
  Se: number, Sut: number, Sy: number, sigma_i: number,
): number {
  switch (criterion) {
    case 'goodman':
      return (Se * (Sut - sigma_i)) / (Sut + Se);

    case 'gerber': {
      const r = Sut / Se;
      const inside = 1 + (4 * Se * (Se + sigma_i)) / (Sut * Sut);
      return (Sut * Sut) / (2 * Se) * (Math.sqrt(inside) - 1) - sigma_i * r / 2 + sigma_i * r / 2;
    }

    case 'asme_elliptic': {
      const a = 1 / (Se * Se) + 1 / (Sy * Sy);
      const b = (2 * sigma_i) / (Sy * Sy);
      const c = (sigma_i * sigma_i) / (Sy * Sy) - 1;
      const disc = b * b - 4 * a * c;
      if (disc < 0) return 0;
      return (-b + Math.sqrt(disc)) / (2 * a);
    }
  }
}

// ─── Clase principal ──────────────────────────────────────────────────────────

export class TensionJointCalculator {
  constructor(private input: TensionJointInput) {}

  calculate(): TensionJointResults {
    this.assertInputs();

    const areas     = this.areas();
    const stiffness = this.stiffness();
    const statics   = this.staticLoad(areas, stiffness);
    const fatigue   = this.input.loadType === 'fatigue' ? this.fatigue(areas, stiffness) : undefined;
    const gasket    = this.gasketResults(statics, stiffness);

    const { verdict, governing, n } = this.decide(statics, fatigue);

    return {
      input: this.input,
      areas,
      stiffness,
      staticLoad: statics,
      fatigue,
      gasket,
      verdict: { verdict, governing, safetyFactor: n },
      recommendations: this.recommendations(),
      warnings:        this.warnings(stiffness, statics, fatigue, gasket),
      calculations:    this.log(areas, stiffness, statics, fatigue, gasket),
    };
  }

  private assertInputs(): void {
    const i = this.input;
    const required: Record<string, any> = {
      'Diámetro d':          i.boltDiameter,
      'Paso p':              i.pitch,
      'Área de tensión At':  i.tensileArea,
      'Agarre l (grip)':     i.grip,
      'Grado del perno':     i.grade?.Sp,
      'Módulo E_elementos':  i.memberE,
      'Factor K':            i.K,
      'Carga externa P':     i.externalLoad,
    };
    const missing = Object.entries(required)
      .filter(([, v]) => v == null || !Number.isFinite(Number(v)) || Number(v) <= 0)
      .map(([k]) => k);

    const method = i.kmMethod ?? 'cornwell';
    if (method === 'wileman' && i.memberMaterial === 'custom' && (i.wilemanA == null || i.wilemanB == null))
      missing.push('Constantes A, B de Wileman');
    if (method === 'cornwell' && (!i.cornwellPlates || i.cornwellPlates.length === 0))
      missing.push('Placas del paquete (Cornwell) — agregue al menos una placa');
    if (i.loadType === 'fatigue' && (i.Pmax == null || i.Pmin == null))
      missing.push('Pmin y Pmax (carga de fatiga)');
    if (missing.length > 0)
      throw new Error(`Faltan datos (Norton §11/Shigley §8-4/§8-9/§8-11): ${missing.join(', ')}`);
  }

  private areas() {
    const d = this.input.boltDiameter;
    return { Ad: (Math.PI / 4) * d * d, At: this.input.tensileArea };
  }

  private stiffness(): StiffnessResults {
    const i  = this.input;
    const kb = boltStiffness(
      i.boltDiameter,
      i.tensileArea,
      i.unthreadedLengthInGrip,
      i.threadedLengthInGrip,
      i.grade.E * 1000,   // GPa → MPa
    );

    const method = i.kmMethod ?? 'cornwell';
    let km: number;
    let cornwellDetail: StiffnessResults['cornwell'];

    if (method === 'cornwell' && i.cornwellPlates?.length) {
      const cw = cornwellJointC(i.boltDiameter, i.grip, i.grade.E, i.cornwellPlates);
      // C_metal = kb/(kb+km) → km = kb*(1-C_metal)/C_metal
      const C_m = cw.C_metal;
      km = C_m > 0 && C_m < 1 ? kb * (1 - C_m) / C_m : kb; // fallback
      cornwellDetail = {
        j: cw.j,
        rL: cw.rL,
        rH: cw.rH,
        t: cw.t,
        CL: cw.CL,
        CH: cw.CH,
        C_metal: cw.C_metal,
      };
    } else {
      // Wileman fallback
      const A = i.wilemanA ?? 0.78715;
      const B = i.wilemanB ?? 0.62873;
      km = memberStiffnessWileman(i.memberE * 1000, i.boltDiameter, i.grip, A, B);
    }

    // C_metal (antes del empaque)
    const C_metal = jointConstantC(kb, km);

    // Empaque no confinado: kg en serie con km → km_eff → C_eff
    let C = C_metal;
    let kg: number | undefined;
    if (
      i.hasGasket &&
      (i.gasketType ?? 'confined') === 'unconfined' &&
      i.gasketArea && i.gasketArea > 0 &&
      i.gasketEg_MPa && i.gasketEg_MPa > 0 &&
      i.gasketThickness_mm && i.gasketThickness_mm > 0
    ) {
      kg = gasketStiffness(i.gasketArea, i.gasketEg_MPa, i.gasketThickness_mm);
      const km_eff = isFinite(kg) ? (km * kg) / (km + kg) : km;
      C = jointConstantC(kb, km_eff);
    }

    return {
      kb,
      km,
      C,
      C_metal: cornwellDetail ? cornwellDetail.C_metal : C_metal,
      kg,
      cornwell: cornwellDetail,
    };
  }

  private staticLoad(areas: { At: number }, st: StiffnessResults): StaticLoadResults {
    const i  = this.input;
    const Sp = i.grade.Sp;
    const Fp = areas.At * Sp;   // Eq. 8-18

    let FiFactor: number;
    if      (i.permanence === 'permanent')   FiFactor = 0.90;
    else if (i.permanence === 'custom_pct')  FiFactor = i.preloadFactor ?? 0.75;
    else                                     FiFactor = 0.75;

    const Fi = i.preloadCustom ?? FiFactor * Fp;
    const FiMethod = i.preloadCustom != null
      ? 'Fi personalizada'
      : i.permanence === 'permanent'
        ? 'Fi = 0.90 Fp (conexión permanente, Eq. 8-31)'
        : i.permanence === 'custom_pct'
          ? `Fi = ${(FiFactor * 100).toFixed(1)}% · Fp (porcentaje personalizado)`
          : 'Fi = 0.75 Fp (conexión reutilizable, Eq. 8-31)';

    const P  = i.externalLoad;
    const Fb = st.C * P + Fi;             // Eq. 8-25
    const Fm = (1 - st.C) * P - Fi;       // Eq. 8-26
    const np = (Sp * areas.At - Fi) / (st.C * P);   // Eq. 8-29
    const np_proof = (Sp * areas.At) / Fb;
    const n0 = Fi / (P * (1 - st.C));               // Eq. 8-30
    const T  = wrenchTorque(i.K, Fi, i.boltDiameter);

    return { Fp, Fi, FiMethod, Fb, Fm, np, np_proof, n0, T };
  }

  private fatigue(areas: { At: number }, st: StiffnessResults): FatigueResults {
    const i    = this.input;
    const g    = i.grade;
    const Pmin = i.Pmin ?? 0;
    const Pmax = i.Pmax ?? i.externalLoad;
    const Fi   = this.staticLoad(areas, st).Fi;

    const sigma_i = Fi / areas.At;
    const sigma_a = (st.C * (Pmax - Pmin)) / (2 * areas.At);
    const sigma_m = (st.C * (Pmax + Pmin)) / (2 * areas.At) + sigma_i;

    const criterion: FatigueCriterion = i.fatigueCriterion ?? 'goodman';
    const Sa = fatigueSa(criterion, g.Se, g.Sut, g.Sy, sigma_i);
    const nf = sigma_a > 0 ? Sa / sigma_a : Infinity;
    const sigma_max = sigma_m + sigma_a;
    const np_fluencia = g.Sp / sigma_max;

    return { sigma_i, sigma_a, sigma_m, criterion, Sa, nf, np_fluencia };
  }

  /**
   * §8-10 — Unión con empaque.
   *
   * Empaque confinado:   usa C_metal directamente (empaque no afecta km).
   * Empaque no confinado: usa C_eff (ya calculado en stiffness con kg en serie).
   */
  private gasketResults(s: StaticLoadResults, st: StiffnessResults): GasketResults | undefined {
    const i = this.input;
    if (!i.hasGasket || !i.gasketArea || i.gasketArea <= 0) return undefined;

    const gasketType = i.gasketType ?? 'confined';
    const Ag   = i.gasketArea;
    const n    = i.gasketLoadFactor ?? 1;
    const C    = st.C;   // ya incluye kg para 'unconfined'
    const p_i  = s.Fi / Ag;
    const p_g  = (s.Fi - n * (1 - C) * i.externalLoad) / Ag;
    const n_seal = s.Fi / ((1 - C) * i.externalLoad);

    return {
      gasketType,
      Ag,
      n,
      p_i,
      p_g,
      sealed: p_g >= 0,
      n_seal,
      kg:      st.kg,
      C_eff:   gasketType === 'unconfined' ? C : undefined,
      C_metal: gasketType === 'unconfined' ? st.C_metal : undefined,
    };
  }

  private decide(s: StaticLoadResults, f?: FatigueResults) {
    const candidates: Array<[string, number]> = [
      ['Factor de carga np = (Sp·At − Fi)/(C·P)', s.np],
      ['Factor de separación n0 = Fi/[P(1−C)]',   s.n0],
    ];
    if (f) {
      candidates.push([`Factor de fatiga nf (${f.criterion})`, f.nf]);
      candidates.push(['Fluencia ny = Sp / σmax',               f.np_fluencia]);
    }
    let governing = candidates[0][0];
    let n = candidates[0][1];
    for (const [k, v] of candidates) {
      if (v < n) { n = v; governing = k; }
    }
    const verdict: 'valid' | 'marginal' | 'invalid' =
      n >= 2 ? 'valid' : n >= 1.2 ? 'marginal' : 'invalid';
    return { verdict, governing, n };
  }

  private recommendations(): string[] {
    return [
      'Precarga recomendada: Fi = 0.75 Fp (conexiones reutilizables) o 0.90 Fp (permanentes) — Shigley §8-9.',
      'Factor K ≈ 0.20 para pernos de acero sin recubrir; consulte la Tabla 8-15 para otros acabados.',
      'Cornwell (Norton §11.8): mantenga j = d/l entre 0.1 y 2.0 para precisión máxima del método FEA.',
      'Para carga cíclica use rosca laminada (Se ≈ 1.5 × cortada) y prefiera ISO 8.8 o superior (§8-11).',
      'Empaques confinados: el empaque no altera km; empaques no confinados reducen C_eff (kg en serie).',
      'Verifique simultáneamente factor de carga np, factor de separación n0 y factor de fatiga nf.',
    ];
  }

  private warnings(
    st: StiffnessResults,
    s: StaticLoadResults,
    f?: FatigueResults,
    g?: GasketResults,
  ): string[] {
    const w: string[] = [];
    const i = this.input;
    const ratio = s.Fi / s.Fp;

    if (ratio < 0.60)
      w.push(`Fi/Fp = ${(ratio * 100).toFixed(0)}% < 60% — precarga baja: riesgo de separación y fatiga.`);
    if (ratio > 0.92)
      w.push(`Fi/Fp = ${(ratio * 100).toFixed(0)}% > 90% — precarga muy alta; el perno queda cerca de fluencia.`);
    if (st.C > 0.35)
      w.push(`C = ${st.C.toFixed(3)} es alto — junta blanda. Revise empaque blando o piezas delgadas.`);
    if (s.np < 2)
      w.push(`Factor de carga np = ${s.np.toFixed(2)} < 2 — use grado superior o más pernos (§8-9).`);
    if (s.n0 < 2)
      w.push(`Factor de separación n0 = ${s.n0.toFixed(2)} — riesgo de separación de la junta bajo P.`);
    if (f && f.nf < 2)
      w.push(`Factor de fatiga nf = ${f.nf.toFixed(2)} con criterio ${f.criterion}; nf ≥ 2 recomendado (§8-11).`);

    // Rango de validez de Cornwell
    const method = i.kmMethod ?? 'cornwell';
    if (method === 'cornwell') {
      const j = i.boltDiameter / i.grip;
      if (j < 0.10 || j > 2.0)
        w.push(`Cornwell: j = d/l = ${j.toFixed(3)} fuera del rango [0.10, 2.00] de la Tabla 11-8.`);
    } else {
      if (i.grip / i.boltDiameter < 1 || i.grip / i.boltDiameter > 16)
        w.push(`Wileman: l/d = ${(i.grip / i.boltDiameter).toFixed(2)} fuera del rango 1–16 de la Tabla 8-8.`);
    }

    if (g) {
      if (!g.sealed)
        w.push(`EMPAQUE: p_g = ${g.p_g.toFixed(2)} MPa < 0 — empaque pierde contacto a n = ${g.n}×P. Aumente precarga o reduzca P.`);
      else if (g.p_g < 0.5 * g.p_i)
        w.push(`EMPAQUE: p_g = ${g.p_g.toFixed(2)} MPa (< 50% p_i) — presión residual baja.`);
      if (g.gasketType === 'unconfined' && g.C_eff !== undefined && g.C_metal !== undefined) {
        const delta = g.C_eff - g.C_metal;
        if (delta > 0.05)
          w.push(`Empaque no confinado eleva C de ${g.C_metal.toFixed(3)} a ${g.C_eff.toFixed(3)} — aumenta carga cíclica en el perno.`);
      }
    }

    // Ec. 8-34 — espaciado entre pernos en brida
    if (i.boltCircleDiameter && i.numBolts && i.numBolts > 0) {
      const s_bolt = (Math.PI * i.boltCircleDiameter) / i.numBolts;
      const s_max  = 2 * i.boltDiameter + 6;
      if (s_bolt > s_max)
        w.push(
          `Ec. 8-34: paso entre pernos s = ${s_bolt.toFixed(1)} mm > s_máx = 2d+6 = ${s_max.toFixed(1)} mm — ` +
          `aumente N o reduzca Db para evitar deflexión de la brida.`,
        );
    }

    return w;
  }

  private log(
    a: { Ad: number; At: number },
    st: StiffnessResults,
    s: StaticLoadResults,
    f: FatigueResults | undefined,
    g: GasketResults | undefined,
  ): TensionJointResults['calculations'] {
    const method = this.input.kmMethod ?? 'cornwell';

    const log: TensionJointResults['calculations'] = {
      At: { formula: 'A_t\\text{ (tabla 8-1/8-2)}',                 value: a.At,  unit: 'mm²' },
      Ad: { formula: 'A_d = \\pi d^2/4',                             value: a.Ad,  unit: 'mm²' },
      kb: { formula: 'k_b = \\dfrac{A_d A_t E}{A_d l_t + A_t l_d}', value: st.kb, unit: 'N/mm', ref: 'Eq. 8-17' },
    };

    if (method === 'cornwell' && st.cornwell) {
      const cw = st.cornwell;
      log.j  = { formula: 'j = d/l',                                   value: cw.j,      unit: '',      ref: 'Norton §11.8' };
      log.rL = { formula: 'r_L = E_L/E_b',                             value: cw.rL,     unit: '',      ref: 'Tabla 11-8' };
      log.CL = { formula: 'C_L = p_3 r_L^3+p_2 r_L^2+p_1 r_L+p_0',   value: cw.CL,     unit: '',      ref: 'Eq. 11.19' };
      if (cw.rH !== cw.rL) {
        log.rH = { formula: 'r_H = E_H/E_b',                           value: cw.rH,     unit: '',      ref: 'Tabla 11-8' };
        log.CH = { formula: 'C_H = p_3 r_H^3+\\ldots+p_0',             value: cw.CH,     unit: '',      ref: 'Eq. 11.19' };
        log.t  = { formula: 't = T_L/(T_L+T_H)',                        value: cw.t,      unit: '',      ref: 'Eq. 11.22' };
        log.C_metal = { formula: 'C_{metal} = C_L+t(C_H-C_L)',         value: cw.C_metal, unit: '',     ref: 'Eq. 11.22' };
      } else {
        log.C_metal = { formula: 'C_{metal} = C_r(j,\\,r)',             value: cw.C_metal, unit: '',     ref: 'Norton §11.8' };
      }
      if (st.kg !== undefined) {
        log.kg = { formula: 'k_g = A_g E_g / t_g',                     value: st.kg,     unit: 'N/mm',  ref: 'Norton §11.8' };
      }
      log.km = { formula: 'k_m = k_b(1-C_{metal})/C_{metal}',          value: st.km,     unit: 'N/mm',  ref: 'Norton §11.8' };
    } else {
      log.km = {
        formula: 'k_m = E\\,d\\,A\\,e^{Bd/l}',
        value: st.km,
        unit: 'N/mm',
        ref: 'Eq. 8-23',
      };
    }

    log.C  = { formula: 'C = k_b/(k_b+k_m)',  value: st.C, unit: '', ref: 'Eq. 8-24' };
    log.Fp = { formula: 'F_p = A_t\\,S_p',                              value: s.Fp,  unit: 'N',    ref: 'Eq. 8-18' };
    log.Fi = { formula: 'F_i',                                          value: s.Fi,  unit: 'N',    ref: s.FiMethod };
    log.T  = { formula: 'T = K\\,F_i\\,d',                              value: s.T,   unit: 'N·m',  ref: 'Eq. 8-27' };
    log.Fb = { formula: 'F_b = C\\,P + F_i',                            value: s.Fb,  unit: 'N',    ref: 'Eq. 8-25' };
    log.Fm = { formula: 'F_m = (1-C)P - F_i',                           value: s.Fm,  unit: 'N',    ref: 'Eq. 8-26' };
    log.np = { formula: 'n_p = \\dfrac{S_p A_t - F_i}{C\\,P}',           value: s.np,       unit: '', ref: 'Eq. 8-29' };
    log.np_proof = { formula: 'n_{p,proof} = \\dfrac{S_p A_t}{C\\,P + F_i}', value: s.np_proof, unit: '', ref: 'razón de prueba' };
    log.n0 = { formula: 'n_0 = \\dfrac{F_i}{P(1-C)}',                    value: s.n0,       unit: '', ref: 'Eq. 8-30' };

    if (f) {
      log.sigma_i = { formula: '\\sigma_i = F_i/A_t',                              value: f.sigma_i, unit: 'MPa' };
      log.sigma_a = { formula: '\\sigma_a = C(P_{max}-P_{min})/(2 A_t)',           value: f.sigma_a, unit: 'MPa', ref: 'Eq. 8-35' };
      log.sigma_m = { formula: '\\sigma_m = C(P_{max}+P_{min})/(2 A_t) + F_i/A_t', value: f.sigma_m, unit: 'MPa', ref: 'Eq. 8-36' };
      log.Sa      = { formula: 'S_a\\text{ (criterio de fatiga)}',                 value: f.Sa,      unit: 'MPa', ref: 'Eq. 8-38/8-42/8-45' };
      log.nf      = { formula: 'n_f = S_a/\\sigma_a',                              value: f.nf,      unit: '' };
      log.np_y    = { formula: 'n_{y} = S_p/\\sigma_{max}',                         value: f.np_fluencia, unit: '', ref: 'Eq. 8-49' };
    }

    if (g) {
      log['p_i'] = {
        formula: 'p_i = F_i / A_g',
        value: g.p_i,
        unit: 'MPa',
        ref: '§8-10',
      };
      log[`p_g (n=${g.n})`] = {
        formula: `p_g = \\dfrac{F_i - n(1-C)P}{A_g},\\; n=${g.n}`,
        value: g.p_g,
        unit: 'MPa',
        ref: '§8-10',
      };
      log['n_sello'] = {
        formula: 'n_{sello} = \\dfrac{F_i}{(1-C)P}',
        value: g.n_seal,
        unit: '',
        ref: '§8-10',
      };
    }

    return log;
  }
}
