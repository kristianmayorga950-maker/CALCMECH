/**
 * Tornillo de potencia — Shigley 9ª ed., §8-1 y §8-2.
 *
 * Los valores de referencia provienen del Ejemplo 8-1 del libro (square thread,
 * d = 1.25 in, p = 0.25 in, F = 6400 lbf, f = 0.08, fc = 0.08, dc = 1.75 in).
 * Se trabaja en SI convirtiendo las dimensiones del ejemplo.
 */

import { describe, it, expect } from 'vitest';
import {
  meanDiameter,
  minorDiameter,
  torqueRaise,
  torqueLower,
  collarTorque,
  screwEfficiency,
  isSelfLocking,
  bodyAxialStress,
  bodyTorsionStress,
  vonMises,
  threadBearingStress,
  threadBendingStress,
  threadShearStress,
  PowerScrewCalculator,
} from '@/modules/powerScrew/calculations';
import type { PowerScrewInput } from '@/modules/powerScrew/types';

describe('§8-1 — Dimensiones de la rosca', () => {
  it('dm = d − p/2  (Eq. previa a 8-1)', () => {
    expect(meanDiameter(32, 4)).toBe(30);
    expect(meanDiameter(31.75, 6.35)).toBeCloseTo(28.575, 3);
  });

  it('dr = d − p  (definición)', () => {
    expect(minorDiameter(32, 4)).toBe(28);
    expect(minorDiameter(31.75, 6.35)).toBeCloseTo(25.4, 3);
  });
});

describe('§8-2 — Mecánica del tornillo (rosca cuadrada)', () => {
  // Ejemplo 8-1 en SI: d=31.75 mm, p=6.35 mm, single-start, F=28 469 N, f=0.08
  const d  = 31.75;
  const p  = 6.35;
  const F  = 28469;
  const f  = 0.08;
  const dm = meanDiameter(d, p);   // 28.575 mm
  const dr = minorDiameter(d, p);  // 25.4  mm
  const L  = p;                    // single-start

  it('TR (Eq. 8-5) para rosca cuadrada', () => {
    // TR = (F·dm/2)·(L + π·f·dm)/(π·dm − f·L)
    const expected =
      (F * dm / 2) * (L + Math.PI * f * dm) / (Math.PI * dm - f * L);
    expect(torqueRaise(F, dm, L, f, 0)).toBeCloseTo(expected, 3);
    expect(torqueRaise(F, dm, L, f, 0)).toBeGreaterThan(0);
  });

  it('TL (Eq. 8-5) para rosca cuadrada (no autobloqueante → puede ser <0)', () => {
    const expected =
      (F * dm / 2) * (Math.PI * f * dm - L) / (Math.PI * dm + f * L);
    expect(torqueLower(F, dm, L, f, 0)).toBeCloseTo(expected, 3);
  });

  it('Autobloqueo: π·f·dm > L  (rosca cuadrada)', () => {
    // π·0.08·28.575 ≈ 7.18 > 6.35 → autobloqueante
    expect(isSelfLocking(f, dm, L, 0)).toBe(true);
    // Con más avance deja de ser autobloqueante
    expect(isSelfLocking(f, dm, 10 * L, 0)).toBe(false);
  });

  it('Eficiencia e = F·L / (2π·T)  (Eq. 8-4)', () => {
    const T = torqueRaise(F, dm, L, f, 0);
    const e = screwEfficiency(F, L, T);
    // Rango físicamente razonable para rosca cuadrada con carga autobloqueante
    expect(e).toBeGreaterThan(0.1);
    expect(e).toBeLessThan(0.5);
    // Consistencia: T = F·L/(2π·e)
    expect((F * L) / (2 * Math.PI * e)).toBeCloseTo(T, 3);
  });

  it('Collarín: Tc = F·fc·dc/2  (Eq. 8-7)', () => {
    const dc = 44.45;   // 1.75 in
    const fc = 0.08;
    expect(collarTorque(F, fc, dc)).toBeCloseTo((F * fc * dc) / 2, 6);
  });
});

describe('§8-2 — Rosca Acme con factor secα', () => {
  const d  = 32, p = 4, F = 10000, f = 0.08;
  const dm = meanDiameter(d, p);
  const L  = p;
  const alpha = 14.5;
  const sec = 1 / Math.cos((alpha * Math.PI) / 180);

  it('TR con secα (Eq. 8-6)', () => {
    const expected =
      (F * dm / 2) * (L + Math.PI * f * dm * sec) / (Math.PI * dm - f * L * sec);
    expect(torqueRaise(F, dm, L, f, alpha)).toBeCloseTo(expected, 6);
  });

  it('TR Acme > TR cuadrada (la componente de fricción crece con secα)', () => {
    const tr_sq   = torqueRaise(F, dm, L, f, 0);
    const tr_acme = torqueRaise(F, dm, L, f, alpha);
    expect(tr_acme).toBeGreaterThan(tr_sq);
  });
});

describe('§8-2 — Esfuerzos en el cuerpo y en el filete', () => {
  const F  = 10000;
  const dr = 28;
  const dm = 30;
  const p  = 4;
  const nt = 2;
  const T  = 100000;   // N·mm

  it('σ axial = 4F/(π·dr²)  (Eq. 8-9)', () => {
    expect(bodyAxialStress(F, dr))
      .toBeCloseTo((4 * F) / (Math.PI * dr * dr), 6);
  });

  it('τ torsión = 16T/(π·dr³)  (Eq. 8-10)', () => {
    expect(bodyTorsionStress(T, dr))
      .toBeCloseTo((16 * T) / (Math.PI * dr ** 3), 6);
  });

  it("Von Mises: σ' = √(σ² + 3τ²)", () => {
    expect(vonMises(100, 50))
      .toBeCloseTo(Math.sqrt(100 ** 2 + 3 * 50 ** 2), 6);
  });

  it('σ aplastamiento filete (Eq. 8-11)', () => {
    expect(threadBearingStress(F, dm, nt, p))
      .toBeCloseTo((2 * F) / (Math.PI * dm * nt * p), 6);
  });

  it('σ flexión filete (Eq. 8-12)', () => {
    expect(threadBendingStress(F, dr, nt, p))
      .toBeCloseTo((6 * F) / (Math.PI * dr * nt * p), 6);
  });

  it('τ cortante filete (Eq. 8-13)', () => {
    expect(threadShearStress(F, dr, nt, p))
      .toBeCloseTo((3 * F) / (Math.PI * dr * nt * p), 6);
  });
});

describe('PowerScrewCalculator — flujo completo', () => {
  const baseInput: PowerScrewInput = {
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
    unitSystem:          'SI',
  };

  it('rellena geometría, torques, esfuerzos e indicadores', () => {
    const res = new PowerScrewCalculator(baseInput).calculate();
    expect(res.geometry.dm).toBe(30);
    expect(res.geometry.dr).toBe(28);
    expect(res.geometry.lead).toBe(8);                       // n·p
    expect(res.torques.Ttotal).toBe(res.torques.TR + res.torques.Tc);
    expect(res.bodyStress.sigmaVonMises).toBeGreaterThan(0);
    expect(res.indicators.efficiencyPercent).toBeGreaterThan(0);
    // calculations incluye la ref §8-1/§8-2
    expect(res.calculations.TR.ref).toMatch(/8-5|8-6/);
  });

  it('lanza si faltan datos obligatorios (Shigley §8-2)', () => {
    const bad: any = { ...baseInput, axialLoad: 0 };
    expect(() => new PowerScrewCalculator(bad).calculate()).toThrow(/§8-2/);
  });

  it('detecta no autobloqueo al aumentar el avance', () => {
    const noLock = { ...baseInput, numberOfStarts: 6 };     // L = 24 mm, mucho mayor que π·f·dm
    const res = new PowerScrewCalculator(noLock).calculate();
    expect(res.indicators.selfLocking).toBe(false);
  });
});
