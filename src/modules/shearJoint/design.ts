/**
 * Diseño iterativo de juntas atornilladas a cortante — Shigley §8-12.
 *
 * Barre {tamaños de perno estándar} × {grados} reutilizando `ShearJointCalculator`
 * y rankea para recomendar el MENOR perno que cumple el factor de seguridad
 * gobernante objetivo (mínimo entre cortante, aplastamiento y área neta).
 *
 * Las tablas se reciben como argumentos para que la función sea pura, testeable
 * sin `fetch` y ejecutable dentro del Web Worker.
 */

import { ShearJointCalculator } from './calculations';
import type { ShearJointInput } from './types';
import type { ThreadData } from '@/utils/threadTables';
import type { MaterialData } from '@/utils/materialDatabase';

/** Datos fijos: todo `ShearJointInput` salvo lo que barre el diseño (perno + grado). */
export type ShearJointSweepBase =
  Omit<ShearJointInput, 'boltDiameter' | 'shearArea' | 'boltSp' | 'boltSy' | 'boltSut'>;

export type ShearAreaMode = 'thread' | 'shank';

export interface ShearJointCandidate {
  key:        string;   // "M16 | ISO 8.8 (>M16)"
  nominal:    string;
  dM:         number;   // mm
  gradeName:  string;
  Sp:         number;   // MPa
  n:          number;   // factor de seguridad gobernante
  nBoltShear: number;
  nBearing:   number;
  nNet?:      number;
  governing:  string;   // criterio que gobierna
  viable:     boolean;
}

export interface ShearJointSweepResult {
  candidates:      ShearJointCandidate[];
  recommendedKey?: string;
  targetN:         number;
  threadStandard:  string;
  areaMode:        ShearAreaMode;
}

/**
 * Ejecuta el barrido perno × grado.
 * @param base      Datos fijos (patrón, carga, placa…).
 * @param threads   Tabla de pernos a barrer (ISO o UNC).
 * @param grades    Grados/clases candidatos (Sp, Sy, Sut del perno).
 * @param targetN   Factor de seguridad gobernante mínimo deseado.
 * @param areaMode  'thread' → usa At (roscas en plano de corte); 'shank' → πd²/4.
 * @param threadStandard  Etiqueta informativa de la tabla usada.
 */
export function sweepShearJoint(
  base: ShearJointSweepBase,
  threads: ThreadData[],
  grades: MaterialData[],
  targetN: number,
  areaMode: ShearAreaMode = 'thread',
  threadStandard = 'iso',
): ShearJointSweepResult {
  const candidates: ShearJointCandidate[] = [];

  for (const th of threads) {
    const shearArea = areaMode === 'thread' ? th.At : (Math.PI * th.dM * th.dM) / 4;
    for (const g of grades) {
      if (!g || !(g.Sp > 0)) continue;
      try {
        const res = new ShearJointCalculator({
          ...base,
          boltDiameter: th.dM,
          shearArea,
          boltSp:  g.Sp,
          boltSy:  g.Sy,
          boltSut: g.Sut,
        }).calculate();

        const n = res.verdict.safetyFactor;
        if (n == null || !Number.isFinite(n)) continue;

        candidates.push({
          key:        `${th.nominal} | ${g.grade}`,
          nominal:    th.nominal,
          dM:         th.dM,
          gradeName:  g.grade,
          Sp:         g.Sp,
          n,
          nBoltShear: res.nBoltShear,
          nBearing:   res.nBearing,
          nNet:       res.nNet,
          governing:  res.verdict.governing,
          viable:     n >= targetN,
        });
      } catch {
        /* combinación inválida — se omite */
      }
    }
  }

  candidates.sort((a, b) => (a.dM - b.dM) || (b.n - a.n));
  const recommended = candidates.find(c => c.viable);

  return {
    candidates,
    recommendedKey: recommended?.key,
    targetN,
    threadStandard,
    areaMode,
  };
}
