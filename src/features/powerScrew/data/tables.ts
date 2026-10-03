/**
 * Datos tabulados para el tornillo de potencia, transcritos y verificados contra el
 * PDF local de Shigley 9ª ed. (ver docs/power-screw/METODOLOGIA.md §3).
 * Unidades base: mm, MPa. Las fuentes (`ref`) son internas; la UI no las muestra.
 */

const IN = 25.4;
const PSI = 4.4482216152605 / (IN * IN); // MPa

// ── Catálogo Acme (½–2 in; se mantiene el del proyecto, sin tamaños mayores) ──

export interface AcmeSize {
  id:   string;   // designación, p. ej. '1-1/4'
  d:    number;   // mm
  p:    number;   // mm
  tpi:  number;
}

const ACME_IN: [string, number, number][] = [
  ['1/2', 0.5, 10], ['5/8', 0.625, 8], ['3/4', 0.75, 6], ['7/8', 0.875, 6],
  ['1', 1, 5], ['1-1/4', 1.25, 5], ['1-1/2', 1.5, 4], ['1-3/4', 1.75, 4], ['2', 2, 4],
];

export const ACME_SIZES: readonly AcmeSize[] = ACME_IN.map(([id, dIn, tpi]) => ({
  id, d: dIn * IN, p: IN / tpi, tpi,
}));
export const ACME_REF = 'Tabla 8-3 (pasos preferidos Acme)';

// ── Materiales del tornillo (Tabla A-20, aceros HR/CD; E de Tabla A-5) ────────

export interface ScrewMaterial {
  id:  string;
  label: string;
  Sy:  number;   // MPa
  Sut: number;   // MPa
  E:   number;   // MPa
}

const E_STEEL = 207_000;
const A20: [string, string, number, number][] = [
  ['1010', 'HR', 320, 180], ['1010', 'CD', 370, 300],
  ['1015', 'HR', 340, 190], ['1015', 'CD', 390, 320],
  ['1018', 'HR', 400, 220], ['1018', 'CD', 440, 370],
  ['1020', 'HR', 380, 210], ['1020', 'CD', 470, 390],
  ['1030', 'HR', 470, 260], ['1030', 'CD', 520, 440],
  ['1035', 'HR', 500, 270], ['1035', 'CD', 550, 460],
  ['1040', 'HR', 520, 290], ['1040', 'CD', 590, 490],
  ['1045', 'HR', 570, 310], ['1045', 'CD', 630, 530],
  ['1050', 'HR', 620, 340], ['1050', 'CD', 690, 580],
  ['1060', 'HR', 680, 370], ['1080', 'HR', 770, 420], ['1095', 'HR', 830, 460],
];

export const SCREW_MATERIALS: readonly ScrewMaterial[] = A20.map(([aisi, proc, Sut, Sy]) => ({
  id: `${aisi}-${proc}`,
  label: `AISI ${aisi} ${proc === 'HR' ? 'laminado en caliente' : 'estirado en frío'}`,
  Sy, Sut, E: E_STEEL,
}));
export const MATERIALS_REF = 'Tabla A-20 (Sy, Sut); Tabla A-5 (E acero)';

// ── Fricción de la rosca (Tabla 8-5) ─────────────────────────────────────────

export type ScrewCondition = 'steelDry' | 'steelOil' | 'bronze';
export type NutMaterial    = 'steel' | 'bronze' | 'brass' | 'castIron';

export const SCREW_CONDITION_LABEL: Record<ScrewCondition, string> = {
  steelDry: 'Acero, seco',
  steelOil: 'Acero, con aceite de máquina',
  bronze:   'Bronce',
};
export const NUT_LABEL: Record<NutMaterial, string> = {
  steel: 'Acero', bronze: 'Bronce', brass: 'Latón', castIron: 'Hierro fundido',
};

/** [mín, máx] o null si la combinación no está en la tabla. */
export const THREAD_FRICTION: Record<ScrewCondition, Record<NutMaterial, [number, number] | null>> = {
  steelDry: { steel: [0.15, 0.25], bronze: [0.15, 0.23], brass: [0.15, 0.19], castIron: [0.15, 0.25] },
  steelOil: { steel: [0.11, 0.17], bronze: [0.10, 0.16], brass: [0.10, 0.15], castIron: [0.11, 0.17] },
  bronze:   { steel: [0.08, 0.12], bronze: [0.04, 0.06], brass: null,         castIron: [0.06, 0.09] },
};
export const THREAD_FRICTION_REF = 'Tabla 8-5';

// ── Fricción del collarín (Tabla 8-6) ────────────────────────────────────────

export interface CollarPair { id: string; label: string; running: number; starting: number }

export const COLLAR_FRICTION: readonly CollarPair[] = [
  { id: 'softSteel-castIron', label: 'Acero suave sobre hierro fundido', running: 0.12, starting: 0.17 },
  { id: 'hardSteel-castIron', label: 'Acero duro sobre hierro fundido',  running: 0.09, starting: 0.15 },
  { id: 'softSteel-bronze',   label: 'Acero suave sobre bronce',         running: 0.08, starting: 0.10 },
  { id: 'hardSteel-bronze',   label: 'Acero duro sobre bronce',          running: 0.06, starting: 0.08 },
];
export const COLLAR_FRICTION_REF = 'Tabla 8-6';

// ── Presión de apoyo segura (Tabla 8-4) ──────────────────────────────────────

export interface BearingPressureRow {
  nut:      'bronze' | 'castIron';
  /** Intervalo de velocidad de frotamiento en ft/min; vMin = 0 y vMax = null para "baja velocidad". */
  vMin:     number;
  vMax:     number | null;
  label:    string;
  pbMinPsi: number;
  pbMaxPsi: number;
}

/** Tornillo de acero en todas las filas (las de hierro fundido son tuerca de hierro). */
export const BEARING_PRESSURE: readonly BearingPressureRow[] = [
  { nut: 'bronze',   vMin: 0,  vMax: 0,    label: 'Baja velocidad',   pbMinPsi: 2500, pbMaxPsi: 3500 },
  { nut: 'bronze',   vMin: 0,  vMax: 10,   label: '≤ 10 ft/min',      pbMinPsi: 1600, pbMaxPsi: 2500 },
  { nut: 'castIron', vMin: 0,  vMax: 8,    label: '≤ 8 ft/min',       pbMinPsi: 1800, pbMaxPsi: 2500 },
  { nut: 'bronze',   vMin: 20, vMax: 40,   label: '20–40 ft/min',     pbMinPsi: 800,  pbMaxPsi: 1400 },
  { nut: 'castIron', vMin: 20, vMax: 40,   label: '20–40 ft/min',     pbMinPsi: 600,  pbMaxPsi: 1000 },
  { nut: 'bronze',   vMin: 50, vMax: null, label: '≥ 50 ft/min',      pbMinPsi: 150,  pbMaxPsi: 240 },
];
export const BEARING_PRESSURE_REF = 'Tabla 8-4';
export const psiToMPa = (psi: number) => psi * PSI;

// ── Constante de condición de extremos (Tabla 4-2) ───────────────────────────

export interface EndCondition { id: string; label: string; theoretical: number; conservative: number; recommended: number }

export const END_CONDITIONS: readonly EndCondition[] = [
  { id: 'fixed-free',     label: 'Empotrado – libre',       theoretical: 0.25, conservative: 0.25, recommended: 0.25 },
  { id: 'pinned-pinned',  label: 'Articulado – articulado', theoretical: 1,    conservative: 1,    recommended: 1 },
  { id: 'fixed-pinned',   label: 'Empotrado – articulado',  theoretical: 2,    conservative: 1,    recommended: 1.2 },
  { id: 'fixed-fixed',    label: 'Empotrado – empotrado',   theoretical: 4,    conservative: 1,    recommended: 1.2 },
];
export const END_CONDITIONS_REF = 'Tabla 4-2';

// ── Reparto de carga en los filetes de la tuerca ─────────────────────────────

export const FIRST_THREAD_SHARE = 0.38;
export const NUT_LOAD_SHARES = [0.38, 0.25, 0.18] as const; // 7.º filete libre de carga
