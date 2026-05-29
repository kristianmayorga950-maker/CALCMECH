/**
 * Verificación contra Shigley EJEMPLO 8-7 (9ª ed.)
 *
 * Enunciado:
 *   Barra rectangular de acero 15 × 200 mm sujeta en voladizo a un canal
 *   de acero de 250 mm mediante 4 pernos M16 × 2 apretados con firmeza
 *   en A, B, C y D.  F = 16 kN.
 *
 * Posiciones de los pernos (centroide en O):
 *   A: ( 75, -60) mm
 *   B: ( 75,  60) mm
 *   C: (-75,  60) mm
 *   D: (-75, -60) mm
 *
 * Distancia de F al centroide: 75 + 50 + 300 = 425 mm
 * F = 16 kN, vertical hacia abajo.
 *
 * Respuestas del libro:
 *   a) V = 16 kN,  M = 16(425) = 6800 N·m
 *      r = √(60² + 75²) = 96.0 mm
 *      F' = V/4 = 4 kN (cortante directo)
 *      F'' = M/(4r) = 6800/(4×96) = 17.7 kN (cortante por momento)
 *      FA = FB = 21.0 kN,  FC = FD = 14.8 kN
 *
 *   b) τ = F_max/As = 21000/144 = 146 MPa  (As = 144 mm², M16)
 *
 *   c) σ_bearing = F_max/(t·d) = 21000/(10×16) = 131 MPa
 *
 *   d) σ_bending = Mc/I = 5600(100)/(8.26×10⁶) = 67.8 MPa
 *      (esto es esfuerzo flexionante en la barra, no en los pernos)
 */
import { describe, it, expect } from 'vitest';
import { ShearJointCalculator, distributeForces, centroid } from '@/modules/shearJoint/calculations';
import type { ShearJointInput, ShearBolt } from '@/modules/shearJoint/types';

// ── Datos del problema ──────────────────────────────────────
const d = 16;                             // mm (M16)
const As = 144;                           // mm² (área de esfuerzo, M16×2, Tab. 8-1)
const F = 16000;                          // N (16 kN)

// Posiciones de los pernos relativas al centroide
const bolts: ShearBolt[] = [
  { id: 'A', x:  75, y: -60 },
  { id: 'B', x:  75, y:  60 },
  { id: 'C', x: -75, y:  60 },
  { id: 'D', x: -75, y: -60 },
];

// Punto de aplicación de F: 425 mm a la derecha del centroide
const appX = 425;  // mm (75 + 50 + 300)
const appY = 0;

// Propiedades de la placa (canal de acero)
const t_channel = 10;                     // mm (alma del canal, Tab. A-7)
const plateSy = 250;                      // MPa (acero estructural)
const plateSut = 400;                     // MPa

// Pernos clase 8.8 (para las propiedades de esfuerzo)
const boltSp = 600;                       // MPa (ISO 8.8)
const boltSy = 640;                       // MPa
const boltSut = 800;                      // MPa

describe('Shigley EJEMPLO 8-7 — M16, 4 pernos, carga excéntrica 16 kN', () => {

  // ── a) Centroide y fuerzas ────────────────────────────────
  describe('(a) Distribución de fuerzas', () => {
    const c = centroid(bolts);

    it('centroide en (0, 0)', () => {
      expect(c.x).toBeCloseTo(0, 6);
      expect(c.y).toBeCloseTo(0, 6);
    });

    const dist = distributeForces(bolts, F, 0, -1, appX, appY);

    it('M = V × e = 6800 N·m', () => {
      // M = (ax - cx)·uy - (ay - cy)·ux
      // = (425 - 0)·(-16000) - (0 - 0)·0 = -6,800,000 N·mm
      expect(Math.abs(dist.M)).toBeCloseTo(6800000, -2);
    });

    it('r = √(60² + 75²) = 96.0 mm para todos los pernos', () => {
      const r = Math.sqrt(60 ** 2 + 75 ** 2);
      expect(r).toBeCloseTo(96.0, 1);
      dist.forces.forEach(f => {
        expect(f.r).toBeCloseTo(96.0, 1);
      });
    });

    it('Σr² = 4 × (60² + 75²) = 36900 mm²', () => {
      // El libro redondea r = 96.0 (real: 96.05), pero Σr² = 4×(60²+75²) = 36900
      expect(dist.sumR2).toBeCloseTo(36900, 0);
    });

    it('F\' (directo) = V/4 = 4 kN por perno', () => {
      // Carga vertical → Fpy = -4000, Fpx = 0
      dist.forces.forEach(f => {
        expect(Math.abs(f.Fpx)).toBeLessThan(1);
        expect(f.Fpy).toBeCloseTo(-4000, 0);
      });
    });

    it('F\'\' (momento) ≈ 17.7 kN por perno', () => {
      const expected = 6800000 * 96 / 36864;  // 17708 N
      dist.forces.forEach(f => {
        const Fm = Math.hypot(f.Fmx, f.Fmy);
        expect(Fm / 1000).toBeCloseTo(17.7, 0);
      });
    });

    it('FA = FB ≈ 21.0 kN (pernos más cargados)', () => {
      const fA = dist.forces.find(f => f.id === 'A')!;
      const fB = dist.forces.find(f => f.id === 'B')!;
      expect(fA.F / 1000).toBeCloseTo(21.0, 0);
      expect(fB.F / 1000).toBeCloseTo(21.0, 0);
    });

    it('FC = FD ≈ 14.8 kN', () => {
      const fC = dist.forces.find(f => f.id === 'C')!;
      const fD = dist.forces.find(f => f.id === 'D')!;
      expect(fC.F / 1000).toBeCloseTo(14.8, 0);
      expect(fD.F / 1000).toBeCloseTo(14.8, 0);
    });
  });

  // ── b) Esfuerzo cortante máximo ──────────────────────────
  describe('(b) Esfuerzo cortante en el perno más cargado', () => {
    const input: ShearJointInput = {
      bolts,
      boltDiameter: d,
      shearArea: As,
      doubleShear: false,         // cortante simple
      boltSp, boltSy, boltSut,
      V: F,
      Vx: 0, Vy: -1,
      applicationX: appX,
      applicationY: appY,
      plateThickness: t_channel,
      plateSy, plateSut,
      unitSystem: 'SI',
    };

    const r = new ShearJointCalculator(input).calculate();

    it('perno más cargado es A o B', () => {
      expect(['A', 'B']).toContain(r.maxBolt.id);
    });

    it('F_max ≈ 21.0 kN', () => {
      expect(r.maxBolt.F / 1000).toBeCloseTo(21.0, 0);
    });

    // τ = F_max / As = 21000/144 = 145.8 ≈ 146 MPa
    it('τ ≈ 146 MPa', () => {
      expect(r.tauBolt).toBeCloseTo(146, -1);
    });
  });

  // ── c) Esfuerzo de aplastamiento ─────────────────────────
  describe('(c) Esfuerzo de aplastamiento', () => {
    const input: ShearJointInput = {
      bolts,
      boltDiameter: d,
      shearArea: As,
      doubleShear: false,
      boltSp, boltSy, boltSut,
      V: F,
      Vx: 0, Vy: -1,
      applicationX: appX,
      applicationY: appY,
      plateThickness: t_channel,
      plateSy, plateSut,
      unitSystem: 'SI',
    };

    const r = new ShearJointCalculator(input).calculate();

    // σ = F_max / (t × d) = 21000 / (10 × 16) = 131.25 MPa
    it('σ_bearing ≈ 131 MPa', () => {
      expect(r.sigmaBearing).toBeCloseTo(131, -1);
    });
  });

  // ── d) Esfuerzo flexionante en la barra (verificación manual) ──
  describe('(d) Esfuerzo flexionante en la barra (cálculo manual)', () => {
    // Esto no lo calcula la app, pero verificamos la fórmula del libro

    it('M_bending = F × (300 + 50) = 5600 N·m', () => {
      const M_bend = 16 * (300 + 50);  // kN·mm → N·m
      expect(M_bend).toBe(5600);
    });

    it('I = I_barra - 2(I_hole + d²A) ≈ 8.26×10⁶ mm⁴', () => {
      const I_bar = (15 * 200 ** 3) / 12;
      const I_hole = (15 * 16 ** 3) / 12;
      const d_sq_A = (60 ** 2) * 15 * 16;
      const I = I_bar - 2 * (I_hole + d_sq_A);
      expect(I / 1e6).toBeCloseTo(8.26, 1);
    });

    it('σ_bending = Mc/I ≈ 67.8 MPa', () => {
      const M = 5600e3;       // N·mm
      const c = 100;          // mm (mitad del ancho 200)
      const I = 8.26e6;       // mm⁴
      const sigma = M * c / I;
      expect(sigma).toBeCloseTo(67.8, 0);
    });
  });
});
