/**
 * Diseño iterativo de tornillos de potencia — barrido cuerda × material.
 */
import { describe, it, expect } from 'vitest';
import { sweepPowerScrew } from '@/modules/powerScrew/design';
import type { PowerScrewSweepBase } from '@/modules/powerScrew/design';
import type { ThreadData } from '@/utils/threadTables';
import type { PowerScrewMaterial } from '@/modules/powerScrew/types';

// Subconjunto de la tabla Acme (Shigley Tab. 8-3).
const THREADS: ThreadData[] = [
  { nominal: '1/2',   tpi: 10, pitch: 2.540, dM: 12.700, dm: 11.430, dr: 10.160, At: 81.07,  Ar: 81.07 },
  { nominal: '1',     tpi: 5,  pitch: 5.080, dM: 25.400, dm: 22.860, dr: 20.320, At: 324.3,  Ar: 324.3 },
  { nominal: '1-1/2', tpi: 4,  pitch: 6.350, dM: 38.100, dm: 34.925, dr: 31.750, At: 791.7,  Ar: 791.7 },
  { nominal: '2',     tpi: 4,  pitch: 6.350, dM: 50.800, dm: 47.625, dr: 44.450, At: 1552.0, Ar: 1552.0 },
];

const MATERIALS: PowerScrewMaterial[] = [
  { name: 'Acero suave (1020 HR)',   Sy: 210, Sut: 380, E: 207 },
  { name: 'Acero endurecido (4140)', Sy: 655, Sut: 895, E: 207 },
];

const base: PowerScrewSweepBase = {
  threadType:          'acme',
  numberOfStarts:      1,
  axialLoad:           50000,    // N — carga alta para forzar fallos en cuerdas pequeñas
  frictionCoefficient: 0.08,
  hasCollar:           false,
  engagedThreads:      2,
  unitSystem:          'SI',
};

describe('sweepPowerScrew', () => {
  it('genera un candidato por cada combinación cuerda × material', () => {
    const r = sweepPowerScrew(base, THREADS, MATERIALS, 2);
    expect(r.candidates.length).toBe(THREADS.length * MATERIALS.length);
  });

  it('ordena por diámetro ascendente', () => {
    const r = sweepPowerScrew(base, THREADS, MATERIALS, 2);
    const dias = r.candidates.map(c => c.dM);
    const sorted = [...dias].sort((a, b) => a - b);
    expect(dias).toEqual(sorted);
  });

  it('marca viable = n >= targetN y recomienda el menor viable', () => {
    const targetN = 2;
    const r = sweepPowerScrew(base, THREADS, MATERIALS, targetN);
    // Todos los viables cumplen el umbral.
    for (const c of r.candidates) expect(c.viable).toBe(c.n >= targetN);
    // El recomendado es el primer viable y tiene el menor dM entre los viables.
    const viables = r.candidates.filter(c => c.viable);
    if (viables.length) {
      const minViableDia = Math.min(...viables.map(c => c.dM));
      const rec = r.candidates.find(c => c.key === r.recommendedKey)!;
      expect(rec.viable).toBe(true);
      expect(rec.dM).toBe(minViableDia);
    }
  });

  it('subir el factor objetivo empuja el recomendado a un diámetro mayor o igual', () => {
    const lo = sweepPowerScrew(base, THREADS, MATERIALS, 1.5);
    const hi = sweepPowerScrew(base, THREADS, MATERIALS, 4);
    const dLo = lo.candidates.find(c => c.key === lo.recommendedKey)?.dM ?? Infinity;
    const dHi = hi.candidates.find(c => c.key === hi.recommendedKey)?.dM ?? Infinity;
    expect(dHi).toBeGreaterThanOrEqual(dLo);
  });

  it('sin combinación viable → recommendedKey undefined', () => {
    const r = sweepPowerScrew(base, THREADS, MATERIALS, 1000);
    expect(r.recommendedKey).toBeUndefined();
    expect(r.candidates.every(c => !c.viable)).toBe(true);
  });
});
