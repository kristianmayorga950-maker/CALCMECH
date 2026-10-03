/**
 * Contratos del motor de cálculo del tornillo de potencia.
 *
 * Modelo: grafo de reglas con alternativas, resuelto por punto fijo sobre lo que
 * el usuario conoce (ver docs/power-screw/METODOLOGIA.md §5). Sin React.
 *
 * Unidades internas coherentes: mm, N, N·mm, MPa (= N/mm²). E también en MPa.
 * `origin` y `ref` son metadatos de auditoría: la UI NUNCA los muestra.
 */

import type { Dimension } from './units';

// ── Configuración del problema ────────────────────────────────────────────────

export type ThreadForm   = 'square' | 'acme';
export type Transmission = 'direct' | 'lever' | 'reducer';
export type ThrustSupport = 'none' | 'collar' | 'bearing';
export type LoadSense    = 'compression' | 'tension';
export type Goal         = 'analyze' | 'capacity' | 'drive' | 'size' | 'lead';

export interface ProblemConfig {
  thread:       ThreadForm;
  transmission: Transmission;
  thrust:       ThrustSupport;
  load:         LoadSense;
  goal:         Goal;                       // solo orienta qué se resalta
  /** Par que tuerce el cuerpo: total (T_R + T_c) o solo el de la rosca. */
  bodyTorque:   'total' | 'threadOnly';
  /** Palanca con una o dos manos (T = P·r o T = 2P·r). */
  leverHands:   1 | 2;
  /** Política para p_b de la tabla: conservadora o interpolación lineal declarada. */
  pbPolicy:     'conservative' | 'interpolate';
  /** Tornillo girado a mano (gato, prensa): p_b de la fila de baja velocidad sin pedir N. */
  manualDrive:  boolean;
  /** En el dimensionamiento, exigir que la rosca sea autobloqueante. */
  requireSelfLock: boolean;
}

// ── Variables ────────────────────────────────────────────────────────────────

/** Identificadores de magnitudes que el usuario puede escribir. */
export type InputId =
  | 'd' | 'p' | 'n' | 'F' | 'f' | 'fc' | 'dc'
  | 'Tin' | 'P' | 'r' | 'Tm' | 'i' | 'etaG'
  | 'Sy' | 'E' | 'nTarget' | 'Lcol' | 'C'
  | 'nt' | 'H' | 'pb' | 'N'
  // Datos que vienen de tablas elegidas (no se escriben a mano):
  | 'fMin'      // extremo bajo de f del par de materiales
  | 'fcStart'   // f_c de arranque del collarín
  | 'nutCode';  // material de la tuerca para la presión de apoyo: 1 bronce, 2 hierro fundido

/** Identificadores de magnitudes derivadas. */
export type DerivedId =
  | 'alpha' | 'dm' | 'dr' | 'h' | 'l' | 'lambda'
  | 'Fw'                                   // carga de trabajo (dada o despejada)
  | 'Tavail'                               // par que la entrada entrega al tornillo
  | 'TR' | 'TL' | 'T0' | 'Tc' | 'Tc_start' | 'T' | 'Tlow' | 'Tstart'
  | 'Preq' | 'rreq' | 'Tmreq' | 'Tinreq' | 'MA'
  | 'e1' | 'e'
  | 'lmax' | 'nmax'
  | 'sigma' | 'tau' | 'sigmaBodyVM'
  | 'sB1' | 'sb1' | 'tr1' | 'sx' | 'vm' | 's1' | 's2' | 's3' | 'tmax'
  | 'k' | 'slender' | 'slender1' | 'Pcr'
  | 'ntEff' | 'sBw' | 'pbEff' | 'Vrub'
  | 'v' | 'power';

export type VarId = InputId | DerivedId;

/** Valores ya resueltos, en unidades base. */
export type Values = Partial<Record<VarId, number>>;

export interface VarDef {
  id:     VarId;
  /** Símbolo en LaTeX, p. ej. 'd_m', 'T_R', '\\sigma_B'. */
  symbol: string;
  label:  string;
  dim:    Dimension;
}

// ── Reglas ───────────────────────────────────────────────────────────────────

export type Origin = 'SHIGLEY' | 'DERIVADA' | 'ESTATICA' | 'EXTERNA';

export type StageId =
  | 'geometry' | 'load' | 'torque' | 'transmission' | 'efficiency' | 'locking'
  | 'body' | 'thread' | 'buckling' | 'wear' | 'kinematics' | 'sizing';

/** Resultado de evaluar una regla: un valor o un motivo de dominio inválido. */
export type RuleOutcome =
  | { ok: true;  value: number }
  | { ok: false; reason: string };     // texto para el usuario, sin referencias

/**
 * Una regla calcula `target` a partir de `inputs`. Varias reglas con el mismo
 * `target` son alternativas; gana la primera aplicable con datos completos
 * (orden de declaración = prioridad). Un target escrito por el usuario nunca se
 * sobrescribe.
 */
export interface Rule {
  id:      string;
  target:  DerivedId;
  stage:   StageId;
  inputs:  VarId[];
  /** Condición de configuración (rosca, apoyo, transmisión…). */
  applies?: (cfg: ProblemConfig) => boolean;
  /** `v` trae garantizados todos los `inputs` de la regla (unidades base). */
  compute: (v: Readonly<Record<VarId, number>>, cfg: ProblemConfig) => RuleOutcome;
  latex: {
    /** Ecuación general, p. ej. 'T_R=\\dfrac{F d_m}{2}\\cdots'. */
    general: (cfg: ProblemConfig) => string;
    /** Ecuación con valores sustituidos (en las unidades mostradas). */
    substituted: (v: Values, cfg: ProblemConfig, fmt: SubstFormatter) => string;
  };
  /** Supuesto visible para el usuario (sin referencias), p. ej. "carga en el primer filete". */
  note?:  string;
  /** Paso trivial (p. ej. F de trabajo = F dada): se calcula pero no se muestra en la traza. */
  hidden?: boolean;
  /** Si el usuario dio este dato, la regla no aplica (p. ej. no se calcula P necesaria si P es dato). */
  skipIfGiven?: InputId;
  origin: Origin;   // interno
  ref:    string;   // interno
}

/** Formatea un valor base en la unidad que el usuario está viendo, para la sustitución. */
export type SubstFormatter = (id: VarId, value: number) => string;

// ── Verificaciones ───────────────────────────────────────────────────────────

export type CheckStatus = 'ok' | 'fail' | 'warn' | 'pending' | 'na';

export interface CheckOutcome {
  status:       Exclude<CheckStatus, 'pending' | 'na'>;
  computed:     number;
  required:     number;
  /** Criterio en LaTeX, p. ej. 'n = S_y/\\sigma\\prime \\ge n_{obj}'. */
  criterion:    string;
  explanation:  string;
}

export interface CheckDef {
  id:      string;
  label:   string;
  inputs:  VarId[];
  /** Si no aplica, devuelve el motivo (p. ej. "no aplica con carga en tensión"). */
  notApplicable?: (cfg: ProblemConfig, given: ReadonlySet<VarId>) => string | null;
  evaluate: (v: Readonly<Record<VarId, number>>, cfg: ProblemConfig) => CheckOutcome;
  origin: Origin;
  ref:    string;
}

// ── Etapas de transmisión (extensibles) ──────────────────────────────────────

/**
 * Cada mecanismo de entrada aporta sus campos y sus reglas (directas e inversas).
 * Agregar un mecanismo = un archivo nuevo en engine/transmission/, sin tocar el solver.
 */
export interface TransmissionStage {
  id:     Transmission;
  label:  string;
  inputs: InputId[];
  rules:  Rule[];
  checks: CheckDef[];
}

// ── Estado de entrada y resultado del motor ──────────────────────────────────

/** Valor escrito por el usuario: número en la unidad elegida. */
export interface EnteredValue {
  value: number;
  unit:  string;     // id de UnitDef
  /** De dónde salió el valor, si no lo escribió el usuario (p. ej. 'Par acero/bronce'). */
  source?: string;
}

export type EnteredInputs = Partial<Record<InputId, EnteredValue>>;

export interface ConversionNote {
  id:   InputId;
  from: EnteredValue;
  to:   EnteredValue;  // en unidad base
}

export interface StepResult {
  ruleId:      string;
  target:      DerivedId;
  stage:       StageId;
  value:       number;          // base
  general:     string;          // LaTeX
  substituted: string;          // LaTeX
  inputsUsed:  VarId[];
  note?:       string;
  hidden?:     boolean;
}

export interface PendingResult {
  target:  DerivedId;
  stage:   StageId;
  /** Entradas mínimas que faltan (camino más corto entre alternativas). */
  missing: InputId[];
  /** Si otra alternativa tenía datos pero falló por dominio, por qué (p. ej. rosca trabada). */
  reason?: string;
}

export interface BlockedResult {
  target: DerivedId;
  stage:  StageId;
  reason: string;               // dominio inválido: explica qué pasa y cómo arreglarlo
}

export interface CheckResult {
  id:      string;
  label:   string;
  status:  CheckStatus;
  outcome?: CheckOutcome;
  missing?: InputId[];
  reason?:  string;             // para 'na'
}

export interface InputIssue {
  id:       InputId;
  severity: 'error' | 'warning';
  message:  string;
}

export interface EngineResult {
  values:      Values;
  steps:       StepResult[];
  pending:     PendingResult[];
  blocked:     BlockedResult[];
  checks:      CheckResult[];
  conversions: ConversionNote[];
  issues:      InputIssue[];
  /** Próximos datos útiles, ordenados por cuántos resultados desbloquean. */
  suggestions: { id: InputId; unlocks: number }[];
}
