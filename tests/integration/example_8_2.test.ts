/**
 * Verificación contra Shigley EJEMPLO 8-2 (9ª ed.) — actualizado a Cornwell+Wileman
 *
 * Enunciado:
 *   5 pernos SAE grado 2, 1/2-20 UNF × 1-1/2 in (pasantes con tuerca).
 *   Figura 8-17a: placa superior (1/2 in) + placa inferior (3/4 in), con una
 *   arandela plana estándar de acero tipo N (1/2 N) bajo la cabeza de cada perno.
 *
 * Verificamos:
 *  (d) kb — rigidez del perno (Ec. 8-17)
 *  (c) km — Wileman (Ec. 8-23): ambas placas de acero
 *
 * Nota: El método Rotscher fue reemplazado por el método FEA de Cornwell (Norton §11.8).
 */

import { describe, it, expect } from 'vitest';
import {
  boltStiffness,
  memberStiffnessWileman,
  cornwellJointC,
} from '@/modules/tensionJoint/calculations';
import type { CornwellPlate } from '@/modules/tensionJoint/types';

const IN    = 25.4;
const LBF2N = 4.44822;

const toMlbfin = (Nmm: number) => Nmm * IN / LBF2N / 1e6;

// ── Datos del perno ───────────────────────────────────────────────────────────
const d      = 0.5  * IN;        // 12.7 mm
const At     = 0.1599 * IN * IN; // 103.16 mm²
const E_MPa  = 207000;           // 207 GPa = 30 Mpsi

const t_washer = 0.095 * IN;    // 2.413 mm — arandela 1/2 N
const t_top    = 0.5   * IN;    // 12.7  mm — placa superior
const t_bot    = 0.75  * IN;    // 19.05 mm — placa inferior
const l_grip   = t_washer + t_top + t_bot;   // 34.163 mm

// Longitudes (Tabla 8-7, UNF, L ≤ 6 in)
const L    = 1.5  * IN;         // 38.1 mm
const LT   = (2 * 0.5 + 0.25) * IN; // 31.75 mm
const ld   = Math.min(L - LT, l_grip);  // 6.35 mm
const lt   = l_grip - ld;              // 27.813 mm

// ── Cálculos ─────────────────────────────────────────────────────────────────
const kb   = boltStiffness(d, At, ld, lt, E_MPa);
const km_w = memberStiffnessWileman(E_MPa, d, l_grip, 0.78715, 0.62873);

// Cornwell — mismo material (acero-acero), j = d/l
const platesSteel: CornwellPlate[] = [{ E_GPa: 207, thickness: l_grip }];
const cw = cornwellJointC(d, l_grip, 207, platesSteel);

describe('Shigley Ejemplo 8-2 — 1/2-20 UNF × 1-1/2 in', () => {

  describe('(d) Rigidez del perno kb (Ec. 8-17)', () => {
    it('kb ≈ 3.69 Mlbf/in', () => {
      expect(toMlbfin(kb)).toBeCloseTo(3.69, 1);
    });

    it('ld + lt = l_grip', () => {
      expect(ld + lt).toBeCloseTo(l_grip, 6);
    });

    it('LT = 2d + 0.25 in (Tabla 8-7 UNF, L ≤ 6 in)', () => {
      expect(LT).toBeCloseTo(31.75, 5);
    });
  });

  describe('(c) km Wileman — acero (Ec. 8-23)', () => {
    it('km_wileman > 0', () => {
      expect(km_w).toBeGreaterThan(0);
    });

    it('km Wileman ≈ 14.9 Mlbf/in (acero uniforme, comparable con libro)', () => {
      expect(toMlbfin(km_w)).toBeCloseTo(14.92, 1);
    });
  });

  describe('Cornwell — mismo material acero-acero', () => {
    it('C_metal entre 0 y 1', () => {
      expect(cw.C_metal).toBeGreaterThan(0);
      expect(cw.C_metal).toBeLessThan(1);
    });

    it('j = d/l correcto', () => {
      expect(cw.j).toBeCloseTo(d / l_grip, 6);
    });

    it('kb < km_wileman (perno más blando que los elementos de acero)', () => {
      expect(kb).toBeLessThan(km_w);
    });
  });
});
