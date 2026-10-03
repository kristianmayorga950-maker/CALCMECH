/**
 * Validación de entradas: convierte a unidades base, detecta errores (el valor no se
 * usa) y avisos (el valor se usa, pero conviene revisarlo). Cada mensaje dice qué
 * pasa y cómo arreglarlo.
 */

import type { ConversionNote, EnteredInputs, InputId, InputIssue, ProblemConfig, Values } from './types';
import { INPUT_BY_ID, visibleInputs } from './vars';
import { BASE_UNIT, getUnit, isBaseUnit, toBase } from './units';
import { fmtNum } from './format';

export interface ValidationResult {
  values:      Values;
  issues:      InputIssue[];
  conversions: ConversionNote[];
}

export function validateInputs(entered: EnteredInputs, cfg: ProblemConfig): ValidationResult {
  const values: Values = {};
  const issues: InputIssue[] = [];
  const conversions: ConversionNote[] = [];
  const err = (id: InputId, message: string) => issues.push({ id, severity: 'error', message });
  const warn = (id: InputId, message: string) => issues.push({ id, severity: 'warning', message });

  for (const def of visibleInputs(cfg)) {
    const e = entered[def.id];
    if (!e) continue;
    if (!Number.isFinite(e.value)) { err(def.id, 'Escriba un número.'); continue; }

    let unitOk = true;
    try { if (getUnit(e.unit).dim !== def.dim) unitOk = false; } catch { unitOk = false; }
    if (!unitOk) { err(def.id, 'La unidad elegida no corresponde a esta magnitud.'); continue; }

    const v = toBase(e.value, e.unit);
    if (!Number.isFinite(v)) { err(def.id, 'El valor es demasiado grande para usarlo en el cálculo.'); continue; }

    if (def.integer && !Number.isInteger(e.value)) { err(def.id, `Debe ser un número entero (escribió ${fmtNum(e.value)}).`); continue; }
    if (def.min !== undefined) {
      const below = def.minInclusive ? v < def.min : v <= def.min;
      if (below) {
        err(def.id, def.min === 0 && !def.minInclusive
          ? `${def.label} debe ser mayor que cero.`
          : `${def.label} debe ser ${def.minInclusive ? 'al menos' : 'mayor que'} ${fmtNum(def.min)}.`);
        continue;
      }
    }
    if (def.max !== undefined && v > def.max) { err(def.id, `${def.label} no puede ser mayor que ${fmtNum(def.max)}.`); continue; }
    if (def.typical && (v < def.typical[0] || v > def.typical[1])) warn(def.id, def.typicalHint ?? 'Valor fuera del rango habitual.');

    values[def.id] = v;
    if (!isBaseUnit(e.unit)) {
      conversions.push({ id: def.id, from: { value: e.value, unit: e.unit }, to: { value: v, unit: BASE_UNIT[def.dim] } });
    }
  }

  // Relaciones entre entradas
  if (values.d !== undefined && values.p !== undefined && values.p >= values.d) {
    err('p', 'El paso debe ser menor que el diámetro mayor; con este valor el diámetro menor sería cero o negativo.');
    delete values.p;
  }
  if (values.H !== undefined && values.p !== undefined && values.H < values.p) {
    warn('H', 'La tuerca es más corta que un paso: no alcanza a tener un filete completo en contacto.');
  }
  if (values.nt !== undefined && values.H !== undefined) {
    warn('H', 'Dio los filetes en contacto y la longitud de la tuerca; se usan los filetes en contacto.');
  }
  for (const id of Object.keys(entered) as InputId[]) {
    if (!INPUT_BY_ID.has(id)) err(id, 'Dato desconocido.');
  }
  return { values, issues, conversions };
}
