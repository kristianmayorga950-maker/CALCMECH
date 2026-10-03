/**
 * Puente entre el estado del tornillo y el esquema: traduce la configuración y
 * los valores conocidos (unidades base: mm, N, N·mm) a la entrada del dibujo,
 * y resume un proyecto para su miniatura (mecanismo, veredicto, criterio que
 * gobierna, F y d). Puro: sin React ni DOM.
 */

import type { EngineResult, ProblemConfig } from '../../engine/types';
import { ENGINE, solve } from '../../engine';
import { verdict, type VerdictStatus } from '../../engine/summary';
import { tableExtras } from '../../state/usePowerScrew';
import type { ProblemState } from '../../state/problemState';
import type { SchematicDims, SchematicInput } from './schematic';

type Values = EngineResult['values'];

const pos = (x: number | undefined) => (x !== undefined && Number.isFinite(x) && x > 0 ? x : undefined);

/** Entrada del dibujo a partir de la configuración y los valores conocidos. */
export function schematicInput(cfg: ProblemConfig, values: Values = {}, compact = false): SchematicInput {
  const dims: SchematicDims = {
    d: pos(values.d), p: pos(values.p), dc: cfg.thrust === 'none' ? undefined : pos(values.dc),
    F: pos(values.Fw ?? values.F), L: pos(values.Lcol), r: pos(values.r ?? values.rreq), P: pos(values.P ?? values.Preq),
    T: pos(values.Tin ?? values.Tinreq), i: pos(values.i), eta: pos(values.etaG),
  };
  return {
    thread: cfg.thread,
    input: cfg.transmission,
    thrust: cfg.thrust,
    load: cfg.load,
    hands: cfg.leverHands,
    dims,
    compact,
  };
}

export interface ProjectSnapshot {
  input:   SchematicInput;
  status:  VerdictStatus;
  /** Texto del sello: cumple / con observaciones / no cumple / incompleto. */
  stamp:   string;
  /** Criterio que gobierna con su utilización, p. ej. «Pandeo 62 %». */
  governing?: string;
  F?: number;   // N
  d?: number;   // mm
}

const STAMP: Record<VerdictStatus, string> = {
  ok: 'Cumple', warn: 'Con observaciones', fail: 'No cumple', incomplete: 'Incompleto',
};

/** Resumen de un proyecto guardado para su miniatura (recalcula con el motor). */
export function projectSnapshot(state: ProblemState): ProjectSnapshot {
  const r = solve(ENGINE, state.cfg, state.entered, { extras: tableExtras(state) });
  const v = verdict(r.checks, state.cfg);
  const g = v.governing;
  const governing = g
    ? (Number.isFinite(g.utilization) ? `${g.label} ${Math.round(g.utilization * 100)} %` : g.label)
    : undefined;
  return {
    input: schematicInput(state.cfg, r.values, true),
    status: v.status,
    stamp: STAMP[v.status],
    governing,
    F: pos(r.values.Fw ?? r.values.F),
    d: pos(r.values.d),
  };
}
