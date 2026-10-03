import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  UNITS, BASE_UNIT, toBase, fromBase, convert, getUnit, unitsFor,
  type Dimension,
} from '@/features/powerScrew/engine/units';

const DIMS = [...new Set(UNITS.map(u => u.dim))] as Dimension[];

/** Par de unidades de la misma dimensión, construido (no filtrado). */
const sameDimPair = fc.constantFrom(...DIMS).chain(dim =>
  fc.tuple(fc.constantFrom(...unitsFor(dim)), fc.constantFrom(...unitsFor(dim))),
);

/** Magnitudes de ingeniería realistas: 1e-6 … 1e9, con signo, sin NaN ni infinitos. */
const magnitude = fc.double({ min: 1e-6, max: 1e9, noNaN: true, noDefaultInfinity: true })
  .chain(v => fc.boolean().map(neg => (neg ? -v : v)));

describe('unidades — valores conocidos', () => {
  it('1 in = 25.4 mm', () => expect(toBase(1, 'in')).toBe(25.4));
  it('1 lbf = 4.4482216152605 N', () => expect(toBase(1, 'lbf')).toBeCloseTo(4.4482216152605, 12));
  it('1 kpsi ≈ 6.894757 MPa', () => expect(toBase(1, 'kpsi')).toBeCloseTo(6.894757, 6));
  it('1 lbf·in ≈ 0.1129848 N·m', () => expect(convert(1, 'lbfin', 'Nm')).toBeCloseTo(0.1129848, 7));
  it('1 ft/min = 5.08 mm/s', () => expect(toBase(1, 'ftmin')).toBeCloseTo(5.08, 12));
  it('207 GPa = 207 000 MPa', () => expect(toBase(207, 'GPa')).toBe(207000));
  it('1 hp ≈ 745.7 W', () => expect(toBase(1, 'hp')).toBeCloseTo(745.7, 1));
  it('cada dimensión tiene exactamente una unidad base con factor 1', () => {
    for (const dim of DIMS) {
      const base = getUnit(BASE_UNIT[dim]);
      expect(base.dim).toBe(dim);
      expect(base.factor).toBe(1);
    }
  });
  it('rechaza conversiones entre dimensiones distintas con un mensaje propio', () => {
    expect(() => convert(1, 'mm', 'N')).toThrow(/dimensiones distintas/);
  });
  it('rechaza unidades desconocidas', () => {
    expect(() => toBase(1, 'furlong')).toThrow(/Unidad desconocida/);
  });
});

describe('unidades — propiedades', () => {
  it('ida y vuelta: fromBase(toBase(x, u), u) recupera x', () => {
    fc.assert(fc.property(fc.constantFrom(...UNITS), magnitude, (u, x) => {
      const back = fromBase(toBase(x, u.id), u.id);
      expect(Math.abs(back - x)).toBeLessThanOrEqual(Math.abs(x) * 1e-12);
    }), { examples: [[getUnit('in'), 1], [getUnit('kpsi'), 0.001]] });
  });

  it('convertir a → b → a recupera el valor (misma dimensión)', () => {
    fc.assert(fc.property(sameDimPair, magnitude, ([a, b], x) => {
      const back = convert(convert(x, a.id, b.id), b.id, a.id);
      expect(Math.abs(back - x)).toBeLessThanOrEqual(Math.abs(x) * 1e-12);
    }));
  });

  it('la conversión es lineal: convert(k·x) = k·convert(x)', () => {
    fc.assert(fc.property(sameDimPair, magnitude, fc.double({ min: 0.01, max: 100, noNaN: true }), ([a, b], x, k) => {
      const lhs = convert(k * x, a.id, b.id);
      const rhs = k * convert(x, a.id, b.id);
      expect(Math.abs(lhs - rhs)).toBeLessThanOrEqual(Math.abs(rhs) * 1e-12);
    }));
  });
});
