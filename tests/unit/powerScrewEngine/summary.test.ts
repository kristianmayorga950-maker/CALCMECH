import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { ENGINE, DEFAULT_CONFIG, solve } from '@/features/powerScrew/engine';
import { efficiencyAt, lockingLeadAngle, utilization, verdict } from '@/features/powerScrew/engine/summary';
import type { EnteredInputs, ProblemConfig } from '@/features/powerScrew/engine/types';

const cfg: ProblemConfig = { ...DEFAULT_CONFIG, thrust: 'collar' };
const ex: EnteredInputs = {
  d: { value: 32, unit: 'mm' }, p: { value: 4, unit: 'mm' }, n: { value: 2, unit: 'count' },
  F: { value: 6.4, unit: 'kN' }, f: { value: 0.08, unit: '1' }, fc: { value: 0.08, unit: '1' }, dc: { value: 40, unit: 'mm' },
};

describe('veredicto', () => {
  it('ejercicio sin material: cumple con observaciones (autobloqueo) y faltan verificaciones', () => {
    const r = solve(ENGINE, cfg, ex);
    const v = verdict(r.checks, cfg);
    expect(v.status).toBe('warn');
    expect(v.pending).toBeGreaterThan(0);
  });

  it('si se exige autobloqueo, la rosca que no bloquea hace fallar el diseño y gobierna', () => {
    const c = { ...cfg, requireSelfLock: true };
    const v = verdict(solve(ENGINE, c, ex).checks, c);
    expect(v.status).toBe('fail');
    expect(v.governing?.id).toBe('selfLock');
  });

  it('con material, gobierna la verificación de mayor utilización', () => {
    const r = solve(ENGINE, cfg, { ...ex, Sy: { value: 290, unit: 'MPa' }, nTarget: { value: 2, unit: '1' } });
    const v = verdict(r.checks, cfg);
    const utils = r.checks.map(c => [c.id, utilization(c)] as const).filter(([id, u]) => u !== undefined && id !== 'selfLock');
    const max = Math.max(...utils.map(([, u]) => u!));
    expect(v.governing?.utilization).toBe(max);
    // σ′ raíz = 48.7 MPa → n = 290/48.7 = 5.96 → utilización 2/5.96
    expect(utilization(r.checks.find(c => c.id === 'rootYield')!)).toBeCloseTo(2 / (290 / 48.68), 2);
  });

  it('sin datos, el diseño queda incompleto', () => {
    expect(verdict(solve(ENGINE, cfg, {}).checks, cfg).status).toBe('incomplete');
  });
});

describe('curva de eficiencia vs ángulo de avance', () => {
  it('coincide con el motor en el punto de diseño (rosca y global)', () => {
    const r = solve(ENGINE, cfg, ex);
    const v = r.values;
    expect(efficiencyAt(v.lambda!, 0.08, 0)).toBeCloseTo(v.e1!, 10);
    expect(efficiencyAt(v.lambda!, 0.08, 0, { fc: 0.08, dcOverDm: 40 / 30 })).toBeCloseTo(v.e!, 10);
  });

  it('en la frontera de autobloqueo la eficiencia de la rosca es menor que 0.5', () => {
    fc.assert(fc.property(fc.double({ min: 0.02, max: 0.3, noNaN: true }), fc.constantFrom(0, (14.5 * Math.PI) / 180), (f, a) => {
      const e = efficiencyAt(lockingLeadAngle(f, a), f, a)!;
      expect(e).toBeLessThan(0.5);
    }));
  });

  it('el apoyo siempre baja la eficiencia', () => {
    fc.assert(fc.property(
      fc.double({ min: 0.01, max: 0.6, noNaN: true }), fc.double({ min: 0.02, max: 0.25, noNaN: true }),
      fc.double({ min: 0.01, max: 0.2, noNaN: true }), fc.double({ min: 1, max: 2.5, noNaN: true }),
      (lam, f, fcol, ratio) => {
        const a = efficiencyAt(lam, f, 0), b = efficiencyAt(lam, f, 0, { fc: fcol, dcOverDm: ratio });
        fc.pre(a !== null && b !== null);
        expect(b!).toBeLessThan(a!);
      }));
  });
});
