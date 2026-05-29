import type { TensionJointInput } from './types';

export interface ValidationError {
  field:    string;
  message:  string;
  severity: 'error' | 'warning';
}

export function validateTensionJoint(i: Partial<TensionJointInput>): ValidationError[] {
  const e: ValidationError[] = [];
  if (!i.boltDiameter || i.boltDiameter <= 0)  e.push({ field: 'boltDiameter', message: 'Ingrese d > 0', severity: 'error' });
  if (!i.pitch || i.pitch <= 0)                e.push({ field: 'pitch',        message: 'Ingrese paso p > 0', severity: 'error' });
  if (!i.tensileArea || i.tensileArea <= 0)    e.push({ field: 'tensileArea',  message: 'Ingrese At > 0 (tabla)', severity: 'error' });
  if (!i.grip || i.grip <= 0)                  e.push({ field: 'grip',         message: 'Ingrese longitud de agarre l', severity: 'error' });
  if (!i.grade || !i.grade.Sp)                 e.push({ field: 'grade',        message: 'Seleccione grado del perno', severity: 'error' });
  if (!i.memberE || i.memberE <= 0)            e.push({ field: 'memberE',      message: 'Ingrese E del elemento', severity: 'error' });
  if (i.K == null || i.K <= 0)                 e.push({ field: 'K',            message: 'Ingrese factor K (≈0.20)', severity: 'error' });
  if (!i.externalLoad || i.externalLoad <= 0)  e.push({ field: 'externalLoad', message: 'Ingrese carga externa P > 0', severity: 'error' });
  if (i.loadType === 'fatigue') {
    if (i.Pmax == null)                        e.push({ field: 'Pmax', message: 'Ingrese Pmax', severity: 'error' });
    if (i.Pmin == null)                        e.push({ field: 'Pmin', message: 'Ingrese Pmin', severity: 'error' });
  }
  if (i.grip && i.boltDiameter) {
    const r = i.grip / i.boltDiameter;
    if (r < 1 || r > 16)
      e.push({ field: 'grip', message: `l/d = ${r.toFixed(2)} fuera del rango de Wileman (1–16)`, severity: 'warning' });
  }
  return e;
}
