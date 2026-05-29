/**
 * Juntas atornilladas y remachadas cargadas a cortante — Shigley 9ª ed., §8-12.
 * Cubre cortante directo, cortante por momento (carga excéntrica), aplastamiento
 * en la placa, tensión en el área neta y esfuerzos admisibles del perno/placa.
 */

export type UnitSystem = 'SI' | 'imperial';

export interface ShearBolt {
  /** Identificador (A, B, 1, 2…) para la UI. */
  id: string;
  /** Coordenadas del perno en el plano de la unión [mm]. */
  x: number;
  y: number;
}

export interface ShearJointInput {
  /** Patrón de pernos. */
  bolts: ShearBolt[];
  /** Diámetro mayor d [mm]. */
  boltDiameter: number;
  /** Área de tensión At (roscas en el plano de corte) o πd²/4 (vástago). */
  shearArea: number;
  /** ¿Cortante simple o doble? */
  doubleShear: boolean;
  /** Grado del perno — usa Sp, Sy, Sut (Tabla 8-9/8-11). */
  boltSp:  number;
  boltSy:  number;
  boltSut: number;

  /** Carga V aplicada al patrón [N]. */
  V:  number;
  /** Componentes (cos, sin) — dirección de V respecto al eje X. Default (0,-1) para V vertical hacia abajo. */
  Vx: number;
  Vy: number;
  /** Punto de aplicación del vector V [mm]. Junto al centroide → solo cortante directo. */
  applicationX: number;
  applicationY: number;

  /** Espesor del miembro/placa [mm] (para aplastamiento). */
  plateThickness: number;
  /** Fluencia de la placa [MPa]. */
  plateSy: number;
  plateSut: number;

  /** Ancho de la placa [mm] — opcional, activa verificación de tensión en el área neta. */
  plateWidth?: number;

  unitSystem: UnitSystem;
}

export interface BoltForce {
  id:        string;
  x: number; y: number;
  r: number;            // distancia al centroide
  Fpx: number; Fpy: number;   // cortante directo (componentes)
  Fmx: number; Fmy: number;   // cortante por momento
  Fx:  number; Fy:  number;   // suma
  F:   number;          // magnitud total
}

export interface ShearJointResults {
  input: ShearJointInput;

  centroid:  { x: number; y: number };
  M:         number;   // N·mm — momento respecto al centroide
  sumR2:     number;   // Σri²
  forces:    BoltForce[];
  maxBolt:   BoltForce;

  /** Esfuerzos en el perno más cargado. */
  tauBolt:        number;   // MPa — Fmax / (shearArea · planos)
  tauBoltAllow:   number;   // MPa — Shigley usa τ_adm = 0.577·Sp (distorsión)
  nBoltShear:     number;

  /** Aplastamiento en la placa. */
  sigmaBearing:   number;   // MPa — Eq. 8-49:  σ = Fmax / (t·d)
  sigmaBearingAllow: number;// MPa — 0.9·Syp (Shigley)
  nBearing:       number;

  /** Tensión en el área neta (si plateWidth dado). */
  sigmaNet?:      number;   // MPa — σ = V / [(w − n·d)·t]
  sigmaNetAllow?: number;   // MPa — 0.6·Syp
  nNet?:          number;

  verdict: {
    verdict: 'valid' | 'marginal' | 'invalid';
    governing: string;
    safetyFactor: number;
  };

  recommendations: string[];
  warnings:        string[];
  calculations: Record<string, { formula: string; value: number; unit: string; ref?: string }>;
}
