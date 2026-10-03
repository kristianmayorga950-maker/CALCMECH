/** Ensambla la definición del motor (reglas + verificaciones) y expone `solve`. */

import type { ProblemConfig } from './types';
import type { EngineDefinition } from './solver';
import { geometryRules } from './rules/geometry';
import { torqueRules, transmissionRules } from './rules/torque';
import { stressRules } from './rules/stress';
import { CHECKS } from './checks';

export const ENGINE: EngineDefinition = {
  rules:  [...geometryRules, ...transmissionRules, ...torqueRules, ...stressRules],
  checks: CHECKS,
};

export const DEFAULT_CONFIG: ProblemConfig = {
  thread: 'square',
  transmission: 'direct',
  thrust: 'none',
  load: 'compression',
  goal: 'analyze',
  bodyTorque: 'total',
  leverHands: 1,
  pbPolicy: 'conservative',
  manualDrive: false,
  requireSelfLock: false,
};

export { solve } from './solver';
export type { EngineDefinition } from './solver';
