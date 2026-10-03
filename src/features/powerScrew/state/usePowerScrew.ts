import { useMemo, useReducer } from 'react';
import { ENGINE, solve } from '../engine';
import { sizeScrew, type SizingResult } from '../engine/sizing';
import { ACME_SIZES } from '../data/tables';
import type { InputId } from '../engine/types';
import { initialState, reducer, type ProblemState, type UnitSystem } from './problemState';

/** Datos que aportan las tablas elegidas y que no se escriben a mano. */
export function tableExtras(s: ProblemState): Partial<Record<InputId, number>> {
  const x: Partial<Record<InputId, number>> = {};
  // El mínimo del rango solo vale mientras f siga viniendo de esa tabla.
  if (s.selections.fRange && s.entered.f?.source) x.fMin = s.selections.fRange[0];
  if (s.selections.fcStart !== undefined && s.entered.fc?.source) x.fcStart = s.selections.fcStart;
  const nut = s.selections.threadPair?.nut;
  if (nut === 'bronze') x.nutCode = 1;
  else if (nut === 'castIron') x.nutCode = 2;
  return x;
}

/**
 * Estado de la sección + resultado del motor, recalculado en vivo.
 * La sustitución usa unidades base coherentes (N, mm, MPa); el resultado se
 * muestra además en la unidad preferida (ver ARQUITECTURA §3).
 */
export function usePowerScrew(system: UnitSystem, restored?: ProblemState) {
  const [state, dispatch] = useReducer(reducer, system, s => restored ?? initialState(s));
  const extras = useMemo(() => tableExtras(state), [state]);
  const result = useMemo(
    () => solve(ENGINE, state.cfg, state.entered, { extras }),
    [state.cfg, state.entered, extras],
  );
  // Dimensionamiento: solo cuando el objetivo lo pide (recorre el catálogo Acme).
  const sizing: SizingResult | undefined = useMemo(
    () => (state.cfg.goal === 'size'
      ? sizeScrew(ENGINE, state.cfg, state.entered, ACME_SIZES, { extras, requireSelfLock: state.cfg.requireSelfLock })
      : undefined),
    [state.cfg, state.entered, extras],
  );
  return { state, dispatch, result, extras, sizing };
}

export type PowerScrewController = ReturnType<typeof usePowerScrew>;
