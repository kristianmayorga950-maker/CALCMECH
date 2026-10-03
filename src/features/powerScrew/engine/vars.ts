/**
 * Catálogo de variables: símbolo, nombre, dimensión, y para las entradas, grupo,
 * visibilidad según la configuración y reglas de validación.
 */

import type { DerivedId, InputId, ProblemConfig, VarDef, VarId } from './types';
import type { Dimension } from './units';

export type InputGroup = 'thread' | 'load' | 'friction' | 'input' | 'strength' | 'nut';

export const INPUT_GROUP_LABEL: Record<InputGroup, string> = {
  thread:   'Rosca',
  load:     'Carga',
  friction: 'Fricción y apoyo',
  input:    'Entrada',
  strength: 'Resistencia',
  nut:      'Tuerca y desgaste',
};

export interface InputDef extends VarDef {
  id:      InputId;
  group:   InputGroup;
  /** Visible con esta configuración. */
  visible: (cfg: ProblemConfig) => boolean;
  integer?: boolean;
  /** Rango válido (en base); fuera de él es error. `minExclusive` por defecto. */
  min?:    number;
  minInclusive?: boolean;
  max?:    number;
  /** Rango habitual (en base); fuera de él es aviso. */
  typical?: [number, number];
  typicalHint?: string;
  hint?:   string;
}

const always = () => true;
const withThrust = (c: ProblemConfig) => c.thrust !== 'none';
const tx = (t: ProblemConfig['transmission']) => (c: ProblemConfig) => c.transmission === t;
const compression = (c: ProblemConfig) => c.load === 'compression';

export const INPUTS: readonly InputDef[] = [
  { id: 'd',  group: 'thread', symbol: 'd',   label: 'Diámetro mayor',  dim: 'length', visible: always, min: 0 },
  { id: 'p',  group: 'thread', symbol: 'p',   label: 'Paso',            dim: 'length', visible: always, min: 0 },
  { id: 'n',  group: 'thread', symbol: 'n',   label: 'Número de entradas', dim: 'count', visible: always, min: 1, minInclusive: true, integer: true, typical: [1, 4], typicalHint: 'Lo habitual es 1 a 4 entradas.' },

  { id: 'F',  group: 'load',   symbol: 'F',   label: 'Carga axial',     dim: 'force',  visible: always, min: 0 },

  { id: 'f',  group: 'friction', symbol: 'f',   label: 'Fricción de la rosca',   dim: 'dimensionless', visible: always, min: 0, max: 1, typical: [0.04, 0.25], typicalHint: 'Las tablas de pares roscados van de 0.04 a 0.25.' },
  { id: 'fc', group: 'friction', symbol: 'f_c', label: 'Fricción del apoyo',     dim: 'dimensionless', visible: withThrust, min: 0, minInclusive: true, max: 1, typical: [0.005, 0.2], typicalHint: 'Collarines de deslizamiento: 0.06 a 0.17; rodamientos: mucho menos.' },
  { id: 'dc', group: 'friction', symbol: 'd_c', label: 'Diámetro medio del apoyo', dim: 'length',      visible: withThrust, min: 0 },

  { id: 'Tin', group: 'input', symbol: 'T_{in}', label: 'Par disponible en la entrada', dim: 'torque', visible: tx('direct'),  min: 0 },
  { id: 'P',   group: 'input', symbol: 'P',      label: 'Fuerza en la palanca',         dim: 'force',  visible: tx('lever'),   min: 0 },
  { id: 'r',   group: 'input', symbol: 'r',      label: 'Brazo de palanca',             dim: 'length', visible: tx('lever'),   min: 0 },
  { id: 'Tm',  group: 'input', symbol: 'T_m',    label: 'Par del motor',                dim: 'torque', visible: tx('reducer'), min: 0 },
  { id: 'i',   group: 'input', symbol: 'i',      label: 'Relación de reducción',        dim: 'dimensionless', visible: tx('reducer'), min: 0 },
  { id: 'etaG',group: 'input', symbol: '\\eta_g',label: 'Eficiencia de la etapa',       dim: 'dimensionless', visible: tx('reducer'), min: 0, max: 1, minInclusive: false },

  { id: 'Sy',      group: 'strength', symbol: 'S_y',     label: 'Resistencia de fluencia', dim: 'stress',  visible: always, min: 0 },
  { id: 'nTarget', group: 'strength', symbol: 'n_{obj}', label: 'Factor de seguridad objetivo', dim: 'dimensionless', visible: always, min: 0, typical: [1, 10], typicalHint: 'Un factor menor que 1 acepta fluencia.' },
  { id: 'E',       group: 'strength', symbol: 'E',       label: 'Módulo de elasticidad',   dim: 'modulus', visible: compression, min: 0 },
  { id: 'Lcol',    group: 'strength', symbol: 'L',       label: 'Longitud libre de columna', dim: 'length', visible: compression, min: 0 },
  { id: 'C',       group: 'strength', symbol: 'C',       label: 'Constante de extremos',   dim: 'dimensionless', visible: compression, min: 0, typical: [0.25, 1.2], typicalHint: 'Valores recomendados: ¼ a 1.2.' },

  { id: 'nt', group: 'nut', symbol: 'n_t', label: 'Filetes en contacto',      dim: 'count',  visible: always, min: 1, minInclusive: true, integer: true },
  { id: 'H',  group: 'nut', symbol: 'H',   label: 'Longitud de la tuerca',    dim: 'length', visible: always, min: 0 },
  { id: 'pb', group: 'nut', symbol: 'p_b', label: 'Presión de apoyo segura',  dim: 'stress', visible: always, min: 0 },
  { id: 'N',  group: 'nut', symbol: 'N',   label: 'Velocidad de giro',        dim: 'rotSpeed', visible: always, min: 0, hint: 'Opcional: velocidad, potencia y fila de la tabla de presión.' },
  // Datos de tablas (no visibles como campos; los aporta el estado según la selección)
  { id: 'fMin',    group: 'friction', symbol: 'f_{mín}',   label: 'Fricción mínima de la tabla', dim: 'dimensionless', visible: () => false },
  { id: 'fcStart', group: 'friction', symbol: 'f_{c,arr}', label: 'Fricción del collarín al arrancar', dim: 'dimensionless', visible: () => false },
  { id: 'nutCode', group: 'nut',      symbol: '\text{tuerca}', label: 'Material de la tuerca', dim: 'count', visible: () => false },
];

export const INPUT_BY_ID = new Map(INPUTS.map(i => [i.id, i]));

export function visibleInputs(cfg: ProblemConfig): InputDef[] {
  return INPUTS.filter(i => i.visible(cfg));
}

/** Variables derivadas: símbolo, nombre y dimensión para la traza. */
export const DERIVED: Record<DerivedId, { symbol: string; label: string; dim: Dimension }> = {
  alpha:   { symbol: '\\alpha',      label: 'Semiángulo de la rosca',        dim: 'angle' },
  dm:      { symbol: 'd_m',          label: 'Diámetro medio',                dim: 'length' },
  dr:      { symbol: 'd_r',          label: 'Diámetro menor',                dim: 'length' },
  h:       { symbol: 'h',            label: 'Profundidad y ancho del filete', dim: 'length' },
  l:       { symbol: 'l',            label: 'Avance',                        dim: 'length' },
  lambda:  { symbol: '\\lambda',     label: 'Ángulo de avance',              dim: 'angle' },
  Fw:      { symbol: 'F',            label: 'Carga de trabajo',              dim: 'force' },
  Tavail:  { symbol: 'T_{ent}',      label: 'Par que entrega la entrada',    dim: 'torque' },
  TR:      { symbol: 'T_R',          label: 'Par para subir (rosca)',        dim: 'torque' },
  TL:      { symbol: 'T_L',          label: 'Par para bajar (rosca)',        dim: 'torque' },
  T0:      { symbol: 'T_0',          label: 'Par sin fricción',              dim: 'torque' },
  Tc:      { symbol: 'T_c',          label: 'Par del apoyo',                 dim: 'torque' },
  Tc_start:{ symbol: 'T_{c,arr}',    label: 'Par del apoyo al arrancar',     dim: 'torque' },
  T:       { symbol: 'T',            label: 'Par total para subir',          dim: 'torque' },
  Tlow:    { symbol: 'T_{baj}',      label: 'Par total para bajar',          dim: 'torque' },
  Tstart:  { symbol: 'T_{arr}',      label: 'Par de arranque',               dim: 'torque' },
  Preq:    { symbol: 'P',            label: 'Fuerza necesaria en la palanca', dim: 'force' },
  rreq:    { symbol: 'r',            label: 'Brazo necesario',               dim: 'length' },
  Tmreq:   { symbol: 'T_m',          label: 'Par del motor necesario',       dim: 'torque' },
  Tinreq:  { symbol: 'T_{in}',       label: 'Par a aplicar en la entrada',   dim: 'torque' },
  MA:      { symbol: 'VM',           label: 'Ventaja mecánica',              dim: 'dimensionless' },
  e1:      { symbol: 'e_{rosca}',    label: 'Eficiencia de la rosca',        dim: 'dimensionless' },
  e:       { symbol: 'e',            label: 'Eficiencia global',             dim: 'dimensionless' },
  lmax:    { symbol: 'l_{máx}',      label: 'Avance máximo autobloqueante',  dim: 'length' },
  nmax:    { symbol: 'n_{máx}',      label: 'Entradas máximas autobloqueantes', dim: 'count' },
  sigma:   { symbol: '\\sigma',      label: 'Esfuerzo axial en el cuerpo',   dim: 'stress' },
  tau:     { symbol: '\\tau',        label: 'Esfuerzo de torsión en el cuerpo', dim: 'stress' },
  sigmaBodyVM: { symbol: "\\sigma'_{c}", label: 'Von Mises en el cuerpo',    dim: 'stress' },
  sB1:     { symbol: '\\sigma_B',    label: 'Apoyo en el primer filete',     dim: 'stress' },
  sb1:     { symbol: '\\sigma_b',    label: 'Flexión en la raíz',            dim: 'stress' },
  tr1:     { symbol: '\\tau_r',      label: 'Cortante transversal en la raíz', dim: 'stress' },
  sx:      { symbol: '\\sigma_x',    label: 'Esfuerzo normal x en la raíz',  dim: 'stress' },
  vm:      { symbol: "\\sigma'",     label: 'Von Mises en la raíz',          dim: 'stress' },
  s1:      { symbol: '\\sigma_1',    label: 'Esfuerzo principal 1',          dim: 'stress' },
  s2:      { symbol: '\\sigma_2',    label: 'Esfuerzo principal 2',          dim: 'stress' },
  s3:      { symbol: '\\sigma_3',    label: 'Esfuerzo principal 3',          dim: 'stress' },
  tmax:    { symbol: '\\tau_{máx}',  label: 'Cortante máximo en la raíz',    dim: 'stress' },
  k:       { symbol: 'k',            label: 'Radio de giro',                 dim: 'length' },
  slender: { symbol: 'L/k',          label: 'Relación de esbeltez',          dim: 'dimensionless' },
  slender1:{ symbol: '(L/k)_1',      label: 'Esbeltez de transición',        dim: 'dimensionless' },
  Pcr:     { symbol: 'P_{cr}',       label: 'Carga crítica de pandeo',       dim: 'force' },
  ntEff:   { symbol: 'n_t',          label: 'Filetes en contacto',           dim: 'count' },
  sBw:     { symbol: '\\sigma_{B,t}', label: 'Presión con todos los filetes', dim: 'stress' },
  pbEff:   { symbol: 'p_b',          label: 'Presión de apoyo admisible',    dim: 'stress' },
  Vrub:    { symbol: 'V',            label: 'Velocidad de frotamiento',      dim: 'linSpeed' },
  v:       { symbol: 'v',            label: 'Velocidad lineal',              dim: 'linSpeed' },
  power:   { symbol: 'H',            label: 'Potencia en el tornillo',       dim: 'power' },
};

export function varSymbol(id: VarId): string {
  const inp = INPUT_BY_ID.get(id as InputId);
  return inp ? inp.symbol : DERIVED[id as DerivedId].symbol;
}

export function varLabel(id: VarId): string {
  const inp = INPUT_BY_ID.get(id as InputId);
  return inp ? inp.label : DERIVED[id as DerivedId].label;
}

export function varDim(id: VarId): Dimension {
  const inp = INPUT_BY_ID.get(id as InputId);
  return inp ? inp.dim : DERIVED[id as DerivedId].dim;
}

export function isInputId(id: VarId): id is InputId {
  return INPUT_BY_ID.has(id as InputId);
}
