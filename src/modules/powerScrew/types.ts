/**
 * Tornillo de potencia — Shigley 9ª ed., §8-1 y §8-2.
 * Todas las unidades internas en SI (mm, N, MPa, N·mm).
 */

export type PowerThreadType = 'square' | 'acme';
export type UnitSystem      = 'SI' | 'imperial';

export interface PowerScrewMaterial {
  name: string;
  Sy:   number;   // MPa — para calcular σ_adm
  Sut:  number;   // MPa
  E:    number;   // GPa
}

export interface PowerScrewInput {
  /** Tipo de rosca — define el ángulo del filete 2α. */
  threadType:          PowerThreadType;   // 'acme' → α=14.5°, 'square' → α=0°
  /** Diámetro mayor d [mm] (§8-1). */
  majorDiameter:       number;
  /** Paso p [mm]. */
  pitch:               number;
  /** Número de entradas (avance L = n·p). 1 = rosca sencilla. */
  numberOfStarts:      number;

  /** Carga axial F [N] (peso a elevar / fuerza a aplicar). */
  axialLoad:           number;

  /** Coef. fricción de rosca f. */
  frictionCoefficient: number;

  /** ¿Hay collarín de empuje? */
  hasCollar:           boolean;
  /** Diámetro medio del collarín dc [mm] (si hay). */
  collarDiameter?:     number;
  /** Coef. fricción del collarín fc (si hay). */
  collarFriction?:     number;

  /** Número de filetes en contacto nt (§8-2, esfuerzos en la rosca). */
  engagedThreads:      number;

  /** Material (opcional, para factor de seguridad contra σ_adm). */
  material?:           PowerScrewMaterial;

  unitSystem:          UnitSystem;
}

export interface PowerScrewGeometry {
  d:             number;   // mm
  dm:            number;   // mm — Shigley Eq. 8-1: dm = d − p/2
  dr:            number;   // mm — Shigley Eq. 8-2: dr = d − p
  p:             number;
  lead:          number;   // L = n·p
  leadAngleRad:  number;   // λ = atan(L/(π·dm))
  leadAngleDeg:  number;
  threadHalfAngleDeg: number;   // α (acme=14.5°, square=0°)
}

export interface PowerScrewTorques {
  TR:        number;   // N·mm — par para subir la carga (§8-2 Eq. 8-5 / 8-6)
  TL:        number;   // N·mm — par para bajar la carga
  Tc:        number;   // N·mm — par por collarín (Eq. 8-7)
  Ttotal:    number;   // N·mm — TR + Tc (par total para elevar)
  efficiency:number;   // e = F·L / (2π·TR)  (§8-2 Eq. 8-4)
  selfLocking: boolean;
  formulas: {
    TR: string;
    TL: string;
    Tc: string;
  };
}

export interface PowerScrewBodyStress {
  sigmaAxial: number;   // MPa — σ = 4F/(π·dr²)  Eq. 8-9
  tauTorsion: number;   // MPa — τ = 16T/(π·dr³) Eq. 8-10 (con T = TR + Tc)
  sigmaVonMises: number;   // σ' = √(σ² + 3τ²)
  allowableSy?:  number;   // MPa — Sy/n si se dio material
}

export interface PowerScrewThreadStress {
  /** Aplastamiento en el filete — Eq. 8-11:  σB = 2F/(π·dm·nt·p). */
  bearing:   number;
  /** Flexión en la base del filete — Eq. 8-12: σb = 6F/(π·dr·nt·p). */
  bending:   number;
  /** Cortante transversal en la base del filete — Eq. 8-13: τ = 3F/(π·dr·nt·p). */
  shear:     number;
}

export interface PowerScrewResults {
  input:      PowerScrewInput;
  geometry:   PowerScrewGeometry;
  torques:    PowerScrewTorques;
  bodyStress: PowerScrewBodyStress;
  threadStress: PowerScrewThreadStress;

  /** Indicadores simples útiles para la UI. */
  indicators: {
    safetyFactorYield?: number;   // Sy / σ'
    selfLocking: boolean;
    efficiencyPercent: number;
  };

  recommendations: string[];
  warnings:        string[];   // advertencias contextuales
  calculations: Record<string, { formula: string; value: number; unit: string; ref?: string }>;
}
