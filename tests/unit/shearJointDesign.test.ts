/**
 * Diseño iterativo de juntas a cortante — barrido perno × grado.
 */
import { describe, it, expect } from 'vitest';
import { sweepShearJoint } from '@/modules/shearJoint/design';
import type { ShearJointSweepBase } from '@/modules/shearJoint/design';
import type { ThreadData } from '@/utils/threadTables';
import type { MaterialData } from '@/utils/materialDatabase';

// Subconjunto de la tabla ISO (Shigley Tab. 8-2).
const THREADS: ThreadData[] = [
  { nominal: 'M8',  pitch: 1.25, dM: 8.0,  dm: 7.188,  dr: 6.466,  At: 36.6, Ar: 32.8 },
  { nominal: 'M12', pitch: 1.75, dM: 12.0, dm: 10.863, dr: 9.853,  At: 84.3, Ar: 76.3 },
  { nominal: 'M16', pitch: 2.00, dM: 16.0, dm: 14.701, dr: 13.546, At: 157,  Ar: 144 },
  { nominal: 'M24', pitch: 3.00, dM: 24.0, dm: 22.051, dr: 20.319, At: 353,  Ar: 324 },
];

const GRADES: MaterialData[] = [
  { grade: '4.8',  designation: 'ISO 4.8',  Sut: 420,  Sy: 340,  Sp: 310, Se: 140, E: 207 },
  { grade: '10.9', designation: 'ISO 10.9', Sut: 1040, Sy: 940,  Sp: 830, Se: 214, E: 207 },
];

const base: ShearJointSweepBase = {
  bolts: [
    { id: 'A', x:  0, y:  40 },
    { id: 'B', x:  0, y: -40 },
    { id: 'C', x: 80, y:  40 },
    { id: 'D', x: 80, y: -40 },
  ],
  doubleShear:    false,
  V:              40000,
  Vx:             0,
  Vy:            -1,
  applicationX:   300,
  applicationY:   0,
  plateThickness: 12,
  plateSy:        370,
  plateSut:       440,
  plateWidth:     160,
  unitSystem:     'SI',
};

describe('sweepShearJoint', () => {
  it('genera un candidato por cada combinación perno × grado', () => {
    const r = sweepShearJoint(base, THREADS, GRADES, 2);
    expect(r.candidates.length).toBe(THREADS.length * GRADES.length);
  });

  it('ordena por diámetro ascendente', () => {
    const r = sweepShearJoint(base, THREADS, GRADES, 2);
    const dias = r.candidates.map(c => c.dM);
    expect(dias).toEqual([...dias].sort((a, b) => a - b));
  });

  it('recomienda el menor perno viable', () => {
    const targetN = 2;
    const r = sweepShearJoint(base, THREADS, GRADES, targetN);
    const viables = r.candidates.filter(c => c.viable);
    if (viables.length) {
      const minViableDia = Math.min(...viables.map(c => c.dM));
      const rec = r.candidates.find(c => c.key === r.recommendedKey)!;
      expect(rec.viable).toBe(true);
      expect(rec.dM).toBe(minViableDia);
      expect(rec.n).toBeGreaterThanOrEqual(targetN);
    }
  });

  it('areaMode "shank" (πd²/4) da mayor área que "thread" (At) y no reduce n cortante', () => {
    const th = sweepShearJoint(base, THREADS, GRADES, 2, 'thread');
    const sh = sweepShearJoint(base, THREADS, GRADES, 2, 'shank');
    // πd²/4 > At para M16 → menor τ → mayor nBoltShear en el mismo perno/grado.
    const key = 'M16 | 10.9';
    const a = th.candidates.find(c => c.key === key)!;
    const b = sh.candidates.find(c => c.key === key)!;
    expect(b.nBoltShear).toBeGreaterThan(a.nBoltShear);
  });

  it('sin combinación viable → recommendedKey undefined', () => {
    const r = sweepShearJoint(base, THREADS, GRADES, 1000);
    expect(r.recommendedKey).toBeUndefined();
  });
});
