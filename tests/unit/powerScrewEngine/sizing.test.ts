import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { ENGINE, DEFAULT_CONFIG } from '@/features/powerScrew/engine';
import { sizeScrew } from '@/features/powerScrew/engine/sizing';
import { ACME_SIZES } from '@/features/powerScrew/data/tables';
import type { EnteredInputs } from '@/features/powerScrew/engine/types';

const cfg = { ...DEFAULT_CONFIG, thread: 'acme' as const, thrust: 'collar' as const };
const base = (F: number, n = 2): EnteredInputs => ({
  n: { value: 1, unit: 'count' },
  F: { value: F, unit: 'N' },
  f: { value: 0.15, unit: '1' }, fc: { value: 0.12, unit: '1' }, dc: { value: 50, unit: 'mm' },
  Sy: { value: 290, unit: 'MPa' }, nTarget: { value: n, unit: '1' },
  E: { value: 207, unit: 'GPa' }, C: { value: 1, unit: '1' }, Lcol: { value: 300, unit: 'mm' },
  pb: { value: 11, unit: 'MPa' },
});

describe('dimensionamiento', () => {
  it('recomienda el menor tamaño que cumple, y dice qué rechaza a los anteriores', () => {
    const r = sizeScrew(ENGINE, cfg, base(30_000), ACME_SIZES);
    const rec = r.candidates.find(c => c.id === r.recommendedId)!;
    expect(rec.passes).toBe(true);
    const smaller = r.candidates.filter(c => c.d < rec.d);
    expect(smaller.length).toBeGreaterThan(0);
    for (const c of smaller) expect(c.failedBy).toBeDefined();
  });

  it('calcula los filetes mínimos por desgaste y la longitud de tuerca', () => {
    const r = sizeScrew(ENGINE, cfg, base(30_000), ACME_SIZES);
    const rec = r.candidates.find(c => c.id === r.recommendedId)!;
    expect(rec.ntMin).toBeGreaterThanOrEqual(1);
    expect(rec.H).toBeCloseTo(rec.ntMin! * rec.p, 9);
    expect(rec.checks.wear).toBe('ok');
  });

  it('da el diámetro menor de partida por compresión pura', () => {
    const r = sizeScrew(ENGINE, cfg, base(30_000), ACME_SIZES);
    expect(r.drStart).toBeCloseTo(Math.sqrt((4 * 30_000 * 2) / (Math.PI * 290)), 9);
  });

  it('sin material, avisa que la fluencia no se pudo evaluar', () => {
    const b = base(30_000); delete b.Sy; delete b.nTarget;
    const r = sizeScrew(ENGINE, cfg, b, ACME_SIZES);
    expect(r.notEvaluated.join(' ')).toMatch(/Fluencia/);
  });

  it('más carga nunca recomienda un tornillo más pequeño', () => {
    fc.assert(fc.property(
      fc.double({ min: 2_000, max: 60_000, noNaN: true }),
      fc.double({ min: 1.05, max: 3, noNaN: true }),
      (F, k) => {
        const a = sizeScrew(ENGINE, cfg, base(F), ACME_SIZES);
        const b = sizeScrew(ENGINE, cfg, base(F * k), ACME_SIZES);
        const da = a.candidates.find(c => c.id === a.recommendedId)?.d ?? Infinity;
        const db = b.candidates.find(c => c.id === b.recommendedId)?.d ?? Infinity;
        expect(db).toBeGreaterThanOrEqual(da);
      }), { numRuns: 40 });
  });
});
