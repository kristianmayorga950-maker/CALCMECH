/**
 * Solver progresivo.
 *
 * 1. Valida y convierte las entradas a unidades base.
 * 2. Punto fijo: calcula toda regla aplicable cuyas entradas ya existan. Un valor
 *    dado por el usuario nunca se sobrescribe; entre alternativas gana la primera
 *    (orden de declaración) que tenga datos completos y dominio válido.
 * 3. Para lo que no se pudo calcular, informa los datos mínimos que faltan
 *    (camino más corto entre alternativas) o el motivo del bloqueo.
 * 4. Sugiere el próximo dato que más resultados desbloquea.
 * 5. Evalúa las verificaciones con el mismo criterio.
 *
 * No lanza excepciones: todo termina en el resultado.
 */

import type {
  BlockedResult, CheckDef, CheckResult, DerivedId, EngineResult, EnteredInputs, InputId,
  PendingResult, ProblemConfig, Rule, StepResult, SubstFormatter, VarId,
} from './types';
import { validateInputs } from './validate';
import { INPUT_BY_ID, isInputId, varLabel } from './vars';
import { texNum } from './format';

export interface EngineDefinition {
  rules:  readonly Rule[];
  checks: readonly CheckDef[];
}

export interface SolveOptions {
  /** Formatea un valor base para la sustitución (en las unidades mostradas). */
  fmt?: SubstFormatter;
  /** Datos que vienen de tablas elegidas (fMin, fcStart, nutCode), ya en unidades base. */
  extras?: Partial<Record<InputId, number>>;
}

const defaultFmt: SubstFormatter = (_id, value) => texNum(value);

type Missing = InputId[] | null; // null = inalcanzable (depende de algo bloqueado o sin regla)

export function solve(
  def: EngineDefinition,
  cfg: ProblemConfig,
  entered: EnteredInputs,
  opts: SolveOptions = {},
): EngineResult {
  const fmt = opts.fmt ?? defaultFmt;
  const { values: validated, issues, conversions } = validateInputs(entered, cfg);
  const given = { ...validated };
  for (const [k, v] of Object.entries(opts.extras ?? {})) {
    if (v !== undefined && Number.isFinite(v)) given[k as InputId] = v;
  }

  const rules = def.rules.filter(r =>
    (!r.applies || r.applies(cfg)) && !(r.skipIfGiven && r.skipIfGiven in given));
  const byTarget = new Map<DerivedId, Rule[]>();
  for (const r of rules) {
    const list = byTarget.get(r.target) ?? [];
    list.push(r);
    byTarget.set(r.target, list);
  }

  const known: Record<string, number> = { ...given } as Record<string, number>;
  const steps: StepResult[] = [];
  const failures = new Map<DerivedId, string>();   // último motivo de dominio por target
  const tried = new Set<string>();                  // reglas evaluadas con dominio inválido

  // ── 2. Punto fijo ──
  let changed = true;
  while (changed) {
    changed = false;
    for (const r of rules) {
      if (r.target in known || tried.has(r.id)) continue;
      if (!r.inputs.every(i => i in known)) continue;
      const out = safeCompute(r, known, cfg);
      if (out.ok) {
        known[r.target] = out.value;
        failures.delete(r.target);
        steps.push({
          ruleId: r.id, target: r.target, stage: r.stage, value: out.value,
          general: r.latex.general(cfg),
          substituted: safeLatex(() => r.latex.substituted(known, cfg, fmt)),
          inputsUsed: [...r.inputs], note: r.note, hidden: r.hidden,
        });
        changed = true;
      } else {
        tried.add(r.id);
        if (!failures.has(r.target)) failures.set(r.target, out.reason);
      }
    }
  }

  // ── 3. Faltantes mínimos ──
  const memo = new Map<VarId, Missing>();
  const minMissing = (id: VarId, stack: Set<VarId>): Missing => {
    if (id in known) return [];
    if (isInputId(id)) {
      const inp = INPUT_BY_ID.get(id)!;
      return inp.visible(cfg) ? [id] : null;
    }
    if (memo.has(id)) return memo.get(id)!;
    if (stack.has(id)) return null;
    const next = new Set(stack).add(id);
    let best: Missing = null;
    for (const r of byTarget.get(id) ?? []) {
      if (tried.has(r.id)) continue; // esa alternativa ya falló por dominio
      const acc = new Set<InputId>();
      let reachable = true;
      for (const dep of r.inputs) {
        const m = minMissing(dep, next);
        if (m === null) { reachable = false; break; }
        m.forEach(x => acc.add(x));
      }
      if (reachable && (best === null || acc.size < best.length)) best = [...acc];
    }
    memo.set(id, best);
    return best;
  };

  const pending: PendingResult[] = [];
  const blocked: BlockedResult[] = [];
  // Un resultado cuyas alternativas dependen todas de datos de tabla no elegidos
  // (campos ocultos sin valor) es opcional: no se reporta como pendiente ni bloqueado.
  const needsHiddenInput = (r: Rule) => r.inputs.some(i =>
    isInputId(i) && !(i in known) && !INPUT_BY_ID.get(i)!.visible(cfg));
  for (const [target, list] of byTarget) {
    if (target in known) continue;
    if (list.every(needsHiddenInput)) continue;
    const stage = list[0].stage;
    const m = minMissing(target, new Set());
    if (m !== null && m.length > 0) {
      pending.push({ target, stage, missing: m, ...(failures.has(target) ? { reason: failures.get(target) } : {}) });
    } else {
      blocked.push({ target, stage, reason: failures.get(target) ?? upstreamReason(target, byTarget, failures, known) });
    }
  }

  // ── 4. Sugerencias ──
  const unlocks = new Map<InputId, number>();
  for (const p of pending) for (const id of p.missing) unlocks.set(id, (unlocks.get(id) ?? 0) + 1);
  const suggestions = [...unlocks.entries()]
    .map(([id, n]) => ({ id, unlocks: n }))
    .sort((a, b) => b.unlocks - a.unlocks || a.id.localeCompare(b.id));

  // ── 5. Verificaciones ──
  const givenSet = new Set(Object.keys(given) as VarId[]);
  const checks: CheckResult[] = def.checks.map(c => {
    const na = c.notApplicable?.(cfg, givenSet);
    if (na) return { id: c.id, label: c.label, status: 'na', reason: na };
    if (c.inputs.every(i => i in known)) {
      try {
        const outcome = c.evaluate(known as Record<VarId, number>, cfg);
        return { id: c.id, label: c.label, status: outcome.status, outcome };
      } catch {
        return { id: c.id, label: c.label, status: 'pending', reason: 'No se pudo evaluar con los valores actuales.' };
      }
    }
    const acc = new Set<InputId>();
    let reachable = true;
    for (const i of c.inputs) {
      const m = minMissing(i, new Set());
      if (m === null) { reachable = false; continue; }
      m.forEach(x => acc.add(x));
    }
    return reachable || acc.size
      ? { id: c.id, label: c.label, status: 'pending', missing: [...acc] }
      : { id: c.id, label: c.label, status: 'pending', reason: 'Depende de un resultado que no se puede calcular con los datos actuales.' };
  });

  return { values: known, steps, pending, blocked, checks, conversions, issues, suggestions };
}

function safeCompute(r: Rule, known: Record<string, number>, cfg: ProblemConfig) {
  try {
    const out = r.compute(known as Record<VarId, number>, cfg);
    if (out.ok && !Number.isFinite(out.value)) {
      return { ok: false as const, reason: 'El resultado no es un número finito con estos datos.' };
    }
    return out;
  } catch {
    return { ok: false as const, reason: 'No se pudo calcular con estos datos.' };
  }
}

function safeLatex(f: () => string): string {
  try { return f(); } catch { return ''; }
}

/** Busca el primer resultado bloqueado del que depende `target`, para explicar el bloqueo. */
function upstreamReason(
  target: DerivedId,
  byTarget: Map<DerivedId, Rule[]>,
  failures: Map<DerivedId, string>,
  known: Record<string, number>,
): string {
  const seen = new Set<VarId>();
  const queue: VarId[] = [target];
  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    if (id !== target && failures.has(id as DerivedId)) {
      return `Depende de «${varLabel(id)}», que no se puede calcular: ${failures.get(id as DerivedId)}`;
    }
    for (const r of byTarget.get(id as DerivedId) ?? []) {
      for (const dep of r.inputs) if (!(dep in known)) queue.push(dep);
    }
  }
  return 'Faltan datos que no están disponibles con la configuración actual.';
}
