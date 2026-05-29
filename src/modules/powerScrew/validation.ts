import type { PowerScrewInput } from './types';

export interface ValidationError {
  field:    string;
  message:  string;
  severity: 'error' | 'warning';
}

export function validatePowerScrewInput(input: Partial<PowerScrewInput>): ValidationError[] {
  const errs: ValidationError[] = [];

  if (!input.majorDiameter || input.majorDiameter <= 0)
    errs.push({ field: 'majorDiameter', message: 'Ingrese d > 0', severity: 'error' });
  if (!input.pitch || input.pitch <= 0)
    errs.push({ field: 'pitch', message: 'Ingrese paso p > 0', severity: 'error' });
  if (input.majorDiameter && input.pitch && input.pitch >= input.majorDiameter)
    errs.push({ field: 'pitch', message: 'p debe ser menor que d', severity: 'error' });
  if (!input.axialLoad || input.axialLoad <= 0)
    errs.push({ field: 'axialLoad', message: 'Ingrese carga F > 0', severity: 'error' });
  if (input.frictionCoefficient == null || input.frictionCoefficient <= 0)
    errs.push({ field: 'frictionCoefficient', message: 'Ingrese coef. fricción f > 0', severity: 'error' });
  if (input.frictionCoefficient != null && (input.frictionCoefficient < 0.05 || input.frictionCoefficient > 0.30))
    errs.push({ field: 'frictionCoefficient', message: 'Rango típico 0.05–0.25 (§8-2)', severity: 'warning' });
  if (!input.engagedThreads || input.engagedThreads <= 0)
    errs.push({ field: 'engagedThreads', message: 'Ingrese nt ≥ 1', severity: 'error' });
  if (input.engagedThreads && input.engagedThreads > 15)
    errs.push({ field: 'engagedThreads', message: 'Shigley recomienda limitar a nt ≈ 10', severity: 'warning' });
  if (input.hasCollar && (!input.collarDiameter || input.collarDiameter <= 0))
    errs.push({ field: 'collarDiameter', message: 'Ingrese dc del collarín', severity: 'error' });
  if (input.hasCollar && input.collarFriction == null)
    errs.push({ field: 'collarFriction', message: 'Ingrese fc del collarín', severity: 'error' });

  return errs;
}
