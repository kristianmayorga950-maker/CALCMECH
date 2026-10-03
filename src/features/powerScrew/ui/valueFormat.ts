import type { DerivedId, VarId } from '../engine/types';
import { varDim, varSymbol } from '../engine/vars';
import { BASE_UNIT, DEFAULT_UNITS, fromBase, getUnit } from '../engine/units';
import { fmtNum } from '../engine/format';
import type { UnitSystem } from '../state/problemState';

/** Lado derecho de "símbolo = valor": base y, si difiere, unidad preferida; ángulos en grados. */
export function valueTex(target: VarId, value: number, system: UnitSystem): string {
  const dim = varDim(target);
  if (dim === 'angle') return `${fmtNum(fromBase(value, 'deg'))}\\,^{\\circ}`;
  if (dim === 'dimensionless' || dim === 'count') {
    return target === 'e' ? `${fmtNum(value)} = ${fmtNum(value * 100)}\\,\\%` : fmtNum(value);
  }
  const base = getUnit(BASE_UNIT[dim]);
  let tex = `${fmtNum(value)}\\,${base.label}`;
  const prefId = DEFAULT_UNITS[system][dim];
  if (prefId !== base.id) {
    const pref = getUnit(prefId);
    tex += ` = ${fmtNum(fromBase(value, prefId))}\\,${pref.label}`;
  }
  return tex;
}

/** Resultado de un paso en LaTeX. */
export function resultTex(target: DerivedId, value: number, system: UnitSystem): string {
  return `${varSymbol(target)} = ${valueTex(target, value, system)}`;
}

/** Dato en unidades base (para la fila "Variables"): sin conversión a la unidad preferida. */
export function inputTex(id: VarId, value: number): string {
  const dim = varDim(id);
  const sym = varSymbol(id);
  if (dim === 'angle') return `${sym} = ${fmtNum(fromBase(value, 'deg'))}\\,^{\\circ}`;
  if (dim === 'dimensionless' || dim === 'count') return `${sym} = ${fmtNum(value)}`;
  return `${sym} = ${fmtNum(value)}\\ ${getUnit(BASE_UNIT[dim]).label}`;
}
