/**
 * Shigley 9ª Ed. — Apéndice A:
 *   Tabla A-29: Dimensiones de tuercas hexagonales (ancho entre caras W)
 *   Tabla A-30: Dimensiones de tornillos cabeza hexagonal  (ancho entre caras W)
 *   Tabla A-31: Arandelas planas métricas
 *   Tabla A-32: Arandelas planas americanas (inch)
 *
 * Todas las cotas internamente en milímetros. Para series en pulgada se guarda
 * también el nominal original para mostrarlo al usuario.
 *
 * Uso en la app: auto-rellenar el Dw efectivo (cara de cabeza / cara de tuerca)
 * bajo el que se originan los conos de Rotscher en §8-5.
 */

/* ── Tabla A-30 — Tornillos cabeza hexagonal (ancho entre caras, W) ───── */
export interface HexHeadRow {
  nominal: string;     // "M10" | "1/2"
  series:  'metric' | 'inch';
  d_mm:    number;     // diámetro nominal en mm
  W_mm:    number;     // ancho entre caras en mm
  H_mm:    number;     // altura de la cabeza en mm
}

export const HEX_HEAD_A30: HexHeadRow[] = [
  // Métrico (mm)
  { nominal: 'M5',   series: 'metric', d_mm:  5,   W_mm:  8,   H_mm: 3.65 },
  { nominal: 'M6',   series: 'metric', d_mm:  6,   W_mm: 10,   H_mm: 4.15 },
  { nominal: 'M8',   series: 'metric', d_mm:  8,   W_mm: 13,   H_mm: 5.50 },
  { nominal: 'M10',  series: 'metric', d_mm: 10,   W_mm: 16,   H_mm: 6.63 },
  { nominal: 'M12',  series: 'metric', d_mm: 12,   W_mm: 18,   H_mm: 7.76 },
  { nominal: 'M14',  series: 'metric', d_mm: 14,   W_mm: 21,   H_mm: 9.09 },
  { nominal: 'M16',  series: 'metric', d_mm: 16,   W_mm: 24,   H_mm: 10.32 },
  { nominal: 'M20',  series: 'metric', d_mm: 20,   W_mm: 30,   H_mm: 12.88 },
  { nominal: 'M24',  series: 'metric', d_mm: 24,   W_mm: 36,   H_mm: 15.44 },
  { nominal: 'M30',  series: 'metric', d_mm: 30,   W_mm: 46,   H_mm: 19.48 },
  { nominal: 'M36',  series: 'metric', d_mm: 36,   W_mm: 55,   H_mm: 23.38 },
  // Inglés (in → mm)
  { nominal: '1/4',  series: 'inch', d_mm:  6.35, W_mm:  7/16 * 25.4, H_mm: 11/64 * 25.4 },
  { nominal: '5/16', series: 'inch', d_mm:  7.94, W_mm:  1/2  * 25.4, H_mm:  7/32 * 25.4 },
  { nominal: '3/8',  series: 'inch', d_mm:  9.53, W_mm:  9/16 * 25.4, H_mm:  1/4  * 25.4 },
  { nominal: '7/16', series: 'inch', d_mm: 11.11, W_mm:  5/8  * 25.4, H_mm: 19/64 * 25.4 },
  { nominal: '1/2',  series: 'inch', d_mm: 12.70, W_mm:  3/4  * 25.4, H_mm: 11/32 * 25.4 },
  { nominal: '5/8',  series: 'inch', d_mm: 15.88, W_mm: 15/16 * 25.4, H_mm: 27/64 * 25.4 },
  { nominal: '3/4',  series: 'inch', d_mm: 19.05, W_mm:  1.125 * 25.4, H_mm: 1/2   * 25.4 },
  { nominal: '7/8',  series: 'inch', d_mm: 22.23, W_mm:  1.3125 * 25.4, H_mm: 37/64 * 25.4 },
  { nominal: '1',    series: 'inch', d_mm: 25.40, W_mm:  1.5   * 25.4, H_mm: 43/64 * 25.4 },
  { nominal: '1-1/4',series: 'inch', d_mm: 31.75, W_mm:  1.875 * 25.4, H_mm: 27/32 * 25.4 },
  { nominal: '1-1/2',series: 'inch', d_mm: 38.10, W_mm:  2.25  * 25.4, H_mm:  1    * 25.4 },
];

/* ── Tabla A-29 — Tuercas hexagonales (ancho entre caras, W) ─────────── */
export interface HexNutRow {
  nominal: string;
  series:  'metric' | 'inch';
  d_mm:    number;
  W_mm:    number;
  H_mm:    number;   // altura de tuerca regular
}

export const HEX_NUT_A29: HexNutRow[] = [
  // Métricas regulares
  { nominal: 'M5',   series: 'metric', d_mm:  5,   W_mm:  8,   H_mm: 4.7 },
  { nominal: 'M6',   series: 'metric', d_mm:  6,   W_mm: 10,   H_mm: 5.2 },
  { nominal: 'M8',   series: 'metric', d_mm:  8,   W_mm: 13,   H_mm: 6.8 },
  { nominal: 'M10',  series: 'metric', d_mm: 10,   W_mm: 16,   H_mm: 8.4 },
  { nominal: 'M12',  series: 'metric', d_mm: 12,   W_mm: 18,   H_mm: 10.8 },
  { nominal: 'M14',  series: 'metric', d_mm: 14,   W_mm: 21,   H_mm: 12.8 },
  { nominal: 'M16',  series: 'metric', d_mm: 16,   W_mm: 24,   H_mm: 14.8 },
  { nominal: 'M20',  series: 'metric', d_mm: 20,   W_mm: 30,   H_mm: 18.0 },
  { nominal: 'M24',  series: 'metric', d_mm: 24,   W_mm: 36,   H_mm: 21.5 },
  { nominal: 'M30',  series: 'metric', d_mm: 30,   W_mm: 46,   H_mm: 25.6 },
  { nominal: 'M36',  series: 'metric', d_mm: 36,   W_mm: 55,   H_mm: 31.0 },
  // Inglés regulares
  { nominal: '1/4',  series: 'inch', d_mm:  6.35, W_mm:  7/16 * 25.4, H_mm: 7/32 * 25.4 },
  { nominal: '5/16', series: 'inch', d_mm:  7.94, W_mm:  1/2  * 25.4, H_mm: 17/64 * 25.4 },
  { nominal: '3/8',  series: 'inch', d_mm:  9.53, W_mm:  9/16 * 25.4, H_mm: 21/64 * 25.4 },
  { nominal: '7/16', series: 'inch', d_mm: 11.11, W_mm: 11/16 * 25.4, H_mm:  3/8  * 25.4 },
  { nominal: '1/2',  series: 'inch', d_mm: 12.70, W_mm:  3/4  * 25.4, H_mm:  7/16 * 25.4 },
  { nominal: '5/8',  series: 'inch', d_mm: 15.88, W_mm: 15/16 * 25.4, H_mm: 35/64 * 25.4 },
  { nominal: '3/4',  series: 'inch', d_mm: 19.05, W_mm:  1.125 * 25.4, H_mm: 41/64 * 25.4 },
  { nominal: '7/8',  series: 'inch', d_mm: 22.23, W_mm:  1.3125 * 25.4, H_mm: 3/4   * 25.4 },
  { nominal: '1',    series: 'inch', d_mm: 25.40, W_mm:  1.5   * 25.4, H_mm: 55/64 * 25.4 },
  { nominal: '1-1/4',series: 'inch', d_mm: 31.75, W_mm:  1.875 * 25.4, H_mm:  1.0625 * 25.4 },
  { nominal: '1-1/2',series: 'inch', d_mm: 38.10, W_mm:  2.25  * 25.4, H_mm:  1.25  * 25.4 },
];

/* ── Tabla A-31 — Arandelas planas métricas (regular) ────────────────── */
export interface WasherMetricRow {
  nominal: string;   // "M10"
  d_mm:    number;   // diámetro nominal del tornillo
  id_mm:   number;   // diámetro interior
  od_mm:   number;   // diámetro exterior — sirve como Dw efectivo
  t_mm:    number;   // espesor
}

export const WASHERS_METRIC_A31: WasherMetricRow[] = [
  { nominal: 'M3',  d_mm:  3, id_mm:  3.2, od_mm:  7.0, t_mm: 0.5 },
  { nominal: 'M4',  d_mm:  4, id_mm:  4.3, od_mm:  9.0, t_mm: 0.8 },
  { nominal: 'M5',  d_mm:  5, id_mm:  5.3, od_mm: 11.0, t_mm: 1.0 },
  { nominal: 'M6',  d_mm:  6, id_mm:  6.4, od_mm: 12.5, t_mm: 1.6 },
  { nominal: 'M8',  d_mm:  8, id_mm:  8.4, od_mm: 17.0, t_mm: 2.0 },
  { nominal: 'M10', d_mm: 10, id_mm: 10.5, od_mm: 21.0, t_mm: 2.5 },
  { nominal: 'M12', d_mm: 12, id_mm: 13.0, od_mm: 24.0, t_mm: 3.0 },
  { nominal: 'M14', d_mm: 14, id_mm: 15.0, od_mm: 28.0, t_mm: 3.0 },
  { nominal: 'M16', d_mm: 16, id_mm: 17.0, od_mm: 30.0, t_mm: 4.0 },
  { nominal: 'M20', d_mm: 20, id_mm: 21.0, od_mm: 37.0, t_mm: 4.0 },
  { nominal: 'M24', d_mm: 24, id_mm: 25.0, od_mm: 44.0, t_mm: 4.0 },
  { nominal: 'M30', d_mm: 30, id_mm: 31.0, od_mm: 56.0, t_mm: 4.0 },
  { nominal: 'M36', d_mm: 36, id_mm: 37.0, od_mm: 66.0, t_mm: 5.0 },
];

/* ── Tabla A-32 — Arandelas planas americanas (Type A narrow) ────────── */
export interface WasherInchRow {
  nominal: string;        // "1/2 N"
  d_nom_in: number;
  d_mm:    number;        // nominal bolt (mm)
  id_mm:   number;
  od_mm:   number;
  t_mm:    number;
}

const inM = (v: number) => v * 25.4;
export const WASHERS_INCH_A32: WasherInchRow[] = [
  { nominal: '1/4 N',   d_nom_in: 0.25,   d_mm: inM(0.25),   id_mm: inM(0.281), od_mm: inM(0.625), t_mm: inM(0.065) },
  { nominal: '5/16 N',  d_nom_in: 0.3125, d_mm: inM(0.3125), id_mm: inM(0.344), od_mm: inM(0.688), t_mm: inM(0.065) },
  { nominal: '3/8 N',   d_nom_in: 0.375,  d_mm: inM(0.375),  id_mm: inM(0.406), od_mm: inM(0.812), t_mm: inM(0.065) },
  { nominal: '7/16 N',  d_nom_in: 0.4375, d_mm: inM(0.4375), id_mm: inM(0.469), od_mm: inM(0.922), t_mm: inM(0.065) },
  { nominal: '1/2 N',   d_nom_in: 0.5,    d_mm: inM(0.5),    id_mm: inM(0.531), od_mm: inM(1.062), t_mm: inM(0.095) },
  { nominal: '9/16 N',  d_nom_in: 0.5625, d_mm: inM(0.5625), id_mm: inM(0.594), od_mm: inM(1.156), t_mm: inM(0.095) },
  { nominal: '5/8 N',   d_nom_in: 0.625,  d_mm: inM(0.625),  id_mm: inM(0.656), od_mm: inM(1.312), t_mm: inM(0.095) },
  { nominal: '3/4 N',   d_nom_in: 0.75,   d_mm: inM(0.75),   id_mm: inM(0.812), od_mm: inM(1.469), t_mm: inM(0.134) },
  { nominal: '7/8 N',   d_nom_in: 0.875,  d_mm: inM(0.875),  id_mm: inM(0.938), od_mm: inM(1.750), t_mm: inM(0.134) },
  { nominal: '1 N',     d_nom_in: 1.0,    d_mm: inM(1.0),    id_mm: inM(1.062), od_mm: inM(2.000), t_mm: inM(0.134) },
  { nominal: '1-1/8 N', d_nom_in: 1.125,  d_mm: inM(1.125),  id_mm: inM(1.250), od_mm: inM(2.250), t_mm: inM(0.134) },
  { nominal: '1-1/4 N', d_nom_in: 1.25,   d_mm: inM(1.25),   id_mm: inM(1.375), od_mm: inM(2.500), t_mm: inM(0.165) },
  { nominal: '1-3/8 N', d_nom_in: 1.375,  d_mm: inM(1.375),  id_mm: inM(1.500), od_mm: inM(2.750), t_mm: inM(0.165) },
  { nominal: '1-1/2 N', d_nom_in: 1.5,    d_mm: inM(1.5),    id_mm: inM(1.625), od_mm: inM(3.000), t_mm: inM(0.165) },
];

/* ── Helpers para autoselección por diámetro del perno ───────────────── */
function closestByD<T extends { d_mm: number }>(rows: T[], d_mm: number): T | null {
  if (!rows.length || !(d_mm > 0)) return null;
  return rows.reduce((best, r) =>
    Math.abs(r.d_mm - d_mm) < Math.abs(best.d_mm - d_mm) ? r : best, rows[0]);
}

export function getHexHeadByDiameter(d_mm: number, series?: 'metric' | 'inch'): HexHeadRow | null {
  const pool = series ? HEX_HEAD_A30.filter(r => r.series === series) : HEX_HEAD_A30;
  return closestByD(pool, d_mm);
}

export function getHexNutByDiameter(d_mm: number, series?: 'metric' | 'inch'): HexNutRow | null {
  const pool = series ? HEX_NUT_A29.filter(r => r.series === series) : HEX_NUT_A29;
  return closestByD(pool, d_mm);
}

export function getMetricWasherByDiameter(d_mm: number): WasherMetricRow | null {
  return closestByD(WASHERS_METRIC_A31, d_mm);
}

export function getInchWasherByDiameter(d_mm: number): WasherInchRow | null {
  return closestByD(WASHERS_INCH_A32, d_mm);
}
