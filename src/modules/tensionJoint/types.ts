/**
 * Junta atornillada a tensión — Norton §11 + Shigley 9ª ed.
 * §8-3  Sujetadores roscados
 * §8-4  Uniones: rigidez del sujetador (kb)
 * §8-5  Uniones: rigidez del elemento (km)
 * §8-6  Resistencia del perno (Sp, Sy, Sut)
 * §8-7  Uniones a tensión: la carga externa
 * §8-8  Relación del par de apriete con la tensión del perno
 * §8-9  Uniones cargadas estáticamente con precarga
 * §8-10 Juntas con empaque
 * §8-11 Cargas de fatiga en uniones atornilladas a tensión
 * Norton §11.8 — Método FEA de Cornwell para C = kb/(kb+km)
 */

export type UnitSystem      = 'SI' | 'imperial';
export type JointPermanence = 'reusable' | 'permanent' | 'custom_pct';
export type MemberMaterial  = 'steel' | 'aluminum' | 'copper' | 'cast_iron' | 'custom';
export type FatigueCriterion = 'goodman' | 'gerber' | 'asme_elliptic';

/**
 * Método para calcular la constante de rigidez de la junta C = kb/(kb+km).
 * - 'wileman'  → Shigley Eq. 8-23 (correlación empírica por material).
 * - 'cornwell' → Norton §11.8, método FEA de Cornwell — da C directamente.
 */
export type KmMethod = 'wileman' | 'cornwell';

/**
 * Tipo de empaque.
 * - 'confined'   → empaque confinado (metal-metal directo); el empaque no entra en km.
 * - 'unconfined' → empaque no confinado (material blando entre bridas); kg en serie con km.
 */
export type GasketType = 'confined' | 'unconfined';

/**
 * Placa del paquete para el método de Cornwell (Norton §11.8).
 * Solo se necesitan dos placas: la inferior (L) y la superior (H).
 */
export interface CornwellPlate {
  /** Módulo elástico de la placa [GPa]. */
  E_GPa: number;
  /** Espesor de la placa [mm]. */
  thickness: number;
  /** Etiqueta descriptiva (para visualización). */
  label?: string;
}

export interface BoltGrade {
  designation: string;
  Sut: number;   // MPa — resistencia última
  Sy:  number;   // MPa — fluencia
  Sp:  number;   // MPa — de prueba
  Se:  number;   // MPa — límite de fatiga (roscas laminadas)
  E:   number;   // GPa
  sizeRange?: string;
  head?: string;
}

export interface TensionJointInput {
  /** Diámetro mayor d [mm]. */
  boltDiameter:  number;
  /** Paso p [mm]. */
  pitch:         number;
  /** Área de tensión At [mm²] (de tabla 8-1/8-2 o calculada). */
  tensileArea:   number;

  /** Grado/clase del perno (Tabla 8-9 SAE / 8-11 ISO). */
  grade:         BoltGrade;

  /** l — longitud de agarre total (grip) [mm]. */
  grip:          number;
  /** ld — longitud del vástago sin rosca dentro del grip [mm]. Si 0 → todo roscado. */
  unthreadedLengthInGrip: number;
  /** lt — longitud de rosca dentro del grip [mm]. */
  threadedLengthInGrip:   number;

  /** Material de los elementos sujetados (para km Wileman, Tabla 8-8). */
  memberMaterial: MemberMaterial;
  /** Módulo E del elemento [GPa] (referencia; Cornwell usa cornwellPlates). */
  memberE:        number;
  /** Constantes A, B de Wileman (Tabla 8-8) — se llenan automáticamente si memberMaterial≠custom. */
  wilemanA?:      number;
  wilemanB?:      number;

  /** Método para calcular km/C. Por defecto 'cornwell'. */
  kmMethod?: KmMethod;

  /**
   * Placas del paquete para el método de Cornwell.
   * - cornwellPlates[0] = placa inferior (TL)
   * - cornwellPlates[1] = placa superior (TH)
   * Si hay una sola placa se usa la misma para ambos lados (caso same-material).
   */
  cornwellPlates?: CornwellPlate[];

  /** Tipo de unión — define la precarga recomendada. */
  permanence:    JointPermanence;
  /**
   * Factor de precarga como fracción de Fp (usado cuando permanence === 'custom_pct').
   * Ej: 0.85 → Fi = 0.85 · Fp.  Por defecto 0.75 si se omite.
   */
  preloadFactor?: number;
  /** Fi personalizada [N]. Si se omite se usa el factor × Fp según el tipo de unión. */
  preloadCustom?: number;
  /** Factor K del par de apriete (Tabla 8-15). 0.20 por defecto. */
  K:             number;

  /** Carga externa total por perno [N]. */
  externalLoad:  number;
  /** Para fatiga: carga máxima / mínima por perno [N]. */
  loadType:      'static' | 'fatigue';
  Pmin?:         number;
  Pmax?:         number;
  fatigueCriterion?: FatigueCriterion;

  /** §8-10 — Unión con empaque. */
  hasGasket?:           boolean;
  /** Tipo de empaque: confinado o no confinado. Por defecto 'confined'. */
  gasketType?:          GasketType;
  /** Ag — área del empaque asignada a cada perno [mm²]. */
  gasketArea?:          number;
  /** Módulo de elasticidad del material del empaque [MPa] (solo para empaque no confinado). */
  gasketEg_MPa?:        number;
  /** Espesor del empaque tg [mm] (solo para empaque no confinado). */
  gasketThickness_mm?:  number;
  /** n — factor de carga con el que se verifica el sellado (p_g ≥ 0 a n×P). */
  gasketLoadFactor?:    number;
  /** Db — diámetro del círculo de pernos [mm] (para condición de espaciado Ec. 8-34). */
  boltCircleDiameter?:  number;
  /** N — número de pernos (para Ec. 8-34 y división de carga §8-7). */
  numBolts?:            number;

  unitSystem: UnitSystem;
}

export interface StiffnessResults {
  kb: number;   // N/mm — Eq. 8-17
  km: number;   // N/mm — rigidez efectiva del paquete (sin empaque para Cornwell)
  C:  number;   // Eq. 8-24 — C efectivo (incluye kg si empaque no confinado)
  /** C calculado solo para la unión metálica (sin efecto de empaque blando). */
  C_metal?: number;
  /** Rigidez del empaque [N/mm] — solo cuando gasketType = 'unconfined'. */
  kg?: number;
  /** Detalles del método Cornwell (solo si kmMethod === 'cornwell'). */
  cornwell?: {
    j:  number;   // d/l — relación de aspecto
    rL: number;   // EL/Eb — relación de módulos (placa inferior)
    rH: number;   // EH/Eb — relación de módulos (placa superior)
    t:  number;   // TL/(TL+TH) — relación de espesores
    CL: number;   // Cr(rL) — constante para placa inferior
    CH: number;   // Cr(rH) — constante para placa superior
    C_metal: number; // C sin efecto de empaque
  };
}

export interface StaticLoadResults {
  Fp:    number;   // N — Eq. 8-18:  Fp = At·Sp
  Fi:    number;   // N — precarga usada
  FiMethod: string; // "0.75 Fp (reutilizable)" o similar
  Fb:    number;   // N — Eq. 8-25: Fb = C·P + Fi
  Fm:    number;   // N — Eq. 8-26: Fm = (1−C)·P − Fi   (negativo = compresión)
  np:    number;   // Eq. 8-29: np = (Sp·At − Fi)/(C·P)  — factor de carga
  np_proof: number; // Fp/Fb = (Sp·At)/(C·P + Fi)
  n0:    number;   // Eq. 8-30: n0 = Fi / [P(1−C)]        separación
  T:     number;   // N·m  — Eq. 8-27: T = K·Fi·d
}

export interface FatigueResults {
  sigma_i: number;   // MPa — σi = Fi/At
  sigma_a: number;   // MPa — σa = C·(Pmax−Pmin)/(2·At)
  sigma_m: number;   // MPa — σm = σa + σi  (carga repetida)  ó σa + Fi/At si Pmin≠0
  criterion: FatigueCriterion;
  Sa:       number;  // MPa — amplitud resistente en el criterio
  nf:       number;  // factor de seguridad contra fatiga
  np_fluencia: number;  // n contra fluencia — σmax ≤ Sp
}

/**
 * Resultados §8-10 — Unión con empaque.
 * Las presiones están en MPa (N/mm²).
 */
export interface GasketResults {
  /** Tipo de empaque. */
  gasketType: GasketType;
  /** Ag [mm²] — área del empaque por perno usada en el cálculo. */
  Ag:     number;
  /** n — factor de carga aplicado (n × P). */
  n:      number;
  /** p_i [MPa] — presión inicial de asentamiento: Fi / Ag. */
  p_i:    number;
  /** p_g [MPa] — presión residual del empaque bajo n × P: (Fi − n·(1−C)·P) / Ag. */
  p_g:    number;
  /** true si p_g ≥ 0 (junta sigue sellada a n × P). */
  sealed: boolean;
  /** n_sello — factor de carga máximo antes de que el empaque pierda contacto. */
  n_seal: number;
  /** Rigidez del empaque [N/mm] — solo para empaque no confinado. */
  kg?: number;
  /** C efectivo de la junta con empaque no confinado. */
  C_eff?: number;
  /** C de la junta metálica sin empaque. */
  C_metal?: number;
}

export interface TensionJointResults {
  input:       TensionJointInput;

  /** Áreas. */
  areas:       { Ad: number; At: number };

  stiffness:   StiffnessResults;
  staticLoad:  StaticLoadResults;
  fatigue?:    FatigueResults;
  gasket?:     GasketResults;

  verdict: {
    verdict: 'valid' | 'marginal' | 'invalid';
    governing: string;
    safetyFactor: number;
  };

  recommendations: string[];
  warnings:        string[];
  calculations:    Record<string, { formula: string; value: number; unit: string; ref?: string }>;
}
