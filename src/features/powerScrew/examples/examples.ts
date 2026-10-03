/**
 * Ejemplos completos. Se construyen con las mismas acciones del reducer que usa la
 * interfaz, así un ejemplo cargado es idéntico a uno escrito a mano (incluido el
 * origen de cada dato de tabla).
 */

import type { InputId, ProblemConfig } from '../engine/types';
import { initialState, reducer, type Action, type ProblemState, type UnitSystem } from '../state/problemState';

export interface WorkedExample {
  id:          string;
  title:       string;
  /** Planteamiento en lenguaje de ingeniería (lo que se muestra al cargarlo). */
  statement:   string;
  build:       (system: UnitSystem) => ProblemState;
}

const val = (id: InputId, value: number, unit: string): Action[] => [
  { type: 'unit', id, unit },
  { type: 'value', id, value },
];
const cfgA = (patch: Partial<ProblemConfig>): Action => ({ type: 'config', patch });

function run(system: UnitSystem, actions: Action[]): ProblemState {
  return actions.reduce(reducer, initialState(system));
}

/**
 * Ejemplo 1 — Tornillo con collarín.
 * Base: rosca cuadrada de 32 mm, paso 4 mm, rosca doble, f = f_c = 0.08,
 * d_c = 40 mm, F = 6.4 kN (ejercicio clásico de tornillos de potencia).
 * Se extiende con material (AISI 1040 laminado en caliente), n_obj = 2,
 * columna empotrada–articulada de 300 mm, tuerca de 32 mm de largo y
 * p_b = 11 MPa (bronce a baja velocidad, ≈ 1 600 psi).
 */
export const EXAMPLE_COLLAR: WorkedExample = {
  id: 'collar',
  title: 'Ejemplo 1 · Tornillo con collarín',
  statement:
    'Un tornillo de rosca cuadrada doble, de 32 mm de diámetro y 4 mm de paso, sube 6.4 kN con un collarín de 40 mm. ' +
    'El coeficiente de fricción es 0.08 en la rosca y en el collarín. Es de acero AISI 1040 laminado en caliente; trabaja en compresión con 300 mm libres, ' +
    'un extremo empotrado y el otro articulado. La tuerca de bronce mide 32 mm. ' +
    'Se pide: pares, eficiencia, autobloqueo, esfuerzos, pandeo, desgaste y factores de seguridad con n = 2.',
  build: system => run(system, [
    cfgA({ thread: 'square', transmission: 'direct', thrust: 'collar', load: 'compression', goal: 'analyze', bodyTorque: 'total', manualDrive: false }),
    ...val('d', 32, 'mm'), ...val('p', 4, 'mm'), ...val('n', 2, 'count'),
    ...val('F', 6.4, 'kN'),
    ...val('f', 0.08, '1'), ...val('fc', 0.08, '1'), ...val('dc', 40, 'mm'),
    { type: 'material', materialId: '1040-HR' },
    ...val('nTarget', 2, '1'),
    ...val('Lcol', 300, 'mm'),
    { type: 'endCondition', conditionId: 'fixed-pinned' },
    ...val('H', 32, 'mm'),
    ...val('pb', 11, 'MPa'),
  ]),
};

/**
 * Ejemplo 2 — Gato de tornillo accionado con palanca.
 * Acme 1-1/4 in del catálogo, palanca de 400 mm con 250 N en una mano,
 * collarín de acero suave sobre bronce (d_c = 45 mm), rosca de acero con aceite
 * sobre tuerca de bronce, AISI 1045 laminado en caliente, n_obj = 2.
 * Columna empotrada–libre de 250 mm (el gato levanta con la punta libre).
 * Tuerca de 50.8 mm. Accionamiento manual. Objetivo: carga máxima.
 */
export const EXAMPLE_LEVER: WorkedExample = {
  id: 'lever',
  title: 'Ejemplo 2 · Gato con palanca',
  statement:
    'Un gato con tornillo Acme de 1¼ in se acciona a mano con una palanca de 400 mm, aplicando 250 N. ' +
    'El collarín, de 45 mm de diámetro medio, es de acero suave sobre bronce, y la rosca es de acero lubricada sobre tuerca de bronce. ' +
    'El tornillo es AISI 1045 laminado en caliente, con 250 mm libres y la punta libre (empotrado–libre). ' +
    'La tuerca mide 50.8 mm. Se pide: la carga máxima que se puede subir, la ventaja mecánica, ' +
    'si se sostiene sola y si resiste con n = 2.',
  build: system => run(system, [
    cfgA({ transmission: 'lever', thrust: 'collar', load: 'compression', goal: 'capacity', bodyTorque: 'total', leverHands: 1 }),
    { type: 'acme', sizeId: '1-1/4' },
    ...val('n', 1, 'count'),
    ...val('P', 250, 'N'), ...val('r', 400, 'mm'),
    { type: 'threadPair', screw: 'steelOil', nut: 'bronze' },
    { type: 'collarPair', pairId: 'softSteel-bronze' },
    ...val('dc', 45, 'mm'),
    { type: 'material', materialId: '1045-HR' },
    ...val('nTarget', 2, '1'),
    ...val('Lcol', 250, 'mm'),
    { type: 'endCondition', conditionId: 'fixed-free' },
    ...val('H', 50.8, 'mm'),
  ]),
};

export const EXAMPLES: readonly WorkedExample[] = [EXAMPLE_COLLAR, EXAMPLE_LEVER];
