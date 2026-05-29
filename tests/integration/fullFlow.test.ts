/**
 * Flujo completo de los tres calculadores — Shigley 9ª ed., Cap. 8.
 *
 * Verifica que cada clase devuelve un objeto con todas las secciones que la
 * UI (ResultsPanel) consume: geometría/áreas, esfuerzos/torques, indicadores,
 * recomendaciones, warnings y el mapa `calculations` con referencias.
 */

import { describe, it, expect } from 'vitest';
import { PowerScrewCalculator }   from '@/modules/powerScrew/calculations';
import { TensionJointCalculator } from '@/modules/tensionJoint/calculations';
import { ShearJointCalculator }   from '@/modules/shearJoint/calculations';
import type { PowerScrewInput }   from '@/modules/powerScrew/types';
import type { TensionJointInput } from '@/modules/tensionJoint/types';
import type { ShearJointInput }   from '@/modules/shearJoint/types';

describe('Power screw — §8-1/§8-2', () => {
  const input: PowerScrewInput = {
    threadType:          'acme',
    majorDiameter:       32,
    pitch:               4,
    numberOfStarts:      2,
    axialLoad:           6400,
    frictionCoefficient: 0.08,
    hasCollar:           true,
    collarDiameter:      40,
    collarFriction:      0.08,
    engagedThreads:      2,
    material:            { name: '1040 HR', Sy: 290, Sut: 520, E: 207 },
    unitSystem:          'SI',
  };

  it('devuelve el shape que consume la UI', () => {
    const r = new PowerScrewCalculator(input).calculate();
    expect(r.geometry.lead).toBe(8);
    expect(r.torques.Ttotal).toBeGreaterThan(0);
    expect(r.bodyStress.sigmaVonMises).toBeGreaterThan(0);
    expect(r.threadStress.bearing).toBeGreaterThan(0);
    expect(r.indicators.safetyFactorYield).toBeGreaterThan(0);
    expect(r.recommendations.length).toBeGreaterThan(0);
    expect(r.calculations.vm.unit).toBe('MPa');
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
