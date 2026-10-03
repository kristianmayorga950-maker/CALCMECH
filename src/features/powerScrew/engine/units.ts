/**
 * Unidades del tornillo de potencia.
 *
 * Base interna coherente: mm, N, N·mm, MPa (= N/mm²), rad, rpm, mm/s, W.
 * Toda conversión pasa por `toBase` / `fromBase`; no hay factores escondidos en
 * las fórmulas. `label` es LaTeX con \mathrm para que KaTeX lo escriba en romanas.
 */

export type Dimension =
  | 'length' | 'force' | 'torque' | 'stress' | 'modulus'
  | 'angle' | 'rotSpeed' | 'linSpeed' | 'power'
  | 'dimensionless' | 'count';

export interface UnitDef {
  id:     string;
  dim:    Dimension;
  /** LaTeX, p. ej. '\\mathrm{N\\cdot mm}'. */
  label:  string;
  /** Texto plano para selectores, p. ej. 'N·mm'. */
  text:   string;
  /** Factor: valor_base = valor × factor. */
  factor: number;
}

const LBF = 4.4482216152605;   // N
const IN  = 25.4;              // mm
const PSI = LBF / (IN * IN);   // MPa (N/mm²) = 0.006894757…

export const UNITS: readonly UnitDef[] = [
  // longitud (base mm)
  { id: 'mm',    dim: 'length',  label: '\\mathrm{mm}',          text: 'mm',     factor: 1 },
  { id: 'cm',    dim: 'length',  label: '\\mathrm{cm}',          text: 'cm',     factor: 10 },
  { id: 'm',     dim: 'length',  label: '\\mathrm{m}',           text: 'm',      factor: 1000 },
  { id: 'in',    dim: 'length',  label: '\\mathrm{in}',          text: 'in',     factor: IN },
  { id: 'ft',    dim: 'length',  label: '\\mathrm{ft}',          text: 'ft',     factor: 12 * IN },
  // fuerza (base N)
  { id: 'N',     dim: 'force',   label: '\\mathrm{N}',           text: 'N',      factor: 1 },
  { id: 'kN',    dim: 'force',   label: '\\mathrm{kN}',          text: 'kN',     factor: 1000 },
  { id: 'lbf',   dim: 'force',   label: '\\mathrm{lbf}',         text: 'lbf',    factor: LBF },
  { id: 'kip',   dim: 'force',   label: '\\mathrm{kip}',         text: 'kip',    factor: 1000 * LBF },
  // par (base N·mm)
  { id: 'Nmm',   dim: 'torque',  label: '\\mathrm{N\\cdot mm}',  text: 'N·mm',   factor: 1 },
  { id: 'Nm',    dim: 'torque',  label: '\\mathrm{N\\cdot m}',   text: 'N·m',    factor: 1000 },
  { id: 'lbfin', dim: 'torque',  label: '\\mathrm{lbf\\cdot in}', text: 'lbf·in', factor: LBF * IN },
  { id: 'lbfft', dim: 'torque',  label: '\\mathrm{lbf\\cdot ft}', text: 'lbf·ft', factor: LBF * 12 * IN },
  // esfuerzo (base MPa)
  { id: 'MPa',   dim: 'stress',  label: '\\mathrm{MPa}',         text: 'MPa',    factor: 1 },
  { id: 'kPa',   dim: 'stress',  label: '\\mathrm{kPa}',         text: 'kPa',    factor: 1e-3 },
  { id: 'psi',   dim: 'stress',  label: '\\mathrm{psi}',         text: 'psi',    factor: PSI },
  { id: 'kpsi',  dim: 'stress',  label: '\\mathrm{kpsi}',        text: 'kpsi',   factor: 1000 * PSI },
  // módulo (base MPa)
  { id: 'GPa',   dim: 'modulus', label: '\\mathrm{GPa}',         text: 'GPa',    factor: 1000 },
  { id: 'MPaE',  dim: 'modulus', label: '\\mathrm{MPa}',         text: 'MPa',    factor: 1 },
  { id: 'Mpsi',  dim: 'modulus', label: '\\mathrm{Mpsi}',        text: 'Mpsi',   factor: 1e6 * PSI },
  // ángulo (base rad)
  { id: 'rad',   dim: 'angle',   label: '\\mathrm{rad}',         text: 'rad',    factor: 1 },
  { id: 'deg',   dim: 'angle',   label: '^{\\circ}',             text: '°',      factor: Math.PI / 180 },
  // velocidad de giro (base rpm)
  { id: 'rpm',   dim: 'rotSpeed', label: '\\mathrm{rpm}',        text: 'rpm',    factor: 1 },
  { id: 'rads',  dim: 'rotSpeed', label: '\\mathrm{rad/s}',      text: 'rad/s',  factor: 60 / (2 * Math.PI) },
  // velocidad lineal (base mm/s)
  { id: 'mms',   dim: 'linSpeed', label: '\\mathrm{mm/s}',       text: 'mm/s',   factor: 1 },
  { id: 'mmin',  dim: 'linSpeed', label: '\\mathrm{m/min}',      text: 'm/min',  factor: 1000 / 60 },
  { id: 'ftmin', dim: 'linSpeed', label: '\\mathrm{ft/min}',     text: 'ft/min', factor: 12 * IN / 60 },
  { id: 'ins',   dim: 'linSpeed', label: '\\mathrm{in/s}',       text: 'in/s',   factor: IN },
  // potencia (base W)
  { id: 'W',     dim: 'power',   label: '\\mathrm{W}',           text: 'W',      factor: 1 },
  { id: 'kW',    dim: 'power',   label: '\\mathrm{kW}',          text: 'kW',     factor: 1000 },
  { id: 'hp',    dim: 'power',   label: '\\mathrm{hp}',          text: 'hp',     factor: 745.69987158227 },
  // adimensionales
  { id: '1',     dim: 'dimensionless', label: '',                text: '',       factor: 1 },
  { id: 'pct',   dim: 'dimensionless', label: '\\%',             text: '%',      factor: 0.01 },
  { id: 'count', dim: 'count',   label: '',                      text: '',       factor: 1 },
] as const;

const BY_ID = new Map(UNITS.map(u => [u.id, u]));

export const BASE_UNIT: Record<Dimension, string> = {
  length: 'mm', force: 'N', torque: 'Nmm', stress: 'MPa', modulus: 'MPaE',
  angle: 'rad', rotSpeed: 'rpm', linSpeed: 'mms', power: 'W',
  dimensionless: '1', count: 'count',
};

/** Unidades por defecto según el sistema global de la app. */
export const DEFAULT_UNITS: Record<'SI' | 'imperial', Record<Dimension, string>> = {
  SI: {
    length: 'mm', force: 'kN', torque: 'Nm', stress: 'MPa', modulus: 'GPa',
    angle: 'deg', rotSpeed: 'rpm', linSpeed: 'mms', power: 'kW',
    dimensionless: '1', count: 'count',
  },
  imperial: {
    length: 'in', force: 'lbf', torque: 'lbfin', stress: 'kpsi', modulus: 'Mpsi',
    angle: 'deg', rotSpeed: 'rpm', linSpeed: 'ftmin', power: 'hp',
    dimensionless: '1', count: 'count',
  },
};

export function getUnit(id: string): UnitDef {
  const u = BY_ID.get(id);
  if (!u) throw new Error(`Unidad desconocida: "${id}"`);
  return u;
}

export function unitsFor(dim: Dimension): UnitDef[] {
  return UNITS.filter(u => u.dim === dim);
}

/** Convierte un valor escrito en `unitId` a la unidad base de su dimensión. */
export function toBase(value: number, unitId: string): number {
  return value * getUnit(unitId).factor;
}

/** Convierte un valor base a `unitId`. */
export function fromBase(valueBase: number, unitId: string): number {
  return valueBase / getUnit(unitId).factor;
}

/** Convierte entre dos unidades de la misma dimensión; falla si no coinciden. */
export function convert(value: number, fromId: string, toId: string): number {
  const a = getUnit(fromId), b = getUnit(toId);
  if (a.dim !== b.dim) throw new Error(`No se puede convertir ${a.text || a.id} a ${b.text || b.id}: dimensiones distintas`);
  return (value * a.factor) / b.factor;
}

export function isBaseUnit(unitId: string): boolean {
  const u = getUnit(unitId);
  return BASE_UNIT[u.dim] === u.id;
}
