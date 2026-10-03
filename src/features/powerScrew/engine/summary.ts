/**
 * Resumen del diseño a partir del resultado del motor: utilización por
 * verificación, veredicto, criterio que gobierna y resultados destacados según
 * el objetivo. Puro y sin React.
 */

import type { CheckResult, DerivedId, EngineResult, InputId, ProblemConfig } from './types';

/**
 * Utilización = demanda / capacidad. ≤ 1 cumple, > 1 no cumple.
 * Factores de seguridad: n_obj / n. Desgaste: σ_B,t / p_b. Entrada: T / T_ent.
 * Autobloqueo: tan λ / (f sec α). Devuelve undefined si la verificación no se
 * expresa como utilización (validez de la ecuación, retención).
 */
export function utilization(c: CheckResult): number | undefined {
  const o = c.outcome;
  if (!o) return undefined;
  switch (c.id) {
    case 'rootYield':
    case 'bodyYield':
    case 'buckling':
      return o.computed > 0 ? o.required / o.computed : Infinity;
    case 'wear':
      return o.required > 0 ? o.computed / o.required : Infinity;
    case 'inputEnough':
      return o.computed > 0 ? o.required / o.computed : Infinity;
    case 'selfLock':
      return o.computed > 0 ? o.required / o.computed : Infinity;
    default:
      return undefined;
  }
}

export type VerdictStatus = 'ok' | 'warn' | 'fail' | 'incomplete';

export interface Verdict {
  status:     VerdictStatus;
  /** Texto corto del veredicto. */
  title:      string;
  evaluated:  number;
  pending:    number;
  /** Verificación con mayor utilización entre las evaluadas. */
  governing?: { id: string; label: string; utilization: number };
}

export function verdict(checks: readonly CheckResult[], cfg: ProblemConfig): Verdict {
  const evaluated = checks.filter(c => c.status === 'ok' || c.status === 'fail' || c.status === 'warn');
  const pending = checks.filter(c => c.status === 'pending').length;

  let governing: Verdict['governing'];
  for (const c of evaluated) {
    const u = utilization(c);
    if (u === undefined) continue;
    // El autobloqueo solo gobierna si se exige.
    if (c.id === 'selfLock' && !cfg.requireSelfLock) continue;
    if (!governing || u > governing.utilization) governing = { id: c.id, label: c.label, utilization: u };
  }

  const isFail = (c: CheckResult) =>
    c.status === 'fail' || (c.id === 'selfLock' && cfg.requireSelfLock && c.status === 'warn');
  const anyFail = evaluated.some(isFail);
  const anyWarn = evaluated.some(c => c.status === 'warn' && !isFail(c));

  let status: VerdictStatus;
  let title: string;
  if (evaluated.length === 0) { status = 'incomplete'; title = 'Faltan datos para evaluar el diseño'; }
  else if (anyFail) { status = 'fail'; title = 'No cumple'; }
  else if (anyWarn) { status = 'warn'; title = 'Cumple con observaciones'; }
  else if (pending > 0) { status = 'incomplete'; title = 'Cumple lo evaluado; faltan verificaciones'; }
  else { status = 'ok'; title = 'Cumple'; }

  return { status, title, evaluated: evaluated.length, pending, governing };
}

/** Resultados que se destacan arriba según el objetivo (en orden de importancia). */
export function goalHighlights(cfg: ProblemConfig, r: EngineResult): (DerivedId | InputId)[] {
  const has = (id: DerivedId) => r.values[id] !== undefined;
  const pick = (...ids: DerivedId[]) => ids.filter(has);
  switch (cfg.goal) {
    case 'capacity':
      return pick('Fw', 'T', 'e');
    case 'drive':
      return cfg.transmission === 'lever'
        ? pick('Preq', 'rreq', 'MA', 'T')
        : cfg.transmission === 'reducer'
          ? pick('Tmreq', 'T', 'power')
          : pick('Tinreq', 'Tlow', 'e');
    case 'lead':
      return pick('nmax', 'lmax', 'lambda', 'e1');
    case 'size':
      return pick('T', 'e');
    case 'analyze':
    default:
      return pick('T', 'Tlow', 'e', 'vm');
  }
}

/**
 * Eficiencia en función del ángulo de avance (curva para el gráfico e–λ).
 * Rosca: e = tan λ (1 − f sec α tan λ) / (tan λ + f sec α).
 * Con apoyo: e = tan λ / [ (tan λ + f sec α)/(1 − f sec α tan λ) + f_c d_c / d_m ].
 * Devuelve null donde la rosca se traba (1 − f sec α tan λ ≤ 0).
 */
export function efficiencyAt(lambda: number, f: number, alpha: number, collar?: { fc: number; dcOverDm: number }): number | null {
  const t = Math.tan(lambda), fs = f / Math.cos(alpha);
  const den = 1 - fs * t;
  if (den <= 0 || t <= 0) return null;
  const threadRatio = (t + fs) / den;          // T_R / (F d_m / 2): factor de par de la rosca
  const extra = collar ? collar.fc * collar.dcOverDm : 0;
  return t / (threadRatio + extra);
}

/** Ángulo de avance en la frontera de autobloqueo: tan λ = f sec α. */
export function lockingLeadAngle(f: number, alpha: number): number {
  return Math.atan(f / Math.cos(alpha));
}
