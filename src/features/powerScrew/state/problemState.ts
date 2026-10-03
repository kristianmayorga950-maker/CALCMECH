/**
 * Estado del problema (reducer puro, sin React): configuración, valores escritos,
 * unidad elegida por campo y selecciones de tablas.
 */

import type { EnteredInputs, InputId, ProblemConfig } from '../engine/types';
import { DEFAULT_CONFIG } from '../engine';
import { INPUTS, INPUT_BY_ID } from '../engine/vars';
import { BASE_UNIT, DEFAULT_UNITS, convert, getUnit } from '../engine/units';
import {
  ACME_SIZES, COLLAR_FRICTION, END_CONDITIONS, NUT_LABEL, SCREW_CONDITION_LABEL,
  SCREW_MATERIALS, THREAD_FRICTION, type NutMaterial, type ScrewCondition,
} from '../data/tables';
import { fmtNum } from '../engine/format';

export type UnitSystem = 'SI' | 'imperial';

export interface Selections {
  acmeSize?:      string;
  screwMaterial?: string;
  threadPair?:    { screw: ScrewCondition; nut: NutMaterial };
  /** Rango de f de la tabla, para verificar el autobloqueo con el extremo bajo. */
  fRange?:        [number, number];
  collarPair?:    string;
  /** f_c de arranque de la tabla del collarín. */
  fcStart?:       number;
  endCondition?:  string;
}

export interface ProblemState {
  cfg:        ProblemConfig;
  entered:    EnteredInputs;
  unitPref:   Record<InputId, string>;
  selections: Selections;
}

export type Action =
  | { type: 'config';     patch: Partial<ProblemConfig> }
  | { type: 'value';      id: InputId; value: number | undefined }
  | { type: 'unit';       id: InputId; unit: string }
  | { type: 'acme';       sizeId: string | undefined; keepThread?: boolean }
  | { type: 'material';   materialId: string | undefined }
  | { type: 'threadPair'; screw: ScrewCondition; nut: NutMaterial }
  | { type: 'collarPair'; pairId: string | undefined }
  | { type: 'endCondition'; conditionId: string | undefined }
  | { type: 'reset';      system: UnitSystem }
  | { type: 'load';       state: ProblemState };

export function defaultUnits(system: UnitSystem): Record<InputId, string> {
  return Object.fromEntries(INPUTS.map(i => [i.id, DEFAULT_UNITS[system][i.dim]])) as Record<InputId, string>;
}

export function initialState(system: UnitSystem = 'SI'): ProblemState {
  return { cfg: { ...DEFAULT_CONFIG }, entered: {}, unitPref: defaultUnits(system), selections: {} };
}

/** Escribe un valor dado en unidades base, expresado en la unidad preferida del campo. */
function setFromBase(s: ProblemState, id: InputId, baseValue: number, source: string): EnteredInputs {
  const unit = s.unitPref[id];
  const value = convert(baseValue, BASE_UNIT[INPUT_BY_ID.get(id)!.dim], unit);
  return { ...s.entered, [id]: { value: round(value), unit, source } };
}

const round = (x: number) => Number(x.toPrecision(10));

function clearSourced(entered: EnteredInputs, ids: InputId[]): EnteredInputs {
  const next = { ...entered };
  for (const id of ids) if (next[id]?.source) delete next[id];
  return next;
}

export function reducer(s: ProblemState, a: Action): ProblemState {
  switch (a.type) {
    case 'config': {
      const patch = { ...a.patch };
      // Con palanca el tornillo suele girarse a mano: se marca por defecto (se puede desmarcar).
      if (patch.transmission && patch.transmission !== s.cfg.transmission && patch.manualDrive === undefined) {
        patch.manualDrive = patch.transmission === 'lever';
      }
      return { ...s, cfg: { ...s.cfg, ...patch } };
    }

    case 'value': {
      const entered = { ...s.entered };
      if (a.value === undefined) delete entered[a.id];
      else entered[a.id] = { value: a.value, unit: s.unitPref[a.id] };
      // Editar a mano un valor que venía de una tabla rompe el vínculo con la tabla.
      const selections = { ...s.selections };
      if (a.id === 'd' || a.id === 'p') delete selections.acmeSize;
      if (a.id === 'Sy' || a.id === 'E') delete selections.screwMaterial;
      if (a.id === 'f') { delete selections.threadPair; delete selections.fRange; }
      if (a.id === 'fc') { delete selections.collarPair; delete selections.fcStart; }
      if (a.id === 'C') delete selections.endCondition;
      return { ...s, entered, selections };
    }

    case 'unit': {
      const unitPref = { ...s.unitPref, [a.id]: a.unit };
      const cur = s.entered[a.id];
      if (!cur) return { ...s, unitPref };
      // Cambiar de unidad conserva la magnitud física.
      let value = cur.value;
      try { if (getUnit(cur.unit).dim === getUnit(a.unit).dim) value = round(convert(cur.value, cur.unit, a.unit)); } catch { /* unidad inválida: se deja el número */ }
      return { ...s, unitPref, entered: { ...s.entered, [a.id]: { ...cur, value, unit: a.unit } } };
    }

    case 'acme': {
      const size = ACME_SIZES.find(x => x.id === a.sizeId);
      if (!size) return { ...s, entered: clearSourced(s.entered, ['d', 'p']), selections: { ...s.selections, acmeSize: undefined } };
      const src = `Catálogo Acme ${size.id} in`;
      // Desde el catálogo se asume rosca Acme, salvo al aplicar un dimensionamiento hecho con otra forma.
      let next: ProblemState = a.keepThread ? s : { ...s, cfg: { ...s.cfg, thread: 'acme' } };
      next = { ...next, entered: setFromBase(next, 'd', size.d, src) };
      next = { ...next, entered: setFromBase(next, 'p', size.p, src) };
      return { ...next, selections: { ...s.selections, acmeSize: size.id } };
    }

    case 'material': {
      const m = SCREW_MATERIALS.find(x => x.id === a.materialId);
      if (!m) return { ...s, entered: clearSourced(s.entered, ['Sy', 'E']), selections: { ...s.selections, screwMaterial: undefined } };
      let next: ProblemState = { ...s, entered: setFromBase(s, 'Sy', m.Sy, m.label) };
      next = { ...next, entered: setFromBase(next, 'E', m.E, m.label) };
      return { ...next, selections: { ...s.selections, screwMaterial: m.id } };
    }

    case 'threadPair': {
      const range = THREAD_FRICTION[a.screw][a.nut];
      if (!range) return s;
      const src = `${SCREW_CONDITION_LABEL[a.screw]} / tuerca de ${NUT_LABEL[a.nut].toLowerCase()}: ${fmtNum(range[0])}–${fmtNum(range[1])}`;
      return {
        ...s,
        entered: { ...s.entered, f: { value: range[1], unit: '1', source: src } },
        selections: { ...s.selections, threadPair: { screw: a.screw, nut: a.nut }, fRange: range },
      };
    }

    case 'collarPair': {
      const c = COLLAR_FRICTION.find(x => x.id === a.pairId);
      if (!c) return { ...s, entered: clearSourced(s.entered, ['fc']), selections: { ...s.selections, collarPair: undefined, fcStart: undefined } };
      return {
        ...s,
        entered: { ...s.entered, fc: { value: c.running, unit: '1', source: `${c.label} (en operación)` } },
        selections: { ...s.selections, collarPair: c.id, fcStart: c.starting },
      };
    }

    case 'endCondition': {
      const e = END_CONDITIONS.find(x => x.id === a.conditionId);
      if (!e) return { ...s, entered: clearSourced(s.entered, ['C']), selections: { ...s.selections, endCondition: undefined } };
      return {
        ...s,
        entered: { ...s.entered, C: { value: e.conservative, unit: '1', source: `${e.label} (valor conservador)` } },
        selections: { ...s.selections, endCondition: e.id },
      };
    }

    case 'reset':
      return initialState(a.system);

    case 'load':
      return a.state;
  }
}
