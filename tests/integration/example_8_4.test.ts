/**
 * Verificación contra Shigley EJEMPLO 8-4 (9ª ed.)
 *
 * Enunciado:
 *   Recipiente a presión de hierro fundido grado 25. N pernos de cabeza
 *   hexagonal terminado, grado SAE 5, 5/8-11 UNC × 2-1/4 in.
 *   Fuerza de separación total = 36 kip. Pernos reutilizables.
 *
 * Respuestas (libro):
 *   kb = 5.21 Mlbf/in
 *   km = 8.81 Mlbf/in  (Ec. 8-23 Wileman, A=0.77871, B=0.61616 — hierro colado)
 *   C  ≈ 0.372 (Wileman) / 0.368 (Ec. 8-22 libro)
 *   Con N = 6 pernos y P = 6 kip/perno:
 *     np (Ec. 8-29) ≈ 2.18,  np_proof ≈ 1.16,  n0 ≈ 3.80
 */
import { describe, it, expect } from 'vitest';
import {
  boltStiffness,
  memberStiffnessWileman,
  TensionJointCalculator,
} from '@/modules/tensionJoint/calculations';
import type { TensionJointInput, BoltGrade } from '@/modules/tensionJoint/types';

const IN          = 25.4;
const LBF_TO_N    = 4.44822;
const KPSI_TO_MPA = 6.89476;
const toMlbfin    = (Nmm: number) => Nmm * IN / LBF_TO_N / 1e6;

// ── Datos del perno ─────────────────────────────────────────────────────
const d      = 0.625 * IN;                         // 15.875 mm
const At     = 0.226 * IN * IN;                    // 145.806 mm²
const p      = IN / 11;                            // paso UNC 11 hilos/in
const E_bolt = 207000;                             // MPa
const E_CI   = 14 * KPSI_TO_MPA * 1000;           // 14 Mpsi → MPa

const l_grip = 1.50 * IN;                         // 38.1 mm
const L      = 2.25 * IN;                         // 57.15 mm
const LT     = (2 * 0.625 + 0.25) * IN;           // 38.1 mm
const ld     = Math.min(L - LT, l_grip);           // 19.05 mm
const lt     = l_grip - ld;                       // 19.05 mm

const grade: BoltGrade = {
  designation: 'SAE 5 (≤1")',
  Sp:  85  * KPSI_TO_MPA,
  Sy:  92  * KPSI_TO_MPA,
  Sut: 120 * KPSI_TO_MPA,
  Se:  18.6 * KPSI_TO_MPA,
  E:   207,
};

const A_wil = 0.77871;
const B_wil = 0.61616;

const kb     = boltStiffness(d, At, ld, lt, E_bolt);
const km_wil = memberStiffnessWileman(E_CI, d, l_grip, A_wil, B_wil);

describe('Shigley EJEMPLO 8-4 — 5/8-11 UNC × 2-1/4, CI grado 25', () => {

  it('kb ≈ 5.21 Mlbf/in', () => {
    expect(toMlbfin(kb)).toBeCloseTo(5.21, 1);
  });

  it('km (Wileman) ≈ 8.81 Mlbf/in', () => {
    expect(toMlbfin(km_wil)).toBeCloseTo(8.81, 1);
  });

  it('C (Wileman) dentro del ±5 % de 0.368 (libro usa Ec. 8-22)', () => {
    const C = kb / (kb + km_wil);
    expect(Math.abs(C - 0.368) / 0.368).toBeLessThan(0.05);
  });

  describe('(b/c) Análisis estático completo — N = 6, P = 6 kip/perno', () => {
    const P_per_bolt = (36000 / 6) * LBF_TO_N;

    const input: TensionJointInput = {
      boltDiameter: d,
      pitch: p,
      tensileArea: At,
      grade,
      grip: l_grip,
      unthreadedLengthInGrip: ld,
      threadedLengthInGrip: lt,
      memberMaterial: 'cast_iron',
      memberE: E_CI / 1000,
      wilemanA: A_wil,
      wilemanB: B_wil,
      kmMethod: 'wileman',
      permanence: 'reusable',
      K: 0.20,
      externalLoad: P_per_bolt,
      loadType: 'static',
      unitSystem: 'imperial',
    };

    const r = new TensionJointCalculator(input).calculate();
    const Fp_kip = r.staticLoad.Fp / LBF_TO_N / 1000;
    const Fi_kip = r.staticLoad.Fi / LBF_TO_N / 1000;

    it('Fp ≈ 19.21 kip', () => expect(Fp_kip).toBeCloseTo(19.21, 1));
    it('Fi ≈ 14.4 kip',  () => expect(Fi_kip).toBeCloseTo(14.41, 1));
    it('np (Ec. 8-29) ≈ 2.18', () => expect(r.staticLoad.np).toBeCloseTo(2.18, 1));
    it('np_proof = Fp/Fb ≈ 1.16', () => expect(r.staticLoad.np_proof).toBeCloseTo(1.16, 1));
    it('n0 ≈ 3.80', () => expect(r.staticLoad.n0).toBeCloseTo(3.80, 1));
  });
});
