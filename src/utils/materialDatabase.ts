/**
 * Tablas de materiales — Shigley 9ª ed.:
 *  - Tabla 8-9:  Grados SAE de pernos (subconjunto).
 *  - Tabla 8-11: Clases métricas ISO (subconjunto).
 *  - Tabla 8-8:  Constantes A, B de Wileman para km.
 *  - Tabla 8-15: Factor K del par de apriete.
 */

export interface MaterialData {
  grade:       string;
  designation: string;
  Sut:         number;   // MPa
  Sy:          number;   // MPa
  Sp:          number;   // MPa
  Se:          number;   // MPa  (roscas laminadas)
  E:           number;   // GPa
  sizeRange?:  string;
  head?:       string;
}

export interface WilemanConstants {
  material: 'steel' | 'aluminum' | 'copper' | 'cast_iron';
  name:     string;
  E:        number;   // GPa
  A:        number;
  B:        number;
}

export interface TorqueFactor {
  condition: string;
  name:      string;
  K:         number;
}

let SAE_MATERIALS: MaterialData[] = [];
let ISO_MATERIALS: MaterialData[] = [];
let WILEMAN_CONSTANTS: WilemanConstants[] = [];
let TORQUE_FACTORS: TorqueFactor[] = [];
let matLoaded = false;

export async function loadMaterialTables(): Promise<void> {
  if (matLoaded) return;
  const [sae, iso, wil, tf] = await Promise.all([
    fetch('/data/materials_sae.json').then(r => r.json()),
    fetch('/data/materials_iso.json').then(r => r.json()),
    fetch('/data/member_constants.json').then(r => r.json()),
    fetch('/data/torque_factors.json').then(r => r.json()),
  ]);
  SAE_MATERIALS     = sae;
  ISO_MATERIALS     = iso;
  WILEMAN_CONSTANTS = wil;
  TORQUE_FACTORS    = tf;
  matLoaded = true;
}

export function getAllSAEGrades(): MaterialData[]  { return SAE_MATERIALS; }
export function getAllISOClasses(): MaterialData[] { return ISO_MATERIALS; }
export function getMaterialBySAEGrade(g: string): MaterialData | null {
  return SAE_MATERIALS.find(m => m.grade === g) ?? null;
}
export function getMaterialByISOClass(g: string): MaterialData | null {
  return ISO_MATERIALS.find(m => m.grade === g) ?? null;
}

export function getWilemanConstants(mat: WilemanConstants['material']): WilemanConstants | null {
  return WILEMAN_CONSTANTS.find(w => w.material === mat) ?? null;
}
export function getAllWilemanConstants(): WilemanConstants[] { return WILEMAN_CONSTANTS; }

export function getTorqueFactors(): TorqueFactor[] { return TORQUE_FACTORS; }

/** Materiales genéricos para el cuerpo del tornillo de potencia (§8-2, acero común). */
export const POWER_SCREW_MATERIALS = [
  { name: 'Acero suave (1020 HR)',    Sy: 210, Sut: 380, E: 207 },
  { name: 'Acero medio (1040 HR)',    Sy: 290, Sut: 520, E: 207 },
  { name: 'Acero endurecido (4140)',  Sy: 655, Sut: 895, E: 207 },
  { name: 'Acero inoxidable (304)',   Sy: 207, Sut: 517, E: 193 },
  { name: 'Personalizado',            Sy: 0,   Sut: 0,   E: 207 },
];
