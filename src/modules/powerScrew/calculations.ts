/**
 * Tornillo de potencia — Shigley, "Diseño en Ingeniería Mecánica" 9ª ed.
 * §8-1  Normas y definiciones de roscas
 * §8-2  Mecánica de los tornillos de potencia
 */

import type {
  PowerScrewInput,
  PowerScrewResults,
  PowerScrewGeometry,
  PowerScrewTorques,
  PowerScrewBodyStress,
  PowerScrewThreadStress,
} from './types';

const DEG = 180 / Math.PI;

/** α = medio ángulo del filete en el plano normal (Acme 14.5°, cuadrada 0°). */
export function threadHalfAngleDeg(threadType: 'square' | 'acme'): number {
  return threadType === 'acme' ? 14.5 : 0;
}

/** dm = d − p/2  (§8-1, entre Eq. 8-1 y 8-2 — diámetro medio). */
export function meanDiameter(d: number, p: number): number {
  return d - p / 2;
}

/** dr = d − p  (§8-1, diámetro menor o de raíz aproximado). */
export function minorDiameter(d: number, p: number): number {
  return d - p;
}

/** Par para elevar la carga — Shigley Eq. 8-5 (cuadrada) / 8-6 (Acme, con secα). */
export function torqueRaise(
  F: number, dm: number, L: number, f: number, alphaDeg = 0,
): number {
  const sec = 1 / Math.cos(alphaDeg / DEG);
  return (F * dm / 2) * (L + Math.PI * f * dm * sec) / (Math.PI * dm - f * L * sec);
}

/** Par para bajar la carga — Shigley Eq. 8-5 / 8-6. */
export function torqueLower(
  F: number, dm: number, L: number, f: number, alphaDeg = 0,
): number {
  const sec = 1 / Math.cos(alphaDeg / DEG);
  return (F * dm / 2) * (Math.PI * f * dm * sec - L) / (Math.PI * dm + f * L * sec);
}

/** Par en el collarín — Shigley Eq. 8-7:  Tc = F·fc·dc / 2. */
export function collarTorque(F: number, fc: number, dc: number): number {
  return (F * fc * dc) / 2;
}

/** Eficiencia — Shigley Eq. 8-4:  e = F·L / (2π·T). */
export function screwEfficiency(F: number, L: number, T: number): number {
  if (T <= 0) return 0;
  return (F * L) / (2 * Math.PI * T);
}

/**
 * Condición de autobloqueo — Shigley (texto después de Eq. 8-6):
 *   π·f·dm > L·cosα   (TL ≥ 0)
 * Para rosca cuadrada (α = 0):  π·f·dm > L.
 */
export function isSelfLocking(f: number, dm: number, L: number, alphaDeg: number): boolean {
  return Math.PI * f * dm > L * Math.cos(alphaDeg / DEG);
}

/** Esfuerzo axial en el cuerpo — Shigley Eq. 8-9:  σ = 4F / (π·dr²). */
export function bodyAxialStress(F: number, dr: number): number {
  return (4 * F) / (Math.PI * dr * dr);
}

/** Esfuerzo de torsión en el cuerpo — Shigley Eq. 8-10:  τ = 16T / (π·dr³). */
export function bodyTorsionStress(T: number, dr: number): number {
  return (16 * T) / (Math.PI * dr * dr * dr);
}

/** Von Mises (distorsión) para estado plano σ, τ:  σ' = √(σ² + 3τ²). */
export function vonMises(sigma: number, tau: number): number {
  return Math.sqrt(sigma * sigma + 3 * tau * tau);
}

/** Aplastamiento (bearing) en el filete — Eq. 8-11:  σB = 2F/(π·dm·nt·p). */
export function threadBearingStress(F: number, dm: number, nt: number, p: number): number {
  return (2 * F) / (Math.PI * dm * nt * p);
}

/** Flexión en la raíz del filete — Eq. 8-12:  σb = 6F/(π·dr·nt·p). */
export function threadBendingStress(F: number, dr: number, nt: number, p: number): number {
  return (6 * F) / (Math.PI * dr * nt * p);
}

/** Cortante transversal en la base del filete — Eq. 8-13:  τ = 3F/(π·dr·nt·p). */
export function threadShearStress(F: number, dr: number, nt: number, p: number): number {
  return (3 * F) / (Math.PI * dr * nt * p);
}

// ─── Clase principal ──────────────────────────────────────────────────────────

export class PowerScrewCalculator {
  constructor(private input: PowerScrewInput) {}

  calculate(): PowerScrewResults {
    this.assertInputs();

    const geometry   = this.geometry();
    const torques    = this.torques(geometry);
    const bodyStress = this.bodyStress(geometry, torques);
    const threadStress = this.threadStress(geometry);

    const F = this.input.axialLoad;
    const indicators = {
      safetyFactorYield: this.input.material
        ? this.input.material.Sy / bodyStress.sigmaVonMises
        : undefined,
      selfLocking: torques.selfLocking,
      efficiencyPercent: torques.efficiency * 100,
    };

    return {
      input: this.input,
      geometry,
      torques,
      bodyStress,
      threadStress,
      indicators,
      recommendations: this.recommendations(torques, bodyStress),
      warnings:        this.warnings(geometry, torques, bodyStress, threadStress),
      calculations:    this.log(F, geometry, torques, bodyStress, threadStress),
    };
  }

  private assertInputs(): void {
    const i = this.input;
    const required: Record<string, number | undefined> = {
      'Diámetro mayor d':      i.majorDiameter,
      'Paso p':                i.pitch,
      'Número de entradas':    i.numberOfStarts,
      'Carga axial F':         i.axialLoad,
      'Coef. fricción f':      i.frictionCoefficient,
      'Filetes en contacto nt':i.engagedThreads,
    };
    const missing = Object.entries(required)
      .filter(([, v]) => v == null || !Number.isFinite(v) || v <= 0)
      .map(([k]) => k);
    if (i.hasCollar) {
      if (!i.collarDiameter)      missing.push('Diámetro collarín dc');
      if (i.collarFriction == null) missing.push('Coef. fricción collarín fc');
    }
    if (missing.length > 0) {
      throw new Error(`Faltan datos para el cálculo según Shigley §8-2: ${missing.join(', ')}`);
    }
  }

  private geometry(): PowerScrewGeometry {
    const { majorDiameter: d, pitch: p, numberOfStarts: n } = this.input;
    const dm   = meanDiameter(d, p);
    const dr   = minorDiameter(d, p);
    const L    = n * p;
    const lam  = Math.atan(L / (Math.PI * dm));
    const alpha = threadHalfAngleDeg(this.input.threadType);
    return {
      d, dm, dr, p,
      lead: L,
      leadAngleRad: lam,
      leadAngleDeg: lam * DEG,
      threadHalfAngleDeg: alpha,
    };
  }

  private torques(g: PowerScrewGeometry): PowerScrewTorques {
    const F = this.input.axialLoad;
    const f = this.input.frictionCoefficient;
    const alpha = g.threadHalfAngleDeg;
    const TR = torqueRaise(F, g.dm, g.lead, f, alpha);
    const TL = torqueLower(F, g.dm, g.lead, f, alpha);
    const Tc = this.input.hasCollar
      ? collarTorque(F, this.input.collarFriction ?? 0, this.input.collarDiameter ?? 0)
      : 0;
    const Ttotal = TR + Tc;
    const e  = screwEfficiency(F, g.lead, Ttotal);
    const sl = isSelfLocking(f, g.dm, g.lead, alpha);

    const secLatex = alpha > 0 ? '\\sec\\alpha' : '';
    return {
      TR, TL, Tc, Ttotal,
      efficiency: Math.max(0, Math.min(1, e)),
      selfLocking: sl,
      formulas: {
        TR: `T_R = \\frac{Fd_m}{2}\\,\\frac{L + \\pi f d_m${secLatex}}{\\pi d_m - f L${secLatex}}`,
        TL: `T_L = \\frac{Fd_m}{2}\\,\\frac{\\pi f d_m${secLatex} - L}{\\pi d_m + f L${secLatex}}`,
        Tc: 'T_c = \\dfrac{F\\,f_c\\,d_c}{2}',
      },
    };
  }

  private bodyStress(g: PowerScrewGeometry, t: PowerScrewTorques): PowerScrewBodyStress {
    const F = this.input.axialLoad;
    const sigma = bodyAxialStress(F, g.dr);
    const tau   = bodyTorsionStress(t.Ttotal, g.dr);
    const vm    = vonMises(sigma, tau);
    return {
      sigmaAxial: sigma,
      tauTorsion: tau,
      sigmaVonMises: vm,
      allowableSy: this.input.material?.Sy,
    };
  }

  private threadStress(g: PowerScrewGeometry): PowerScrewThreadStress {
    const F  = this.input.axialLoad;
    const nt = this.input.engagedThreads;
    return {
      bearing: threadBearingStress(F, g.dm, nt, g.p),
      bending: threadBendingStress(F, g.dr, nt, g.p),
      shear:   threadShearStress  (F, g.dr, nt, g.p),
    };
  }

  private recommendations(
    _t: PowerScrewTorques,
    _bs: PowerScrewBodyStress,
  ): string[] {
    // Recomendaciones base del libro (§8-2). Se añaden contextuales en warnings().
    return [
      'Usar un coeficiente de fricción representativo: f ≈ 0.08 lubricado, 0.15 seco (Shigley §8-2).',
      'Para aplastamiento del filete considere 2–3 filetes en contacto como máximo, aunque haya más.',
      'Prefiera rosca cuadrada si la eficiencia es crítica; Acme acepta desgaste y ajuste con tuerca partida.',
      'Si el tornillo no es autobloqueante se requiere freno; en caso contrario considere e < 0.5.',
      'Para el collarín, un cojinete de bolas baja fc ≈ 0.01; con empuje plano lubricado fc ≈ 0.08–0.15.',
    ];
  }

  private warnings(
    _g: PowerScrewGeometry,
    t: PowerScrewTorques,
    bs: PowerScrewBodyStress,
    ts: PowerScrewThreadStress,
  ): string[] {
    const w: string[] = [];
    if (!t.selfLocking)
      w.push('El tornillo NO es autobloqueante (π·f·dm < L·cosα) — la carga puede descender por sí sola. Añada freno o aumente f.');
    if (t.efficiency > 0.5)
      w.push(`Eficiencia e = ${(t.efficiency * 100).toFixed(1)}% — coherente con tornillo no autobloqueante.`);
    if (this.input.material) {
      const n = this.input.material.Sy / bs.sigmaVonMises;
      if (n < 2)
        w.push(`σ' Von Mises = ${bs.sigmaVonMises.toFixed(1)} MPa da n = ${n.toFixed(2)} < 2 respecto a Sy — aumente dr o material.`);
    }
    if (ts.bearing > 100 && !this.input.material)
      w.push(`σ_aplastamiento en el filete = ${ts.bearing.toFixed(1)} MPa. Para bronce/fundición, el libro sugiere σ_adm ≈ 18–28 MPa (Tabla 8-17 de Mott); revise número de filetes nt.`);
    if (this.input.engagedThreads > 15)
      w.push('Se tomaron >15 filetes en contacto. Shigley recomienda limitar a 10 por distribución no uniforme de la carga.');
    return w;
  }

  private log(
    F: number,
    g: PowerScrewGeometry,
    t: PowerScrewTorques,
    bs: PowerScrewBodyStress,
    ts: PowerScrewThreadStress,
  ): PowerScrewResults['calculations'] {
    return {
      dm:     { formula: 'd_m = d - p/2',                      value: g.dm,           unit: 'mm',   ref: '§8-1' },
      dr:     { formula: 'd_r = d - p',                        value: g.dr,           unit: 'mm',   ref: '§8-1' },
      lead:   { formula: 'L = n\\,p',                          value: g.lead,         unit: 'mm',   ref: '§8-1' },
      lambda: { formula: '\\lambda = \\arctan\\!\\left(\\dfrac{L}{\\pi d_m}\\right)', value: g.leadAngleDeg, unit: '°', ref: '§8-2' },
      F:      { formula: 'F',                                  value: F,              unit: 'N' },
      TR:     { formula: t.formulas.TR,                        value: t.TR,           unit: 'N·mm', ref: 'Eq. 8-5/8-6' },
      TL:     { formula: t.formulas.TL,                        value: t.TL,           unit: 'N·mm', ref: 'Eq. 8-5/8-6' },
      Tc:     { formula: t.formulas.Tc,                        value: t.Tc,           unit: 'N·mm', ref: 'Eq. 8-7' },
      Ttotal: { formula: 'T = T_R + T_c',                      value: t.Ttotal,       unit: 'N·mm' },
      eff:    { formula: 'e = \\dfrac{FL}{2\\pi T_R}',         value: t.efficiency,   unit: '',     ref: 'Eq. 8-4' },
      sigma:  { formula: '\\sigma = \\dfrac{4F}{\\pi d_r^2}',  value: bs.sigmaAxial,  unit: 'MPa',  ref: 'Eq. 8-9' },
      tau:    { formula: '\\tau = \\dfrac{16T}{\\pi d_r^3}',   value: bs.tauTorsion,  unit: 'MPa',  ref: 'Eq. 8-10' },
      vm:     { formula: "\\sigma' = \\sqrt{\\sigma^2 + 3\\tau^2}", value: bs.sigmaVonMises, unit: 'MPa' },
      sigmaB: { formula: '\\sigma_B = \\dfrac{2F}{\\pi d_m n_t p}', value: ts.bearing,   unit: 'MPa', ref: 'Eq. 8-11' },
      sigmaBf:{ formula: '\\sigma_b = \\dfrac{6F}{\\pi d_r n_t p}', value: ts.bending,   unit: 'MPa', ref: 'Eq. 8-12' },
      tauTh:  { formula: '\\tau = \\dfrac{3F}{\\pi d_r n_t p}',     value: ts.shear,     unit: 'MPa', ref: 'Eq. 8-13' },
    };
  }
}
