/** Generadores compartidos para las pruebas por propiedades del motor. */

import fc from 'fast-check';
import type { ProblemConfig } from '@/features/powerScrew/engine/types';

export const arbConfig: fc.Arbitrary<ProblemConfig> = fc.record({
  thread:       fc.constantFrom('square', 'acme'),
  transmission: fc.constantFrom('direct', 'lever', 'reducer'),
  thrust:       fc.constantFrom('none', 'collar', 'bearing'),
  load:         fc.constantFrom('compression', 'tension'),
  goal:         fc.constantFrom('analyze', 'capacity', 'drive', 'size', 'lead'),
  bodyTorque:   fc.constantFrom('total', 'threadOnly'),
  leverHands:   fc.constantFrom(1, 2),
  pbPolicy:     fc.constantFrom('conservative', 'interpolate'),
  manualDrive:  fc.boolean(),
  requireSelfLock: fc.boolean(),
}) as fc.Arbitrary<ProblemConfig>;
