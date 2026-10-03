/**
 * Flujo completo de los tres calculadores — Shigley 9ª ed., Cap. 8.
 *
 * Juntas: cada clase devuelve las secciones que consume ResultsPanel.
 * Tornillo de potencia: el motor progresivo (src/features/powerScrew) entrega
 * pasos, verificaciones y resultados completos con datos suficientes.
 */

import { describe, it, expect } from 'vitest';
import { ENGINE, DEFAULT_CONFIG, solve } from '@/features/powerScrew/engine';
import { TensionJointCalculator } from '@/modules/tensionJoint/calculations';
import { ShearJointCalculator }   from '@/modules/shearJoint/calculations';
import type { TensionJointInput } from '@/modules/tensionJoint/types';
import type { ShearJointInput }   from '@/modules/shearJoint/types';

describe('Power screw — §8-1/§8-2 (motor progresivo)', () => {
  it('con datos completos calcula todo y evalúa todas las verificaciones', () => {
    const r = solve(ENGINE, { ...DEFAULT_CONFIG, thrust: 'collar' }, {
      d: { value: 32, unit: 'mm' }, p: { value: 4, unit: 'mm' }, n: { value: 2, unit: 'count' },
      F: { value: 6.4, unit: 'kN' }, f: { value: 0.08, unit: '1' }, fc: { value: 0.08, unit: '1' }, dc: { value: 40, unit: 'mm' },
      Sy: { value: 290, unit: 'MPa' }, E: { value: 207, unit: 'GPa' }, nTarget: { value: 2, unit: '1' },
      Lcol: { value: 300, unit: 'mm' }, C: { value: 1, unit: '1' }, nt: { value: 4, unit: 'count' }, pb: { value: 11, unit: 'MPa' },
    });
    expect(r.values.l).toBe(8);
    expect(r.values.T).toBeGreaterThan(0);
    expect(r.values.vm).toBeGreaterThan(0);
    expect(r.issues).toEqual([]);
    expect(r.blocked).toEqual([]);
    expect(r.checks.filter(c => c.status === 'pending')).toEqual([]);
    expect(r.steps.every(s => s.general.length > 0)).toBe(true);
  });
});

describe('Tension joint — §8-3 a §8-11', () => {
  const input: TensionJointInput = {
    boltDiameter:           12,
    pitch:                  1.75,
    tensileArea:            84.3,
    grade: {
      designation: 'ISO 8.8', Sut: 830, Sy: 660, Sp: 600, Se: 129, E: 207,
    },
    grip:                   30,
    unthreadedLengthInGrip: 12,
    threadedLengthInGrip:   18,
    memberMaterial:         'steel',
    memberE:                207,
    wilemanA:               0.78715,
    wilemanB:               0.62873,
    kmMethod:               'wileman',
    permanence:             'reusable',
    K:                      0.20,
    externalLoad:           15000,
    loadType:               'static',
    unitSystem:             'SI',
  };

  it('entrega rigideces, cargas estáticas y veredicto', () => {
    const r = new TensionJointCalculator(input).calculate();
    expect(r.stiffness.kb).toBeGreaterThan(0);
    expect(r.stiffness.km).toBeGreaterThan(0);
    expect(r.stiffness.C).toBeGreaterThan(0);
    expect(r.staticLoad.Fp).toBeCloseTo(84.3 * 600, 3);
    expect(r.staticLoad.T).toBeGreaterThan(0);      // N·m
    expect(r.verdict.verdict).toMatch(/valid|marginal|invalid/);
    expect(r.calculations.C.ref).toBe('Eq. 8-24');
  });
});

describe('Shear joint — §8-12', () => {
  const input: ShearJointInput = {
    bolts: [
      { id: 'A', x:   0, y:  40 },
      { id: 'B', x:   0, y: -40 },
      { id: 'C', x:  80, y:  40 },
      { id: 'D', x:  80, y: -40 },
    ],
    boltDiameter:   16,
    shearArea:      157,
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

  it('distribuye fuerzas, calcula τ, aplastamiento y área neta', () => {
    const r = new ShearJointCalculator(input).calculate();
    expect(r.forces).toHaveLength(4);
    expect(r.maxBolt.F).toBeGreaterThan(0);
    expect(r.tauBolt).toBeGreaterThan(0);
    expect(r.sigmaBearing).toBeGreaterThan(0);
    expect(r.sigmaNet).toBeGreaterThan(0);
    expect(r.verdict.verdict).toMatch(/valid|marginal|invalid/);
  });
});
