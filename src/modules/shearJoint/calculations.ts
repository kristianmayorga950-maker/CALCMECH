/**
 * Juntas atornilladas a cortante — Shigley 9ª ed., §8-12.
 *
 * Análisis:
 *  1. Centroide del grupo.
 *  2. Cortante directo  F' = V/n, distribuido en todos los pernos.
 *  3. Cortante por momento F'' = M·ri / Σri²  (perpendicular a ri).
 *  4. Fuerza resultante por perno → selección del perno más cargado.
 *  5. τ en el perno   — admisible 0.577·Sp (distorsión de energía).
 *  6. σ aplastamiento  — Eq. 8-49:  σ = F/(t·d),  admisible 0.9·Syp.
 *  7. σ tensión área neta — σ = V/[(w−n·d)·t], admisible 0.6·Syp.
 */

import type {
  ShearJointInput,
  ShearJointResults,
  BoltForce,
  ShearBolt,
} from './types';

export function centroid(bolts: ShearBolt[]): { x: number; y: number } {
  const n = bolts.length;
  const sx = bolts.reduce((s, b) => s + b.x, 0);
  const sy = bolts.reduce((s, b) => s + b.y, 0);
  return { x: sx / n, y: sy / n };
}

/** Par (cortante directo + por momento) aplicado al patrón — Shigley §8-12. */
export function distributeForces(
  bolts: ShearBolt[],
  V: number, Vx: number, Vy: number,
  ax: number, ay: number,
): { forces: BoltForce[]; M: number; sumR2: number; centroid: { x: number; y: number } } {
  const c = centroid(bolts);
  const n = bolts.length;
  // Componentes unitarias de V
  const vmag = Math.hypot(Vx, Vy) || 1;
  const ux = (Vx / vmag) * V;
  const uy = (Vy / vmag) * V;
  // Momento de V respecto al centroide (brazo perpendicular)
  //   M = (ax − cx)·Vy − (ay − cy)·Vx   (positivo antihorario)
  const M = (ax - c.x) * uy - (ay - c.y) * ux;
  const sumR2 = bolts.reduce((s, b) => s + ((b.x - c.x) ** 2 + (b.y - c.y) ** 2), 0);

  const forces: BoltForce[] = bolts.map(b => {
    const rx = b.x - c.x;
    const ry = b.y - c.y;
    const r  = Math.hypot(rx, ry);
    // Cortante directo — la carga V se reparte por igual
    const Fpx = ux / n;
    const Fpy = uy / n;
    // Cortante por momento — perpendicular a r, magnitud M·r/Σr²
    // dirección perpendicular a (rx, ry): (−ry, rx)  (antihorario)
    const Fmx = sumR2 > 0 ? (-M * ry) / sumR2 : 0;
    const Fmy = sumR2 > 0 ? ( M * rx) / sumR2 : 0;
    const Fx  = Fpx + Fmx;
    const Fy  = Fpy + Fmy;
    return { id: b.id, x: b.x, y: b.y, r, Fpx, Fpy, Fmx, Fmy, Fx, Fy, F: Math.hypot(Fx, Fy) };
  });
  return { forces, M, sumR2, centroid: c };
}

// ─── Clase principal ──────────────────────────────────────────────────────────

export class ShearJointCalculator {
  constructor(private input: ShearJointInput) {}

  calculate(): ShearJointResults {
    this.assertInputs();
    const i = this.input;

    const { forces, M, sumR2, centroid: c } =
      distributeForces(i.bolts, i.V, i.Vx, i.Vy, i.applicationX, i.applicationY);
    const maxBolt = forces.reduce((a, b) => (b.F > a.F ? b : a), forces[0]);

    const planes = i.doubleShear ? 2 : 1;
    const tauBolt = maxBolt.F / (i.shearArea * planes);
    const tauBoltAllow = 0.577 * i.boltSp;     // criterio de distorsión con Sp
    const nBoltShear   = tauBoltAllow / tauBolt;

    const sigmaBearing = maxBolt.F / (i.plateThickness * i.boltDiameter);
    const sigmaBearingAllow = 0.9 * i.plateSy;
    const nBearing = sigmaBearingAllow / sigmaBearing;

    let sigmaNet: number | undefined;
    let sigmaNetAllow: number | undefined;
    let nNet: number | undefined;
    if (i.plateWidth && i.plateWidth > 0) {
      // Para la tensión en el área neta Shigley usa la línea crítica de pernos:
      //   σ = V / [(w − nc·d)·t]  donde nc = pernos en la sección crítica (aquí todos si en línea)
      const nc = i.bolts.length;
      const netArea = Math.max(1e-6, (i.plateWidth - nc * i.boltDiameter) * i.plateThickness);
      sigmaNet = i.V / netArea;
      sigmaNetAllow = 0.6 * i.plateSy;
      nNet = sigmaNetAllow / sigmaNet;
    }

    const { verdict, governing, n } = this.decide(nBoltShear, nBearing, nNet);

    return {
      input: i,
      centroid: c, M, sumR2,
      forces, maxBolt,
      tauBolt, tauBoltAllow, nBoltShear,
      sigmaBearing, sigmaBearingAllow, nBearing,
      sigmaNet, sigmaNetAllow, nNet,
      verdict: { verdict, governing, safetyFactor: n },
      recommendations: this.recommendations(),
      warnings: this.warnings(nBoltShear, nBearing, nNet),
      calculations: this.log(maxBolt, tauBolt, tauBoltAllow, sigmaBearing, sigmaBearingAllow, sigmaNet, sigmaNetAllow, M, sumR2),
    };
  }

  private assertInputs(): void {
    const i = this.input;
    const missing: string[] = [];
    if (!i.bolts || i.bolts.length < 1) missing.push('Patrón de pernos (coordenadas)');
    if (!i.boltDiameter || i.boltDiameter <= 0) missing.push('Diámetro d');
    if (!i.shearArea || i.shearArea <= 0)       missing.push('Área de corte (At o πd²/4)');
    if (!i.boltSp)   missing.push('Sp del perno');
    if (!i.V)        missing.push('Carga V');
    if (!i.plateThickness) missing.push('Espesor de la placa t');
    if (!i.plateSy)  missing.push('Sy de la placa');
    if (missing.length > 0)
      throw new Error(`Faltan datos (Shigley §8-12): ${missing.join(', ')}`);
  }

  private decide(nShear: number, nBearing: number, nNet?: number) {
    const opts: Array<[string, number]> = [
      ['Cortante del perno  (τ_adm = 0.577·Sp)', nShear],
      ['Aplastamiento placa (σ_adm = 0.9·Sy)',   nBearing],
    ];
    if (nNet != null) opts.push(['Tensión área neta  (σ_adm = 0.6·Sy)', nNet]);
    let governing = opts[0][0], n = opts[0][1];
    for (const [k, v] of opts) if (v < n) { n = v; governing = k; }
    const verdict: 'valid' | 'marginal' | 'invalid' =
      n >= 2 ? 'valid' : n >= 1.2 ? 'marginal' : 'invalid';
    return { verdict, governing, n };
  }

  private recommendations(): string[] {
    return [
      'En Shigley §8-12 los pernos se diseñan sólo contra cortante — la precarga se ignora en este modelo (el libro la discute al final de la sección).',
      'Prefiera un patrón simétrico y centrado sobre la línea de acción de V para anular el momento.',
      'Si la rosca cae en el plano de corte use At; si cae el vástago use πd²/4 — Shigley lo aclara al presentar Eq. 8-49.',
      'Use τ_adm = 0.577·Sp (distorsión) para el perno y σ_adm ≈ 0.9·Sy para aplastamiento en la placa.',
      'Verifique también la tensión en el área neta de la placa (ancho − nc·d)·t y la resistencia a desgarre.',
      'Separación mínima entre pernos y al borde: 3d y 1.5d, respectivamente (práctica recomendada AISC).',
    ];
  }

  private warnings(nShear: number, nBearing: number, nNet?: number): string[] {
    const w: string[] = [];
    if (nShear < 2)   w.push(`Cortante del perno bajo (n = ${nShear.toFixed(2)}): aumente d o use grado superior.`);
    if (nBearing < 2) w.push(`Aplastamiento crítico (n = ${nBearing.toFixed(2)}): aumente t o use placa con Sy mayor.`);
    if (nNet != null && nNet < 2)
      w.push(`Tensión en área neta baja (n = ${nNet.toFixed(2)}): aumente el ancho de la placa.`);
    return w;
  }

  private log(
    maxBolt: BoltForce,
    tauB: number, tauA: number,
    sigB: number, sigA: number,
    sigN: number | undefined, sigNA: number | undefined,
    M: number, sumR2: number,
  ): ShearJointResults['calculations'] {
    const log: ShearJointResults['calculations'] = {
      M:      { formula: 'M = V \\cdot e',                                  value: M,         unit: 'N·mm' },
      sumR2:  { formula: '\\sum r_i^2',                                     value: sumR2,     unit: 'mm²' },
      Fmax:   { formula: 'F_{\\max} = \\sqrt{(F\'_x+F\'\'_x)^2+(F\'_y+F\'\'_y)^2}', value: maxBolt.F, unit: 'N' },
      tau:    { formula: '\\tau = F_{\\max}/(A_v \\cdot \\text{planos})',   value: tauB,      unit: 'MPa' },
      tauAdm: { formula: '\\tau_{adm} = 0.577\\,S_p',                       value: tauA,      unit: 'MPa', ref: '§8-12' },
      sigmaBr:{ formula: '\\sigma = F_{\\max}/(t\\,d)',                     value: sigB,      unit: 'MPa', ref: 'Eq. 8-49' },
      sigBrAdm:{formula: '\\sigma_{adm} = 0.9\\,S_y',                       value: sigA,      unit: 'MPa' },
    };
    if (sigN != null && sigNA != null) {
      log.sigmaNet    = { formula: '\\sigma = V/[(w-n\\,d)\\,t]', value: sigN,  unit: 'MPa' };
      log.sigmaNetAdm = { formula: '\\sigma_{adm} = 0.6\\,S_y',    value: sigNA, unit: 'MPa' };
    }
    return log;
  }
}
