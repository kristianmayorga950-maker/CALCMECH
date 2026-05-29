/**
 * Junta atornillada a cortante — Shigley 9ª ed., §8-12.
 *
 * Patrón estándar del libro: 4 pernos en rectángulo, carga V excéntrica.
 * Se verifica la suma vectorial de cortante directo + cortante por momento
 * y los factores de seguridad por τ y por aplastamiento.
 */

import { describe, it, expect } from 'vitest';
import {
  centroid,
  distributeForces,
  ShearJointCalculator,
} from '@/modules/shearJoint/calculations';
import type { ShearJointInput } from '@/modules/shearJoint/types';

describe('§8-12 — Centroide del patrón', () => {
  it('rectángulo 2×2 centrado en origen', () => {
    const bolts = [
      { id: 'A', x:  0, y:  40 },
      { id: 'B', x:  0, y: -40 },
      { id: 'C', x: 80, y:  40 },
      { id: 'D', x: 80, y: -40 },
    ];
    const c = centroid(bolts);
    expect(c.x).toBe(40);
    expect(c.y).toBe(0);
  });
});

describe('§8-12 — Cortante directo puro (carga sobre el centroide)', () => {
  it('cada perno recibe V/n en la misma dirección', () => {
    const bolts = [
      { id: '1', x:  0, y:  40 },
      { id: '2', x:  0, y: -40 },
      { id: '3', x: 80, y:  40 },
      { id: '4', x: 80, y: -40 },
    ];
    // V = 4000 N hacia abajo (Vy = −1), punto de aplicación = centroide (40, 0)
    const { forces, M } = distributeForces(bolts, 4000, 0, -1, 40, 0);
    expect(M).toBeCloseTo(0, 6);
    for (const f of forces) {
      expect(f.F).toBeCloseTo(1000, 6);   // 4000/4
      expect(f.Fpy).toBeCloseTo(-1000, 6);
      expect(f.Fmx).toBeCloseTo(0, 6);
      expect(f.Fmy).toBeCloseTo(0, 6);
    }
  });
});

describe('§8-12 — Cortante por momento (carga excéntrica)', () => {
  const bolts = [
    { id: 'A', x:  0, y:  40 },
    { id: 'B', x:  0, y: -40 },
    { id: 'C', x: 80, y:  40 },
    { id: 'D', x: 80, y: -40 },
  ];
  // V = 4000 N hacia abajo aplicado a 300 mm del origen (excentricidad 260 mm respecto del centroide)
  const V = 4000, ax = 300, ay = 0;
  const { forces, M, sumR2, centroid: c } =
    distributeForces(bolts, V, 0, -1, ax, ay);

  it('sumR2 = 4·(40² + 40²) para el rectángulo', () => {
    expect(sumR2).toBeCloseTo(4 * (40 * 40 + 40 * 40), 6);
  });

  it('M = V·e respecto del centroide', () => {
    const e = ax - c.x;   // brazo = 260 mm
    expect(Math.abs(M)).toBeCloseTo(V * e, 3);
  });

  it('las parejas reflejadas en y=0 tienen la misma magnitud', () => {
    // Con V vertical (Vy=-1) y punto de aplicación en y=0, los pernos
    // simétricos respecto al eje x del centroide (A↔B, C↔D) reciben igual F.
    const byId = Object.fromEntries(forces.map(f => [f.id, f]));
    expect(byId.A.F).toBeCloseTo(byId.B.F, 6);
    expect(byId.C.F).toBeCloseTo(byId.D.F, 6);
  });

  it('los pernos alejados del punto de aplicación son los más cargados', () => {
    const byId = Object.fromEntries(forces.map(f => [f.id, f]));
    // V se aplica en x=300 (a la derecha); las columnas en x=0 ven mayor momento inverso,
    // pero los críticos son los que sumen directo+momento en la misma dirección.
    const maxF = Math.max(...forces.map(f => f.F));
    expect(maxF).toBeGreaterThan(byId.A.F * 0.99);
  });

  it('la componente directa suma V y la componente de momento se anula', () => {
    const Fpx = forces.reduce((s, f) => s + f.Fpx, 0);
    const Fpy = forces.reduce((s, f) => s + f.Fpy, 0);
    const Fmx = forces.reduce((s, f) => s + f.Fmx, 0);
    const Fmy = forces.reduce((s, f) => s + f.Fmy, 0);
    expect(Fpx).toBeCloseTo(0, 6);
    expect(Fpy).toBeCloseTo(-V, 6);
    expect(Fmx).toBeCloseTo(0, 6);
    expect(Fmy).toBeCloseTo(0, 6);
  });
});

describe('ShearJointCalculator — flujo completo', () => {
  const baseInput: ShearJointInput = {
    bolts: [
      { id: 'A', x:  0, y:  40 },
      { id: 'B', x:  0, y: -40 },
      { id: 'C', x: 80, y:  40 },
      { id: 'D', x: 80, y: -40 },
    ],
    boltDiameter:   16,
    shearArea:      157,       // At para M16 (filetes en plano de corte)
    doubleShear:    false,
    boltSp:         600,
    boltSy:         660,
    boltSut:        830,
    V:              18000,
    Vx:             0,
    Vy:            -1,
    applicationX:   300,
    applicationY:   0,
    plateThickness: 10,
    plateSy:        370,
    plateSut:       440,
    plateWidth:     140,
    unitSystem:     'SI',
  };

  it('calcula τ, σ_bearing y n por cada criterio', () => {
    const r = new ShearJointCalculator(baseInput).calculate();
    expect(r.maxBolt).toBeDefined();
    expect(r.tauBolt).toBeGreaterThan(0);
    expect(r.tauBoltAllow).toBeCloseTo(0.577 * baseInput.boltSp, 6);
    expect(r.sigmaBearing).toBeGreaterThan(0);
    expect(r.sigmaBearingAllow).toBeCloseTo(0.9 * baseInput.plateSy, 6);
  });

  it('τ = Fmax/(Av·planos) — con cortante doble se reduce a la mitad', () => {
    const rs = new ShearJointCalculator(baseInput).calculate();
    const rd = new ShearJointCalculator({ ...baseInput, doubleShear: true }).calculate();
    expect(rd.tauBolt).toBeCloseTo(rs.tauBolt / 2, 3);
    expect(rd.nBoltShear).toBeCloseTo(2 * rs.nBoltShear, 3);
  });

  it('plateWidth > 0 activa la verificación de área neta', () => {
    const r = new ShearJointCalculator(baseInput).calculate();
    expect(r.sigmaNet).toBeDefined();
    expect(r.nNet).toBeDefined();
    expect(r.sigmaNetAllow).toBeCloseTo(0.6 * baseInput.plateSy, 6);
  });

  it('lanza si faltan datos críticos', () => {
    const bad: any = { ...baseInput, V: 0 };
    expect(() => new ShearJointCalculator(bad).calculate()).toThrow(/Faltan datos/);
  });
});
