import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { saveSession, loadSession, clearSession, isEmptyState, SESSION_KEY } from '@/features/powerScrew/state/session';
import { saveProject, listProjects, type KeyValueStore } from '@/features/powerScrew/state/persistence';
import { initialState, reducer, type Action } from '@/features/powerScrew/state/problemState';
import { EXAMPLES } from '@/features/powerScrew/examples/examples';
import { INPUTS } from '@/features/powerScrew/engine/vars';
import { ACME_SIZES, SCREW_MATERIALS } from '@/features/powerScrew/data/tables';

const memStore = (): KeyValueStore & { m: Map<string, string> } => {
  const m = new Map<string, string>();
  return { m, getItem: k => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: k => void m.delete(k) };
};
const brokenStore: KeyValueStore = {
  getItem: () => { throw new Error('bloqueado'); },
  setItem: () => { throw new Error('bloqueado'); },
  removeItem: () => { throw new Error('bloqueado'); },
};

const arbAction: fc.Arbitrary<Action> = fc.oneof(
  fc.record({ type: fc.constant('value' as const), id: fc.constantFrom(...INPUTS.filter(i => i.visible(initialState().cfg)).map(i => i.id)), value: fc.double({ min: -1e6, max: 1e6, noNaN: true, noDefaultInfinity: true }) }),
  fc.record({ type: fc.constant('acme' as const), sizeId: fc.constantFrom(...ACME_SIZES.map(a => a.id)) }),
  fc.record({ type: fc.constant('material' as const), materialId: fc.constantFrom(...SCREW_MATERIALS.map(m => m.id)) }),
  fc.record({ type: fc.constant('config' as const), patch: fc.record({ transmission: fc.constantFrom('direct', 'lever', 'reducer'), thrust: fc.constantFrom('none', 'collar', 'bearing') }) }),
) as fc.Arbitrary<Action>;
const arbState = fc.array(arbAction, { maxLength: 25 }).map(as => as.reduce(reducer, initialState('SI')));
const arbName = fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0);

describe('autoguardado de la sesión', () => {
  it('lo autoguardado se recupera idéntico (ida y vuelta)', () => {
    fc.assert(fc.property(arbState, arbName, fc.option(fc.constantFrom(...EXAMPLES.map(e => e.id)), { nil: undefined }), (s, name, ex) => {
      const st = memStore();
      const saved = saveSession(st, name, s, ex);
      const back = loadSession(st);
      if (isEmptyState(s)) {
        expect(saved).toBe(false);
        expect(back).toBeNull();
      } else {
        expect(saved).toBe(true);
        expect(back?.state).toEqual(s);
        expect(back?.name).toBe(name.trim());
        expect(back?.exampleId).toBe(ex);
      }
    }), { numRuns: 300 });
  });

  it('un cero negativo se guarda como 0 y vuelve igual', () => {
    const s = reducer(initialState('SI'), { type: 'value', id: 'd', value: -0 });
    expect(Object.is(s.entered.d?.value, 0)).toBe(true);
    const st = memStore();
    saveSession(st, '!', s);
    expect(loadSession(st)?.state).toEqual(s);
  });

  it('un estado vacío (Reiniciar) borra la ranura', () => {
    const st = memStore();
    saveSession(st, 'x', EXAMPLES[0].build('SI'));
    expect(loadSession(st)).not.toBeNull();
    saveSession(st, 'x', initialState('SI'));
    expect(loadSession(st)).toBeNull();
    expect(st.m.has(SESSION_KEY)).toBe(false);
  });

  it('no se mezcla con los proyectos guardados', () => {
    const st = memStore();
    saveProject(st, 'A', EXAMPLES[0].build('SI'));
    saveSession(st, 'sesión', EXAMPLES[1].build('SI'));
    expect(listProjects(st).map(p => p.name)).toEqual(['A']);
    clearSession(st);
    expect(listProjects(st)).toHaveLength(1);
  });

  it('con el almacenamiento bloqueado no falla y no recupera nada', () => {
    expect(() => saveSession(brokenStore, 'x', EXAMPLES[0].build('SI'))).not.toThrow();
    expect(saveSession(brokenStore, 'x', EXAMPLES[0].build('SI'))).toBe(false);
    expect(loadSession(brokenStore)).toBeNull();
    expect(() => clearSession(brokenStore)).not.toThrow();
    expect(saveSession(null, 'x', EXAMPLES[0].build('SI'))).toBe(false);
    expect(loadSession(null)).toBeNull();
  });

  it('una ranura corrupta se ignora', () => {
    fc.assert(fc.property(fc.string(), junk => {
      const st = memStore();
      st.setItem(SESSION_KEY, junk);
      expect(() => loadSession(st)).not.toThrow();
    }));
    const st = memStore();
    st.setItem(SESSION_KEY, JSON.stringify({ data: '{"app":"otra"}' }));
    expect(loadSession(st)).toBeNull();
  });
});
