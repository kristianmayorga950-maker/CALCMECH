import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { initialState, reducer, type ProblemState } from '@/features/powerScrew/state/problemState';
import { toBase, unitsFor } from '@/features/powerScrew/engine/units';
import { INPUT_BY_ID } from '@/features/powerScrew/engine/vars';
import type { InputId } from '@/features/powerScrew/engine/types';

const s0 = initialState('SI');

describe('estado del problema', () => {
  it('arranca vacío, con unidades SI por campo', () => {
    expect(s0.entered).toEqual({});
    expect(s0.unitPref.d).toBe('mm');
    expect(s0.unitPref.F).toBe('kN');
    expect(initialState('imperial').unitPref.d).toBe('in');
  });

  it('el catálogo Acme fija d, p y la rosca Acme, con el origen visible', () => {
    const s = reducer(s0, { type: 'acme', sizeId: '1-1/4' });
    expect(s.cfg.thread).toBe('acme');
    expect(s.entered.d).toMatchObject({ value: 31.75, unit: 'mm' });
    expect(s.entered.p?.value).toBeCloseTo(5.08, 9);
    expect(s.entered.d?.source).toMatch(/Acme 1-1\/4/);
  });

  it('editar d a mano rompe el vínculo con el catálogo', () => {
    let s = reducer(s0, { type: 'acme', sizeId: '1' });
    s = reducer(s, { type: 'value', id: 'd', value: 26 });
    expect(s.selections.acmeSize).toBeUndefined();
    expect(s.entered.d).toEqual({ value: 26, unit: 'mm' });
  });

  it('el par de materiales llena f con el máximo del rango y guarda el rango', () => {
    const s = reducer(s0, { type: 'threadPair', screw: 'steelOil', nut: 'bronze' });
    expect(s.entered.f?.value).toBe(0.16);
    expect(s.selections.fRange).toEqual([0.10, 0.16]);
  });

  it('un par de materiales que no está en la tabla no cambia nada', () => {
    expect(reducer(s0, { type: 'threadPair', screw: 'bronze', nut: 'brass' })).toBe(s0);
  });

  it('el material llena S_y y E en las unidades del campo', () => {
    const s = reducer(s0, { type: 'material', materialId: '1040-HR' });
    expect(s.entered.Sy).toMatchObject({ value: 290, unit: 'MPa' });
    expect(s.entered.E).toMatchObject({ value: 207, unit: 'GPa' });
  });

  it('la condición de extremos usa el valor conservador', () => {
    const s = reducer(s0, { type: 'endCondition', conditionId: 'fixed-fixed' });
    expect(s.entered.C?.value).toBe(1);
  });

  it('reiniciar vuelve al estado inicial del sistema de unidades pedido', () => {
    const s = reducer(reducer(s0, { type: 'value', id: 'F', value: 6.4 }), { type: 'reset', system: 'SI' });
    expect(s).toEqual(s0);
  });
});

describe('estado del problema — propiedades', () => {
  /** Un campo con dimensión física y dos unidades de esa dimensión. */
  const arbFieldUnits = fc.constantFrom<InputId>('d', 'F', 'Sy', 'E', 'Tin', 'N', 'dc')
    .chain(id => {
      const us = unitsFor(INPUT_BY_ID.get(id)!.dim).map(u => u.id);
      return fc.tuple(fc.constant(id), fc.constantFrom(...us), fc.constantFrom(...us));
    });

  it('cambiar la unidad de un campo conserva la magnitud física', () => {
    fc.assert(fc.property(arbFieldUnits, fc.double({ min: 1e-3, max: 1e6, noNaN: true }), ([id, u1, u2], x) => {
      let s: ProblemState = reducer(s0, { type: 'unit', id, unit: u1 });
      s = reducer(s, { type: 'value', id, value: x });
      const before = toBase(s.entered[id]!.value, s.entered[id]!.unit);
      s = reducer(s, { type: 'unit', id, unit: u2 });
      const after = toBase(s.entered[id]!.value, s.entered[id]!.unit);
      expect(Math.abs(after - before)).toBeLessThanOrEqual(Math.abs(before) * 1e-9);
    }));
  });
});

describe('accionamiento manual por defecto', () => {
  it('al elegir palanca se marca; al pasar a reductor se desmarca; se puede cambiar a mano', () => {
    let s = reducer(s0, { type: 'config', patch: { transmission: 'lever' } });
    expect(s.cfg.manualDrive).toBe(true);
    s = reducer(s, { type: 'config', patch: { manualDrive: false } });
    expect(s.cfg.manualDrive).toBe(false);
    s = reducer(s, { type: 'config', patch: { transmission: 'reducer' } });
    expect(s.cfg.manualDrive).toBe(false);
  });
});

describe('aplicar el tamaño de un dimensionamiento', () => {
  it('conserva la forma de rosca con la que se dimensionó', () => {
    const s = reducer(s0, { type: 'acme', sizeId: '1-1/2', keepThread: true });
    expect(s.cfg.thread).toBe('square');
    expect(s.entered.d?.value).toBeCloseTo(38.1, 9);
  });
});
