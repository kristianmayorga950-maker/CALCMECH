/**
 * Junta atornillada a tensión — Norton §11 + Shigley 9ª ed., §8-3 a §8-11.
 *
 * Caso base: perno ISO M10×1.5 clase 8.8, grip l = 30 mm con vástago de 12 mm
 * sin rosca y 18 mm roscados, elementos de acero (Wileman A=0.78715, B=0.62873).
 *
 * Validación Cornwell: Norton Ejemplo 11-4
 *   d = 10 mm, l = 50 mm → j = 0.20
 *   Placa inferior: aluminio E = 71.7 GPa → rL = 71.7/207 = 0.3464
 *   Placa superior: acero   E = 207 GPa  → rH = 207/207 = 1.0
 *   TL = 30 mm, TH = 20 mm → t = 30/50 = 0.60
 *   CL ≈ 0.321, CH ≈ 0.147 → C = CL + t*(CH-CL) = 0.321 + 0.6*(0.147-0.321) = 0.217
 *   (Norton Tabla 11-8, j=0.20)
 */

import { describe, it, expect } from 'vitest';
import {
  boltStiffness,
  memberStiffnessWileman,
  cornwellJointC,
  gasketStiffness,
  jointConstantC,
  wrenchTorque,
  fatigueSa,
  TensionJointCalculator,
} from '@/modules/tensionJoint/calculations';
import type { TensionJointInput, BoltGrade, CornwellPlate } from '@/modules/tensionJoint/types';

const ISO_8_8: BoltGrade = {
  designation: 'ISO 8.8',
  Sut: 830, Sy: 660, Sp: 600, Se: 129, E: 207,
};

// ─── kb ───────────────────────────────────────────────────────────────────────

describe('§8-4 — Rigidez del perno (Eq. 8-17)', () => {
  it('kb = (Ad·At·E)/(Ad·lt + At·ld) para grip mixto', () => {
    const d = 12, At = 84.3, ld = 12, lt = 18, E_MPa = 207 * 1000;
    const Ad = (Math.PI / 4) * d * d;
    const expected = (Ad * At * E_MPa) / (Ad * lt + At * ld);
    expect(boltStiffness(d, At, ld, lt, E_MPa)).toBeCloseTo(expected, 3);
  });

  it('caso ld = 0 (perno totalmente roscado) degenera a At·E/lt', () => {
    const d = 10, At = 58, lt = 25, E_MPa = 207 * 1000;
    expect(boltStiffness(d, At, 0, lt, E_MPa)).toBeCloseTo((At * E_MPa) / lt, 6);
  });
});

// ─── km Wileman ──────────────────────────────────────────────────────────────

describe('§8-5 — Rigidez del elemento (Wileman, Eq. 8-23)', () => {
  it('km = E·d·A·exp(B·d/l) — acero estructural', () => {
    const E_MPa = 207 * 1000, d = 12, l = 30, A = 0.78715, B = 0.62873;
    const expected = E_MPa * d * A * Math.exp((B * d) / l);
    expect(memberStiffnessWileman(E_MPa, d, l, A, B)).toBeCloseTo(expected, 3);
  });

  it('km crece con d y decrece con l (comportamiento esperado)', () => {
    const E_MPa = 207 * 1000;
    const km1 = memberStiffnessWileman(E_MPa, 12, 30, 0.78715, 0.62873);
    const km2 = memberStiffnessWileman(E_MPa, 16, 30, 0.78715, 0.62873);
    const km3 = memberStiffnessWileman(E_MPa, 12, 60, 0.78715, 0.62873);
    expect(km2).toBeGreaterThan(km1);
    expect(km3).toBeLessThan(km1);
  });
});

// ─── Método Cornwell ──────────────────────────────────────────────────────────

describe('Norton §11.8 — Método de Cornwell (Tabla 11-8)', () => {
  const Eb_GPa = 207;   // acero — módulo del perno

  it('mismo material (acero-acero): C entre 0 y 1 y decrece con j', () => {
    const plates: CornwellPlate[] = [{ E_GPa: 207, thickness: 25 }];
    const c1 = cornwellJointC(10, 50, Eb_GPa, plates);   // j = 0.20
    const c2 = cornwellJointC(10, 20, Eb_GPa, plates);   // j = 0.50
    expect(c1.C_metal).toBeGreaterThan(0);
    expect(c1.C_metal).toBeLessThan(1);
    // Mayor j → perno más corto/grueso → mayor C
    expect(c2.C_metal).toBeGreaterThan(c1.C_metal);
  });

  it('j fuera del rango de tabla: clampea al extremo correspondiente', () => {
    // j < 0.10 clampea a j = 0.10
    const plates: CornwellPlate[] = [{ E_GPa: 207, thickness: 5000 }]; // j ≈ 0
    const cLow = cornwellJointC(10, 5000, Eb_GPa, plates);
    // j > 2.00 clampea a j = 2.00
    const cHigh = cornwellJointC(10, 4, Eb_GPa, plates);
    expect(cLow.C_metal).toBeGreaterThan(0);
    expect(cHigh.C_metal).toBeGreaterThan(0);
  });

  it('Tabla 11-8, j=0.20: coeficientes producen C_metal razonable para acero-acero', () => {
    // j = 0.20, r = 1.0 (acero/acero)
    // Ecuación: Cr = p3*(1)^3 + p2*(1)^2 + p1*(1) + p0
    // = -0.3806 + 1.0875 + (-1.1715) + 0.6118 = 0.1472
    const plates: CornwellPlate[] = [{ E_GPa: 207, thickness: 25 }];
    const cw = cornwellJointC(10, 50, Eb_GPa, plates);
    expect(cw.j).toBeCloseTo(0.2, 6);
    expect(cw.C_metal).toBeCloseTo(0.147, 2);
  });

  it('Norton Ej 11-4: dos materiales aluminio+acero → C ≈ 0.217 (±0.02)', () => {
    // Placa inferior: aluminio E=71.7 GPa, TL=30mm
    // Placa superior: acero   E=207 GPa,  TH=20mm
    // j = d/l = 10/50 = 0.20
    // rL = 71.7/207 ≈ 0.3464, rH = 1.0
    // t = 30/50 = 0.60
    const plates: CornwellPlate[] = [
      { E_GPa: 71.7, thickness: 30, label: 'Aluminio (inferior)' },
      { E_GPa: 207,  thickness: 20, label: 'Acero (superior)' },
    ];
    const cw = cornwellJointC(10, 50, Eb_GPa, plates);
    expect(cw.j).toBeCloseTo(0.20, 4);
    expect(cw.t).toBeCloseTo(0.60, 4);
    expect(cw.rL).toBeCloseTo(71.7 / 207, 3);
    expect(cw.rH).toBeCloseTo(1.0, 4);
    // CL para rL=0.3464, j=0.20
    // = -0.3806*(0.3464)^3 + 1.0875*(0.3464)^2 + (-1.1715)*(0.3464) + 0.6118
    const rL = 71.7 / 207;
    const p = [0.6118, -1.1715, 1.0875, -0.3806] as [number,number,number,number];
    const CL_expected = p[3]*rL**3 + p[2]*rL**2 + p[1]*rL + p[0];
    expect(cw.CL).toBeCloseTo(CL_expected, 4);
    // CH para rH=1.0: = -0.3806 + 1.0875 - 1.1715 + 0.6118 = 0.1472
    expect(cw.CH).toBeCloseTo(0.147, 2);
    // C = CL + 0.6*(CH - CL)
    const C_expected = cw.CL + 0.6 * (cw.CH - cw.CL);
    expect(cw.C_metal).toBeCloseTo(C_expected, 4);
    // Valor aproximado del ejemplo del libro
    expect(cw.C_metal).toBeGreaterThan(0.19);
    expect(cw.C_metal).toBeLessThan(0.26);
  });

  it('C_metal es mayor para materiales más blandos (aluminio < acero en r)', () => {
    const platesAl: CornwellPlate[] = [{ E_GPa: 71.7, thickness: 25 }];  // r≈0.35
    const platesSteel: CornwellPlate[] = [{ E_GPa: 207, thickness: 25 }]; // r=1.0
    const cwAl    = cornwellJointC(10, 50, Eb_GPa, platesAl);
    const cwSteel = cornwellJointC(10, 50, Eb_GPa, platesSteel);
    // Material más blando → C_metal mayor (el perno toma más carga relativa)
    expect(cwAl.C_metal).toBeGreaterThan(cwSteel.C_metal);
  });
});

// ─── kg empaque ───────────────────────────────────────────────────────────────

describe('Norton §11.8 — Rigidez del empaque (gasketStiffness)', () => {
  it('kg = Ag·Eg/tg', () => {
    const Ag = 500, Eg = 350, tg = 3;  // Teflon
    expect(gasketStiffness(Ag, Eg, tg)).toBeCloseTo((500 * 350) / 3, 4);
  });

  it('tg = 0 devuelve Infinity', () => {
    expect(gasketStiffness(500, 350, 0)).toBe(Infinity);
  });
});

// ─── C = kb/(kb+km) ───────────────────────────────────────────────────────────

describe('§8-7 — Constante de rigidez de la junta', () => {
  it('C = kb/(kb+km) siempre entre 0 y 1', () => {
    expect(jointConstantC(1e5, 4e5)).toBeCloseTo(0.2, 6);
    expect(jointConstantC(1, 0)).toBe(1);
    const C = jointConstantC(1e5, 3e5);
    expect(C).toBeGreaterThan(0);
    expect(C).toBeLessThan(1);
  });
});

// ─── Par de apriete ───────────────────────────────────────────────────────────

describe('§8-8 — Par de apriete (Eq. 8-27)', () => {
  it('T = K·Fi·d  → N·m con d en mm', () => {
    expect(wrenchTorque(0.20, 40000, 12)).toBeCloseTo(96, 6);
  });
});

// ─── Fatiga ───────────────────────────────────────────────────────────────────

describe('§8-11 — Sa por criterio de fatiga', () => {
  const Sut = 830, Sy = 660, Se = 129, sigma_i = 200;

  it('Goodman: Sa = Se(Sut − σi)/(Sut + Se)', () => {
    const expected = (Se * (Sut - sigma_i)) / (Sut + Se);
    expect(fatigueSa('goodman', Se, Sut, Sy, sigma_i)).toBeCloseTo(expected, 6);
  });

  it('ASME-elíptica: satisface (Sa/Se)² + ((Sa+σi)/Sy)² = 1', () => {
    const Sa = fatigueSa('asme_elliptic', Se, Sut, Sy, sigma_i);
    const check = (Sa / Se) ** 2 + ((Sa + sigma_i) / Sy) ** 2;
    expect(check).toBeCloseTo(1, 3);
  });

  it('Sa Goodman > 0 y Sa ASME > 0', () => {
    expect(fatigueSa('goodman',       Se, Sut, Sy, sigma_i)).toBeGreaterThan(0);
    expect(fatigueSa('asme_elliptic', Se, Sut, Sy, sigma_i)).toBeGreaterThan(0);
  });
});

// ─── TensionJointCalculator — flujo completo ─────────────────────────────────

describe('TensionJointCalculator — flujo completo (Cornwell)', () => {
  const baseInput: TensionJointInput = {
    boltDiameter:           10,
    pitch:                  1.5,
    tensileArea:            58,
    grade:                  ISO_8_8,
    grip:                   30,
    unthreadedLengthInGrip: 12,
    threadedLengthInGrip:   18,
    memberMaterial:         'steel',
    memberE:                207,
    kmMethod:               'cornwell',
    cornwellPlates: [{ E_GPa: 207, thickness: 30, label: 'Acero' }],
    permanence:             'reusable',
    K:                      0.20,
    externalLoad:           8000,
    loadType:               'static',
    unitSystem:             'SI',
  };

  it('calcula rigideces y constante C con Cornwell', () => {
    const res = new TensionJointCalculator(baseInput).calculate();
    expect(res.stiffness.kb).toBeGreaterThan(0);
    expect(res.stiffness.km).toBeGreaterThan(0);
    expect(res.stiffness.C).toBeGreaterThan(0);
    expect(res.stiffness.C).toBeLessThan(1);
    expect(res.stiffness.cornwell).toBeDefined();
    expect(res.stiffness.cornwell!.j).toBeCloseTo(10 / 30, 4);
  });

  it('Fp = At·Sp y Fi = 0.75 Fp en junta reutilizable', () => {
    const res = new TensionJointCalculator(baseInput).calculate();
    const Fp = baseInput.tensileArea * ISO_8_8.Sp;
    expect(res.staticLoad.Fp).toBeCloseTo(Fp, 3);
    expect(res.staticLoad.Fi).toBeCloseTo(0.75 * Fp, 3);
    expect(res.staticLoad.FiMethod).toMatch(/0.75/);
  });

  it('junta permanente usa 0.90 Fp', () => {
    const res = new TensionJointCalculator(
      { ...baseInput, permanence: 'permanent' },
    ).calculate();
    expect(res.staticLoad.Fi).toBeCloseTo(0.90 * res.staticLoad.Fp, 3);
  });

  it('Fb = C·P + Fi  y  np = (Sp·At − Fi)/(C·P)  (Ec. 8-29)', () => {
    const res = new TensionJointCalculator(baseInput).calculate();
    const C  = res.stiffness.C;
    const Fi = res.staticLoad.Fi;
    const P  = baseInput.externalLoad;
    expect(res.staticLoad.Fb).toBeCloseTo(C * P + Fi, 3);
    expect(res.staticLoad.np).toBeCloseTo(
      (ISO_8_8.Sp * baseInput.tensileArea - Fi) / (C * P), 3,
    );
    expect(res.staticLoad.np_proof).toBeCloseTo(
      (ISO_8_8.Sp * baseInput.tensileArea) / (C * P + Fi), 3,
    );
  });

  it('fatiga exige Pmin y Pmax', () => {
    const fatInput: TensionJointInput = {
      ...baseInput,
      loadType: 'fatigue',
      Pmin: 0,
      Pmax: 8000,
      fatigueCriterion: 'goodman',
    };
    const res = new TensionJointCalculator(fatInput).calculate();
    expect(res.fatigue).toBeDefined();
    expect(res.fatigue!.sigma_a).toBeGreaterThan(0);
    expect(res.fatigue!.nf).toBeGreaterThan(0);
  });

  it('lanza si faltan datos', () => {
    const bad: any = { ...baseInput, tensileArea: 0 };
    expect(() => new TensionJointCalculator(bad).calculate()).toThrow(/Faltan datos/);
  });

  it('lanza si cornwellPlates vacío cuando kmMethod=cornwell', () => {
    const bad: any = { ...baseInput, cornwellPlates: [] };
    expect(() => new TensionJointCalculator(bad).calculate()).toThrow(/Cornwell/);
  });

  it('empaque no confinado: C_eff < C_metal y stiffness.kg definido', () => {
    const withGasket: TensionJointInput = {
      ...baseInput,
      hasGasket:          true,
      gasketType:         'unconfined',
      gasketArea:         500,
      gasketEg_MPa:       0.01 * 1000,   // caucho plano 0.01 GPa → 10 MPa
      gasketThickness_mm: 3,
      gasketLoadFactor:   2,
    };
    const res = new TensionJointCalculator(withGasket).calculate();
    expect(res.stiffness.kg).toBeDefined();
    expect(res.stiffness.kg!).toBeGreaterThan(0);
    // kg en serie ablanda el sistema → C_eff ≥ C_metal
    expect(res.stiffness.C).toBeGreaterThanOrEqual(res.stiffness.C_metal!);
    expect(res.gasket).toBeDefined();
    expect(res.gasket!.gasketType).toBe('unconfined');
  });

  it('empaque confinado: stiffness.C = C_metal (kg no en serie)', () => {
    const withConfinedGasket: TensionJointInput = {
      ...baseInput,
      hasGasket:       true,
      gasketType:      'confined',
      gasketArea:      500,
      gasketLoadFactor: 2,
    };
    const res = new TensionJointCalculator(withConfinedGasket).calculate();
    expect(res.stiffness.kg).toBeUndefined();
    expect(res.stiffness.C).toBeCloseTo(res.stiffness.C_metal!, 6);
  });
});
