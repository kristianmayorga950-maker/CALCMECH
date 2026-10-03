/**
 * Dimensionamiento: recorre tamaños candidatos (catálogo Acme o una serie d/p del
 * usuario), resuelve el problema completo con cada uno y elige el menor diámetro
 * que cumple todas las verificaciones evaluables. Para el desgaste calcula los
 * filetes mínimos en contacto (despeje de la presión media ≤ p_b).
 */

import type { CheckStatus, EnteredInputs, InputId, ProblemConfig } from './types';
import type { EngineDefinition } from './solver';
import { solve } from './solver';

export interface SizeCandidateInput { id: string; d: number; p: number }   // mm

export interface SizeCandidate {
  id:        string;
  d:         number;
  p:         number;
  dr:        number | undefined;
  ntMin?:    number;            // filetes mínimos por desgaste
  H?:        number;            // longitud de tuerca correspondiente, mm
  checks:    Record<string, CheckStatus>;
  margins:   Record<string, number>;   // calculado / requerido (≥ 1 cumple para n; ≤ 1 para desgaste)
  passes:    boolean;
  /** Primer criterio que falla, para explicar el rechazo. */
  failedBy?: string;
}

export interface SizingResult {
  /** Diámetro menor mínimo por compresión pura, como punto de partida. */
  drStart?:      number;
  candidates:    SizeCandidate[];
  recommendedId?: string;
  /** Verificaciones que no se pudieron evaluar por falta de datos. */
  notEvaluated:  string[];
}

const DESIGN_CHECKS = ['torqueEq', 'rootYield', 'bodyYield', 'buckling', 'wear', 'selfLock'] as const;

export function sizeScrew(
  def: EngineDefinition,
  cfg: ProblemConfig,
  entered: EnteredInputs,
  candidates: readonly SizeCandidateInput[],
  opts: { extras?: Partial<Record<InputId, number>>; requireSelfLock?: boolean } = {},
): SizingResult {
  const base: EnteredInputs = { ...entered };
  delete base.d; delete base.p;

  // Punto de partida: σ = 4F/(π d_r²) ≤ S_y / n  →  d_r ≥ √(4 F n / (π S_y))
  const probe = solve(def, cfg, base, { extras: opts.extras });
  const F = probe.values.Fw, Sy = probe.values.Sy, n = probe.values.nTarget;
  const drStart = F && Sy && n ? Math.sqrt((4 * F * n) / (Math.PI * Sy)) : undefined;

  const notEvaluated = new Set<string>();
  const out: SizeCandidate[] = [];

  for (const c of [...candidates].sort((a, b) => a.d - b.d || a.p - b.p)) {
    const withSize: EnteredInputs = { ...base, d: { value: c.d, unit: 'mm' }, p: { value: c.p, unit: 'mm' } };
    let r = solve(def, cfg, withSize, { extras: opts.extras });

    // Filetes mínimos por desgaste, si no los fijó el usuario y hay p_b.
    let ntMin: number | undefined;
    const pb = r.values.pbEff, dm = r.values.dm, Fw = r.values.Fw;
    if (!entered.nt && !entered.H && pb && dm && Fw) {
      ntMin = Math.max(1, Math.ceil((2 * Fw) / (Math.PI * dm * c.p * pb) - 1e-9));
      r = solve(def, cfg, { ...withSize, nt: { value: ntMin, unit: 'count' } }, { extras: opts.extras });
    }

    const checks: Record<string, CheckStatus> = {};
    const margins: Record<string, number> = {};
    let failedBy: string | undefined;
    for (const id of DESIGN_CHECKS) {
      const ch = r.checks.find(x => x.id === id);
      if (!ch) continue;
      checks[id] = ch.status;
      if (ch.outcome) {
        margins[id] = id === 'wear' || id === 'selfLock'
          ? ch.outcome.computed / ch.outcome.required
          : ch.outcome.computed / (ch.outcome.required || 1);
      }
      if (ch.status === 'pending') notEvaluated.add(ch.label);
      const fails = ch.status === 'fail' || (id === 'selfLock' && opts.requireSelfLock && ch.status === 'warn');
      if (fails && !failedBy) failedBy = ch.label;
    }
    const evaluated = Object.values(checks).some(s => s === 'ok' || s === 'fail' || s === 'warn');
    out.push({
      id: c.id, d: c.d, p: c.p, dr: r.values.dr, ntMin,
      H: ntMin !== undefined ? ntMin * c.p : undefined,
      checks, margins, passes: evaluated && !failedBy, failedBy,
    });
  }

  return {
    drStart,
    candidates: out,
    recommendedId: out.find(c => c.passes)?.id,
    notEvaluated: [...notEvaluated],
  };
}
