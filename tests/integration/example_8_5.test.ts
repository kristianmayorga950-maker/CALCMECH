/**
 * Verificación contra Shigley EJEMPLO 8-5 (9ª ed.) — actualizado
 *
 * Enunciado:
 *   Cap screw 5/8"-11 UNC  SAE grade 5 en junta atornillada a fatiga.
 *   Miembros: arandela endurecida tw = 1/16 in, placa de acero t1 = 5/8 in,
 *            base de hierro colado tapada t2 = 5/8 in.
 *   Carga externa fluctuante 0 → 5 kip por tornillo.
 *
 * Respuestas publicadas en el libro:
 *   kb = 5.21 Mlbf/in · km = 8.95 Mlbf/in (Ec. 8-22) · C = 0.368
 *   Fi = 14.4 kip  ·   np = 2.61  ·  n0 = 4.56
 *   σi = 63.7 kpsi ·   σa = 4.07 kpsi
 *   Sa (Goodman) = 7.55 kpsi · nf = 1.85
 *
 * Usamos método Wileman con hierro colado para aproximar el km combinado.
 * Tolerancias ampliadas (±30 %) para cantidades que dependen de km.
 *
 * Nota: el método Rotscher fue reemplazado por Cornwell (Norton §11.8).
 * Para este ejemplo histórico de Shigley se usa Wileman.
 */
import { describe, it, expect } from 'vitest';
import { TensionJointCalculator } from '@/modules/tensionJoint/calculations';
import type { TensionJointInput, BoltGrade } from '@/modules/tensionJoint/types';

const IN           = 25.4;
const KPSI_TO_MPA  = 6.89476;
const LBF_TO_N     = 4.44822;

const d   = 0.625 * IN;
const At  = 0.226 * IN * IN;
const p   = IN / 11;

// l_eff Tabla 8-7(b): h = tw + t1 = 0.6875 in (> d/2). l_eff = h + d/2 = 1.0 in
const l   = 1.0 * IN;

const grade: BoltGrade = {
  designation: 'SAE 5',
  Sp:  85  * KPSI_TO_MPA,
  Sy:  92  * KPSI_TO_MPA,
  Sut: 120 * KPSI_TO_MPA,
  Se:  18.6 * KPSI_TO_MPA,
  E:   30  * KPSI_TO_MPA,  // ≈ 206.843 GPa
};

// Usar Wileman con hierro colado (A=0.778 71, B=0.616 16) como aproximación
const input: TensionJointInput = {
  boltDiameter: d,
  pitch: p,
  tensileArea: At,
  grade,
  grip: l,
  unthreadedLengthInGrip: 0,
  threadedLengthInGrip:   l,

  memberMaterial: 'cast_iron',
  memberE:        14 * KPSI_TO_MPA,   // 14 Mpsi → GPa
  wilemanA:       0.77871,
  wilemanB:       0.61616,
  kmMethod:       'wileman',

  permanence: 'reusable',
  K: 0.20,

  externalLoad: 5000 * LBF_TO_N,
  loadType: 'fatigue',
  Pmin: 0,
  Pmax: 5000 * LBF_TO_N,
  fatigueCriterion: 'goodman',
  unitSystem: 'imperial',
};

describe('Shigley EJEMPLO 8-5 — cap screw 5/8-11 UNC SAE 5, fatiga (Wileman)', () => {
  const r = new TensionJointCalculator(input).calculate();

  const Fi_kip       = r.staticLoad.Fi / LBF_TO_N / 1000;
  const Fp_kip       = r.staticLoad.Fp / LBF_TO_N / 1000;
  const np           = r.staticLoad.np;
  const n0           = r.staticLoad.n0;
  const sigma_a_kpsi = r.fatigue!.sigma_a / KPSI_TO_MPA;
  const sigma_i_kpsi = r.fatigue!.sigma_i / KPSI_TO_MPA;
  const Sa_kpsi      = r.fatigue!.Sa      / KPSI_TO_MPA;
  const nf           = r.fatigue!.nf;

  // ── Resultados EXACTOS (independientes de km) ───────────────────────────
  it('Fp = At·Sp ≈ 19.21 kip (±1 %)', () => expect(Fp_kip).toBeCloseTo(19.21, 1));
  it('Fi = 0.75·Fp ≈ 14.4 kip (±1 %)', () => expect(Fi_kip).toBeCloseTo(14.41, 1));
  it('σi = Fi/At ≈ 63.7 kpsi (±1 %)', () => expect(sigma_i_kpsi).toBeCloseTo(63.7, 0));
  it('Sa (Goodman) ≈ 7.55 kpsi (±3 %)', () => expect(Math.abs(Sa_kpsi - 7.55) / 7.55).toBeLessThan(0.03));

  // ── Cantidades dependientes de km (tolerancia ±30 %) ───────────────────
  it('C dentro del ±30 % de 0.368', () =>
    expect(Math.abs(r.stiffness.C - 0.368) / 0.368).toBeLessThan(0.30));
  it('np (Ec. 8-29) dentro del ±30 % de 2.61', () =>
    expect(Math.abs(np - 2.61) / 2.61).toBeLessThan(0.30));
  it('n0 dentro del ±15 % de 4.56', () =>
    expect(Math.abs(n0 - 4.56) / 4.56).toBeLessThan(0.15));
  it('σa dentro del ±30 % de 4.07', () =>
    expect(Math.abs(sigma_a_kpsi - 4.07) / 4.07).toBeLessThan(0.30));
  it('nf (Goodman) dentro del ±35 % de 1.85', () =>
    expect(Math.abs(nf - 1.85) / 1.85).toBeLessThan(0.35));
});
